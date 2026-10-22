"""Metadatos de audio: ID3/APE (MP3), Vorbis comments (FLAC, OGG), MP4 (M4A), RIFF (WAV).

Todos se limpian sin recodificar: solo se tocan las etiquetas, el audio queda
bit a bit igual.
"""

from __future__ import annotations

import contextlib
import io
import struct
from typing import Any

import mutagen
from mutagen import MutagenError
from mutagen.apev2 import APENoHeaderError, APEv2
from mutagen.flac import FLAC
from mutagen.id3 import ID3, ID3NoHeaderError

from .base import Inspection, InvalidFile, printable
from .riff import riff_chunks as _riff_chunks
from .sniff import FileKind

#: En WAV solo se conserva lo que hace falta para reproducir.
_WAV_KEEP = {b"fmt ", b"fact", b"data"}
_RIFF_INFO_NAMES = {
    b"INAM": "Titulo", b"IART": "Artista", b"ICMT": "Comentario", b"ICRD": "Fecha",
    b"ISFT": "Software", b"IENG": "Ingeniero", b"ICOP": "Copyright", b"IPRD": "Producto",
    b"ISBJ": "Asunto", b"ITCH": "Tecnico", b"IKEY": "Palabras clave", b"IGNR": "Genero",
}


def _tag_items(tags: Any) -> dict[str, Any]:
    out: dict[str, Any] = {}
    if tags is None:
        return out
    items = tags.items() if hasattr(tags, "items") else tags
    for key, value in items:
        name = str(key)
        if hasattr(value, "data") and isinstance(getattr(value, "data", None), bytes):
            out[name] = f"<imagen {len(value.data)} bytes>"  # APIC, covr
        elif isinstance(value, list):
            out[name] = printable([v if isinstance(v, bytes | str | int | float) else str(v)
                                   for v in value])
        else:
            out[name] = printable(value if isinstance(value, bytes | str | int | float) else str(value))
    return out


# ═════════════════════════════════════════════════════════════ mutagen
def _mutagen_inspect(data: bytes) -> tuple[dict[str, Any], list[str]]:
    try:
        audio = mutagen.File(io.BytesIO(data))
    except MutagenError as exc:
        raise InvalidFile(f"Audio ilegible: {exc}") from None
    if audio is None:
        raise InvalidFile("Formato de audio no reconocido")
    metadata: dict[str, Any] = {}
    tags = _tag_items(audio.tags)
    if tags:
        metadata["Etiquetas"] = tags
    pictures = getattr(audio, "pictures", None)
    if pictures:
        metadata["Imagenes"] = [f"<{p.mime} {len(p.data)} bytes>" for p in pictures]
    try:
        ape = _tag_items(APEv2(io.BytesIO(data)))
    except (APENoHeaderError, MutagenError):
        ape = {}
    if ape:
        metadata["APEv2"] = ape
    findings = [f"Etiqueta.{k}" for k in tags] + [f"APEv2.{k}" for k in ape]
    if pictures:
        findings.append("Imagenes incrustadas")
    return metadata, findings


def _mutagen_clean(data: bytes, kind: FileKind) -> bytes:
    buffer = io.BytesIO(data)
    try:
        if kind.name == "mp3":
            try:
                ID3(buffer).delete(buffer, delete_v1=True, delete_v2=True)
            except ID3NoHeaderError:
                buffer.seek(0)
        elif kind.name == "flac":
            audio = FLAC(buffer)
            audio.clear_pictures()
            if audio.tags is not None:
                audio.tags.clear()
            buffer.seek(0)
            audio.save(buffer, deleteid3=True)
        else:
            audio = mutagen.File(buffer)
            if audio is None:
                raise InvalidFile("Formato de audio no reconocido")
            buffer.seek(0)
            audio.delete(buffer)
        buffer.seek(0)
        with contextlib.suppress(APENoHeaderError):
            APEv2(buffer).delete(buffer)
    except MutagenError as exc:
        raise InvalidFile(f"No se pudieron borrar las etiquetas: {exc}") from None
    return buffer.getvalue()


# ═════════════════════════════════════════════════════════════════ WAV
def _wav_inspect(data: bytes) -> tuple[dict[str, Any], list[str]]:
    metadata: dict[str, Any] = {}
    findings: list[str] = []
    for fourcc, start, end in _riff_chunks(data):
        if fourcc in _WAV_KEEP:
            continue
        name = fourcc.decode("latin-1").strip()
        if fourcc == b"LIST" and data[start + 8:start + 12] == b"INFO":
            info = {}
            for sub, s_start, _s_end in _riff_chunks(data[:end], offset=start + 12):
                size = struct.unpack("<I", data[s_start + 4:s_start + 8])[0]
                value = data[s_start + 8:s_start + 8 + size].decode("latin-1", "replace")
                label = _RIFF_INFO_NAMES.get(sub, sub.decode("latin-1"))
                info[label] = printable(value)
                findings.append(f"RIFF.INFO.{sub.decode('latin-1')}")
            metadata["RIFF INFO"] = info
        else:
            metadata[f"RIFF.{name}"] = f"<{end - start - 8} bytes>"
            findings.append(f"RIFF.{name}")
    return metadata, findings


def _wav_clean(data: bytes) -> bytes:
    body = bytearray()
    for fourcc, start, end in _riff_chunks(data):
        if fourcc in _WAV_KEEP:
            body += data[start:end]
    return b"RIFF" + struct.pack("<I", len(body) + 4) + b"WAVE" + bytes(body)


# ════════════════════════════════════════════════════════════ fachada
def inspect_audio(data: bytes, kind: FileKind) -> Inspection:
    if kind.name == "wav":
        metadata, findings = _wav_inspect(data)
    else:
        metadata, findings = _mutagen_inspect(data)
    return Inspection(kind, metadata, findings)


def clean_audio(data: bytes, kind: FileKind) -> bytes:
    if kind.name == "wav":
        return _wav_clean(data)
    return _mutagen_clean(data, kind)
