"""API HTTP de extremo a extremo con TestClient."""

from __future__ import annotations

import json

import pytest
from fastapi.testclient import TestClient

from data_anonymizer.config import Settings
from data_anonymizer.main import create_app

from .conftest import POLICIES, ROOT, exif_with_gps, image_bytes

EXAMPLE = (ROOT / "examples" / "clientes.json").read_bytes()


def settings(**overrides) -> Settings:
    base = {"anon_secret": "secreto-api", "policies_dir": POLICIES, "default_policy": "auto",
            "ner_model": "", "_env_file": None}
    return Settings(**{**base, **overrides})


@pytest.fixture
def client() -> TestClient:
    return TestClient(create_app(settings()))


@pytest.fixture
def secured() -> TestClient:
    return TestClient(create_app(settings(api_keys="clave-1, clave-2")))


# ─────────────────────────────────────────────────────────────── infra
def test_health(client):
    body = client.get("/health").json()
    assert body["status"] == "ok" and body["stable_aliases"] is True
    assert body["ner"] == {"active": False, "model": None}
    assert {"auto", "ejemplo", "estricta"} <= set(body["policies"])


def test_cabeceras_de_privacidad(client):
    response = client.get("/health")
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["x-content-type-options"] == "nosniff"


def test_politicas(client):
    listing = client.get("/v1/policies").json()
    assert next(p for p in listing if p["name"] == "auto")["default"] is True
    detail = client.get("/v1/policies/ejemplo").json()
    assert detail["detection"]["replacement"] == "pseudo"
    assert client.get("/v1/policies/nope").status_code == 404


def test_swagger(client):
    spec = client.get("/openapi.json").json()
    assert {"/v1/json", "/v1/text", "/v1/file", "/v1/file/inspect"} <= set(spec["paths"])
    assert client.get("/docs").status_code == 200


def test_docs_desactivables():
    app = TestClient(create_app(settings(docs_enabled=False, public_url="https://x.example")))
    assert app.get("/docs").status_code == 404
    assert app.get("/openapi.json").status_code == 404


# ──────────────────────────────────────────────────────────────── json
def test_json_con_politica_por_defecto(client):
    response = client.post("/v1/json", content=EXAMPLE, headers={"content-type": "application/json"})
    assert response.status_code == 200 and response.headers["x-policy"] == "auto"
    text = response.text
    assert "Laura" not in text and "612 345" not in text and "ES91" not in text


def test_json_con_politica_e_informe(client):
    response = client.post("/v1/json?policy=ejemplo&report=true", content=EXAMPLE)
    body = response.json()
    assert set(body) == {"data", "report"}
    assert body["report"]["changed_values"] > 5
    assert "interno" not in body["data"]


def test_json_alias_estables_entre_peticiones(client):
    first = client.post("/v1/json?policy=ejemplo", content=EXAMPLE).json()
    second = client.post("/v1/json?policy=ejemplo", content=EXAMPLE).json()
    assert first == second


@pytest.mark.parametrize("body, status", [(b"{malo", 400), (b"\xff\xfe", 400)])
def test_json_invalido(client, body, status):
    assert client.post("/v1/json", content=body).status_code == status


def test_json_politica_inexistente(client):
    response = client.post("/v1/json?policy=nope", content=b"{}")
    assert response.status_code == 404 and "Disponibles" in response.json()["detail"]


def test_json_demasiado_grande():
    small = TestClient(create_app(settings(max_json_mb=0.0001)))
    big = json.dumps({"x": "a" * 500}).encode()
    assert small.post("/v1/json", content=big).status_code == 413

    def chunks():  # sin Content-Length: se corta al leer
        yield big

    assert small.post("/v1/json", content=chunks()).status_code == 413
    assert small.post("/v1/text", json={"text": "a" * 500}).status_code == 413


# ──────────────────────────────────────────────────────────────── texto
def test_texto(client):
    response = client.post("/v1/text", json={"text": "Soy Laura Gómez, laura@example.com"})
    body = response.json()
    assert body["text"] == "Soy [NOMBRE], [EMAIL]"
    assert [(e["label"], e["start"], e["end"]) for e in body["entities"]] == [
        ("NOMBRE", 4, 15), ("EMAIL", 17, 34)]


def test_texto_con_politica(client):
    body = client.post("/v1/text", json={"text": "Soy Laura Gómez", "policy": "ejemplo"}).json()
    assert body["text"].startswith("Soy NOMBRE-")


# ───────────────────────────────────────────────────────────── archivos
def test_limpiar_archivo(client):
    data = image_bytes("JPEG", exif=exif_with_gps())
    response = client.post("/v1/file", files={"file": ("foto de Laura.jpg", data, "image/jpeg")})
    assert response.status_code == 200
    assert response.headers["x-file-type"] == "jpeg"
    assert int(response.headers["x-metadata-removed"]) >= 5
    assert 'filename="anonimizado.jpg"' in response.headers["content-disposition"]
    assert b"Canon" not in response.content
    again = client.post("/v1/file/inspect", files={"file": ("x", response.content)}).json()
    assert again["findings"] == []


def test_inspeccionar_archivo(client):
    data = image_bytes("JPEG", exif=exif_with_gps())
    body = client.post("/v1/file/inspect", files={"file": ("x.jpg", data)}).json()
    assert body["type"] == "jpeg" and "GPS.GPSLatitude" in body["findings"]


def test_archivo_no_soportado_vacio_y_grande(client):
    assert client.post("/v1/file", files={"file": ("a.txt", b"hola")}).status_code == 415
    assert client.post("/v1/file", files={"file": ("a.txt", b"")}).status_code == 422
    small = TestClient(create_app(settings(max_upload_mb=0.0001)))
    assert small.post("/v1/file", files={"file": ("a.jpg", b"\xff" * 2000)}).status_code == 413


def test_archivo_corrupto(client):
    response = client.post("/v1/file", files={"file": ("a.jpg", b"\xff\xd8\xff\xe0\x00")})
    assert response.status_code == 422 and "detail" in response.json()


# ──────────────────────────────────────────────────────── autenticacion
@pytest.mark.parametrize("headers, status", [
    ({}, 401), ({"X-API-Key": "mala"}, 401), ({"X-API-Key": "clave-2"}, 200),
])
def test_api_key(secured, headers, status):
    assert secured.post("/v1/text", json={"text": "hola"}, headers=headers).status_code == status


def test_health_no_exige_clave(secured):
    assert secured.get("/health").status_code == 200


def test_cors():
    app = TestClient(create_app(settings(cors_origins="https://app.example")))
    response = app.options("/v1/text", headers={"Origin": "https://app.example",
                                                "Access-Control-Request-Method": "POST"})
    assert response.headers["access-control-allow-origin"] == "https://app.example"


def test_app_perezosa(monkeypatch, tmp_path):
    import data_anonymizer.main as main_module

    monkeypatch.chdir(tmp_path)  # sin .env ni carpeta policies: solo 'auto'
    monkeypatch.setenv("ANON_SECRET", "x")
    from data_anonymizer.config import get_settings

    get_settings.cache_clear()
    try:
        assert main_module.app.title == "data-anonymizer"
        with pytest.raises(AttributeError):
            main_module.no_existe  # noqa: B018
    finally:
        main_module.__dict__.pop("app", None)
        get_settings.cache_clear()
