"""Deteccion del tipo de archivo por su contenido (magic bytes).

Nunca se confia en la extension ni en el Content-Type que manda el cliente:
un ``foto.jpg`` puede ser un PNG, y procesar un formato con el manejador de
otro produce archivos corruptos o, peor, metadatos que se quedan dentro.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

Family = Literal["image", "pdf", "audio", "video"]


@dataclass(frozen=True)
class FileKind:
    name: str
    family: Family
    mime: str
    extension: str


KINDS: dict[str, FileKind] = {k.name: k for k in (
    FileKind("jpeg", "image", "image/jpeg", "jpg"),
    FileKind("png", "image", "image/png", "png"),
    FileKind("webp", "image", "image/webp", "webp"),
    FileKind("gif", "image", "image/gif", "gif"),
    FileKind("tiff", "image", "image/tiff", "tiff"),
    FileKind("pdf", "pdf", "application/pdf", "pdf"),
    FileKind("mp3", "audio", "audio/mpeg", "mp3"),
    FileKind("flac", "audio", "audio/flac", "flac"),
    FileKind("ogg", "audio", "audio/ogg", "ogg"),
    FileKind("m4a", "audio", "audio/mp4", "m4a"),
    FileKind("wav", "audio", "audio/wav", "wav"),
    FileKind("mp4", "video", "video/mp4", "mp4"),
    FileKind("mov", "video", "video/quicktime", "mov"),
    FileKind("mkv", "video", "video/x-matroska", "mkv"),
    FileKind("webm", "video", "video/webm", "webm"),
    FileKind("avi", "video", "video/x-msvideo", "avi"),
)}

#: Bytes de cabecera que hacen falta para decidir.
SNIFF_BYTES = 4096

_M4A_BRANDS = {b"M4A ", b"M4B ", b"M4P ", b"F4A ", b"F4B "}


def sniff(head: bytes) -> FileKind | None:
    if head.startswith(b"\xff\xd8\xff"):
        return KINDS["jpeg"]
    if head.startswith(b"\x89PNG\r\n\x1a\n"):
        return KINDS["png"]
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return KINDS["webp"]
    if head[:4] == b"RIFF" and head[8:12] == b"WAVE":
        return KINDS["wav"]
    if head[:4] == b"RIFF" and head[8:12] == b"AVI ":
        return KINDS["avi"]
    if head[:6] in (b"GIF87a", b"GIF89a"):
        return KINDS["gif"]
    if head[:4] in (b"II*\x00", b"MM\x00*"):
        return KINDS["tiff"]
    # El estandar permite basura antes de %PDF (hasta 1024 bytes).
    if b"%PDF-" in head[:1024]:
        return KINDS["pdf"]
    if head[:4] == b"fLaC":
        return KINDS["flac"]
    if head[:4] == b"OggS":
        return KINDS["ogg"]
    if head[4:8] == b"ftyp":
        brand = head[8:12]
        if brand in _M4A_BRANDS:
            return KINDS["m4a"]
        if brand == b"qt  ":
            return KINDS["mov"]
        return KINDS["mp4"]
    if head[:4] == b"\x1a\x45\xdf\xa3":
        return KINDS["webm"] if b"webm" in head[:64] else KINDS["mkv"]
    if head[:3] == b"ID3" or _is_mpeg_audio_frame(head):
        return KINDS["mp3"]
    return None


def _is_mpeg_audio_frame(head: bytes) -> bool:
    """Cabecera de trama MPEG Layer III sin ID3 delante."""
    if len(head) < 4 or head[0] != 0xFF or (head[1] & 0xE0) != 0xE0:
        return False
    layer = (head[1] >> 1) & 0x03
    bitrate = head[2] >> 4
    sample_rate = (head[2] >> 2) & 0x03
    return layer == 0x01 and bitrate not in (0, 15) and sample_rate != 3
