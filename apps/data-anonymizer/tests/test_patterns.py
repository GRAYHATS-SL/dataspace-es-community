"""Reconocedores de PII uno a uno: lo que deben encontrar y lo que no."""

from __future__ import annotations

import pytest

from data_anonymizer.pii import patterns as p
from data_anonymizer.pii.patterns import RECOGNIZERS, RegexRecognizer, Span


def labels_in(text: str) -> set[str]:
    return {span.label for r in RECOGNIZERS for span in r.find(text)}


# ───────────────────────────────────────────────────────── validadores
@pytest.mark.parametrize("value, ok", [
    ("12345678Z", True), ("12345678-Z", True), ("X1234567L", True), ("Y1234567X", True),
    ("12345678A", False), ("1234567Z", False), ("ABCDEFGHZ", False),
])
def test_dni_nie_con_letra_de_control(value, ok):
    assert p.valid_dni(value) is ok


@pytest.mark.parametrize("value, ok", [
    ("ES9121000418450200051332", True), ("ES91 2100 0418 4502 0005 1332", True),
    ("GB82WEST12345698765432", True), ("ES9121000418450200051333", False),
    ("ES91", False), ("1291210004184502", False),
])
def test_iban_mod97(value, ok):
    assert p.valid_iban(value) is ok


@pytest.mark.parametrize("value, ok", [
    ("4111 1111 1111 1111", True), ("5500-0000-0000-0004", True), ("4111111111111112", False),
    ("0000000000000000", False), ("1234", False),
])
def test_luhn(value, ok):
    assert p.luhn_ok(value) is ok


@pytest.mark.parametrize("value, ok", [
    ("192.168.1.20", True), ("8.8.8.8", True), ("256.1.1.1", False), ("0.1.2.3", False),
])
def test_ipv4(value, ok):
    assert p.valid_ipv4(value) is ok


def test_ipv6():
    assert p.valid_ipv6("2001:db8::1")
    assert not p.valid_ipv6("12:34:56")


@pytest.mark.parametrize("value, ok", [
    ("612 345 678", True), ("+34 957 49 67 41", True), ("12-03-2024", False), ("957 49", False),
])
def test_telefono_plausible(value, ok):
    assert p.plausible_phone(value) is ok


@pytest.mark.parametrize("value, ok", [
    ("37.888213, -4.779412", True), ("95.0000, 10.0000", False), ("1.5, abc", False),
])
def test_coordenadas_plausibles(value, ok):
    assert p.plausible_coordinates(value) is ok


# ──────────────────────────────────────────────────────── reconocedores
@pytest.mark.parametrize("text, label", [
    ("escribe a laura.gomez@example.com ya", p.EMAIL),
    ("ver https://example.com/perfil?id=3", p.URL),
    ("o en www.example.org", p.URL),
    ("IBAN ES91 2100 0418 4502 0005 1332 BANCO", p.IBAN),
    ("pago con 4111 1111 1111 1111", p.TARJETA),
    ("DNI 12345678Z", p.DOC_IDENTIDAD),
    ("NIE X1234567L", p.DOC_IDENTIDAD),
    ("codice RSSMRA85T10A562S", p.DOC_IDENTIDAD),
    ("SSN 123-45-6789", p.DOC_IDENTIDAD),
    ("desde 192.168.1.20", p.IP),
    ("desde 2001:db8:0:0:0:0:2:1", p.IP),
    ("en 37.888213, -4.779412", p.COORDENADAS),
    ("coche 1234 BCD", p.MATRICULA),
    ("CP 28013", p.CODIGO_POSTAL),
    ("28013 Madrid", p.CODIGO_POSTAL),
    ("vive en Calle Mayor 12", p.DIRECCION),
    ("vive en C/ San Fernando 3, 2º B", p.DIRECCION),
    ("piazza Napoleone 1", p.DIRECCION),
    ("221 Baker Street", p.DIRECCION),
    ("Brivibas iela 32", p.DIRECCION),
    ("en Goethestraße 4", p.DIRECCION),
    ("el Sr. Martínez de la Fuente", p.NOMBRE),
    ("Dra. Ruiz", p.NOMBRE),
    ("llama al +34 612 345 678", p.TELEFONO),
    ("llama al 957 49 67 41", p.TELEFONO),
])
def test_encuentra(text, label):
    assert label in labels_in(text)


@pytest.mark.parametrize("text", [
    "Riego por goteo en jardín interior con dos plantas",
    "Pedido 2024-000123 del 12-03-2024",
    "Importe total 1234.50 EUR",
    "versión 1.2.3 del firmware",
    "Tarjeta 4111111111111112 (no pasa Luhn)",
    "DNI 12345678A (letra incorrecta)",
    "el codigo 28013 suelto",
    "Uso Residencial",
])
def test_no_se_dispara_con_texto_corriente(text):
    assert labels_in(text) == set()


def test_el_iban_voraz_se_recorta_hasta_validar():
    text = "IBAN ES91 2100 0418 4502 0005 1332 BANCO"
    span = next(s for r in RECOGNIZERS if r.label == p.IBAN for s in r.find(text))
    assert text[span.start:span.end] == "ES91 2100 0418 4502 0005 1332"


def test_un_match_invalido_sin_separadores_se_descarta():
    recognizer = RegexRecognizer("X", p.CARD_PATTERN, 0.9, p.luhn_ok)
    assert list(recognizer.find("4111111111111112")) == []


def test_span_solape_y_longitud():
    a, b, c = Span(0, 5, "A", 1, "x"), Span(4, 8, "B", 1, "x"), Span(5, 9, "C", 1, "x")
    assert a.overlaps(b) and not a.overlaps(c)
    assert a.length == 5
