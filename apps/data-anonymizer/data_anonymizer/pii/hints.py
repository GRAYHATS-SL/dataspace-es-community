"""Pistas por nombre de clave: ``"email": ...`` es un correo diga lo que diga.

En modo generico el nombre del campo es a menudo mejor senal que el valor:
``"telefono": "957"`` no cumple el formato de un telefono, pero sigue siendo
un dato que no debe salir. Las claves se normalizan (minusculas, sin tildes ni
separadores) para que ``first_name``, ``firstName`` y ``First-Name`` coincidan.

Hay dos fuerzas:

* **fuerte**: la clave no deja lugar a dudas (``apellidos``, ``iban``). Se
  sustituye el valor entero, tenga la forma que tenga.
* **debil**: la clave suele ser PII pero no siempre (``name`` puede ser el
  nombre de un producto). Solo se sustituye entero si el valor *parece* una
  persona; si no, se le pasa el detector normal.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from .names import fold
from .patterns import (
    CODIGO_POSTAL,
    COORDENADAS,
    DIRECCION,
    DOC_IDENTIDAD,
    EMAIL,
    FECHA_NAC,
    IBAN,
    IP,
    NOMBRE,
    SECRETO,
    TARJETA,
    TELEFONO,
)


@dataclass(frozen=True)
class KeyHint:
    label: str
    strong: bool


def normalize_key(key: str) -> str:
    return re.sub(r"[^a-z0-9]", "", fold(key))


_STRONG: dict[str, tuple[str, ...]] = {
    NOMBRE: (
        "firstname", "lastname", "surname", "givenname", "familyname", "middlename", "fullname",
        "nombrecompleto", "nombreyapellidos", "apellido", "apellidos", "apellido1", "apellido2",
        "primerapellido", "segundoapellido", "customername", "clientname", "patientname",
        "contactname", "cardholder", "cardholdername", "holdername", "nombrecliente",
        "nombrecontacto", "nombretitular", "nombrepaciente", "titular", "username", "nickname",
    ),
    EMAIL: ("email", "mail", "emailaddress", "correo", "correoelectronico", "emails"),
    TELEFONO: ("phone", "phonenumber", "telephone", "telefono", "tel", "movil", "mobile",
               "celular", "fax", "whatsapp", "telefonos", "phones"),
    DIRECCION: ("address", "streetaddress", "addressline1", "addressline2", "direccion",
                "domicilio", "calle", "street", "billingaddress", "shippingaddress",
                "direccionpostal", "direccionenvio", "homeaddress"),
    DOC_IDENTIDAD: ("dni", "nie", "nif", "passport", "pasaporte", "passportnumber", "ssn",
                    "socialsecuritynumber", "nss", "numeroseguridadsocial", "documento",
                    "documentoidentidad", "idcard", "nationalid", "taxid", "cif"),
    IBAN: ("iban", "bankaccount", "accountnumber", "cuentabancaria", "numerocuenta", "ccc",
           "swiftiban"),
    TARJETA: ("cardnumber", "creditcard", "creditcardnumber", "tarjeta", "numerotarjeta",
              "pan", "cvv", "cvc"),
    IP: ("ip", "ipaddress", "clientip", "remoteip", "remoteaddr", "remoteaddress", "sourceip",
         "xforwardedfor", "direccionip"),
    FECHA_NAC: ("birthdate", "dateofbirth", "dob", "birthday", "fechanacimiento",
                "fechadenacimiento", "nacimiento"),
    CODIGO_POSTAL: ("zip", "zipcode", "postalcode", "postcode", "cp", "codigopostal"),
    COORDENADAS: ("lat", "lng", "lon", "long", "latitude", "longitude", "latitud", "longitud",
                  "coordinates", "coordenadas", "geo", "gps"),
    SECRETO: ("password", "passwd", "pwd", "contrasena", "secret", "token",
              "accesstoken", "refreshtoken", "apikey", "authorization", "privatekey",
              "sessionid", "cookie", "pin"),
}

_WEAK: dict[str, tuple[str, ...]] = {
    NOMBRE: ("name", "nombre", "contact", "contacto", "owner", "propietario", "author",
             "autor", "person", "persona", "responsable", "user", "usuario", "cliente",
             "customer", "employee", "empleado", "paciente", "patient", "remitente",
             "destinatario", "sender", "recipient", "firmante", "signer"),
}

# Sufijos: "customerEmail", "contactPhone", "billing_address", "userIp".
_SUFFIXES: tuple[tuple[str, str], ...] = (
    ("email", EMAIL), ("mail", EMAIL), ("correo", EMAIL),
    ("phone", TELEFONO), ("telefono", TELEFONO), ("mobile", TELEFONO), ("movil", TELEFONO),
    ("address", DIRECCION), ("direccion", DIRECCION), ("domicilio", DIRECCION),
    ("firstname", NOMBRE), ("lastname", NOMBRE), ("fullname", NOMBRE), ("apellidos", NOMBRE),
    ("password", SECRETO), ("token", SECRETO), ("secret", SECRETO), ("apikey", SECRETO),
    ("iban", IBAN), ("dni", DOC_IDENTIDAD), ("nif", DOC_IDENTIDAD), ("ssn", DOC_IDENTIDAD),
    ("birthdate", FECHA_NAC), ("dateofbirth", FECHA_NAC), ("fechanacimiento", FECHA_NAC),
    ("ipaddress", IP), ("zipcode", CODIGO_POSTAL), ("postalcode", CODIGO_POSTAL),
    ("latitude", COORDENADAS), ("longitude", COORDENADAS),
)

_EXACT: dict[str, KeyHint] = {}
for _label, _keys in _STRONG.items():
    for _key in _keys:
        _EXACT[_key] = KeyHint(_label, True)
for _label, _keys in _WEAK.items():
    for _key in _keys:
        _EXACT.setdefault(_key, KeyHint(_label, False))

# Claves que acaban como una pista pero no lo son ("domain" no es "ip"...).
# Se comparan como clave exacta normalizada.
_NOT_HINTS = frozenset({
    "emailverified", "emailenabled", "phoneverified", "addressvalidated", "macaddress",
    "ipversion", "hostname", "filename",
})


def hint_for_key(key: object) -> KeyHint | None:
    if not isinstance(key, str) or not key:
        return None
    normalized = normalize_key(key)
    if not normalized or normalized in _NOT_HINTS:
        return None
    if normalized in _EXACT:
        return _EXACT[normalized]
    for suffix, label in _SUFFIXES:
        if normalized.endswith(suffix) and len(normalized) > len(suffix):
            return KeyHint(label, True)
    return None
