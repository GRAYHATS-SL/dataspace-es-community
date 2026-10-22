"""Deteccion generica de PII: reglas + diccionario de nombres + NER opcional.

Todos los reconocedores proponen tramos con una puntuacion; despues se
resuelven los solapes quedandose con el de mayor confianza (y, a igualdad, el
mas largo). Asi "Calle Juan de Mena 4" sale como una DIRECCION entera y no
como una calle con un NOMBRE dentro.
"""

from __future__ import annotations

import re
from collections.abc import Callable, Iterable, Sequence
from dataclasses import dataclass, field

from .names import NameRecognizer, fold
from .ner import NerBackend
from .patterns import RECOGNIZERS, REDACTADO, TEXT_ENTITIES, Span

Replacer = Callable[[str, str], str]
"""(texto_original_del_tramo, etiqueta) -> texto de sustitucion."""


@dataclass
class DetectorConfig:
    entities: Sequence[str] = TEXT_ENTITIES
    use_ner: bool = True
    min_score: float = 0.5
    extra_terms: Sequence[str] = ()
    extra_terms_label: str = REDACTADO
    allow_terms: Sequence[str] = ()


@dataclass
class Detector:
    names: NameRecognizer
    ner: NerBackend | None = None
    config: DetectorConfig = field(default_factory=DetectorConfig)

    def __post_init__(self) -> None:
        self._entities = set(self.config.entities)
        self._regex = [r for r in RECOGNIZERS if r.label in self._entities]
        terms = [t.strip() for t in self.config.extra_terms if t and t.strip()]
        self._extra = None
        if terms:
            alternation = "|".join(sorted((re.escape(t) for t in terms), key=len, reverse=True))
            self._extra = re.compile(rf"(?<!\w)(?:{alternation})(?!\w)", re.IGNORECASE)
        self._allow = {fold(t.strip()) for t in self.config.allow_terms if t and t.strip()}

    @property
    def ner_active(self) -> bool:
        return self.ner is not None and self.config.use_ner

    def with_config(self, config: DetectorConfig) -> Detector:
        """Mismo diccionario y mismo modelo NER, otra configuracion.

        Cargar un modelo de spaCy cuesta segundos y cientos de MB: se carga una
        vez y cada politica crea su detector reutilizandolo.
        """
        return Detector(self.names, self.ner, config)

    # ------------------------------------------------------------- detectar
    def find(self, text: str) -> list[Span]:
        if not isinstance(text, str) or not text.strip():
            return []
        candidates = list(self._candidates(text))
        chosen = self._resolve(candidates)
        return [s for s in chosen if fold(text[s.start:s.end].strip()) not in self._allow]

    def _candidates(self, text: str) -> Iterable[Span]:
        if self._extra is not None:
            for match in self._extra.finditer(text):
                yield Span(match.start(), match.end(), self.config.extra_terms_label, 1.0, "lista")
        for recognizer in self._regex:
            yield from recognizer.find(text)
        if "NOMBRE" in self._entities:
            yield from self.names.find(text)
        if self.ner_active:
            for span in self.ner.find(text):  # type: ignore[union-attr]
                if span.label in self._entities:
                    yield span

    def _resolve(self, candidates: list[Span]) -> list[Span]:
        ranked = sorted(
            (c for c in candidates if c.score >= self.config.min_score and c.length > 0),
            key=lambda s: (-s.score, -s.length, s.start),
        )
        accepted: list[Span] = []
        for span in ranked:
            if not any(span.overlaps(other) for other in accepted):
                accepted.append(span)
        return sorted(accepted, key=lambda s: s.start)

    # ------------------------------------------------------------ sustituir
    def redact(self, text: str, replacer: Replacer) -> tuple[str, list[Span]]:
        spans = self.find(text)
        if not spans:
            return text, []
        out: list[str] = []
        cursor = 0
        for span in spans:
            out.append(text[cursor:span.start])
            out.append(replacer(text[span.start:span.end], span.label))
            cursor = span.end
        out.append(text[cursor:])
        return "".join(out), spans

    def classify_value(self, value: str) -> str | None:
        """Etiqueta del valor COMPLETO si todo el es una unica PII.

        Sirve para campos cuyo nombre no dice nada ("valor", "campo3"): si el
        texto entero es un correo, un IBAN o un nombre, se trata como tal.
        """
        stripped = value.strip() if isinstance(value, str) else ""
        if not stripped:
            return None
        spans = self.find(stripped)
        if len(spans) == 1 and spans[0].start == 0 and spans[0].end == len(stripped):
            return spans[0].label
        if "NOMBRE" in self._entities and self.names.looks_like_person(stripped):
            return "NOMBRE"
        return None
