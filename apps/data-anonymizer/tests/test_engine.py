"""Motor JSON: reglas, pistas por clave, valores por defecto e informe."""

from __future__ import annotations

import json

import pytest

from data_anonymizer.core.policy import Policy

from .conftest import POLICIES, ROOT

EXAMPLE = json.loads((ROOT / "examples" / "clientes.json").read_text("utf-8"))


def run(make_engine, policy: dict, data):
    return make_engine(policy).anonymize(data)[0]


# ────────────────────────────────────────────────────────────── acciones
def test_keep_drop_redact_replace(make_engine):
    policy = {"fields": [
        {"path": "a", "action": "keep"},
        {"path": "b", "action": "drop"},
        {"path": "c", "action": "redact", "label": "SECRETO"},
        {"path": "d", "action": "replace", "value": None},
        {"path": "e", "action": "redact"},
    ]}
    data = {"a": "Laura Gómez", "b": "x", "c": "y", "d": "z", "e": None}
    assert run(make_engine, policy, data) == {"a": "Laura Gómez", "c": "[SECRETO]", "d": None, "e": None}


def test_drop_en_lista_quita_el_elemento(make_engine):
    policy = {"fields": [{"path": "tags[1]", "action": "drop"}]}
    assert run(make_engine, policy, {"tags": ["a", "b", "c"]}) == {"tags": ["a", "c"]}


def test_redact_sobre_un_objeto_lo_sustituye_entero(make_engine):
    policy = {"fields": [{"path": "interno", "action": "redact"}]}
    assert run(make_engine, policy, {"interno": {"x": 1}}) == {"interno": "[REDACTADO]"}


def test_pseudo_es_determinista_y_separa_namespaces(make_engine):
    policy = {"fields": [
        {"path": "a", "action": "pseudo", "prefix": "CLI-"},
        {"path": "b", "action": "pseudo", "prefix": "CLI-"},
        {"path": "c", "action": "pseudo", "prefix": "CLI-", "namespace": "otro"},
        {"path": "d", "action": "pseudo", "length": 12},
    ]}
    out = run(make_engine, policy, {"a": "Laura", "b": "Laura", "c": "Laura", "d": 42})
    assert out["a"] == out["b"] != out["c"]
    assert out["a"].startswith("CLI-") and len(out["a"]) == 4 + 8
    assert len(out["d"]) == 12


def test_pseudo_id_conserva_la_estructura(make_engine):
    policy = {"fields": [{"path": "id", "action": "pseudo_id", "preserve": ["cli"]}]}
    out = run(make_engine, policy, {"id": "cli-laura-gomez-000123"})["id"]
    prefix, _a, _b, number = out.split("-")
    assert (prefix, number) == ("cli", "000123") and "laura" not in out.lower()


def test_hash(make_engine):
    policy = {"fields": [{"path": "dni", "action": "hash", "length": 16},
                         {"path": "x", "action": "hash"}]}
    out = run(make_engine, policy, {"dni": "12345678Z", "x": "a"})
    assert len(out["dni"]) == 16 and int(out["dni"], 16) >= 0
    assert len(out["x"]) == 64


def test_mask(make_engine):
    policy = {"fields": [{"path": "t", "action": "mask", "keep_end": 4},
                         {"path": "n", "action": "mask", "keep_start": 1, "mask_char": "#"}]}
    out = run(make_engine, policy, {"t": "4111 1111 1111 1234", "n": "Laura"})
    assert out == {"t": "**** **** **** 1234", "n": "L####"}


def test_round_y_date(make_engine):
    policy = {"fields": [
        {"path": "geo", "action": "round", "decimals": 1},
        {"path": "nac", "action": "date", "precision": "month"},
        {"path": "rara", "action": "date"},
    ]}
    out = run(make_engine, policy, {"geo": [37.888213, -4.779412], "nac": "12/04/1985", "rara": "ayer"})
    assert out == {"geo": [37.9, -4.8], "nac": "1985-04", "rara": "[FECHA]"}


def test_detect_explicito_y_sobre_objetos(make_engine):
    policy = {"defaults": {"strings": "keep"},
              "fields": [{"path": "notas", "action": "detect"}]}
    out = run(make_engine, policy, {"notas": {"a": "mail: x@y.com", "n": 3}, "otro": "x@y.com"})
    assert out == {"notas": {"a": "mail: [EMAIL]", "n": 3}, "otro": "x@y.com"}


# ───────────────────────────────────────────────────── valores por defecto
@pytest.mark.parametrize("strings, expected", [
    ("keep", {"t": "Laura Gómez llamó"}),
    ("redact", {"t": "[REDACTADO]"}),
    ("drop", {}),
    ("detect", {"t": "[NOMBRE] llamó"}),
])
def test_defaults_strings(make_engine, strings, expected):
    assert run(make_engine, {"defaults": {"strings": strings}}, {"t": "Laura Gómez llamó"}) == expected


def test_defaults_numeros_y_booleanos(make_engine):
    policy = {"defaults": {"numbers": "redact", "booleans": "drop"}}
    assert run(make_engine, policy, {"n": 3, "b": True, "z": None}) == {"n": "[REDACTADO]", "z": None}


def test_valores_raros_se_dejan(make_engine):
    assert run(make_engine, {}, [None, 1.5, True]) == [None, 1.5, True]


# ─────────────────────────────────────────────────────── pistas por clave
def test_pistas_por_clave(make_engine):
    data = {"email": "no-parece-un-email", "telefono": 957, "lat": 37.888213, "lng": "-4.779412",
            "latitude": "norte", "fechaNacimiento": "1985-04-12", "birthdate": "desconocida",
            "password": "hunter2", "name": "Sensor Almacén Norte", "contacto": "GÓMEZ RUIZ, LAURA",
            "apellidos": "", "email_ok": True}
    out = run(make_engine, {}, data)
    assert out == {
        "email": "[EMAIL]", "telefono": "[TELEFONO]", "lat": 37.89, "lng": "-4.78",
        "latitude": "norte", "fechaNacimiento": "1985", "birthdate": "[FECHA_NAC]",
        "password": "[SECRETO]", "name": "Sensor Almacén Norte", "contacto": "[NOMBRE]",
        "apellidos": "", "email_ok": True,
    }


def test_las_listas_heredan_la_clave_del_padre(make_engine):
    out = run(make_engine, {}, {"emails": ["a@b.com", "c"], "coordinates": [37.888213, -4.779412]})
    assert out == {"emails": ["[EMAIL]", "[EMAIL]"], "coordinates": [37.89, -4.78]}


def test_pistas_desactivables(make_engine):
    out = run(make_engine, {"defaults": {"key_hints": False}}, {"email": "no-parece-un-email"})
    assert out == {"email": "no-parece-un-email"}


def test_una_regla_explicita_manda_sobre_la_pista(make_engine):
    out = run(make_engine, {"fields": [{"path": "email", "action": "keep"}]}, {"email": "a@b.com"})
    assert out == {"email": "a@b.com"}


# ────────────────────────────────────────────────────────── sustitutos
def test_estilo_pseudo_es_estable(make_engine):
    engine = make_engine({"detection": {"replacement": "pseudo"}})
    a, _ = engine.anonymize({"t": "Llamar a Laura Gómez"})
    b, _ = engine.anonymize({"t": "laura  gómez", "contacto": "Laura Gómez"})
    alias = a["t"].removeprefix("Llamar a ")
    assert alias.startswith("NOMBRE-") and b["contacto"] == alias


def test_estilo_mask(make_engine):
    out = run(make_engine, {"detection": {"replacement": "mask"}}, {"t": "Soy Laura Gómez"})
    assert out == {"t": "Soy L**** G****"}


def test_label_format(make_engine):
    out = run(make_engine, {"detection": {"label_format": "<{label}>"}}, {"email": "a@b.com"})
    assert out == {"email": "<EMAIL>"}


def test_nombres_desactivados_no_usan_el_valor_completo(make_engine):
    policy = {"detection": {"entities": ["EMAIL"]}}
    assert run(make_engine, policy, {"x": "GÓMEZ RUIZ, LAURA"}) == {"x": "GÓMEZ RUIZ, LAURA"}


# ──────────────────────────────────────────────────── informe y ejemplos
def test_el_informe_cuenta_sin_guardar_valores(make_engine):
    _, report = make_engine({}).anonymize({"email": "a@b.com", "t": "hola", "n": "Laura Gómez llamó"})
    summary = report.as_dict()
    assert summary["entities"] == {"EMAIL": 1, "NOMBRE": 1}
    assert summary["changed_values"] == 2
    assert "a@b.com" not in json.dumps(summary)


def test_raiz_eliminada_devuelve_none(make_engine):
    assert run(make_engine, {"defaults": {"strings": "drop"}}, "texto") is None


def test_cache_de_reglas_con_indices(make_engine):
    engine = make_engine({"fields": [{"path": "l[0]", "action": "redact"}]})
    assert engine.anonymize({"l": ["a", "b"]})[0] == {"l": ["[REDACTADO]", "b"]}
    assert engine.anonymize({"l": ["c", "d"]})[0] == {"l": ["[REDACTADO]", "d"]}


def test_politica_de_ejemplo_sobre_el_json_de_ejemplo(detector, pseudo):
    from data_anonymizer.core.engine import JsonAnonymizer

    engine = JsonAnonymizer(Policy.from_file(POLICIES / "ejemplo.yaml"), pseudo, detector)
    out, _ = engine.anonymize(EXAMPLE)
    text = json.dumps(out, ensure_ascii=False)
    for leak in ("Laura", "Gómez", "laura.gomez", "612 345", "12345678Z", "Calle Mayor",
                 "Alberto", "192.168", "soporte@", "Proyecto Atlas", "jperez", "1985-04"):
        assert leak not in text, leak
    assert out["cliente"]["id"] == out["pedidos"][0]["clienteId"]  # cruzables
    assert out["pedidos"][0]["tarjeta"] == "**** **** **** 1111"
    assert out["pedidos"][0]["estado"] == "enviado"
    assert "interno" not in out


@pytest.mark.parametrize("name", ["auto", "estricta"])
def test_politicas_incluidas_no_filtran_el_ejemplo(detector, pseudo, name):
    from data_anonymizer.core.engine import JsonAnonymizer

    engine = JsonAnonymizer(Policy.from_file(POLICIES / f"{name}.yaml"), pseudo, detector)
    text = json.dumps(engine.anonymize(EXAMPLE)[0], ensure_ascii=False)
    for leak in ("Laura", "laura.gomez", "612 345", "12345678Z", "Calle Mayor", "Alberto", "192.168"):
        assert leak not in text, (name, leak)


def test_anonymize_text(make_engine):
    text, spans = make_engine({}).anonymize_text("correo: a@b.com")
    assert text == "correo: [EMAIL]" and spans[0].label == "EMAIL"


def test_un_valor_que_es_una_persona_en_mayusculas(make_engine):
    out, report = make_engine({}).anonymize({"x": "GÓMEZ RUIZ, LAURA", "phone": True})
    assert out == {"x": "[NOMBRE]", "phone": True}
    assert report.entities["NOMBRE"] == 1


def test_la_cache_de_reglas_se_vacia_al_llenarse(make_engine, monkeypatch):
    monkeypatch.setattr("data_anonymizer.core.engine._RULE_CACHE_LIMIT", 2)
    engine = make_engine({"fields": [{"path": "**.e", "action": "redact"}]})
    data = {f"k{i}": {"e": "x"} for i in range(5)}
    assert engine.anonymize(data)[0] == {f"k{i}": {"e": "[REDACTADO]"} for i in range(5)}
    assert len(engine._rule_cache) <= 3
