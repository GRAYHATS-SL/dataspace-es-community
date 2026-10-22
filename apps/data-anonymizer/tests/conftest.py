"""Fixtures comunes. Todos los archivos de prueba se generan aqui: el
repositorio no lleva binarios y nada depende de datos reales."""

from __future__ import annotations

import io
import shutil
import struct
import subprocess
from collections.abc import Callable
from pathlib import Path

import pytest
from PIL import Image

from data_anonymizer.core.engine import JsonAnonymizer
from data_anonymizer.core.policy import Policy
from data_anonymizer.core.pseudonymize import Pseudonymizer
from data_anonymizer.pii.detector import Detector
from data_anonymizer.pii.names import NameRecognizer, load_first_names

ROOT = Path(__file__).resolve().parents[1]
POLICIES = ROOT / "policies"
HAS_FFMPEG = bool(shutil.which("ffmpeg") and shutil.which("ffprobe"))
needs_ffmpeg = pytest.mark.skipif(not HAS_FFMPEG, reason="ffmpeg/ffprobe no instalados")


# ─────────────────────────────────────────────────────────── deteccion
@pytest.fixture(scope="session")
def first_names() -> frozenset[str]:
    return load_first_names()


@pytest.fixture(scope="session")
def detector(first_names) -> Detector:
    return Detector(NameRecognizer(first_names))


@pytest.fixture
def pseudo() -> Pseudonymizer:
    return Pseudonymizer("secreto-de-pruebas")


@pytest.fixture
def make_engine(detector, pseudo) -> Callable[..., JsonAnonymizer]:
    def build(policy: dict | None = None) -> JsonAnonymizer:
        return JsonAnonymizer(Policy.from_mapping(policy or {}), pseudo, detector)

    return build


# ───────────────────────────────────────────────────────────── imagenes
def exif_with_gps(orientation: int = 1) -> Image.Exif:
    exif = Image.Exif()
    exif[0x010F] = "Canon"
    exif[0x0110] = "EOS 5D"
    exif[0x013B] = "Laura Gomez"
    exif[0x0112] = orientation
    gps = exif.get_ifd(0x8825)
    gps[1], gps[2] = "N", (37.0, 53.0, 17.0)
    gps[3], gps[4] = "W", (4.0, 46.0, 45.0)
    sub = exif.get_ifd(0x8769)
    sub[0x9003] = "2024:05:01 10:00:00"
    sub[0xA431] = "SN-123456"
    return exif


XMP = b'<x:xmpmeta xmlns:x="adobe:ns:meta/"><dc:creator>Laura Gomez</dc:creator></x:xmpmeta>'


def image_bytes(fmt: str, **params) -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (40, 20), (200, 40, 40)).save(buffer, fmt, **params)
    return buffer.getvalue()


@pytest.fixture
def jpeg_with_metadata() -> bytes:
    data = image_bytes("JPEG", exif=exif_with_gps(orientation=6), comment=b"Laura", xmp=XMP)
    return data + b"MOTION-PHOTO-TRAILER"


# ──────────────────────────────────────────────────────────────── audio
def riff(form: bytes, chunks: list[tuple[bytes, bytes]]) -> bytes:
    body = b""
    for fourcc, payload in chunks:
        body += fourcc + struct.pack("<I", len(payload)) + payload + (b"\x00" if len(payload) % 2 else b"")
    return b"RIFF" + struct.pack("<I", len(body) + 4) + form + body


def wav_with_info() -> bytes:
    fmt = struct.pack("<HHIIHH", 1, 1, 8000, 16000, 2, 16)
    info = b"INFO"
    for key, value in ((b"INAM", b"Grabacion Laura\x00"), (b"IART", b"Laura Gomez\x00")):
        info += key + struct.pack("<I", len(value)) + value + (b"\x00" if len(value) % 2 else b"")
    return riff(b"WAVE", [(b"fmt ", fmt), (b"LIST", info), (b"bext", b"x" * 31),
                          (b"data", b"\x00\x00" * 800)])


def mp3_frames(count: int = 30) -> bytes:
    # MPEG-1 Layer III, 128 kbit/s, 44.1 kHz, sin CRC: tramas de 417 bytes.
    header = b"\xff\xfb\x90\x64"
    return (header + b"\x00" * 413) * count


def mp3_with_tags() -> bytes:
    from mutagen.id3 import APIC, ID3, TIT2, TPE1

    buffer = io.BytesIO(mp3_frames())
    tags = ID3()
    tags.add(TIT2(encoding=3, text="Grabacion Laura"))
    tags.add(TPE1(encoding=3, text="Laura Gomez"))
    tags.add(APIC(encoding=3, mime="image/png", type=3, desc="cover", data=image_bytes("PNG")))
    tags.save(buffer)
    return buffer.getvalue()


def ffmpeg_file(tmp_path: Path, extension: str, extra: list[str] | None = None) -> bytes:
    """Genera un archivo con ffmpeg y metadatos que delatan a alguien."""
    target = tmp_path / f"muestra.{extension}"
    sources = ["-f", "lavfi", "-i", "sine=frequency=440:duration=0.5"]
    if extension in ("mp4", "mov", "mkv", "webm", "avi"):
        sources = ["-f", "lavfi", "-i", "testsrc=s=32x24:d=0.5", *sources]
    codecs = {
        "webm": ["-c:v", "libvpx", "-c:a", "libopus"],
        "avi": ["-c:v", "mpeg4", "-c:a", "mp3"],
        "mp4": ["-c:v", "libx264", "-c:a", "aac"],
        "mov": ["-c:v", "libx264", "-c:a", "aac"],
        "mkv": ["-c:v", "libx264", "-c:a", "aac"],
    }.get(extension, [])
    subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *sources, *codecs,
         "-metadata", "artist=Laura Gomez", "-metadata", "title=Grabacion de Laura",
         "-metadata", "location=+37.8882-004.7794/", *(extra or []), str(target)],
        check=True,
    )
    return target.read_bytes()
