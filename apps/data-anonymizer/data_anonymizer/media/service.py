"""Punto de entrada unico para inspeccionar y limpiar archivos.

La limpieza es *fail-closed*: despues de limpiar se vuelve a inspeccionar el
resultado y, si queda cualquier metadato identificable, NO se entrega el
archivo (``VerificationFailed``). Mejor un error que un archivo que parece
limpio y no lo esta.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from .audio import clean_audio, inspect_audio
from .base import Inspection, UnsupportedFile, VerificationFailed
from .images import clean_image, inspect_image
from .pdf import clean_pdf, inspect_pdf
from .sniff import KINDS, SNIFF_BYTES, FileKind, sniff
from .video import Ffmpeg, clean_video, inspect_video

SUPPORTED = sorted(KINDS)


@dataclass
class CleanResult:
    data: bytes
    kind: FileKind
    removed: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


class MediaService:
    def __init__(self, ffmpeg: Ffmpeg | None = None) -> None:
        self.ffmpeg = ffmpeg or Ffmpeg()

    def detect(self, data: bytes) -> FileKind:
        kind = sniff(data[:SNIFF_BYTES])
        if kind is None:
            raise UnsupportedFile(f"Tipo de archivo no soportado. Soportados: {', '.join(SUPPORTED)}")
        return kind

    def inspect(self, data: bytes) -> Inspection:
        kind = self.detect(data)
        if kind.family == "image":
            return inspect_image(data, kind)
        if kind.family == "pdf":
            return inspect_pdf(data, kind)
        if kind.family == "audio":
            return inspect_audio(data, kind)
        return inspect_video(data, kind, self.ffmpeg)

    def clean(self, data: bytes) -> CleanResult:
        before = self.inspect(data)
        kind = before.kind
        if kind.family == "image":
            cleaned = clean_image(data, kind)
        elif kind.family == "pdf":
            cleaned = clean_pdf(data, kind)
        elif kind.family == "audio":
            cleaned = clean_audio(data, kind)
        else:
            cleaned = clean_video(data, kind, self.ffmpeg)

        after = self.inspect(cleaned)
        if after.kind.name != kind.name:
            raise VerificationFailed(f"El archivo limpio ya no es {kind.name} sino {after.kind.name}")
        if after.findings:
            raise VerificationFailed(
                "Tras limpiar siguen quedando metadatos: " + ", ".join(after.findings)
            )
        return CleanResult(cleaned, kind, before.findings, after.warnings)
