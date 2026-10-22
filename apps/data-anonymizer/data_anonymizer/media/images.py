"""Metadatos de imagenes: EXIF (incluido GPS), XMP, IPTC, comentarios y texto.

JPEG, PNG y WebP se limpian **sin recomprimir**: se reescribe el contenedor
quitando los segmentos o chunks de metadatos y se deja intacta la imagen. Asi
no se pierde calidad y el resultado es reproducible.

GIF y TIFF se reconstruyen con Pillow (ambos son sin perdida).

En JPEG se conserva la orientacion EXIF: sin ella las fotos de movil saldrian
giradas. Es el unico campo que se deja y no identifica a nadie.
"""

from __future__ import annotations

import io
import struct
from typing import Any

from PIL import ExifTags, Image, ImageOps, ImageSequence, IptcImagePlugin, UnidentifiedImageError

from .base import Inspection, InvalidFile, printable
from .riff import riff_chunks as _riff_chunks
from .sniff import FileKind

ORIENTATION = 0x0112
_EXIF_IFD = 0x8769
_GPS_IFD = 0x8825

#: Etiquetas TIFF/EXIF estructurales: describen la imagen, no a quien la hizo.
BENIGN_TAGS = frozenset({
    "ImageWidth", "ImageLength", "BitsPerSample", "Compression", "PhotometricInterpretation",
    "FillOrder", "StripOffsets", "SamplesPerPixel", "RowsPerStrip", "StripByteCounts",
    "XResolution", "YResolution", "PlanarConfiguration", "ResolutionUnit", "Orientation",
    "ExtraSamples", "SampleFormat", "TileWidth", "TileLength", "TileOffsets", "TileByteCounts",
    "Predictor", "ColorMap", "NewSubfileType", "SubfileType", "JPEGTables", "YCbCrSubSampling",
    "YCbCrPositioning", "ReferenceBlackWhite", "InterColorProfile", "TransferFunction",
    "ExifImageWidth", "ExifImageHeight", "ColorSpace",
})

#: Claves de ``Image.info`` que son parametros de la imagen, no metadatos.
BENIGN_INFO = frozenset({
    "jfif", "jfif_version", "jfif_unit", "jfif_density", "dpi", "icc_profile", "adobe",
    "adobe_transform", "progressive", "progression", "transparency", "gamma", "srgb",
    "chromaticity", "aspect", "duration", "loop", "background", "version", "compression",
    "resolution", "exif", "interlace", "default_image", "disposal", "blend", "timestamp",
    "bbox", "mode", "optimize", "frame_count", "lossless", "quality", "subsampling",
    "mpinfo", "mp", "transparency_index",
})


def _tag_name(tag: int, table: dict[int, str]) -> str:
    return table.get(tag, f"0x{tag:04X}")


def _open(data: bytes) -> Image.Image:
    try:
        image = Image.open(io.BytesIO(data))
        image.load()
    except (UnidentifiedImageError, OSError, SyntaxError, ValueError) as exc:
        raise InvalidFile(f"Imagen ilegible: {exc}") from None
    return image


def _exif_analysis(image: Image.Image) -> tuple[dict[str, Any], list[str]]:
    metadata: dict[str, Any] = {}
    findings: list[str] = []
    exif = image.getexif()
    base = {}
    for tag, value in exif.items():
        name = _tag_name(tag, ExifTags.TAGS)
        if tag in (_EXIF_IFD, _GPS_IFD):
            continue
        base[name] = printable(value)
        if name not in BENIGN_TAGS:
            findings.append(f"EXIF.{name}")
    if base:
        metadata["EXIF"] = base
    sub = {_tag_name(t, ExifTags.TAGS): printable(v) for t, v in exif.get_ifd(_EXIF_IFD).items()}
    if sub:
        metadata.setdefault("EXIF", {}).update(sub)
        findings += [f"EXIF.{n}" for n in sub if n not in BENIGN_TAGS]
    gps = {_tag_name(t, ExifTags.GPSTAGS): printable(v) for t, v in exif.get_ifd(_GPS_IFD).items()}
    if gps:
        metadata["GPS"] = gps
        findings += [f"GPS.{n}" for n in gps]
    elif _GPS_IFD in exif:
        findings.append("EXIF.GPSInfo")
    return metadata, findings


def _benign_gif_extension(value: Any) -> bool:
    # NETSCAPE2.0 / ANIMEXTS1.0 solo guardan el numero de repeticiones.
    return isinstance(value, tuple) and bool(value) and value[0] in (b"NETSCAPE2.0", b"ANIMEXTS1.0")


def _info_analysis(image: Image.Image) -> tuple[dict[str, Any], list[str]]:
    metadata: dict[str, Any] = {}
    findings: list[str] = []
    for key, value in image.info.items():
        if key in BENIGN_INFO or (key == "extension" and _benign_gif_extension(value)):
            continue
        metadata[str(key)] = printable(value)
        findings.append(f"info.{key}")
    try:
        iptc = IptcImagePlugin.getiptcinfo(image)
    except (SyntaxError, ValueError, IndexError):  # pragma: no cover - IPTC corrupto
        iptc = None
    if iptc:
        metadata["IPTC"] = {f"{k[0]}:{k[1]}": printable(v) for k, v in iptc.items()}
        findings.append("IPTC")
    return metadata, findings


# ═════════════════════════════════════════════════════════════════ JPEG
_SOI = b"\xff\xd8"
_EOI = b"\xff\xd9"


def _jpeg_segments(data: bytes):
    """Recorre los segmentos hasta SOS. Devuelve (marcador, inicio, fin)."""
    if not data.startswith(_SOI):
        raise InvalidFile("No es un JPEG valido")
    pos = 2
    while pos < len(data) - 1:
        if data[pos] != 0xFF:
            raise InvalidFile("JPEG corrupto: se esperaba un marcador")
        marker = data[pos + 1]
        if marker == 0xFF:  # bytes de relleno
            pos += 1
            continue
        if marker in (0x01, *range(0xD0, 0xD8)):
            yield marker, pos, pos + 2
            pos += 2
            continue
        if pos + 4 > len(data):
            raise InvalidFile("JPEG truncado")
        length = struct.unpack(">H", data[pos + 2:pos + 4])[0]
        end = pos + 2 + length
        if marker == 0xDA:  # SOS: a partir de aqui, datos de imagen
            eoi = data.find(_EOI, end)
            yield marker, pos, (len(data) if eoi == -1 else eoi + 2)
            return
        yield marker, pos, end
        pos = end


def _segment_name(marker: int, segment: bytes) -> str:
    payload = segment[4:]
    if marker == 0xFE:
        return "COM"
    if marker == 0xE1:
        if payload.startswith(b"Exif\x00"):
            return "APP1.Exif"
        if payload.startswith(b"http://ns.adobe.com/xap/1.0/") or b"xmp" in payload[:64].lower():
            return "APP1.XMP"
        return "APP1"
    if marker == 0xE2:
        if payload.startswith(b"ICC_PROFILE\x00"):
            return "APP2.ICC"
        if payload.startswith(b"MPF\x00"):
            return "APP2.MPF"
        return "APP2"
    if marker == 0xED:
        return "APP13.IPTC"
    if marker == 0xE0:
        return "APP0.JFIF" if payload.startswith(b"JFIF\x00") else "APP0"
    if marker == 0xEE:
        return "APP14.Adobe" if payload.startswith(b"Adobe") else "APP14"
    return f"APP{marker - 0xE0}"


#: Segmentos que se conservan: JFIF (densidad), ICC (color) y Adobe (necesario
#: para decodificar bien los JPEG CMYK). El EXIF se reconstruye aparte.
_JPEG_KEEP = {"APP0.JFIF", "APP2.ICC", "APP14.Adobe"}


def _jpeg_findings(data: bytes) -> tuple[list[str], int]:
    findings: list[str] = []
    last_end = 2
    for marker, start, end in _jpeg_segments(data):
        last_end = end
        if 0xE0 <= marker <= 0xEF or marker == 0xFE:
            name = _segment_name(marker, data[start:end])
            if name not in _JPEG_KEEP and name != "APP1.Exif":
                findings.append(f"JPEG.{name}")
    trailer = len(data) - last_end
    if trailer > 0:
        findings.append(f"JPEG.datos_tras_EOI ({trailer} bytes)")
    return findings, trailer


def clean_jpeg(data: bytes) -> bytes:
    orientation = _open(data).getexif().get(ORIENTATION, 1)
    out = bytearray(_SOI)
    exif_written = False
    for marker, start, end in _jpeg_segments(data):
        segment = data[start:end]
        is_app = 0xE0 <= marker <= 0xEF or marker == 0xFE
        if is_app and _segment_name(marker, segment) not in _JPEG_KEEP:
            continue
        if not exif_written and (marker != 0xE0):
            # El EXIF minimo va despues de JFIF (si lo hay) y antes de lo demas.
            out += _minimal_exif_segment(orientation)
            exif_written = True
        out += segment
    if not out.endswith(_EOI):
        out += _EOI
    return bytes(out)


def _minimal_exif_segment(orientation: int) -> bytes:
    if orientation in (None, 1):
        return b""
    exif = Image.Exif()
    exif[ORIENTATION] = orientation
    payload = exif.tobytes()
    return b"\xff\xe1" + struct.pack(">H", len(payload) + 2) + payload


# ══════════════════════════════════════════════════════════════════ PNG
_PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"
_PNG_KEEP = {
    b"IHDR", b"PLTE", b"IDAT", b"IEND", b"tRNS", b"gAMA", b"cHRM", b"sRGB", b"iCCP", b"sBIT",
    b"bKGD", b"pHYs", b"acTL", b"fcTL", b"fdAT", b"cICP", b"mDCv", b"cLLi", b"hIST", b"sPLT",
}


def _png_chunks(data: bytes):
    if not data.startswith(_PNG_SIGNATURE):
        raise InvalidFile("No es un PNG valido")
    pos = len(_PNG_SIGNATURE)
    while pos + 8 <= len(data):
        length = struct.unpack(">I", data[pos:pos + 4])[0]
        kind = data[pos + 4:pos + 8]
        end = pos + 12 + length
        if end > len(data):
            raise InvalidFile("PNG truncado")
        yield kind, data[pos + 8:pos + 8 + length], pos, end
        pos = end
        if kind == b"IEND":
            return


def _png_text(kind: bytes, payload: bytes) -> tuple[str, str]:
    keyword, _, rest = payload.partition(b"\x00")
    if kind == b"tEXt":
        return keyword.decode("latin-1"), rest.decode("latin-1", "replace")
    if kind == b"zTXt":
        import zlib

        try:
            return keyword.decode("latin-1"), zlib.decompress(rest[1:]).decode("latin-1", "replace")
        except zlib.error:
            return keyword.decode("latin-1"), "<comprimido ilegible>"
    return keyword.decode("latin-1"), f"<{len(rest)} bytes>"


def clean_png(data: bytes) -> bytes:
    out = bytearray(_PNG_SIGNATURE)
    for kind, _payload, start, end in _png_chunks(data):
        if kind in _PNG_KEEP:
            out += data[start:end]
    return bytes(out)


def _png_findings(data: bytes) -> tuple[dict[str, Any], list[str]]:
    texts: dict[str, Any] = {}
    findings: list[str] = []
    for kind, payload, _start, _end in _png_chunks(data):
        if kind in _PNG_KEEP:
            continue
        name = kind.decode("latin-1")
        if kind in (b"tEXt", b"zTXt", b"iTXt"):
            key, value = _png_text(kind, payload)
            texts[key] = printable(value)
            findings.append(f"PNG.{name}:{key}")
        else:
            findings.append(f"PNG.{name}")
    return ({"PNG": texts} if texts else {}), findings


# ═════════════════════════════════════════════════════════════════ WebP
_WEBP_DROP = {b"EXIF", b"XMP "}


def clean_webp(data: bytes) -> bytes:
    body = bytearray()
    for fourcc, start, end in _riff_chunks(data):
        if fourcc in _WEBP_DROP:
            continue
        chunk = bytearray(data[start:end])
        if fourcc == b"VP8X":
            chunk[8] &= ~(0x08 | 0x04) & 0xFF  # banderas de EXIF y XMP
        body += chunk
    return b"RIFF" + struct.pack("<I", len(body) + 4) + b"WEBP" + bytes(body)


def _webp_findings(data: bytes) -> list[str]:
    return [f"WebP.{fourcc.decode().strip()}" for fourcc, _s, _e in _riff_chunks(data)
            if fourcc in _WEBP_DROP]


# ══════════════════════════════════════════════════════════ GIF y TIFF
def clean_with_pillow(data: bytes, kind: FileKind) -> bytes:
    image = _open(data)
    frames: list[Image.Image] = []
    durations: list[int] = []
    for frame in ImageSequence.Iterator(image):
        copy = (ImageOps.exif_transpose(frame) if kind.name == "tiff" else frame).copy()
        durations.append(frame.info.get("duration", 0))
        copy.info = {}  # ni comentarios, ni XMP, ni ICC con texto, ni etiquetas
        frames.append(copy)
    out = io.BytesIO()
    params: dict[str, Any] = {"save_all": len(frames) > 1}
    if len(frames) > 1:
        params["append_images"] = frames[1:]
    if kind.name == "gif":
        if "loop" in image.info:
            params["loop"] = image.info["loop"]
        if any(durations):
            params["duration"] = durations if len(frames) > 1 else durations[0]
        if "transparency" in image.info:
            params["transparency"] = image.info["transparency"]
        frames[0].save(out, format="GIF", **params)
    else:
        params["compression"] = "tiff_lzw"
        if "icc_profile" in image.info:
            params["icc_profile"] = image.info["icc_profile"]
        frames[0].save(out, format="TIFF", **params)
    return out.getvalue()


# ════════════════════════════════════════════════════════════ fachada
def inspect_image(data: bytes, kind: FileKind) -> Inspection:
    image = _open(data)
    metadata, findings = _exif_analysis(image)
    info_meta, info_findings = _info_analysis(image)
    metadata.update(info_meta)
    if kind.name == "jpeg":
        segment_findings, _ = _jpeg_findings(data)
        # XMP/IPTC/comentarios ya los listan los segmentos con su nombre exacto.
        info_findings = [f for f in info_findings if f not in ("info.xmp", "info.comment",
                                                                "info.photoshop", "IPTC")]
        findings += info_findings + segment_findings
    elif kind.name == "png":
        png_meta, png_findings = _png_findings(data)
        metadata.update(png_meta)
        # Los textos PNG aparecen tambien en image.info con su clave: no duplicar.
        texts = set(png_meta.get("PNG", {}))
        findings += [f for f in info_findings if f.removeprefix("info.") not in texts
                     and f != "info.xmp"] + png_findings
    elif kind.name == "webp":
        findings += [f for f in info_findings if f != "info.xmp"] + _webp_findings(data)
    else:
        findings += info_findings
    return Inspection(kind, metadata, sorted(set(findings)))


def clean_image(data: bytes, kind: FileKind) -> bytes:
    if kind.name == "jpeg":
        return clean_jpeg(data)
    if kind.name == "png":
        return clean_png(data)
    if kind.name == "webp":
        return clean_webp(data)
    return clean_with_pillow(data, kind)
