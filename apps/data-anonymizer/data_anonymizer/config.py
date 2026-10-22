"""Configuracion por variables de entorno (o fichero ``.env``).

Ver ``.env.example`` para la lista completa con explicaciones.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

#: Valor del .env.example. Si llega a produccion, los alias son predecibles.
EXAMPLE_SECRET = "cambia-este-secreto"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # --- Pseudonimizacion -------------------------------------------------
    anon_secret: str = Field("", description="Clave HMAC de los alias. Obligatoria en produccion.")
    anon_alias_length: int = Field(8, ge=4, le=32)

    # --- Politicas -------------------------------------------------------
    policies_dir: Path = Path("policies")
    default_policy: str = "auto"

    # --- Deteccion -------------------------------------------------------
    ner_model: str = Field("", description="Modelo de spaCy, p. ej. es_core_news_md. Vacio = sin NER.")
    detection_names_file: str = Field("", description="Fichero extra de nombres de pila.")

    # --- Archivos --------------------------------------------------------
    max_upload_mb: float = Field(100, gt=0)
    max_json_mb: float = Field(10, gt=0)
    ffmpeg_path: str = "ffmpeg"
    ffprobe_path: str = "ffprobe"
    media_timeout_seconds: float = Field(120, gt=0)

    # --- API -------------------------------------------------------------
    api_keys: str = Field("", description="Claves separadas por comas. Vacio = sin autenticacion.")
    cors_origins: str = ""
    docs_enabled: bool = True
    public_url: str = ""
    log_level: str = "INFO"

    @property
    def api_key_set(self) -> frozenset[str]:
        return frozenset(k.strip() for k in self.api_keys.split(",") if k.strip())

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def secret_is_insecure(self) -> bool:
        return not self.anon_secret or self.anon_secret == EXAMPLE_SECRET

    @property
    def max_upload_bytes(self) -> int:
        return int(self.max_upload_mb * 1024 * 1024)

    @property
    def max_json_bytes(self) -> int:
        return int(self.max_json_mb * 1024 * 1024)


@lru_cache
def get_settings() -> Settings:
    return Settings()
