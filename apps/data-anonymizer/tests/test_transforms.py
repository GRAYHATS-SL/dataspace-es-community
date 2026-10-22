"""Pseudonimizacion y transformaciones de valores sueltos."""

from __future__ import annotations

import pytest

from data_anonymizer.core.pseudonymize import Pseudonymizer
from data_anonymizer.core.transforms import is_numeric, mask, mask_words, round_value, truncate_date


# ───────────────────────────────────────────────────────── pseudonimos
def test_alias_determinista_y_dependiente_del_secreto():
    a, b = Pseudonymizer("uno"), Pseudonymizer("dos")
    assert a.alias("Laura") == a.alias("Laura") != b.alias("Laura")
    assert a.alias("Laura", namespace="x") != a.alias("Laura", namespace="y")
    assert a.alias("Laura", prefix="P-").startswith("P-")


@pytest.mark.parametrize("value", [None, "", "   "])
def test_alias_de_vacio(value):
    assert Pseudonymizer("s").alias(value) == ""


def test_parametros_invalidos():
    with pytest.raises(ValueError):
        Pseudonymizer("")
    with pytest.raises(ValueError):
        Pseudonymizer("s", alias_length=3)


def test_hexdigest():
    assert len(Pseudonymizer("s").hexdigest("x", length=10)) == 10


def test_pseudonymize_id():
    p = Pseudonymizer("s")
    out = p.pseudonymize_id("urn:example:Sensor:casa-laura-07", preserve=("urn", "example", "Sensor"))
    assert out.startswith("urn:example:Sensor:") and out.endswith("-07") and "laura" not in out
    assert p.pseudonymize_id("") == ""
    assert p.pseudonymize_id("abc", separators="") == p.token("abc", namespace="id:segment")


# ────────────────────────────────────────────────────────── transformar
def test_mask():
    assert mask("4111 1111 1111 1234", keep_end=4) == "**** **** **** 1234"
    assert mask("Laura Gómez", keep_start=1, char="#") == "L#### #####"
    assert mask("", keep_end=2) == ""


def test_mask_words():
    assert mask_words("Laura Gómez") == "L**** G****"


@pytest.mark.parametrize("value, decimals, expected", [
    (37.888213, 2, 37.89), (37.888213, 0, 38), ("-4.779412", 2, "-4.78"), ("12", 0, "12"),
    (True, 2, True), ("norte", 2, "norte"), (None, 2, None),
])
def test_round_value(value, decimals, expected):
    assert round_value(value, decimals) == expected


def test_is_numeric():
    assert is_numeric(3) and is_numeric("3.5") and not is_numeric(True) and not is_numeric("x")


@pytest.mark.parametrize("value, precision, expected", [
    ("1985-04-12", "year", "1985"),
    ("1985-04-12T10:00:00Z", "month", "1985-04"),
    ("1985-04-12 10:00:00+02:00", "day", "1985-04-12"),
    ("12/04/1985", "day", "1985-04-12"),
    ("1985", "day", "1985"),
    ("1985-04", "day", "1985-04"),
    ("1985-13-01", "year", None),
    ("ayer", "year", None),
    (19850412, "year", None),
])
def test_truncate_date(value, precision, expected):
    assert truncate_date(value, precision) == expected
