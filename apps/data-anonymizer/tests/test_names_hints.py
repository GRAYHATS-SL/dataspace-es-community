"""Diccionario de nombres de pila y pistas por nombre de clave."""

from __future__ import annotations

import pytest

from data_anonymizer.pii.hints import hint_for_key, normalize_key
from data_anonymizer.pii.names import NameRecognizer, fold, load_first_names


def test_fold():
    assert fold("JOSÉ Ñoño") == "jose nono"


def test_la_lista_incluye_nombres_con_y_sin_tilde(first_names):
    assert {"jose", "maria", "laura", "inaki"} <= first_names


def test_fichero_extra_de_nombres(tmp_path):
    extra = tmp_path / "extra.txt"
    extra.write_text("# comentario\nZebedeo\n\n", "utf-8")
    names = load_first_names(str(extra))
    assert "zebedeo" in names and "laura" in names


@pytest.mark.parametrize("text, found", [
    ("Ayer Laura Gómez llamó", "Laura Gómez"),
    ("Escribió María de la Fuente", "María de la Fuente"),
    ("Firmado: John Smith", "John Smith"),
])
def test_nombre_mas_apellido(first_names, text, found):
    spans = list(NameRecognizer(first_names).find(text))
    assert [text[s.start:s.end] for s in spans] == [found]


@pytest.mark.parametrize("text", [
    "Hoy María fue al mercado",       # nombre suelto: no basta
    "Uso Residencial Plurifamiliar",  # capitalizado pero sin nombre de pila
    "laura gomez",                    # sin mayusculas no se puede saber
])
def test_no_marca_sin_nombre_y_apellido(first_names, text):
    assert list(NameRecognizer(first_names).find(text)) == []


@pytest.mark.parametrize("value, person", [
    ("Laura Gómez Ruiz", True), ("GÓMEZ RUIZ, LAURA", True), ("Sensor Almacén Norte", False),
    ("Laura", False), ("Laura Gómez 2", False), ("laura gómez", False), ("", False), (None, False),
    ("Laura de la", False), ("A " * 50, False),
])
def test_looks_like_person(first_names, value, person):
    assert NameRecognizer(first_names).looks_like_person(value) is person


@pytest.mark.parametrize("key, normalized", [
    ("first_name", "firstname"), ("First-Name", "firstname"), ("fechaNacimiento", "fechanacimiento"),
    ("Teléfono", "telefono"),
])
def test_normalize_key(key, normalized):
    assert normalize_key(key) == normalized


@pytest.mark.parametrize("key, label, strong", [
    ("email", "EMAIL", True), ("customerEmail", "EMAIL", True), ("apellidos", "NOMBRE", True),
    ("name", "NOMBRE", False), ("contacto", "NOMBRE", False), ("iban", "IBAN", True),
    ("lat", "COORDENADAS", True), ("fecha_nacimiento", "FECHA_NAC", True),
    ("password", "SECRETO", True), ("billing_address", "DIRECCION", True),
])
def test_pistas(key, label, strong):
    hint = hint_for_key(key)
    assert hint is not None and (hint.label, hint.strong) == (label, strong)


@pytest.mark.parametrize("key", ["importe", "estado", "", None, 3, "emailVerified", "hostname", "--"])
def test_claves_que_no_son_pista(key):
    assert hint_for_key(key) is None
