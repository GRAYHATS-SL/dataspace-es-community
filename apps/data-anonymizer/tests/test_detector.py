"""Detector: combinacion de reconocedores, solapes, listas y NER."""

from __future__ import annotations

from collections.abc import Iterable

from data_anonymizer.pii.detector import Detector, DetectorConfig
from data_anonymizer.pii.names import NameRecognizer
from data_anonymizer.pii.patterns import LUGAR, NOMBRE, Span

LABEL = lambda original, label: f"[{label}]"  # noqa: E731


def test_frase_completa(detector):
    text = ("Hola, soy Laura Gómez Ruiz, vivo en Calle Mayor 12, 3º B, 41001 Sevilla. "
            "Mi móvil es +34 612 345 678 y mi correo laura.gomez@example.com")
    out, spans = detector.redact(text, LABEL)
    assert out == ("Hola, soy [NOMBRE], vivo en [DIRECCION], [CODIGO_POSTAL] Sevilla. "
                   "Mi móvil es [TELEFONO] y mi correo [EMAIL]")
    assert [s.label for s in spans] == ["NOMBRE", "DIRECCION", "CODIGO_POSTAL", "TELEFONO", "EMAIL"]


def test_la_direccion_se_traga_el_nombre_que_contiene(detector):
    out, spans = detector.redact("Vive en Calle Juan de Mena 4.", LABEL)
    assert out == "Vive en [DIRECCION]."
    assert len(spans) == 1


def test_sin_pii_devuelve_el_texto_intacto(detector):
    assert detector.redact("Riego por goteo", LABEL) == ("Riego por goteo", [])
    assert detector.find("") == []
    assert detector.find("   ") == []


def test_extra_terms_y_allow_terms(detector):
    custom = detector.with_config(DetectorConfig(extra_terms=["Proyecto Atlas", " "],
                                                 allow_terms=["Rosa Mosqueta"]))
    out, _ = custom.redact("El Proyecto Atlas usa Rosa Mosqueta", LABEL)
    assert out == "El [REDACTADO] usa Rosa Mosqueta"


def test_entidades_desactivadas(detector):
    only_email = detector.with_config(DetectorConfig(entities=["EMAIL"]))
    out, _ = only_email.redact("Laura Gómez, laura@example.com, 612 345 678", LABEL)
    assert out == "Laura Gómez, [EMAIL], 612 345 678"


def test_min_score_filtra(detector):
    strict = detector.with_config(DetectorConfig(min_score=0.8))
    out, _ = strict.redact("Laura Gómez llamó al 612 345 678", LABEL)
    assert out == "Laura Gómez llamó al 612 345 678"  # nombre 0.72 y telefono 0.75


def test_classify_value(detector):
    assert detector.classify_value("laura@example.com") == "EMAIL"
    assert detector.classify_value("GÓMEZ RUIZ, LAURA") == NOMBRE
    assert detector.classify_value("Sensor Almacén Norte") is None
    assert detector.classify_value("mi email es a@b.com") is None
    assert detector.classify_value("") is None


class FakeNer:
    name = "falso"

    def __init__(self, spans: list[Span]) -> None:
        self.spans = spans

    def find(self, text: str) -> Iterable[Span]:
        return self.spans


def test_el_ner_aporta_entidades_que_las_reglas_no_ven(first_names):
    text = "Gómez llamó desde Sevilla"
    ner = FakeNer([Span(0, 5, NOMBRE, 0.65, "ner"), Span(18, 25, LUGAR, 0.65, "ner")])
    detector = Detector(NameRecognizer(first_names), ner)
    assert detector.ner_active
    assert detector.redact(text, LABEL)[0] == "[NOMBRE] llamó desde [LUGAR]"


def test_el_ner_se_puede_apagar_por_politica(first_names):
    ner = FakeNer([Span(0, 5, NOMBRE, 0.65, "ner")])
    detector = Detector(NameRecognizer(first_names), ner, DetectorConfig(use_ner=False))
    assert not detector.ner_active
    assert detector.find("Gómez llamó") == []


def test_el_ner_respeta_las_entidades_elegidas(first_names):
    ner = FakeNer([Span(18, 25, LUGAR, 0.65, "ner")])
    detector = Detector(NameRecognizer(first_names), ner, DetectorConfig(entities=["NOMBRE"]))
    assert detector.find("Gómez llamó desde Sevilla") == []


def test_ante_solapes_gana_la_mayor_confianza(first_names):
    ner = FakeNer([Span(0, 11, LUGAR, 0.65, "ner")])  # el NER se equivoca
    detector = Detector(NameRecognizer(first_names), ner)
    spans = detector.find("Laura Gómez vino")
    assert [s.label for s in spans] == [NOMBRE]
