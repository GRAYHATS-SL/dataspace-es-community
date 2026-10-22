"""Recorrido de contenedores RIFF (WebP, WAV, AVI)."""

from __future__ import annotations

import struct
from collections.abc import Iterator

from .base import InvalidFile


def riff_chunks(data: bytes, offset: int = 12) -> Iterator[tuple[bytes, int, int]]:
    """Devuelve (fourcc, inicio, fin) de cada chunk, con el relleno incluido."""
    pos = offset
    while pos + 8 <= len(data):
        fourcc = data[pos:pos + 4]
        size = struct.unpack("<I", data[pos + 4:pos + 8])[0]
        end = pos + 8 + size + (size & 1)
        if pos + 8 + size > len(data):
            raise InvalidFile("Contenedor RIFF truncado")
        yield fourcc, pos, min(end, len(data))
        pos = end
