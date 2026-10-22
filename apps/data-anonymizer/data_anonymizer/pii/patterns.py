"""Patrones y validadores de PII para texto libre.

Cada reconocedor devuelve tramos (``Span``) con una etiqueta y una puntuacion
de confianza. Los identificadores con digito de control (IBAN, tarjeta, DNI,
NIE) solo se aceptan si el control cuadra: asi un numero de pedido de 16
cifras no se confunde con una tarjeta.

Nota sobre mayusculas: los patrones que se apoyan en la inicial mayuscula de
un nombre propio NO pueden usar ``re.IGNORECASE`` (con el, ``[A-Z]`` acepta
minusculas y el patron se dispara con cualquier frase). Se usa el flag local
``(?i:...)`` solo en la parte de palabras clave.
"""

from __future__ import annotations

import ipaddress
import re
from collections.abc import Callable, Iterable
from dataclasses import dataclass

# ─────────────────────────────────────────────────────────────── etiquetas
NOMBRE = "NOMBRE"
DIRECCION = "DIRECCION"
EMAIL = "EMAIL"
TELEFONO = "TELEFONO"
IBAN = "IBAN"
TARJETA = "TARJETA"
DOC_IDENTIDAD = "DOC_IDENTIDAD"
IP = "IP"
URL = "URL"
MATRICULA = "MATRICULA"
CODIGO_POSTAL = "CODIGO_POSTAL"
COORDENADAS = "COORDENADAS"
LUGAR = "LUGAR"
ORGANIZACION = "ORGANIZACION"
FECHA_NAC = "FECHA_NAC"
SECRETO = "SECRETO"
REDACTADO = "REDACTADO"

#: Lo que el detector sabe buscar en texto libre. LUGAR y ORGANIZACION solo
#: los aporta el NER (spaCy); sin el, simplemente no aparecen.
TEXT_ENTITIES: tuple[str, ...] = (
    NOMBRE, DIRECCION, EMAIL, TELEFONO, IBAN, TARJETA, DOC_IDENTIDAD, IP, URL,
    MATRICULA, CODIGO_POSTAL, COORDENADAS, LUGAR, ORGANIZACION,
)


@dataclass(frozen=True, slots=True)
class Span:
    start: int
    end: int
    label: str
    score: float
    source: str

    @property
    def length(self) -> int:
        return self.end - self.start

    def overlaps(self, other: Span) -> bool:
        return self.start < other.end and other.start < self.end


# ───────────────────────────────────────────────────── piezas de los patrones
UPPER = "A-ZÀ-ÖØ-ÞĀĄĆČĎĐĒĖĘĚĢĪĮĶĹĻĽŁŃŅŇŌŐŒŔŘŚŞŠŢŤŪŮŰŲŸŹŻŽ"
LOWER = "a-zß-öø-ÿāąćčďđēėęěģīįķĺļľłńņňōőœŕřśşšţťūůűųÿźżž"
# El punto queda fuera del cuerpo de la palabra: si no, un nombre al final
# de frase ("...D. Alberto Ruiz. Contacto: ...") arrastraria la siguiente.
WORD_TAIL = r"[\w'’\-]*"
CAP_WORD = rf"[{UPPER}][{LOWER}]{WORD_TAIL}"
CONNECTOR = (
    r"(?i:de\s+la|de\s+los|de\s+las|del|de|dei|degli|della|delle|di|da|dos|das|do|"
    r"d'|la|las|los|el|van\s+der|van|von|y|i|e)"
)

STREET_PREFIXES = [
    # Espanol
    "calle", "c/", "avenida", "avda.", "avda", "av.", "plaza", "pza.", "pza", "paseo",
    "camino", "carretera", "ctra.", "ctra", "ronda", "travesía", "travesia", "callejón",
    "callejon", "cuesta", "glorieta", "polígono", "poligono", "urbanización",
    "urbanizacion", "urb.", "barrio", "pasaje", "rambla", "carrer", "rúa", "rua",
    # Portugues / italiano / frances
    "avenida", "travessa", "largo", "via", "viale", "vicolo", "corso", "piazza",
    "piazzale", "strada", "rue", "boulevard", "bd.", "allée", "impasse", "chemin",
    # Ingles / aleman
    "street", "st.", "road", "rd.", "avenue", "ave.", "lane", "drive", "square",
    "strasse", "straße",
]
_STREET_ALT = "|".join(sorted({re.escape(p) for p in STREET_PREFIXES}, key=len, reverse=True))

# Prefijo de via + nombre propio (1..4 palabras) + numero, piso y puerta opcionales.
# "Calle Mayor 12", "C/ San Fernando 3, 2º B", "Via del Fosso 14", "Rue de Rivoli 8"
_NUMBER_PART = (
    r"(?:,?\s*(?:n[º°o]\.?\s*)?\d{1,4}(?:\s*[-/]\s*\d{1,4})?(?:\s*[A-Za-z]\b)?"
    r"(?:,?\s*\d{1,2}\s*[º°ªoa]\.?(?:\s*[A-Za-z]\b|\s*(?i:izq|izda|dcha|der)\.?)?)?)?"
)
STREET_PATTERN = re.compile(
    rf"(?<![\w/])(?i:{_STREET_ALT})(?:\s*[/.]?\s*|\s+)"
    rf"(?:{CONNECTOR}\s+)*"
    rf"[{UPPER}\d]{WORD_TAIL}"
    rf"(?:\s+(?:{CONNECTOR}\s+)*[{UPPER}]{WORD_TAIL}){{0,3}}"
    rf"{_NUMBER_PART}"
)
# Idiomas con el tipo de via detras: "Brivibas iela 32", "Baker Street 221B",
# "Goethestraße 4" (va pegado y lo cubre el sufijo -strasse/-straße).
STREET_SUFFIX_PATTERN = re.compile(
    rf"\b{CAP_WORD}(?:\s+{CAP_WORD})?\s+"
    r"(?i:street|road|avenue|lane|drive|iela|gatve|ulica|cesta)"
    r"(?:\s*\d{1,4}[a-zA-Z]?)?"
    rf"|\b[{UPPER}][{LOWER}]+(?i:strasse|straße)(?:\s*\d{{1,4}}[a-zA-Z]?)?"
)

EMAIL_PATTERN = re.compile(r"(?<![\w.+-])[\w.+-]+@[\w-]+(?:\.[\w-]+)*\.[A-Za-z]{2,}\b")
URL_PATTERN = re.compile(r"\b(?:https?|ftp)://[^\s<>\"']+|\bwww\.[^\s<>\"']+", re.IGNORECASE)

PHONE_PATTERN = re.compile(
    r"(?<![\w+/.-])"
    r"(?:"
    r"\+\d{1,3}[ .-]?(?:\(\d{1,4}\)[ .-]?)?\d{2,4}(?:[ .-]?\d{2,9}){1,4}"
    r"|\(\d{1,4}\)[ .-]?\d{2,4}(?:[ .-]?\d{2,9}){1,4}"
    r"|\d{2,4}(?:[ .-]\d{2,4}){2,4}"
    r"|\d{9,12}"
    r")(?![\w/-])"
)
_DATE_LIKE = re.compile(r"^\d{1,4}[./-]\d{1,2}[./-]\d{1,4}$")

IBAN_PATTERN = re.compile(r"\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]){11,30}\b")
CARD_PATTERN = re.compile(r"(?<![\d-])\d(?:[ -]?\d){12,18}(?![\d-])")
DNI_PATTERN = re.compile(r"\b(?:\d{8}|[XYZ]\d{7})[-\s]?[A-Z]\b", re.IGNORECASE)
CODICE_FISCALE_PATTERN = re.compile(r"\b[A-Z]{6}\d{2}[A-EHLMPRST]\d{2}[A-Z]\d{3}[A-Z]\b")
SSN_PATTERN = re.compile(r"\b(?!000|666|9\d\d)\d{3}-(?!00)\d{2}-(?!0000)\d{4}\b")
IPV4_PATTERN = re.compile(r"(?<![\d.])(?:\d{1,3}\.){3}\d{1,3}(?![\d.])")
IPV6_PATTERN = re.compile(r"(?<![\w:])(?:[0-9a-fA-F]{1,4}:){2,7}(?::|[0-9a-fA-F]{1,4})(?![\w:])")
COORD_PATTERN = re.compile(r"(?<![\d.])[-+]?\d{1,3}\.\d{4,}\s*[,;]\s*[-+]?\d{1,3}\.\d{4,}(?![\d.])")
PLATE_PATTERN = re.compile(r"\b\d{4}[ -]?[BCDFGHJKLMNPRSTVWXYZ]{3}\b")
# Un codigo postal suelto es indistinguible de cualquier numero de 5 cifras.
# Solo se marca con contexto: "CP 41001", "C.P.: 41001" o "41001 Sevilla".
POSTCODE_PATTERN = re.compile(
    rf"(?:(?<=\b(?i:cp)\s)|(?<=\b(?i:cp):\s)|(?<=\b(?i:c\.p\.)\s)|(?<=(?i:postal)\s)|(?<=(?i:postal):\s))\d{{5}}\b"
    rf"|\b\d{{5}}(?=\s+[{UPPER}][{LOWER}]{{2,}})"
)

PERSON_TITLE_PATTERN = re.compile(
    r"(?<![\w.])(?i:d\.|dña\.?|doña|don|sr\.|sra\.|srta\.|dr\.|dra\.|prof\.|"
    r"mr\.?|mrs\.?|ms\.?|miss|sig\.|sig\.ra|herr|frau|mme\.?|mlle\.?|m\.)\s+"
    rf"{CAP_WORD}(?:\s+(?:{CONNECTOR}\s+)*{CAP_WORD}){{0,3}}"
)


# ───────────────────────────────────────────────────────────── validadores
_DNI_LETTERS = "TRWAGMYFPDXBNJZSQVHLCKE"


def valid_dni(value: str) -> bool:
    raw = re.sub(r"[\s-]", "", value).upper()
    if len(raw) != 9:
        return False
    number = raw[:-1].replace("X", "0").replace("Y", "1").replace("Z", "2")
    if not number.isdigit():
        return False
    return _DNI_LETTERS[int(number) % 23] == raw[-1]


def valid_iban(value: str) -> bool:
    raw = value.replace(" ", "").upper()
    if not 15 <= len(raw) <= 34 or not raw[:2].isalpha() or not raw[2:4].isdigit():
        return False
    rearranged = raw[4:] + raw[:4]
    digits = "".join(str(int(char, 36)) for char in rearranged)
    return int(digits) % 97 == 1


def luhn_ok(value: str) -> bool:
    digits = [int(c) for c in value if c.isdigit()]
    if not 13 <= len(digits) <= 19 or len(set(digits)) == 1:
        return False
    checksum = 0
    for index, digit in enumerate(reversed(digits)):
        if index % 2 == 1:
            digit *= 2
            if digit > 9:
                digit -= 9
        checksum += digit
    return checksum % 10 == 0


def valid_ipv4(value: str) -> bool:
    try:
        ipaddress.IPv4Address(value)
    except ValueError:
        return False
    # Las versiones de software tambien son "1.2.3.4"; descartar las que
    # empiezan por 0 reduce falsos positivos sin perder IPs reales.
    return not value.startswith("0.")


def valid_ipv6(value: str) -> bool:
    try:
        ipaddress.IPv6Address(value)
    except ValueError:
        return False
    return True


def plausible_phone(value: str) -> bool:
    if _DATE_LIKE.match(value.strip()):
        return False
    digits = sum(c.isdigit() for c in value)
    return 9 <= digits <= 15


def plausible_coordinates(value: str) -> bool:
    try:
        lat, lon = (float(p) for p in re.split(r"\s*[,;]\s*", value.strip()))
    except ValueError:
        return False
    return abs(lat) <= 90 and abs(lon) <= 180


# ─────────────────────────────────────────────────────── reconocedores regex
@dataclass(frozen=True)
class RegexRecognizer:
    label: str
    pattern: re.Pattern[str]
    score: float
    validator: Callable[[str], bool] | None = None
    name: str = "regex"

    def find(self, text: str) -> Iterable[Span]:
        for match in self.pattern.finditer(text):
            end = self._validated_end(match.group(0))
            if end is not None:
                yield Span(match.start(), match.start() + end, self.label, self.score, self.name)

    def _validated_end(self, value: str) -> int | None:
        """Longitud valida del match, recortando por la derecha si hace falta.

        Los patrones de numeros agrupados son voraces: en "ES91 2100 0418 4502
        0005 1332 BANCO" el grupo final se come "BANC" y el control falla. En
        lugar de descartar el match entero se prueba a cortarlo en cada
        separador, de mas largo a mas corto.
        """
        if self.validator is None or self.validator(value):
            return len(value)
        cuts = [m.start() for m in re.finditer(r"[ \-]", value)]
        for cut in reversed(cuts):
            candidate = value[:cut].rstrip()
            if candidate and self.validator(candidate):
                return len(candidate)
        return None


RECOGNIZERS: tuple[RegexRecognizer, ...] = (
    RegexRecognizer(URL, URL_PATTERN, 0.95, name="url"),
    RegexRecognizer(EMAIL, EMAIL_PATTERN, 0.99, name="email"),
    RegexRecognizer(IBAN, IBAN_PATTERN, 0.99, valid_iban, name="iban"),
    RegexRecognizer(TARJETA, CARD_PATTERN, 0.97, luhn_ok, name="luhn"),
    RegexRecognizer(DOC_IDENTIDAD, DNI_PATTERN, 0.98, valid_dni, name="dni_nie"),
    RegexRecognizer(DOC_IDENTIDAD, CODICE_FISCALE_PATTERN, 0.95, name="codice_fiscale"),
    RegexRecognizer(DOC_IDENTIDAD, SSN_PATTERN, 0.85, name="ssn"),
    RegexRecognizer(IP, IPV4_PATTERN, 0.9, valid_ipv4, name="ipv4"),
    RegexRecognizer(IP, IPV6_PATTERN, 0.9, valid_ipv6, name="ipv6"),
    RegexRecognizer(COORDENADAS, COORD_PATTERN, 0.95, plausible_coordinates, name="coords"),
    RegexRecognizer(MATRICULA, PLATE_PATTERN, 0.85, name="matricula_es"),
    RegexRecognizer(DIRECCION, STREET_SUFFIX_PATTERN, 0.85, name="via_sufijo"),
    RegexRecognizer(DIRECCION, STREET_PATTERN, 0.88, name="via_prefijo"),
    RegexRecognizer(NOMBRE, PERSON_TITLE_PATTERN, 0.88, name="tratamiento"),
    RegexRecognizer(CODIGO_POSTAL, POSTCODE_PATTERN, 0.8, name="cp_contexto"),
    RegexRecognizer(TELEFONO, PHONE_PATTERN, 0.75, plausible_phone, name="telefono"),
)
