"""Reconocimiento de nombres de persona con un diccionario de nombres de pila.

Sin NER, la unica senal fiable de que "Laura Gómez" es una persona y "Riego
Goteo" no lo es, es que *Laura* es un nombre de pila. Por eso:

* En texto libre se marca ``<NombreDePila> <Apellido>{1,3}``. Un nombre de
  pila suelto NO se marca: muchos son tambien palabras corrientes
  (Rosa, Pilar, Luz, Domingo, Victoria...).
* Para el valor completo de un campo (``"contacto": "GÓMEZ RUIZ, LAURA"``) se
  aceptan tambien mayusculas y el orden "Apellidos, Nombre".
"""

from __future__ import annotations

import re
import unicodedata
from collections.abc import Iterable
from functools import lru_cache
from importlib import resources
from pathlib import Path

from .patterns import CONNECTOR, LOWER, NOMBRE, UPPER, WORD_TAIL, Span


def fold(value: str) -> str:
    """Minusculas y sin tildes: 'José' -> 'jose'."""
    decomposed = unicodedata.normalize("NFD", value)
    return "".join(c for c in decomposed if unicodedata.category(c) != "Mn").casefold()


def _read_names(lines: Iterable[str]) -> set[str]:
    out: set[str] = set()
    for line in lines:
        entry = line.split("#", 1)[0].strip()
        if entry:
            out.add(fold(entry))
    return out


@lru_cache(maxsize=8)
def load_first_names(extra_file: str | None = None) -> frozenset[str]:
    text = resources.files("data_anonymizer.pii").joinpath("data/nombres.txt").read_text("utf-8")
    names = _read_names(text.splitlines())
    if extra_file:
        names |= _read_names(Path(extra_file).read_text("utf-8").splitlines())
    return frozenset(names)


_CAP = rf"[{UPPER}][{LOWER}]{WORD_TAIL}"
# Candidato: 2..5 palabras capitalizadas, admitiendo particulas ("de la").
_CANDIDATE = re.compile(rf"\b{_CAP}(?:\s+(?:{CONNECTOR}\s+)?{_CAP}){{1,4}}")
_TOKEN = re.compile(rf"[{UPPER}{LOWER}][{UPPER}{LOWER}'’\-]*")
_CONNECTOR_WORD = re.compile(rf"^{CONNECTOR}$")


class NameRecognizer:
    """Encuentra "Nombre Apellido" en texto y clasifica valores completos."""

    def __init__(self, first_names: frozenset[str], score: float = 0.72) -> None:
        self.first_names = first_names
        self.score = score

    def find(self, text: str) -> Iterable[Span]:
        for match in _CANDIDATE.finditer(text):
            tokens = list(re.finditer(r"\S+", match.group(0)))
            words = [t.group(0) for t in tokens]
            # El nombre de pila puede no ser la primera palabra capitalizada:
            # "Ayer Laura Gómez llamó" -> el tramo empieza en "Laura".
            for index, token in enumerate(tokens):
                if fold(words[index]) in self.first_names and self._has_surname(words[index + 1 :]):
                    yield Span(match.start() + token.start(), match.end(), NOMBRE, self.score,
                               "nombres_de_pila")
                    break

    @staticmethod
    def _has_surname(rest: list[str]) -> bool:
        return any(not _CONNECTOR_WORD.match(w) for w in rest)

    def looks_like_person(self, value: str) -> bool:
        """True si el valor COMPLETO parece el nombre de una persona.

        Acepta "Laura Gómez Ruiz", "GÓMEZ RUIZ, LAURA", "laura gomez" no
        (sin mayusculas no hay forma de distinguirlo de texto corriente).
        """
        if not isinstance(value, str):
            return False
        stripped = value.strip()
        if not stripped or any(ch.isdigit() for ch in stripped) or len(stripped) > 80:
            return False
        tokens = _TOKEN.findall(stripped.replace(",", " "))
        meaningful = [t for t in tokens if not _CONNECTOR_WORD.match(t)]
        if not 2 <= len(meaningful) <= 5:
            return False
        # Todas las palabras con inicial mayuscula (o todo en mayusculas).
        if not all(t[0].isupper() for t in meaningful):
            return False
        return any(fold(t) in self.first_names for t in meaningful)
