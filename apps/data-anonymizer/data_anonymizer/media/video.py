"""Metadatos de video con ffmpeg/ffprobe: MP4, MOV, MKV, WebM y AVI.

Se remultiplexa sin recodificar (``-c copy``): la imagen y el sonido quedan
identicos y el proceso es rapido incluso con archivos grandes. Se eliminan:

* Metadatos globales (titulo, autor, fecha de creacion, ubicacion ``©xyz``
  de los moviles, modelo de camara...).
* Metadatos de cada pista y los capitulos.
* Pistas de datos y adjuntos: ahi van la telemetria GPS de las camaras de
  accion (GoPro GPMF) o las caratulas con su propio EXIF.
* La firma del programa (``encoder``), gracias a ``+bitexact``.
"""

from __future__ import annotations

import json
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Any

from .base import Inspection, InvalidFile, ToolMissing, printable
from .sniff import FileKind

#: Etiquetas que describen el contenedor o la pista, no a quien grabo.
BENIGN_TAGS = frozenset({
    "major_brand", "minor_version", "compatible_brands", "handler_name", "vendor_id",
    "language", "duration", "bps", "number_of_frames", "number_of_bytes", "_statistics_tags",
})


class Ffmpeg:
    def __init__(self, ffmpeg: str = "ffmpeg", ffprobe: str = "ffprobe", timeout: float = 120) -> None:
        self.ffmpeg_cmd = ffmpeg
        self.ffprobe_cmd = ffprobe
        self.timeout = timeout

    @property
    def available(self) -> bool:
        return bool(shutil.which(self.ffmpeg_cmd) and shutil.which(self.ffprobe_cmd))

    def _require(self) -> None:
        if not self.available:
            raise ToolMissing(
                "Para limpiar video hace falta ffmpeg/ffprobe instalado (o FFMPEG_PATH/FFPROBE_PATH)."
            )

    def _run(self, args: list[str]) -> subprocess.CompletedProcess[bytes]:
        try:
            return subprocess.run(args, capture_output=True, timeout=self.timeout, check=False)
        except subprocess.TimeoutExpired:
            raise InvalidFile(f"ffmpeg ha tardado mas de {self.timeout:.0f} s") from None

    def probe(self, path: Path) -> dict[str, Any]:
        self._require()
        result = self._run([
            self.ffprobe_cmd, "-v", "error", "-print_format", "json",
            "-show_format", "-show_streams", "-show_chapters", str(path),
        ])
        if result.returncode != 0:
            raise InvalidFile(f"ffprobe no puede leer el video: {_stderr(result)}")
        return json.loads(result.stdout or b"{}")

    def strip(self, source: Path, target: Path) -> None:
        self._require()
        # Caratulas y adjuntos de MKV aparecen como pistas de "video" mjpeg/png:
        # se excluyen una a una, porque llevan su propio EXIF.
        excluded = [arg for index in embedded_pictures(self.probe(source)) for arg in ("-map", f"-0:{index}")]
        result = self._run([
            self.ffmpeg_cmd, "-hide_banner", "-nostdin", "-loglevel", "error", "-y",
            "-i", str(source),
            # Solo video, audio y subtitulos: fuera pistas de datos y adjuntos.
            "-map", "0:v?", "-map", "0:a?", "-map", "0:s?", *excluded,
            "-c", "copy",
            "-map_metadata", "-1",
            "-map_metadata:s:v", "-1", "-map_metadata:s:a", "-1", "-map_metadata:s:s", "-1",
            "-map_chapters", "-1",
            "-fflags", "+bitexact", "-flags:v", "+bitexact", "-flags:a", "+bitexact",
            str(target),
        ])
        if result.returncode != 0 or not target.exists():
            raise InvalidFile(f"ffmpeg no pudo remultiplexar el video: {_stderr(result)}")


def embedded_pictures(probe: dict[str, Any]) -> list[int]:
    """Indices de pistas que en realidad son imagenes incrustadas o adjuntos."""
    out = []
    for stream in probe.get("streams", []):
        tags = stream.get("tags") or {}
        attached = (stream.get("disposition") or {}).get("attached_pic") == 1
        if attached or stream.get("codec_type") == "attachment" or "filename" in tags or "mimetype" in tags:
            out.append(stream["index"])
    return out


def _stderr(result: subprocess.CompletedProcess[bytes]) -> str:
    text = result.stderr.decode("utf-8", "replace").strip().splitlines()
    return text[-1] if text else f"codigo {result.returncode}"


def _sensitive_tags(tags: dict[str, Any] | None) -> dict[str, Any]:
    out = {}
    for key, value in (tags or {}).items():
        lowered = key.lower()
        if lowered in BENIGN_TAGS or lowered.startswith("_statistics"):
            continue
        # El muxer de Matroska firma siempre "Lavf", incluso con +bitexact: es
        # la huella de este mismo proceso, no del autor del archivo.
        if lowered == "encoder" and str(value).strip() == "Lavf":
            continue
        out[key] = printable(value)
    return out


def analyse(probe: dict[str, Any]) -> tuple[dict[str, Any], list[str]]:
    metadata: dict[str, Any] = {}
    findings: list[str] = []
    pictures = set(embedded_pictures(probe))
    global_tags = _sensitive_tags(probe.get("format", {}).get("tags"))
    if global_tags:
        metadata["Global"] = global_tags
        findings += [f"Global.{k}" for k in global_tags]
    for stream in probe.get("streams", []):
        index, codec_type = stream.get("index"), stream.get("codec_type", "?")
        tags = _sensitive_tags(stream.get("tags"))
        if tags:
            metadata[f"Pista {index} ({codec_type})"] = tags
            findings += [f"Pista{index}.{k}" for k in tags]
        if codec_type in ("data", "attachment") or index in pictures:
            tag = (stream.get("tags") or {}).get("handler_name") or stream.get("codec_name", "")
            findings.append(f"Pista{index}.{codec_type}:{tag}".rstrip(":"))
    chapters = probe.get("chapters", [])
    if chapters:
        metadata["Capitulos"] = [printable((c.get("tags") or {}).get("title", "")) for c in chapters]
        findings.append(f"Capitulos ({len(chapters)})")
    return metadata, findings


def _with_tempfile(data: bytes, kind: FileKind, work):
    with tempfile.TemporaryDirectory(prefix="anon-") as tmp:
        source = Path(tmp) / f"entrada.{kind.extension}"
        source.write_bytes(data)
        return work(Path(tmp), source)


def inspect_video(data: bytes, kind: FileKind, tool: Ffmpeg) -> Inspection:
    probe = _with_tempfile(data, kind, lambda _tmp, src: tool.probe(src))
    metadata, findings = analyse(probe)
    return Inspection(kind, metadata, findings)


def clean_video(data: bytes, kind: FileKind, tool: Ffmpeg) -> bytes:
    def work(tmp: Path, source: Path) -> bytes:
        target = tmp / f"salida.{kind.extension}"
        tool.strip(source, target)
        return target.read_bytes()

    return _with_tempfile(data, kind, work)
