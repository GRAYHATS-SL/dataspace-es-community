"""API HTTP del anonimizador.

Arranque::

    uvicorn data_anonymizer.main:app --port 8080

Documentacion interactiva en ``/docs`` (Swagger) y ``/redoc``.
"""

from __future__ import annotations

import hmac
import json
import logging
from typing import Annotated, Any

from fastapi import Depends, FastAPI, File, HTTPException, Query, Request, Security, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from . import __version__
from .config import Settings, get_settings
from .media.base import MediaError
from .media.service import SUPPORTED
from .services import Services, build_services

log = logging.getLogger("data_anonymizer")

DESCRIPTION = """
Servicio para anonimizar datos **antes** de compartirlos: JSON, texto libre y
metadatos de archivos. No llama a ningún servicio externo ni guarda nada: lo
que entra se procesa en memoria y se devuelve.

**Tres modos de uso**

| Endpoint | Qué hace |
|---|---|
| `POST /v1/json` | Anonimiza un JSON según una política (`?policy=`). Con `auto`, sin configurar nada. |
| `POST /v1/text` | Busca y sustituye PII en texto libre. Devuelve también dónde estaba. |
| `POST /v1/file` | Elimina los metadatos de una imagen, PDF, audio o vídeo. |

**Qué se detecta en texto:** nombres de persona, direcciones, emails,
teléfonos, IBAN (con dígito de control), tarjetas (Luhn), DNI/NIE (con letra
de control), IP, URL, matrículas, códigos postales con contexto y coordenadas.
Con un modelo NER de spaCy (`NER_MODEL`), además lugares y organizaciones.

**Autenticación.** Si el despliegue define `API_KEYS`, las rutas `/v1/*`
exigen la cabecera `X-API-Key` (botón **Authorize**). `/health` queda abierto.
"""

EXAMPLE_JSON = {
    "cliente": {
        "id": "cli-000123",
        "nombre": "Laura Gómez Ruiz",
        "email": "laura.gomez@example.com",
        "telefono": "+34 612 345 678",
        "direccion": "Calle Mayor 12, 3º B, 28013 Madrid",
        "fechaNacimiento": "1985-04-12",
        "lat": 40.416775,
        "lng": -3.703790,
    },
    "notas": "Llamar a D. Alberto Ruiz al 612 345 678. IBAN ES91 2100 0418 4502 0005 1332.",
    "pedidos": [{"importe": 59.9, "tarjeta": "4111 1111 1111 1111", "estado": "enviado"}],
}

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False,
                              description="Solo si el despliegue define API_KEYS.")


class TextIn(BaseModel):
    text: str = Field(..., examples=["Soy Laura Gómez, mi móvil es 612 345 678 y vivo en C/ Mayor 12."])
    policy: str | None = Field(None, description="Política cuya configuración de detección se usa.")


class EntityOut(BaseModel):
    label: str
    start: int
    end: int
    score: float
    source: str


class TextOut(BaseModel):
    text: str
    entities: list[EntityOut]


class ErrorOut(BaseModel):
    detail: str


ERRORS: dict[int | str, dict[str, Any]] = {
    401: {"model": ErrorOut, "description": "Falta `X-API-Key` o no es válida."},
}


def create_app(settings: Settings | None = None, services: Services | None = None) -> FastAPI:
    settings = settings or get_settings()
    logging.basicConfig(level=settings.log_level.upper())
    services = services or build_services(settings)
    keys = settings.api_key_set
    if not keys:
        log.warning("API_KEYS vacio: la API no exige autenticacion.")

    app = FastAPI(
        title="data-anonymizer",
        version=__version__,
        summary="Anonimización configurable de JSON, texto libre y metadatos de archivos",
        description=DESCRIPTION,
        servers=[{"url": settings.public_url.rstrip("/")}] if settings.public_url.strip() else None,
        docs_url="/docs" if settings.docs_enabled else None,
        redoc_url="/redoc" if settings.docs_enabled else None,
        openapi_url="/openapi.json" if settings.docs_enabled else None,
        openapi_tags=[
            {"name": "json", "description": "JSON guiado por políticas."},
            {"name": "texto", "description": "Detección de PII en texto libre."},
            {"name": "archivos", "description": "Metadatos de imágenes, PDF, audio y vídeo."},
            {"name": "infra", "description": "Estado del servicio."},
        ],
    )
    app.state.services = services

    if settings.cors_origin_list:
        app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origin_list,
                           allow_methods=["GET", "POST"], allow_headers=["*"],
                           expose_headers=["X-Metadata-Removed", "X-File-Type", "X-Policy"])

    @app.middleware("http")
    async def privacy_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response

    @app.exception_handler(MediaError)
    async def media_error(_request: Request, exc: MediaError):
        return JSONResponse(status_code=exc.status, content={"detail": str(exc)})

    def require_key(key: Annotated[str | None, Security(api_key_header)] = None) -> None:
        if not keys:
            return
        if not key or not any(hmac.compare_digest(key, k) for k in keys):
            raise HTTPException(401, "X-API-Key ausente o invalida")

    def engine_for(name: str | None):
        try:
            return services.engine(name)
        except KeyError:
            raise HTTPException(404, f"No existe la politica '{name}'. "
                                     f"Disponibles: {sorted(services.policies)}") from None

    protected = [Depends(require_key)]

    # ───────────────────────────────────────────────────────────── infra
    @app.get("/health", tags=["infra"], summary="Estado del servicio")
    def health() -> dict[str, Any]:
        detector = services.detector
        return {
            "status": "ok",
            "version": __version__,
            "ner": {"active": detector.ner is not None,
                    "model": getattr(detector.ner, "name", None)},
            "ffmpeg": services.media.ffmpeg.available,
            "policies": sorted(services.policies),
            "stable_aliases": not services.ephemeral_secret,
        }

    @app.get("/v1/policies", tags=["json"], dependencies=protected, responses=ERRORS,
             summary="Políticas disponibles")
    def list_policies() -> list[dict[str, Any]]:
        return [{"name": name, "description": p.description, "rules": len(p.fields),
                 "default": name == settings.default_policy}
                for name, p in sorted(services.policies.items())]

    @app.get("/v1/policies/{name}", tags=["json"], dependencies=protected, responses=ERRORS,
             summary="Detalle de una política")
    def get_policy(name: str) -> dict[str, Any]:
        return engine_for(name).policy.model_dump(mode="json")

    # ─────────────────────────────────────────────────────────────── json
    @app.post(
        "/v1/json", tags=["json"], dependencies=protected,
        summary="Anonimizar un JSON",
        description=(
            "Envía el JSON tal cual en el cuerpo. Se devuelve con la misma forma y los datos "
            "personales sustituidos según la política. Con `report=true` la respuesta es "
            "`{\"data\": ..., \"report\": ...}` con el recuento de lo que se ha cambiado."
        ),
        responses={**ERRORS,
                   400: {"model": ErrorOut, "description": "El cuerpo no es JSON válido."},
                   404: {"model": ErrorOut, "description": "La política no existe."},
                   413: {"model": ErrorOut, "description": "Supera `MAX_JSON_MB`."}},
        openapi_extra={"requestBody": {"required": True, "content": {
            "application/json": {"schema": {}, "example": EXAMPLE_JSON}}}},
    )
    async def anonymize_json(
        request: Request,
        policy: Annotated[str | None, Query(description="Nombre de la política. Por defecto, "
                                                        "DEFAULT_POLICY.")] = None,
        report: Annotated[bool, Query(description="Incluir el resumen de cambios.")] = False,
    ) -> Response:
        engine = engine_for(policy)
        body = await _read_limited(request, settings.max_json_bytes)
        try:
            data = json.loads(body)
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise HTTPException(400, f"JSON invalido: {exc}") from None
        result, summary = await run_in_threadpool(engine.anonymize, data)
        payload = {"data": result, "report": summary.as_dict()} if report else result
        return JSONResponse(payload, headers={"X-Policy": engine.policy.name})

    # ────────────────────────────────────────────────────────────── texto
    @app.post("/v1/text", tags=["texto"], dependencies=protected, response_model=TextOut,
              summary="Anonimizar texto libre",
              responses={**ERRORS, 404: {"model": ErrorOut, "description": "La política no existe."}})
    async def anonymize_text(body: TextIn) -> TextOut:
        engine = engine_for(body.policy)
        if len(body.text.encode()) > settings.max_json_bytes:
            raise HTTPException(413, "Texto demasiado grande")
        text, spans = await run_in_threadpool(engine.anonymize_text, body.text)
        return TextOut(text=text, entities=[
            EntityOut(label=s.label, start=s.start, end=s.end, score=s.score, source=s.source)
            for s in spans
        ])

    # ──────────────────────────────────────────────────────────── archivos
    file_errors: dict[int | str, dict[str, Any]] = {
        **ERRORS,
        413: {"model": ErrorOut, "description": "Supera `MAX_UPLOAD_MB`."},
        415: {"model": ErrorOut, "description": f"Tipo no soportado. Soportados: {', '.join(SUPPORTED)}."},
        422: {"model": ErrorOut, "description": "Archivo corrupto o ilegible."},
        500: {"model": ErrorOut, "description": "La verificación posterior encontró metadatos: "
                                                "no se entrega el archivo."},
        501: {"model": ErrorOut, "description": "Falta ffmpeg para procesar vídeo."},
    }

    @app.post(
        "/v1/file", tags=["archivos"], dependencies=protected, responses={
            **file_errors,
            200: {"description": "El archivo sin metadatos.",
                  "content": {"application/octet-stream": {"schema": {"type": "string",
                                                                      "format": "binary"}}}},
        },
        response_class=Response, summary="Eliminar metadatos de un archivo",
        description=(
            "Detecta el tipo por el contenido (no por la extensión), elimina los metadatos y "
            "**verifica** el resultado antes de devolverlo. Cabeceras de respuesta: "
            "`X-File-Type`, `X-Metadata-Removed` (nº de campos eliminados)."
        ),
    )
    async def clean_file(file: Annotated[UploadFile, File(description="Imagen, PDF, audio o vídeo")]):
        data = await _read_upload(file, settings.max_upload_bytes)
        result = await run_in_threadpool(services.media.clean, data)
        return Response(
            content=result.data,
            media_type=result.kind.mime,
            headers={
                "Content-Disposition": f'attachment; filename="anonimizado.{result.kind.extension}"',
                "X-File-Type": result.kind.name,
                "X-Metadata-Removed": str(len(result.removed)),
            },
        )

    @app.post("/v1/file/inspect", tags=["archivos"], dependencies=protected, responses=file_errors,
              summary="Ver los metadatos de un archivo sin modificarlo")
    async def inspect_file(file: Annotated[UploadFile, File(description="Imagen, PDF, audio o vídeo")]):
        data = await _read_upload(file, settings.max_upload_bytes)
        inspection = await run_in_threadpool(services.media.inspect, data)
        return inspection.as_dict()

    return app


async def _read_limited(request: Request, limit: int) -> bytes:
    declared = request.headers.get("content-length")
    if declared and declared.isdigit() and int(declared) > limit:
        raise HTTPException(413, f"El cuerpo supera {limit // (1024 * 1024)} MB")
    chunks = bytearray()
    async for chunk in request.stream():
        chunks += chunk
        if len(chunks) > limit:
            raise HTTPException(413, f"El cuerpo supera {limit // (1024 * 1024)} MB")
    return bytes(chunks)


async def _read_upload(file: UploadFile, limit: int) -> bytes:
    data = bytearray()
    while chunk := await file.read(1024 * 1024):
        data += chunk
        if len(data) > limit:
            raise HTTPException(413, f"El archivo supera {limit // (1024 * 1024)} MB")
    if not data:
        raise HTTPException(422, "Archivo vacio")
    return bytes(data)


def __getattr__(name: str):
    # `uvicorn data_anonymizer.main:app` crea la app al primer acceso, no al
    # importar el modulo: asi los tests pueden importar create_app sin cargar
    # el .env del desarrollador ni el modelo NER.
    if name == "app":
        application = create_app()
        globals()["app"] = application
        return application
    raise AttributeError(name)
