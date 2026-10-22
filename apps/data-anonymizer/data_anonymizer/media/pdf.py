"""Metadatos de PDF: diccionario /Info, XMP, autores de comentarios y restos.

Lo que se elimina:

* ``/Info`` del trailer (Author, Creator, Producer, Title, fechas...).
* El flujo XMP del catalogo y los de cada pagina, imagen o fuente.
* ``/PieceInfo``: datos privados que guardan Illustrator, Acrobat y otros.
* El autor (``/T``) de las anotaciones de revision: el nombre de quien
  escribio cada comentario. En los campos de formulario ``/T`` es el nombre
  del campo y se deja, porque quitarlo rompe el formulario.
* Las revisiones antiguas: el PDF se reescribe entero, asi que desaparecen
  las actualizaciones incrementales que conservaban metadatos anteriores.

Lo que NO se toca, porque es contenido y no metadatos: el texto, los
adjuntos y los formularios. Los adjuntos se avisan en ``warnings``.
"""

from __future__ import annotations

import io
import re
from typing import Any

import pikepdf

from .base import Inspection, InvalidFile, UnsupportedFile, printable
from .sniff import FileKind

_PRIVATE_KEYS = ("/Metadata", "/PieceInfo")
_XMP_FIELDS = re.compile(
    rb"<(dc:creator|dc:title|dc:description|xmp:CreatorTool|pdf:Producer|pdf:Author|"
    rb"xmp:CreateDate|xmp:ModifyDate|xmpMM:DocumentID|xmpMM:InstanceID|photoshop:AuthorsPosition)"
    rb"[^>]*>(.*?)</\1>",
    re.DOTALL,
)


def _open(data: bytes) -> pikepdf.Pdf:
    try:
        return pikepdf.open(io.BytesIO(data))
    except pikepdf.PasswordError:
        raise UnsupportedFile("PDF protegido con contrasena: no se puede reescribir") from None
    except pikepdf.PdfError as exc:
        raise InvalidFile(f"PDF ilegible: {exc}") from None


def _is_markup_annotation(annot: Any) -> bool:
    return isinstance(annot, pikepdf.Dictionary) and annot.get("/Subtype") != pikepdf.Name.Widget


def _xmp_summary(stream: pikepdf.Stream) -> dict[str, Any]:
    try:
        raw = stream.read_bytes()
    except pikepdf.PdfError:  # pragma: no cover - flujo corrupto
        return {"XMP": "<ilegible>"}
    fields = {}
    for match in _XMP_FIELDS.finditer(raw):
        text = re.sub(rb"<[^>]+>", b" ", match.group(2)).decode("utf-8", "replace")
        fields[match.group(1).decode()] = printable(" ".join(text.split()))
    return fields or {"XMP": f"<{len(raw)} bytes>"}


def inspect_pdf(data: bytes, kind: FileKind) -> Inspection:
    metadata: dict[str, Any] = {}
    findings: list[str] = []
    warnings: list[str] = []
    with _open(data) as pdf:
        info = pdf.trailer.get("/Info")
        if isinstance(info, pikepdf.Dictionary) and len(info.keys()):
            metadata["Info"] = {str(k)[1:]: printable(str(v)) for k, v in info.items()}
            findings += [f"Info.{str(k)[1:]}" for k in info]
        root_xmp = pdf.Root.get("/Metadata")
        if isinstance(root_xmp, pikepdf.Stream):
            metadata["XMP"] = _xmp_summary(root_xmp)
            findings.append("XMP")
        nested = 0
        for obj in pdf.objects:
            if isinstance(obj, pikepdf.Dictionary | pikepdf.Stream) and obj.objgen != pdf.Root.objgen:
                nested += sum(1 for key in _PRIVATE_KEYS if key in obj)
        if "/PieceInfo" in pdf.Root:
            nested += 1
        if nested:
            findings.append(f"Metadatos internos en {nested} objetos (XMP/PieceInfo)")
        authors: set[str] = set()
        for page in pdf.pages:
            for annot in page.get("/Annots", []) or []:
                if _is_markup_annotation(annot) and "/T" in annot:
                    authors.add(str(annot["/T"]))
        if authors:
            metadata["Autores de comentarios"] = sorted(authors)
            findings.append("Anotaciones.autor")
        if pdf.attachments:
            warnings.append(f"El PDF lleva {len(pdf.attachments)} adjunto(s); no se modifican.")
    return Inspection(kind, metadata, findings, warnings)


def clean_pdf(data: bytes, kind: FileKind) -> bytes:
    with _open(data) as pdf:
        if "/Info" in pdf.trailer:
            del pdf.trailer["/Info"]
        for obj in pdf.objects:
            if isinstance(obj, pikepdf.Dictionary | pikepdf.Stream):
                for key in _PRIVATE_KEYS:
                    if key in obj:
                        del obj[key]
        for page in pdf.pages:
            for annot in page.get("/Annots", []) or []:
                if _is_markup_annotation(annot) and "/T" in annot:
                    del annot["/T"]
        out = io.BytesIO()
        # deterministic_id: el /ID se calcula del contenido y no de la hora o
        # la ruta del fichero original. Sin XMP no hay version que arreglar.
        pdf.save(out, deterministic_id=True, fix_metadata_version=False)
    return out.getvalue()
