"""Reconocimiento de entidades con spaCy (opcional).

Las reglas encuentran muy bien lo que tiene formato (correos, IBAN, DNI...)
pero un nombre propio sin tratamiento ni nombre de pila conocido ("Gómez
dijo que...") o el nombre de un lugar solo los ve un modelo de lenguaje.

spaCy NO es una dependencia obligatoria: se instala con ``pip install
.[ner]`` y se activa con ``NER_MODEL``. Si no esta, el detector funciona solo
con reglas y lo dice en ``/health``.
"""

from __future__ import annotations

import logging
import re
from collections.abc import Iterable
from typing import Protocol

from .names import fold
from .patterns import LUGAR, NOMBRE, ORGANIZACION, Span

# Palabras que los modelos pequenos confunden con personas al inicio de frase.
_NOT_PEOPLE = frozenset({
    "hola", "buenas", "buenos", "gracias", "saludos", "atentamente", "estimado", "estimada",
    "querido", "querida", "hello", "hi", "dear", "thanks", "regards", "ciao", "bonjour",
})
_SENTENCE_START = re.compile(r"(?:^|[.!?¡¿:\n]\s*)$")

log = logging.getLogger(__name__)

#: Etiquetas de los modelos de spaCy (es/ca/pt/it/fr/de usan PER/LOC/ORG;
#: los ingleses PERSON/GPE/LOC/FAC/ORG) -> etiquetas del anonimizador.
DEFAULT_LABEL_MAP: dict[str, str] = {
    "PER": NOMBRE,
    "PERSON": NOMBRE,
    "LOC": LUGAR,
    "GPE": LUGAR,
    "FAC": LUGAR,
    "ORG": ORGANIZACION,
}


class NerBackend(Protocol):
    name: str

    def find(self, text: str) -> Iterable[Span]: ...


class SpacyNer:
    """Adaptador de un ``spacy.Language`` al protocolo del detector."""

    def __init__(self, nlp, *, name: str, label_map: dict[str, str] | None = None,
                 score: float = 0.65, first_names: frozenset[str] = frozenset()) -> None:
        self._nlp = nlp
        self.name = name
        self.label_map = label_map or DEFAULT_LABEL_MAP
        self.score = score
        self.first_names = first_names

    def find(self, text: str) -> Iterable[Span]:
        if not text.strip():
            return
        for entity in self._nlp(text).ents:
            label = self.label_map.get(entity.label_)
            if label is None:
                continue
            # spaCy a veces incluye la puntuacion final en la entidad.
            surface = entity.text.rstrip(" .,;:")
            if len(surface) < 2 or self._is_noise(text, entity.start_char, surface, label):
                continue
            yield Span(entity.start_char, entity.start_char + len(surface), label, self.score,
                       f"ner:{self.name}")

    def _is_noise(self, text: str, start: int, surface: str, label: str) -> bool:
        """Filtra los fallos tipicos de los modelos pequenos (``*_sm``).

        * Siglas cortas en mayusculas ("EUR", "CP", "IVA") marcadas como ORG.
        * Una sola palabra al inicio de frase marcada como persona ("Hola, ...")
          que no es un nombre de pila conocido.
        """
        if surface.isupper() and len(surface) <= 4:
            return True
        if label == NOMBRE and " " not in surface:
            word = fold(surface)
            if word in _NOT_PEOPLE:
                return True
            if _SENTENCE_START.search(text[:start]) and word not in self.first_names:
                return True
        return False


def load_spacy(model: str, first_names: frozenset[str] = frozenset()) -> SpacyNer | None:
    """Carga el modelo o devuelve None explicando por que no se pudo."""
    if not model:
        return None
    try:
        import spacy
    except ImportError:
        log.warning("NER_MODEL=%s pero spaCy no esta instalado (pip install .[ner]). "
                    "Se sigue solo con reglas.", model)
        return None
    try:
        # El parser y el lematizador no se usan: fuera, para ir el doble de rapido.
        nlp = spacy.load(model, disable=["parser", "lemmatizer", "tagger", "attribute_ruler"])
    except OSError:
        log.warning("No se encuentra el modelo de spaCy '%s' (python -m spacy download %s). "
                    "Se sigue solo con reglas.", model, model)
        return None
    log.info("NER activo con el modelo %s", model)
    return SpacyNer(nlp, name=model, first_names=first_names)
