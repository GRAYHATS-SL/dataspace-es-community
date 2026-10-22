"""Motor de anonimizacion de JSON guiado por una politica.

Recorre el documento y, para cada nodo, decide en este orden:

1. **Regla explicita** (``fields``): la primera cuya ruta coincide. Si cae en
   un objeto o lista, se aplica a todo su contenido.
2. **Pista por nombre de clave** (``defaults.key_hints``): ``email``,
   ``apellidos``, ``iban``, ``lat``...
3. **Valor por defecto por tipo** (``defaults.strings`` / ``numbers`` /
   ``booleans``). Con ``strings: detect`` cada texto pasa por el detector.

El motor no conoce ningun formato concreto: sirve igual para la respuesta de
una API, un export de un CRM o un log estructurado.
"""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass, field
from typing import Any

from ..pii.detector import Detector, DetectorConfig
from ..pii.hints import KeyHint, hint_for_key
from ..pii.patterns import COORDENADAS, FECHA_NAC, NOMBRE, REDACTADO, Span
from .policy import Action, Policy, ReplacementStyle, Rule
from .pseudonymize import Pseudonymizer
from .transforms import is_numeric, mask, mask_words, round_value, truncate_date

_DROP = object()
_NO_HINT = object()
_CONTAINER_WHOLE = {Action.KEEP, Action.DROP, Action.REDACT, Action.REPLACE}
_RULE_CACHE_LIMIT = 50_000


@dataclass
class Report:
    """Resumen de lo que se ha tocado. Nunca contiene valores, solo cuentas."""

    actions: Counter[str] = field(default_factory=Counter)
    entities: Counter[str] = field(default_factory=Counter)

    def as_dict(self) -> dict[str, Any]:
        return {
            "changed_values": sum(n for a, n in self.actions.items() if a != Action.KEEP.value),
            "actions": dict(sorted(self.actions.items())),
            "entities": dict(sorted(self.entities.items())),
        }


class JsonAnonymizer:
    def __init__(self, policy: Policy, pseudonymizer: Pseudonymizer, detector: Detector) -> None:
        self.policy = policy
        self.pseudo = pseudonymizer
        det = policy.detection
        self.detector = detector.with_config(
            DetectorConfig(
                entities=det.entities,
                use_ner=det.ner != "off",
                min_score=det.min_score,
                extra_terms=det.extra_terms,
                allow_terms=det.allow_terms,
            )
        )
        self._rule_cache: dict[tuple, Rule | None] = {}

    # ─────────────────────────────────────────────────────────── entrada
    def anonymize(self, data: Any) -> tuple[Any, Report]:
        report = Report()
        result = self._walk(data, (), None, report)
        return (None if result is _DROP else result), report

    def anonymize_text(self, text: str) -> tuple[str, list[Span]]:
        """Texto libre suelto (endpoint /v1/text)."""
        return self.detector.redact(text, self.replacement)

    # ───────────────────────────────────────────────────────── recorrido
    def _walk(self, value: Any, path: tuple, last_key: str | None, report: Report) -> Any:
        rule = self._rule(path) if path else None
        if rule is not None:
            return self._apply(rule, value, report)
        if isinstance(value, dict):
            out = {}
            for key, child in value.items():
                result = self._walk(child, (*path, key), key, report)
                if result is not _DROP:
                    out[key] = result
            return out
        if isinstance(value, list):
            items = (self._walk(child, (*path, i), last_key, report) for i, child in enumerate(value))
            return [item for item in items if item is not _DROP]
        return self._default_leaf(value, last_key, report)

    def _rule(self, path: tuple) -> Rule | None:
        key = path if self.policy.index_sensitive else tuple(-1 if isinstance(p, int) else p for p in path)
        try:
            return self._rule_cache[key]
        except KeyError:
            pass
        if len(self._rule_cache) > _RULE_CACHE_LIMIT:
            self._rule_cache.clear()
        rule = self.policy.rule_for(path)
        self._rule_cache[key] = rule
        return rule

    # ──────────────────────────────────────────────── nodos sin regla
    def _default_leaf(self, value: Any, key: str | None, report: Report) -> Any:
        if value is None:
            return None
        defaults = self.policy.defaults
        if defaults.key_hints:
            hint = hint_for_key(key)
            if hint is not None:
                result = self._apply_hint(hint, value, report)
                if result is not _NO_HINT:
                    return result
        if isinstance(value, bool):
            return self._simple_default(defaults.booleans, value, report)
        if isinstance(value, int | float):
            return self._simple_default(defaults.numbers, value, report)
        if isinstance(value, str):
            if defaults.strings == "detect":
                return self._detect(value, report)
            return self._simple_default(defaults.strings, value, report)
        return value

    def _simple_default(self, mode: str, value: Any, report: Report) -> Any:
        report.actions[mode] += 1
        if mode == "drop":
            return _DROP
        if mode == "redact":
            return self._label(REDACTADO)
        return value

    def _apply_hint(self, hint: KeyHint, value: Any, report: Report) -> Any:
        if isinstance(value, bool):
            return _NO_HINT
        defaults = self.policy.defaults
        if hint.label == COORDENADAS:
            if not is_numeric(value):
                return _NO_HINT  # texto no numerico: que lo mire el detector
            report.actions["hint:round"] += 1
            report.entities[COORDENADAS] += 1
            return round_value(value, defaults.coordinates_decimals)
        if hint.label == FECHA_NAC:
            truncated = truncate_date(value, defaults.birthdate_precision)
            report.actions["hint:date"] += 1
            report.entities[FECHA_NAC] += 1
            return truncated if truncated is not None else self._label(FECHA_NAC)
        if not hint.strong:
            # "name", "contacto": solo si el valor parece de verdad una persona.
            if isinstance(value, str) and self.detector.names.looks_like_person(value):
                report.actions["hint:replace"] += 1
                report.entities[NOMBRE] += 1
                return self.replacement(value, NOMBRE)
            return _NO_HINT
        if isinstance(value, str) and not value.strip():
            return value
        report.actions["hint:replace"] += 1
        report.entities[hint.label] += 1
        return self.replacement(str(value), hint.label)

    # ───────────────────────────────────────────────── reglas explicitas
    def _apply(self, rule: Rule, value: Any, report: Report) -> Any:
        action = rule.action
        if isinstance(value, dict | list) and action not in _CONTAINER_WHOLE:
            return self._map_leaves(rule, value, report)
        if action is Action.DETECT:
            return self._detect(value, report) if isinstance(value, str) else value
        report.actions[action.value] += 1
        if action is Action.KEEP:
            return value
        if action is Action.DROP:
            return _DROP
        if action is Action.REPLACE:
            return rule.value
        if value is None:
            return None
        if action is Action.REDACT:
            return self._label(rule.label or REDACTADO)
        return self._apply_leaf(rule, value, report)

    def _map_leaves(self, rule: Rule, value: Any, report: Report) -> Any:
        if isinstance(value, dict):
            return {k: self._map_leaves(rule, v, report) for k, v in value.items()}
        if isinstance(value, list):
            return [self._map_leaves(rule, v, report) for v in value]
        return self._apply(rule, value, report)

    def _apply_leaf(self, rule: Rule, value: Any, report: Report) -> Any:
        action = rule.action
        text = str(value)
        if action is Action.PSEUDO:
            token = self.pseudo.token(text, namespace=rule.namespace or "default", length=rule.length)
            return f"{rule.prefix}{token}"
        if action is Action.PSEUDO_ID:
            return self.pseudo.pseudonymize_id(
                text, namespace=rule.namespace or "id", preserve=tuple(rule.preserve),
                separators=rule.separators,
            )
        if action is Action.HASH:
            return self.pseudo.hexdigest(text, namespace=rule.namespace or "hash", length=rule.length or 64)
        if action is Action.MASK:
            return mask(text, keep_start=rule.keep_start, keep_end=rule.keep_end, char=rule.mask_char)
        if action is Action.ROUND:
            return round_value(value, rule.decimals)
        if action is Action.DATE:
            truncated = truncate_date(value, rule.precision)
            return truncated if truncated is not None else self._label(rule.label or "FECHA")
        raise AssertionError(f"accion sin implementar: {action}")  # pragma: no cover

    # ──────────────────────────────────────────────────────── deteccion
    def _detect(self, value: str, report: Report) -> str:
        text, spans = self.detector.redact(value, self.replacement)
        names_on = NOMBRE in self.policy.detection.entities
        if not spans and names_on and self.detector.names.looks_like_person(value):
            # "GÓMEZ RUIZ, LAURA" no tiene la forma "Nombre Apellido" que se busca
            # en texto corrido, pero como valor completo es claramente una persona.
            report.actions["detect"] += 1
            report.entities[NOMBRE] += 1
            return self.replacement(value, NOMBRE)
        if spans:
            report.actions["detect"] += 1
            report.entities.update(span.label for span in spans)
        else:
            report.actions["keep"] += 1
        return text

    # ──────────────────────────────────────────────────────── sustitutos
    def _label(self, label: str) -> str:
        return self.policy.detection.label_format.format(label=label)

    def replacement(self, original: str, label: str) -> str:
        style = self.policy.detection.replacement
        if style is ReplacementStyle.PSEUDO:
            # Normalizado para que "Laura  Gómez" y "laura gómez" den el mismo alias.
            canonical = " ".join(original.split()).casefold()
            return f"{label}-{self.pseudo.token(canonical, namespace=label)}"
        if style is ReplacementStyle.MASK:
            return mask_words(original)
        return self._label(label)
