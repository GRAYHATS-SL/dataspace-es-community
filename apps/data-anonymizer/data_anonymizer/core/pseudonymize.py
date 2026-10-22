"""Pseudonimizacion determinista con HMAC-SHA256.

El mismo valor produce SIEMPRE el mismo alias mientras el secreto
(``ANON_SECRET``) no cambie, y el alias no permite recuperar el original. Eso
mantiene los datos agrupables y cruzables entre peticiones (el mismo cliente
tiene el mismo alias en la ficha y en sus pedidos) sin revelar el valor real.

Por que HMAC y no un hash simple: el hash sin clave de un conjunto pequeno de
valores (nombres de pila, DNIs de una provincia, calles de una ciudad) se
revierte por fuerza bruta en segundos. Con HMAC, sin el secreto no hay ataque
de diccionario posible.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import re

_B32_PADDING = re.compile(r"=+$")


class Pseudonymizer:
    """Genera alias estables a partir de una clave secreta."""

    def __init__(self, secret: str, alias_length: int = 8) -> None:
        if not secret:
            raise ValueError("El secreto de pseudonimizacion no puede estar vacio")
        if alias_length < 4:
            raise ValueError("Un alias de menos de 4 caracteres colisiona demasiado")
        self._key = secret.encode("utf-8")
        self.alias_length = alias_length

    def digest(self, value: str, *, namespace: str = "") -> bytes:
        message = f"{namespace}\x00{value}".encode()
        return hmac.new(self._key, message, hashlib.sha256).digest()

    def token(self, value: str, *, namespace: str = "", length: int | None = None) -> str:
        """Token base32 corto y determinista: legible y apto para URLs.

        ``namespace`` separa dominios: con namespaces distintos, el mismo texto
        produce alias distintos y no se puede correlacionar un campo con otro.
        """
        encoded = base64.b32encode(self.digest(value, namespace=namespace)).decode("ascii")
        return _B32_PADDING.sub("", encoded)[: length or self.alias_length]

    def hexdigest(self, value: str, *, namespace: str = "", length: int = 64) -> str:
        return self.digest(value, namespace=namespace).hex()[:length]

    def alias(self, value: object, *, namespace: str = "", prefix: str = "") -> str:
        """Alias con prefijo legible, p. ej. ``CLI-4KJ7QAXM``."""
        if value is None or str(value).strip() == "":
            return ""
        return f"{prefix}{self.token(str(value), namespace=namespace)}"

    def pseudonymize_id(
        self,
        identifier: str,
        *,
        namespace: str = "id",
        preserve: tuple[str, ...] = (),
        separators: str = "-_:./",
    ) -> str:
        """Pseudonimiza un identificador conservando su estructura.

        Muchos identificadores llevan informacion tecnica que el consumidor
        necesita (``urn:example:sensor:...``, ``order-2024-000123``,
        ``tenant/eu/device-07``). Hashear el id entero rompe filtros y
        agrupaciones; aqui se conservan los separadores, los segmentos
        puramente numericos y los declarados en ``preserve``, y solo se
        sustituye el resto.

            cliente-juan-perez-0042  ->  cliente-K3D9XQ2M-7TMD2CQA-0042
                                         (con preserve=["cliente"])
        """
        if not identifier:
            return ""
        keep = {token.lower() for token in preserve if token}
        splitter = re.compile(f"([{re.escape(separators)}])") if separators else None
        parts = splitter.split(identifier) if splitter else [identifier]
        out: list[str] = []
        for part in parts:
            if part == "" or (separators and part in separators) or part.isdigit() or part.lower() in keep:
                out.append(part)
            else:
                out.append(self.token(part.lower(), namespace=f"{namespace}:segment"))
        return "".join(out)
