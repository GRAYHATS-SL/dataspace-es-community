"""Politicas: sintaxis de rutas, validacion y carga de ficheros."""

from __future__ import annotations

import pytest

from data_anonymizer.core.policy import (
    Action,
    Policy,
    PolicyError,
    Segment,
    load_policies,
    match_path,
    parse_path,
)

from .conftest import POLICIES


def match(pattern: str, *path) -> bool:
    return match_path(parse_path(pattern), tuple(path))


def test_parse_path():
    assert parse_path('$.a["x.y"][*][0].b') == (
        Segment("key", "a"), Segment("key", "x.y"), Segment("index", "*"), Segment("index", 0),
        Segment("key", "b"),
    )
    assert parse_path("**.email")[0].kind == "any"


@pytest.mark.parametrize("bad", ["", "$", "a[", "a]"])
def test_rutas_invalidas(bad):
    with pytest.raises(PolicyError):
        parse_path(bad)


@pytest.mark.parametrize("pattern, path, ok", [
    ("cliente.email", ("cliente", "email"), True),
    ("cliente.email", ("cliente", "nombre"), False),
    ("cliente.email", ("otro", "cliente", "email"), False),
    ("**.email", ("email",), True),
    ("**.email", ("a", "b", 3, "email"), True),
    ("a.**", ("a", "b", "c"), True),
    ("pedidos.tarjeta", ("pedidos", 3, "tarjeta"), True),
    ("pedidos[*].tarjeta", ("pedidos", 3, "tarjeta"), True),
    ("pedidos[0].tarjeta", ("pedidos", 0, "tarjeta"), True),
    ("pedidos[0].tarjeta", ("pedidos", 1, "tarjeta"), False),
    ("pedidos[0]", ("pedidos",), False),
    ("cliente.*", ("cliente", "x"), True),
    ("cliente.*", ("cliente",), False),
])
def test_match_path(pattern, path, ok):
    assert match(pattern, *path) is ok


def test_gana_la_primera_regla():
    policy = Policy.from_mapping({"fields": [
        {"path": "cliente.email", "action": "keep"},
        {"path": "**.email", "action": "redact"},
    ]})
    assert policy.rule_for(("cliente", "email")).action is Action.KEEP
    assert policy.rule_for(("otro", "email")).action is Action.REDACT
    assert policy.rule_for(("nada",)) is None
    assert not policy.index_sensitive


def test_index_sensitive():
    assert Policy.from_mapping({"fields": [{"path": "a[2]", "action": "drop"}]}).index_sensitive


@pytest.mark.parametrize("data, message", [
    ({"fields": [{"path": "a", "action": "nope"}]}, "fields.0.action"),
    ({"fields": [{"path": "a[", "action": "keep"}]}, "fields.0.path"),
    ({"fields": [{"path": "a", "action": "keep", "inventado": 1}]}, "inventado"),
    ({"detection": {"entities": ["NOMBRE", "OVNI"]}}, "OVNI"),
    ({"detection": {"label_format": "<<>>"}}, "label_format"),
    ({"defaults": {"strings": "quemar"}}, "defaults.strings"),
    ("no soy un objeto", "objeto"),
])
def test_errores_con_mensaje_util(data, message):
    with pytest.raises(PolicyError, match=message):
        Policy.from_mapping(data, source="prueba.yaml")


def test_carga_las_politicas_del_repositorio():
    policies = load_policies(POLICIES)
    assert {"auto", "ejemplo", "estricta"} <= set(policies)
    assert policies["ejemplo"].name == "ejemplo"
    assert policies["estricta"].defaults.strings == "redact"


def test_yaml_invalido(tmp_path):
    (tmp_path / "rota.yaml").write_text("fields: [", "utf-8")
    with pytest.raises(PolicyError, match="YAML invalido"):
        load_policies(tmp_path)


def test_directorio_inexistente(tmp_path):
    with pytest.raises(PolicyError):
        load_policies(tmp_path / "no-existe")


def test_yaml_vacio_es_la_politica_por_defecto(tmp_path):
    (tmp_path / "vacia.yml").write_text("", "utf-8")
    policy = load_policies(tmp_path)["vacia"]
    assert policy.defaults.strings == "detect" and policy.fields == []
