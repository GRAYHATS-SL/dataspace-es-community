"""Transformaciones de valores sueltos: enmascarar, redondear, truncar fechas."""

from __future__ import annotations

import re
from typing import Any


def mask(value: str, *, keep_start: int = 0, keep_end: int = 0, char: str = "*") -> str:
    """Enmascara conservando longitud, espacios y signos de puntuacion.

    ``mask("4111 1111 1111 1234", keep_end=4)`` -> ``"**** **** **** 1234"``
    ``mask("Laura Gómez", keep_start=1)``      -> ``"L**** *****"``
    """
    if not isinstance(value, str) or not value:
        return value
    positions = [i for i, c in enumerate(value) if c.isalnum()]
    visible = set(positions[:keep_start]) | set(positions[len(positions) - keep_end:] if keep_end else [])
    return "".join(c if (i in visible or not c.isalnum()) else char for i, c in enumerate(value))


def mask_words(value: str, char: str = "*") -> str:
    """Primera letra de cada palabra visible: 'Laura Gómez' -> 'L**** G****'."""
    return re.sub(r"\w+", lambda m: m.group(0)[0] + char * (len(m.group(0)) - 1), value)


_NUMBER = re.compile(r"^\s*[-+]?\d+(?:\.\d+)?\s*$")


def is_numeric(value: Any) -> bool:
    if isinstance(value, bool):
        return False
    return isinstance(value, int | float) or (isinstance(value, str) and bool(_NUMBER.match(value)))


def round_value(value: Any, decimals: int) -> Any:
    """Redondea numeros y cadenas numericas; deja intacto lo demas.

    Con 2 decimales una coordenada queda en ~1 km, con 1 en ~11 km.
    """
    if isinstance(value, bool):
        return value
    if isinstance(value, int | float):
        rounded = round(float(value), decimals)
        return int(rounded) if decimals == 0 else rounded
    if isinstance(value, str) and _NUMBER.match(value):
        rounded = round(float(value), decimals)
        return str(int(rounded)) if decimals == 0 else f"{rounded:.{decimals}f}"
    return value


_ISO = re.compile(r"^\s*(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?(?:[T ][\d:.]+(?:Z|[+-]\d{2}:?\d{2})?)?\s*$")
_EUROPEAN = re.compile(r"^\s*(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\s*$")


def truncate_date(value: Any, precision: str) -> str | None:
    """Deja solo el año, el año y el mes, o la fecha sin hora.

    Devuelve None si el valor no es una fecha reconocible (el llamante decide
    entonces si censurarlo).
    """
    if not isinstance(value, str):
        return None
    year = month = day = None
    if match := _ISO.match(value):
        year, month, day = match.group(1), match.group(2), match.group(3)
    elif match := _EUROPEAN.match(value):
        day, month, year = f"{int(match.group(1)):02d}", f"{int(match.group(2)):02d}", match.group(3)
    else:
        return None
    if month is not None and not 1 <= int(month) <= 12:
        return None
    if precision == "year" or month is None:
        return year
    if precision == "month" or day is None:
        return f"{year}-{month}"
    return f"{year}-{month}-{day}"
