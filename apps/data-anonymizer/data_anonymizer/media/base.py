"""Tipos comunes de los manejadores de archivos."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from .sniff import FileKind


class MediaError(Exception):
    """Error al procesar un archivo. ``status`` es el codigo HTTP sugerido."""

    status = 422


class UnsupportedFile(MediaError):
    status = 415


class InvalidFile(MediaError):
    status = 422


class ToolMissing(MediaError):
    """Falta una herramienta externa (ffmpeg) para ese formato."""

    status = 501


class VerificationFailed(MediaError):
    """El archivo limpio aun conserva metadatos: no se entrega."""

    status = 500


@dataclass
class Inspection:
    kind: FileKind
    #: Metadatos encontrados, agrupados por origen (EXIF, GPS, XMP, Info...).
    metadata: dict[str, Any] = field(default_factory=dict)
    #: Campos que identifican o pueden identificar: lo que la limpieza elimina.
    findings: list[str] = field(default_factory=list)
    #: Avisos que no son metadatos pero conviene saber (adjuntos de un PDF...).
    warnings: list[str] = field(default_factory=list)

    def as_dict(self) -> dict[str, Any]:
        return {
            "type": self.kind.name,
            "mime": self.kind.mime,
            "metadata": self.metadata,
            "findings": self.findings,
            "warnings": self.warnings,
        }


def printable(value: Any, limit: int = 200) -> Any:
    """Convierte un valor de metadatos en algo serializable y corto."""
    if isinstance(value, bytes | bytearray):
        return f"<{len(value)} bytes>"
    if isinstance(value, str):
        cleaned = value.replace("\x00", "").strip()
        return cleaned if len(cleaned) <= limit else cleaned[:limit] + "…"
    if isinstance(value, bool | int | float) or value is None:
        return value
    if isinstance(value, tuple | list):
        return [printable(v, limit) for v in value[:20]]
    if isinstance(value, dict):
        return {str(k): printable(v, limit) for k, v in list(value.items())[:50]}
    try:
        return float(value)  # IFDRational de Pillow y similares
    except (TypeError, ValueError):
        return printable(str(value), limit)
