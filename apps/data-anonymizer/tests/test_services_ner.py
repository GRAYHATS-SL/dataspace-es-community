"""Arranque del servicio (configuracion, politicas) y adaptador de spaCy."""

from __future__ import annotations

import logging
import sys
from types import SimpleNamespace

import pytest

from data_anonymizer.config import EXAMPLE_SECRET, Settings
from data_anonymizer.core.policy import PolicyError
from data_anonymizer.pii import ner as ner_module
from data_anonymizer.pii.ner import SpacyNer, load_spacy
from data_anonymizer.services import build_services

from .conftest import POLICIES


def settings(**overrides) -> Settings:
    base = {"anon_secret": "s", "policies_dir": POLICIES, "_env_file": None}
    return Settings(**{**base, **overrides})


# ─────────────────────────────────────────────────────────── servicios
def test_secreto_vacio_genera_uno_efimero(caplog):
    with caplog.at_level(logging.WARNING):
        services = build_services(settings(anon_secret=""))
    assert services.ephemeral_secret and "ANON_SECRET" in caplog.text


def test_secreto_de_ejemplo_avisa(caplog):
    with caplog.at_level(logging.WARNING):
        build_services(settings(anon_secret=EXAMPLE_SECRET))
    assert "valor de ejemplo" in caplog.text


def test_sin_directorio_de_politicas_queda_auto(tmp_path):
    services = build_services(settings(policies_dir=tmp_path / "nada"))
    assert list(services.policies) == ["auto"]


def test_politica_por_defecto_inexistente():
    with pytest.raises(PolicyError, match="DEFAULT_POLICY"):
        build_services(settings(default_policy="nope"))


def test_politica_que_exige_ner_sin_modelo(tmp_path):
    (tmp_path / "ner.yaml").write_text("detection:\n  ner: 'on'\n", "utf-8")
    with pytest.raises(PolicyError, match="exige NER"):
        build_services(settings(policies_dir=tmp_path))


def test_motor_por_politica_se_reutiliza():
    services = build_services(settings())
    assert services.engine(None) is services.engine("auto")
    with pytest.raises(KeyError):
        services.engine("nope")


def test_propiedades_de_configuracion():
    s = settings(api_keys=" a, ,b ", cors_origins="x, y", max_upload_mb=1, max_json_mb=2)
    assert s.api_key_set == {"a", "b"} and s.cors_origin_list == ["x", "y"]
    assert s.max_upload_bytes == 1024 * 1024 and s.max_json_bytes == 2 * 1024 * 1024
    assert settings(anon_secret="").secret_is_insecure


# ───────────────────────────────────────────────────────────────── NER
def fake_nlp(entities):
    def nlp(text):
        return SimpleNamespace(ents=[SimpleNamespace(text=t, label_=label, start_char=text.index(t))
                                     for t, label in entities])
    return nlp


def test_adaptador_spacy_y_filtros_de_ruido():
    text = "Hola, Gómez llamó. Laura vino desde Sevilla. Pago en EUR a Telefónica X."
    nlp = fake_nlp([("Hola", "PER"), ("Gómez", "PER"), ("Laura", "PER"), ("Sevilla", "LOC"),
                    ("EUR", "ORG"), ("Telefónica X.", "ORG"), ("X", "MISC"), ("a", "PER")])
    ner = SpacyNer(nlp, name="falso", first_names=frozenset({"laura"}))
    found = [(text[s.start:s.end], s.label) for s in ner.find(text)]
    assert found == [("Gómez", "NOMBRE"), ("Laura", "NOMBRE"), ("Sevilla", "LUGAR"),
                     ("Telefónica X", "ORGANIZACION")]
    assert list(ner.find("   ")) == []


def test_una_sola_palabra_a_inicio_de_frase_no_es_persona():
    ner = SpacyNer(fake_nlp([("Gracias", "PER"), ("Martínez", "PER")]), name="f")
    assert list(ner.find("Gracias. Martínez")) == []


def test_load_spacy_sin_modelo_o_sin_paquete(monkeypatch, caplog):
    assert load_spacy("") is None
    with caplog.at_level(logging.WARNING):
        assert load_spacy("modelo_que_no_existe_xx") is None
    monkeypatch.setitem(sys.modules, "spacy", None)  # simula que no esta instalado
    with caplog.at_level(logging.WARNING):
        assert load_spacy("es_core_news_sm") is None
    assert "no esta instalado" in caplog.text


def test_build_services_con_ner_inyectado():
    ner = SpacyNer(fake_nlp([]), name="falso")
    services = build_services(settings(), ner=ner)
    assert services.detector.ner is ner


@pytest.mark.ner
def test_modelo_real_de_spacy():
    pytest.importorskip("spacy", reason="spaCy no instalado")
    if ner_module.load_spacy("es_core_news_sm", frozenset()) is None:
        pytest.skip("modelo es_core_news_sm no descargado")
    services = build_services(settings(ner_model="es_core_news_sm"))
    text, spans = services.engine("auto").anonymize_text("Ayer Gómez llamó desde Sevilla.")
    assert "Gómez" not in text and "Sevilla" not in text
    assert {s.label for s in spans} >= {"LUGAR"}
