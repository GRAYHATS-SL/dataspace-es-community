"""Politicas de anonimizacion: que hacer con cada campo de un JSON.

Una politica es un YAML con tres bloques (ver ``policies/ejemplo.yaml``):

* ``fields``: reglas por ruta. Gana la PRIMERA regla que coincide, como en un
  cortafuegos: pon las excepciones concretas antes que las generales.
* ``defaults``: que hacer con lo que ninguna regla nombra.
* ``detection``: como se busca y se sustituye la PII en texto libre.

Sintaxis de rutas::

    cliente.email            clave exacta
    pedidos[*].tarjeta       cualquier elemento de la lista
    pedidos[0].tarjeta       solo el primero
    cliente.*                cualquier clave dentro de 'cliente'
    **.email                 'email' a cualquier profundidad
    ["clave.con.puntos"]     claves con caracteres especiales

Los indices de lista son transparentes: ``pedidos.tarjeta`` tambien coincide
con ``pedidos[3].tarjeta``. Solo hace falta escribirlos para fijar uno.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from enum import StrEnum
from pathlib import Path
from typing import Any, Literal

import yaml
from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    PrivateAttr,
    ValidationError,
    field_validator,
    model_validator,
)

from ..pii.patterns import TEXT_ENTITIES


class PolicyError(ValueError):
    """Politica mal escrita. El mensaje dice el fichero y el campo."""


class Action(StrEnum):
    KEEP = "keep"            # se deja tal cual
    DROP = "drop"            # se elimina la clave (o el elemento de la lista)
    REDACT = "redact"        # se sustituye por la etiqueta: "[NOMBRE]"
    REPLACE = "replace"      # se sustituye por un valor fijo (`value`)
    PSEUDO = "pseudo"        # alias determinista: "CLI-4KJ7QAXM"
    PSEUDO_ID = "pseudo_id"  # alias que conserva la estructura del id
    HASH = "hash"            # HMAC en hexadecimal
    MASK = "mask"            # "J*** G****" / "**** **** **** 1234"
    DETECT = "detect"        # busca PII dentro del texto y sustituye solo eso
    ROUND = "round"          # redondeo numerico (coordenadas, importes)
    DATE = "date"            # trunca fechas a año / mes / dia


class ReplacementStyle(StrEnum):
    LABEL = "label"
    PSEUDO = "pseudo"
    MASK = "mask"


class _Model(BaseModel):
    model_config = ConfigDict(extra="forbid", use_enum_values=False)


class Rule(_Model):
    path: str
    action: Action
    label: str | None = Field(None, description="Etiqueta para redact/pseudo")
    prefix: str = ""
    namespace: str | None = None
    value: Any = None
    keep_start: int = Field(0, ge=0)
    keep_end: int = Field(0, ge=0)
    mask_char: str = Field("*", min_length=1, max_length=1)
    decimals: int = Field(2, ge=0, le=10)
    precision: Literal["year", "month", "day"] = "year"
    preserve: list[str] = Field(default_factory=list)
    separators: str = "-_:./"
    length: int | None = Field(None, ge=4, le=64)

    @field_validator("path")
    @classmethod
    def _path_ok(cls, value: str) -> str:
        parse_path(value)  # lanza PolicyError con detalle si no se entiende
        return value


class Defaults(_Model):
    strings: Literal["keep", "detect", "redact", "drop"] = "detect"
    numbers: Literal["keep", "redact", "drop"] = "keep"
    booleans: Literal["keep", "redact", "drop"] = "keep"
    key_hints: bool = True
    coordinates_decimals: int = Field(2, ge=0, le=10)
    birthdate_precision: Literal["year", "month", "day"] = "year"


class Detection(_Model):
    entities: list[str] = Field(default_factory=lambda: list(TEXT_ENTITIES))
    ner: Literal["auto", "on", "off"] = "auto"
    replacement: ReplacementStyle = ReplacementStyle.LABEL
    label_format: str = "[{label}]"
    min_score: float = Field(0.5, ge=0, le=1)
    extra_terms: list[str] = Field(default_factory=list)
    allow_terms: list[str] = Field(default_factory=list)

    @field_validator("entities")
    @classmethod
    def _known_entities(cls, value: list[str]) -> list[str]:
        unknown = sorted(set(value) - set(TEXT_ENTITIES))
        if unknown:
            raise ValueError(f"entidades desconocidas {unknown}; validas: {list(TEXT_ENTITIES)}")
        return value

    @field_validator("label_format")
    @classmethod
    def _format_ok(cls, value: str) -> str:
        if "{label}" not in value:
            raise ValueError("label_format debe contener {label}")
        return value


class Policy(_Model):
    name: str = "sin-nombre"
    description: str = ""
    defaults: Defaults = Field(default_factory=Defaults)
    detection: Detection = Field(default_factory=Detection)
    fields: list[Rule] = Field(default_factory=list)

    _compiled: list[tuple[tuple[Segment, ...], Rule]] = PrivateAttr(default_factory=list)
    _index_sensitive: bool = PrivateAttr(False)

    @model_validator(mode="after")
    def _compile(self) -> Policy:
        self._compiled = [(parse_path(rule.path), rule) for rule in self.fields]
        self._index_sensitive = any(
            seg.kind == "index" and seg.value != "*" for segs, _ in self._compiled for seg in segs
        )
        return self

    def rule_for(self, path: tuple[str | int, ...]) -> Rule | None:
        for segments, rule in self._compiled:
            if match_path(segments, path):
                return rule
        return None

    @property
    def index_sensitive(self) -> bool:
        """True si alguna regla fija un indice concreto (cambia el cacheo)."""
        return self._index_sensitive

    # ---------------------------------------------------------- carga
    @classmethod
    def from_mapping(cls, data: Any, *, source: str = "<politica>") -> Policy:
        if not isinstance(data, dict):
            raise PolicyError(f"{source}: la politica debe ser un objeto YAML/JSON")
        try:
            return cls.model_validate(data)
        except ValidationError as exc:
            problems = "; ".join(
                f"{'.'.join(str(p) for p in err['loc'])}: {err['msg']}" for err in exc.errors()
            )
            raise PolicyError(f"{source}: {problems}") from None

    @classmethod
    def from_file(cls, path: Path) -> Policy:
        try:
            data = yaml.safe_load(path.read_text("utf-8")) or {}
        except yaml.YAMLError as exc:
            raise PolicyError(f"{path.name}: YAML invalido: {exc}") from None
        data.setdefault("name", path.stem)
        return cls.from_mapping(data, source=path.name)


def load_policies(directory: Path) -> dict[str, Policy]:
    """Carga todos los ``*.yaml``/``*.yml`` de un directorio, por nombre de fichero."""
    if not directory.is_dir():
        raise PolicyError(f"No existe el directorio de politicas: {directory}")
    policies: dict[str, Policy] = {}
    for file in sorted([*directory.glob("*.yaml"), *directory.glob("*.yml")]):
        policies[file.stem] = Policy.from_file(file)
    return policies


# ─────────────────────────────────────────────────────────────────── rutas
@dataclass(frozen=True)
class Segment:
    kind: Literal["key", "index", "any"]
    value: str | int


_DOUBLE_STAR = Segment("any", "**")
_TOKEN = re.compile(
    r"""\[\s*(?P<idx>\*|\d+)\s*\]
      |\[\s*(?P<q>["'])(?P<qkey>.*?)(?P=q)\s*\]
      |(?P<key>[^.\[\]]+)
      |(?P<dot>\.)""",
    re.VERBOSE,
)


def parse_path(path: str) -> tuple[Segment, ...]:
    text = path.strip()
    if text.startswith("$"):
        text = text[1:].lstrip(".")
    if not text:
        raise PolicyError("ruta vacia")
    segments: list[Segment] = []
    position = 0
    while position < len(text):
        match = _TOKEN.match(text, position)
        if match is None:
            raise PolicyError(f"ruta '{path}': no se entiende a partir de '{text[position:]}'")
        position = match.end()
        if match.group("dot"):
            continue
        if match.group("idx") is not None:
            idx = match.group("idx")
            segments.append(Segment("index", "*" if idx == "*" else int(idx)))
        elif match.group("q") is not None:
            segments.append(Segment("key", match.group("qkey")))
        else:
            key = match.group("key").strip()
            segments.append(_DOUBLE_STAR if key == "**" else Segment("key", key))
    return tuple(segments)


def match_path(pattern: tuple[Segment, ...], path: tuple[str | int, ...]) -> bool:
    return _match(pattern, 0, path, 0)


def _match(pattern: tuple[Segment, ...], i: int, path: tuple[str | int, ...], j: int) -> bool:
    if i == len(pattern):
        return j == len(path)
    segment = pattern[i]
    if segment.kind == "any":
        return any(_match(pattern, i + 1, path, k) for k in range(j, len(path) + 1))
    if j == len(path):
        return False
    step = path[j]
    if isinstance(step, int):
        if segment.kind == "index":
            return segment.value in ("*", step) and _match(pattern, i + 1, path, j + 1)
        # Indice implicito: la lista es transparente para las claves.
        return _match(pattern, i, path, j + 1)
    if segment.kind == "key" and segment.value in ("*", step):
        return _match(pattern, i + 1, path, j + 1)
    return False
