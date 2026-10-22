"""Metadatos de archivos: deteccion de tipo, inspeccion, limpieza y verificacion."""

from __future__ import annotations

import io
import struct

import pikepdf
import pytest
from PIL import Image, PngImagePlugin

from data_anonymizer.media import images
from data_anonymizer.media.base import (
    InvalidFile,
    ToolMissing,
    UnsupportedFile,
    VerificationFailed,
    printable,
)
from data_anonymizer.media.service import MediaService
from data_anonymizer.media.sniff import KINDS, sniff
from data_anonymizer.media.video import Ffmpeg, analyse, embedded_pictures

from .conftest import (
    XMP,
    exif_with_gps,
    ffmpeg_file,
    image_bytes,
    mp3_frames,
    mp3_with_tags,
    needs_ffmpeg,
    riff,
    wav_with_info,
)

service = MediaService()


def assert_cleaned(data: bytes, kind: str, *leaks: bytes) -> bytes:
    before = service.inspect(data)
    assert before.kind.name == kind
    assert before.findings, "la muestra deberia traer metadatos"
    result = service.clean(data)
    assert result.kind.name == kind and result.removed == before.findings
    assert service.inspect(result.data).findings == []
    for leak in leaks:
        assert leak not in result.data, leak
    return result.data


# ─────────────────────────────────────────────────────────────── sniff
@pytest.mark.parametrize("head, kind", [
    (b"\xff\xd8\xff\xe0", "jpeg"), (b"\x89PNG\r\n\x1a\n", "png"), (b"RIFF\0\0\0\0WEBPVP8 ", "webp"),
    (b"RIFF\0\0\0\0WAVEfmt ", "wav"), (b"RIFF\0\0\0\0AVI LIST", "avi"), (b"GIF89a", "gif"),
    (b"II*\x00", "tiff"), (b"MM\x00*", "tiff"), (b"basura%PDF-1.7", "pdf"), (b"fLaC", "flac"),
    (b"OggS", "ogg"), (b"\0\0\0\x20ftypM4A ", "m4a"), (b"\0\0\0\x20ftypqt  ", "mov"),
    (b"\0\0\0\x20ftypisom", "mp4"), (b"\x1a\x45\xdf\xa3....webm", "webm"),
    (b"\x1a\x45\xdf\xa3....matroska", "mkv"), (b"ID3\x03", "mp3"), (b"\xff\xfb\x90\x64", "mp3"),
])
def test_sniff(head, kind):
    assert sniff(head).name == kind


@pytest.mark.parametrize("head", [b"", b"hola", b"\xff\xfb\x00\x00", b"\xff\xfb\xf0\x00", b"\xff"])
def test_sniff_desconocido(head):
    assert sniff(head) is None


def test_tipo_no_soportado():
    with pytest.raises(UnsupportedFile, match="no soportado"):
        service.clean(b"esto es texto plano")


def test_printable():
    assert printable(b"abc") == "<3 bytes>"
    assert printable("x" * 300).endswith("…")
    assert printable({"a": (1, 2)}) == {"a": [1, 2]}
    assert printable(object()).startswith("<object")


# ───────────────────────────────────────────────────────────── imagenes
def test_jpeg_sin_perdida_y_conservando_la_orientacion(jpeg_with_metadata):
    clean = assert_cleaned(jpeg_with_metadata, "jpeg", b"Laura", b"Canon", b"TRAILER")
    original, result = Image.open(io.BytesIO(jpeg_with_metadata)), Image.open(io.BytesIO(clean))
    assert result.getexif().get(images.ORIENTATION) == 6
    assert original.tobytes() == result.tobytes()  # mismos pixeles: no se ha recomprimido


def test_jpeg_inspeccion_detallada(jpeg_with_metadata):
    inspection = service.inspect(jpeg_with_metadata)
    assert {"GPS.GPSLatitude", "EXIF.Make", "EXIF.BodySerialNumber", "JPEG.APP1.XMP",
            "JPEG.COM"} <= set(inspection.findings)
    assert any(f.startswith("JPEG.datos_tras_EOI") for f in inspection.findings)
    assert inspection.metadata["GPS"]["GPSLatitudeRef"] == "N"
    assert inspection.as_dict()["mime"] == "image/jpeg"


def test_jpeg_con_orientacion_normal_no_lleva_exif():
    clean = service.clean(image_bytes("JPEG", exif=exif_with_gps(orientation=1))).data
    assert b"Exif" not in clean


def test_jpeg_cmyk_conserva_adobe_e_icc():
    buffer = io.BytesIO()
    Image.new("CMYK", (8, 8)).save(buffer, "JPEG", icc_profile=b"\0" * 128, comment=b"Laura")
    clean = service.clean(buffer.getvalue()).data
    assert b"Adobe" in clean and b"ICC_PROFILE" in clean and b"Laura" not in clean


def test_jpeg_corrupto():
    with pytest.raises(InvalidFile):
        service.inspect(b"\xff\xd8\xff\xe0\x00")
    with pytest.raises(InvalidFile):
        list(images._jpeg_segments(b"\xff\xd8\x00\x00"))
    with pytest.raises(InvalidFile):
        list(images._jpeg_segments(b"nojpeg"))


def test_jpeg_segmentos_raros():
    # Relleno 0xFF, un RST suelto y segmentos APP sin firma conocida.
    segments = (b"\xff\xd8" + b"\xff\xff\xd0" + b"\xff\xe1\x00\x04ab" + b"\xff\xe2\x00\x04ab"
                + b"\xff\xe0\x00\x04ab" + b"\xff\xee\x00\x04ab" + b"\xff\xe5\x00\x04ab")
    names = [images._segment_name(m, segments[s:e]) for m, s, e in images._jpeg_segments(segments)
             if m != 0xD0]
    assert names == ["APP1", "APP2", "APP0", "APP14", "APP5"]


def test_png():
    info = PngImagePlugin.PngInfo()
    info.add_text("Author", "Laura Gomez")
    info.add_text("Comment", "casa de Laura", zip=True)
    info.add_itxt("Description", "Laura", zip=False)
    data = image_bytes("PNG", pnginfo=info, exif=exif_with_gps())
    inspection = service.inspect(data)
    assert {"PNG.tEXt:Author", "PNG.zTXt:Comment", "PNG.iTXt:Description", "PNG.eXIf"} <= set(
        inspection.findings)
    assert inspection.metadata["PNG"]["Comment"] == "casa de Laura"
    assert_cleaned(data, "png", b"Laura")


def test_png_corrupto():
    with pytest.raises(InvalidFile):
        list(images._png_chunks(b"no"))
    with pytest.raises(InvalidFile):
        list(images._png_chunks(b"\x89PNG\r\n\x1a\n\x00\x00\x00\xffIDAT"))
    assert images._png_text(b"zTXt", b"k\x00\x00roto") == ("k", "<comprimido ilegible>")


def test_webp():
    clean = assert_cleaned(image_bytes("WEBP", exif=exif_with_gps(), xmp=XMP, lossless=True),
                           "webp", b"Laura", b"Canon")
    assert Image.open(io.BytesIO(clean)).size == (40, 20)


def test_gif_animado():
    frames = [Image.new("RGB", (8, 8), color).convert("P") for color in ("red", "green", "blue")]
    buffer = io.BytesIO()
    frames[0].save(buffer, "GIF", save_all=True, append_images=frames[1:], duration=[50, 60, 70],
                   loop=0, comment=b"Laura", transparency=0)
    clean = assert_cleaned(buffer.getvalue(), "gif", b"Laura")
    result = Image.open(io.BytesIO(clean))
    assert result.n_frames == 3 and result.info.get("loop") == 0


def test_gif_simple():
    buffer = io.BytesIO()
    Image.new("P", (8, 8)).save(buffer, "GIF", comment=b"Laura")
    assert_cleaned(buffer.getvalue(), "gif", b"Laura")


def test_tiff():
    data = image_bytes("TIFF", tiffinfo={315: "Laura Gomez", 305: "Photoshop", 270: "Casa de Laura"},
                       icc_profile=b"\0" * 64)
    clean = assert_cleaned(data, "tiff", b"Laura", b"Photoshop")
    assert Image.open(io.BytesIO(clean)).size == (40, 20)


def test_imagen_ilegible():
    with pytest.raises(InvalidFile):
        service.inspect(b"GIF89a-roto")


# ──────────────────────────────────────────────────────────────────── PDF
def make_pdf(**extras) -> bytes:
    pdf = pikepdf.new()
    pdf.add_blank_page()
    pdf.docinfo["/Author"] = "Laura Gomez"
    pdf.docinfo["/Creator"] = "Editor de Laura"
    with pdf.open_metadata(set_pikepdf_as_editor=False) as meta:
        meta["dc:creator"] = ["Laura Gomez"]
    page = pdf.pages[0]
    page.obj["/PieceInfo"] = pikepdf.Dictionary(App=pikepdf.Dictionary(Private=pikepdf.String("x")))
    pdf.Root["/PieceInfo"] = pikepdf.Dictionary()
    note = pdf.make_indirect(pikepdf.Dictionary(Type=pikepdf.Name.Annot, Subtype=pikepdf.Name.Text,
                                                Rect=[0, 0, 9, 9], T=pikepdf.String("Laura Gomez")))
    widget = pdf.make_indirect(pikepdf.Dictionary(Type=pikepdf.Name.Annot, Subtype=pikepdf.Name.Widget,
                                                  Rect=[0, 0, 9, 9], T=pikepdf.String("campo_dni")))
    page.obj["/Annots"] = pikepdf.Array([note, widget])
    if extras.get("attachment"):
        pdf.attachments["a.txt"] = pikepdf.AttachedFileSpec(pdf, b"hola")
    buffer = io.BytesIO()
    pdf.save(buffer, **({"encryption": extras["encryption"]} if "encryption" in extras else {}))
    return buffer.getvalue()


@pytest.mark.filterwarnings("ignore::UserWarning")
def test_pdf():
    data = make_pdf(attachment=True)
    inspection = service.inspect(data)
    assert {"Info.Author", "XMP", "Anotaciones.autor"} <= set(inspection.findings)
    assert inspection.warnings and "adjunto" in inspection.warnings[0]
    clean = assert_cleaned(data, "pdf", b"Laura")
    assert b"campo_dni" in clean  # el nombre del campo de formulario se respeta
    with pikepdf.open(io.BytesIO(clean)) as pdf:
        assert len(pdf.pages) == 1


def test_pdf_cifrado():
    data = make_pdf(encryption=pikepdf.Encryption(user="1234", owner="1234"))
    with pytest.raises(UnsupportedFile, match="contrasena"):
        service.inspect(data)


def test_pdf_ilegible():
    with pytest.raises(InvalidFile):
        service.inspect(b"%PDF-1.7\nesto no es un pdf")


# ────────────────────────────────────────────────────────────────── audio
def test_wav():
    clean = assert_cleaned(wav_with_info(), "wav", b"Laura", b"bext")
    assert clean.endswith(b"\x00\x00" * 800)
    inspection = service.inspect(wav_with_info())
    assert inspection.metadata["RIFF INFO"]["Artista"] == "Laura Gomez"


def test_wav_truncado():
    with pytest.raises(InvalidFile):
        service.inspect(b"RIFF\x00\x00\x00\x00WAVEdata\xff\x00\x00\x00")


def test_mp3_id3_y_caratula():
    data = mp3_with_tags()
    inspection = service.inspect(data)
    assert "Etiqueta.TPE1" in inspection.findings and "Etiqueta.APIC:cover" in inspection.findings
    clean = assert_cleaned(data, "mp3", b"Laura", b"APIC")
    assert clean.endswith(mp3_frames()[-100:])


def test_mp3_sin_etiquetas_no_se_toca():
    data = mp3_frames()
    assert service.inspect(data).findings == []


def test_mp3_con_ape():
    from mutagen.apev2 import APEv2

    buffer = io.BytesIO(mp3_frames())
    tags = APEv2()
    tags["Artist"] = "Laura Gomez"
    tags.save(buffer)
    data = buffer.getvalue()
    assert "APEv2.Artist" in service.inspect(data).findings
    assert_cleaned(data, "mp3", b"Laura")


def test_audio_ilegible():
    with pytest.raises(InvalidFile):
        service.inspect(b"fLaC" + b"\x00" * 10)


@needs_ffmpeg
@pytest.mark.parametrize("extension", ["flac", "ogg", "m4a"])
def test_audio_con_ffmpeg(tmp_path, extension):
    assert_cleaned(ffmpeg_file(tmp_path, extension), extension, b"Laura")


@needs_ffmpeg
def test_flac_con_imagen(tmp_path):
    from mutagen.flac import FLAC, Picture

    path = tmp_path / "x.flac"
    path.write_bytes(ffmpeg_file(tmp_path, "flac"))
    audio = FLAC(path)
    picture = Picture()
    picture.data, picture.mime, picture.type = image_bytes("PNG"), "image/png", 3
    audio.add_picture(picture)
    audio.save()
    data = path.read_bytes()
    assert "Imagenes incrustadas" in service.inspect(data).findings
    assert_cleaned(data, "flac", b"Laura")


# ────────────────────────────────────────────────────────────────── video
@needs_ffmpeg
@pytest.mark.parametrize("extension", ["mp4", "mov", "mkv", "webm", "avi"])
def test_video(tmp_path, extension):
    data = ffmpeg_file(tmp_path, extension)
    findings = service.inspect(data).findings
    assert any("artist" in f.lower() for f in findings)
    assert_cleaned(data, extension, b"Laura")


@needs_ffmpeg
def test_mkv_con_adjunto_y_capitulos(tmp_path):
    meta = tmp_path / "meta.txt"
    meta.write_text(";FFMETADATA1\n[CHAPTER]\nTIMEBASE=1/1000\nSTART=0\nEND=200\ntitle=Casa de Laura\n")
    cover = tmp_path / "cover.jpg"
    cover.write_bytes(image_bytes("JPEG", exif=exif_with_gps()))
    base = tmp_path / "base.mkv"
    base.write_bytes(ffmpeg_file(tmp_path, "mkv"))
    target = tmp_path / "final.mkv"
    import subprocess

    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(base), "-i", str(meta),
                    "-map", "0", "-map_chapters", "1", "-attach", str(cover),
                    "-metadata:s:t", "mimetype=image/jpeg", "-c", "copy", str(target)], check=True)
    data = target.read_bytes()
    findings = service.inspect(data).findings
    assert any(f.startswith("Capitulos") for f in findings)
    assert any(".video:mjpeg" in f or "attachment" in f for f in findings)
    assert_cleaned(data, "mkv", b"Laura", b"Canon")


def test_analisis_de_ffprobe():
    probe = {
        "format": {"tags": {"major_brand": "isom", "title": "Laura", "encoder": "Lavf"}},
        "streams": [
            {"index": 0, "codec_type": "video", "tags": {"handler_name": "VideoHandler"}},
            {"index": 1, "codec_type": "data", "tags": {"handler_name": "GoPro MET"}},
            {"index": 2, "codec_type": "video", "codec_name": "mjpeg",
             "disposition": {"attached_pic": 1}},
        ],
        "chapters": [{"tags": {"title": "Casa"}}],
    }
    metadata, findings = analyse(probe)
    assert findings == ["Global.title", "Pista1.data:GoPro MET", "Pista2.video:mjpeg", "Capitulos (1)"]
    assert embedded_pictures(probe) == [2]
    assert metadata["Capitulos"] == ["Casa"]


def test_sin_ffmpeg():
    sin = MediaService(Ffmpeg("no-existe-ffmpeg", "no-existe-ffprobe"))
    data = b"\0\0\0\x20ftypisom" + b"\0" * 64
    with pytest.raises(ToolMissing):
        sin.inspect(data)
    with pytest.raises(ToolMissing):
        sin.ffmpeg.strip(None, None)


@needs_ffmpeg
def test_video_corrupto():
    with pytest.raises(InvalidFile, match="ffprobe"):
        service.inspect(b"\0\0\0\x20ftypisom" + b"\0" * 64)


@needs_ffmpeg
def test_timeout_de_ffmpeg(tmp_path):
    lento = Ffmpeg(timeout=0.000001)
    with pytest.raises(InvalidFile, match="tardado"):
        lento.probe(tmp_path / "x.mp4")


@needs_ffmpeg
def test_ffmpeg_que_falla(tmp_path):
    source = tmp_path / "x.mp4"
    source.write_bytes(b"no es video")
    with pytest.raises(InvalidFile):
        Ffmpeg().strip(source, tmp_path / "y.mp4")


# ───────────────────────────────────────────────────────── verificacion
def test_la_verificacion_bloquea_un_archivo_que_sigue_sucio(monkeypatch, jpeg_with_metadata):
    monkeypatch.setattr("data_anonymizer.media.service.clean_image", lambda data, kind: data)
    with pytest.raises(VerificationFailed, match="siguen quedando"):
        service.clean(jpeg_with_metadata)


def test_la_verificacion_bloquea_un_cambio_de_tipo(monkeypatch, jpeg_with_metadata):
    png = image_bytes("PNG")
    monkeypatch.setattr("data_anonymizer.media.service.clean_image", lambda data, kind: png)
    with pytest.raises(VerificationFailed, match="ya no es jpeg"):
        service.clean(jpeg_with_metadata)


def test_riff_utilidad():
    data = riff(b"WAVE", [(b"abcd", b"123")])
    assert data[:4] == b"RIFF" and struct.unpack("<I", data[4:8])[0] == len(data) - 8
    assert KINDS["wav"].mime == "audio/wav"
