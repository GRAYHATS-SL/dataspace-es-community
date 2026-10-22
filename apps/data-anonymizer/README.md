# data-anonymizer

API para anonimizar datos **antes** de compartirlos, publicarlos o usarlos en
entornos de prueba:

- **JSON** con reglas por campo que tú configuras (o sin configurar nada).
- **Texto libre**: detecta nombres, direcciones, emails, teléfonos, IBAN,
  tarjetas, DNI/NIE, IPs... y los sustituye.
- **Archivos**: elimina los metadatos de imágenes, PDF, audio y vídeo (GPS,
  autor, cámara, software, comentarios...).

No llama a ningún servicio externo ni guarda nada: lo que entra se procesa en
memoria y se devuelve.

```text
POST /v1/json        {"cliente": {"nombre": "Laura Gómez", "email": "laura@example.com"}}
                  →  {"cliente": {"nombre": "[NOMBRE]",    "email": "[EMAIL]"}}

POST /v1/text        "Soy Laura Gómez y vivo en Calle Mayor 12, 28013 Madrid"
                  →  "Soy [NOMBRE] y vivo en [DIRECCION], [CODIGO_POSTAL] Madrid"

POST /v1/file        foto.jpg (con GPS, cámara y autor)  →  foto.jpg sin metadatos
```

---

## Índice

1. [Puesta en marcha](#puesta-en-marcha)
2. [Uso de la API](#uso-de-la-api)
3. [Políticas: qué anonimizar en tu JSON](#políticas-qué-anonimizar-en-tu-json)
4. [Detección automática de PII](#detección-automática-de-pii)
5. [Metadatos de archivos](#metadatos-de-archivos)
6. [Configuración](#configuración)
7. [Seguridad y límites](#seguridad-y-límites)
8. [Desarrollo](#desarrollo)

---

## Puesta en marcha

### Con Docker (recomendado)

```bash
git clone <url-del-repositorio> data-anonymizer
cd data-anonymizer
cp .env.example .env          # y cambia ANON_SECRET (ver más abajo)
docker compose up -d --build
```

La API queda en `http://localhost:8080` y la documentación interactiva
(Swagger) en `http://localhost:8080/docs`.

Para activar el reconocimiento de entidades con spaCy (mejor detección de
nombres y lugares), en `docker-compose.yml` pon `WITH_NER: "true"` y en `.env`
`NER_MODEL=es_core_news_md`.

### Sin Docker (Python 3.11 o superior)

```bash
python -m venv .venv
# Windows:      .venv\Scripts\activate
# Linux/macOS:  source .venv/bin/activate
pip install -e .
cp .env.example .env          # en Windows: copy .env.example .env
uvicorn data_anonymizer.main:app --port 8080
```

- **Vídeo**: necesita [ffmpeg](https://ffmpeg.org/download.html) en el `PATH`
  (o `FFMPEG_PATH`/`FFPROBE_PATH`). Sin él, todo lo demás funciona y los vídeos
  responden `501`.
- **NER (opcional)**: `pip install -e ".[ner]"` y
  `python -m spacy download es_core_news_md`, y después `NER_MODEL=es_core_news_md`.

Comprueba que está vivo:

```bash
curl http://localhost:8080/health
# {"status":"ok","version":"1.0.0","ner":{"active":false,"model":null},
#  "ffmpeg":true,"policies":["auto","ejemplo","estricta"],"stable_aliases":true}
```

---

## Uso de la API

| Método | Ruta | Qué hace |
|---|---|---|
| `POST` | `/v1/json?policy=<nombre>&report=<bool>` | Anonimiza el JSON del cuerpo. |
| `POST` | `/v1/text` | Anonimiza texto libre y dice dónde estaba la PII. |
| `POST` | `/v1/file` | Devuelve el archivo sin metadatos. |
| `POST` | `/v1/file/inspect` | Lista los metadatos de un archivo sin tocarlo. |
| `GET` | `/v1/policies` · `/v1/policies/{nombre}` | Políticas cargadas. |
| `GET` | `/health` | Estado (siempre abierto, sin clave). |

### JSON

```bash
curl -X POST "http://localhost:8080/v1/json?policy=ejemplo&report=true" \
     -H "Content-Type: application/json" \
     --data-binary @examples/clientes.json
```

El JSON vuelve con **la misma forma**; solo cambian los valores. Con
`report=true` la respuesta es `{"data": ..., "report": ...}` y el informe dice
cuántos valores se han cambiado y qué tipos de PII se han encontrado (nunca
incluye los valores originales).

### Texto

```bash
curl -X POST http://localhost:8080/v1/text \
     -H "Content-Type: application/json" \
     -d '{"text": "Soy Laura Gómez, mi móvil es 612 345 678"}'
```

```json
{
  "text": "Soy [NOMBRE], mi móvil es [TELEFONO]",
  "entities": [
    {"label": "NOMBRE",   "start": 4,  "end": 15, "score": 0.72, "source": "nombres_de_pila"},
    {"label": "TELEFONO", "start": 29, "end": 40, "score": 0.75, "source": "telefono"}
  ]
}
```

`start`/`end` son posiciones en el texto **original**. Admite `"policy"` para
usar la configuración de detección de otra política.

### Archivos

```bash
# Limpiar
curl -X POST http://localhost:8080/v1/file -F "file=@foto.jpg" -o foto-limpia.jpg -D -

# Ver qué metadatos tiene (antes o después)
curl -X POST http://localhost:8080/v1/file/inspect -F "file=@foto.jpg"
```

```json
{
  "type": "jpeg",
  "mime": "image/jpeg",
  "metadata": {"EXIF": {"Make": "Canon", "Model": "EOS 5D"}, "GPS": {"GPSLatitude": [37, 53, 17]}},
  "findings": ["EXIF.Make", "EXIF.Model", "GPS.GPSLatitude", "JPEG.APP1.XMP"],
  "warnings": []
}
```

La respuesta de `/v1/file` lleva las cabeceras `X-File-Type` y
`X-Metadata-Removed` (número de campos eliminados), y se descarga como
`anonimizado.<ext>` para no reenviar un nombre de fichero que podría contener
datos personales.

### Códigos de error

| Código | Cuándo |
|---|---|
| `400` | El cuerpo no es JSON válido. |
| `401` | Falta `X-API-Key` o no es válida (solo si hay `API_KEYS`). |
| `404` | La política pedida no existe. |
| `413` | Supera `MAX_JSON_MB` o `MAX_UPLOAD_MB`. |
| `415` | Tipo de archivo no soportado. |
| `422` | Archivo corrupto, vacío o ilegible; PDF con contraseña. |
| `500` | La verificación encontró metadatos tras limpiar: **no se entrega el archivo**. |
| `501` | Es un vídeo y no hay ffmpeg. |

---

## Políticas: qué anonimizar en tu JSON

Una política es un fichero YAML en la carpeta `policies/`. El nombre del
fichero es el nombre de la política (`policies/clientes.yaml` →
`?policy=clientes`). Se incluyen tres:

| Política | Para qué |
|---|---|
| `auto` | Sin configurar nada: detección automática en todos los textos. Es la de por defecto. |
| `ejemplo` | Ejemplo comentado con todas las acciones, pensado para `examples/clientes.json`. **Cópiala como plantilla.** |
| `estricta` | Lista blanca: todo texto no declarado se censura entero. |

### Cómo se decide qué hacer con cada valor

1. **La primera regla de `fields` cuya ruta coincide** (como en un
   cortafuegos: pon las excepciones concretas antes que las generales). Si la
   ruta apunta a un objeto o lista, la acción se aplica a todo su contenido.
2. Si ninguna coincide, **el nombre de la clave** (`email`, `telefono`,
   `apellidos`, `iban`, `lat`, `fechaNacimiento`, `password`...), si
   `defaults.key_hints` está activo.
3. Si tampoco, **el valor por defecto según el tipo**: `defaults.strings`,
   `defaults.numbers`, `defaults.booleans`.

### Estructura

```yaml
description: Lo que verás en GET /v1/policies

defaults:
  strings: detect          # keep | detect | redact | drop
  numbers: keep            # keep | redact | drop
  booleans: keep
  key_hints: true          # usar el nombre de la clave como pista
  coordinates_decimals: 2  # claves lat/lng/coordinates: 2 decimales ≈ 1 km
  birthdate_precision: year

detection:
  entities: [NOMBRE, DIRECCION, EMAIL, TELEFONO, IBAN, TARJETA, DOC_IDENTIDAD,
             IP, URL, MATRICULA, CODIGO_POSTAL, COORDENADAS, LUGAR, ORGANIZACION]
  ner: auto                # auto | on (falla al arrancar si no hay modelo) | off
  replacement: label       # label "[NOMBRE]" | pseudo "NOMBRE-4KJ7QAXM" | mask "L**** G****"
  label_format: "[{label}]"
  min_score: 0.5
  extra_terms: []          # se censuran siempre
  allow_terms: []          # no se censuran nunca (falsos positivos conocidos)

fields:
  - path: cliente.email
    action: mask
    keep_end: 3
```

### Rutas

| Ruta | Coincide con |
|---|---|
| `cliente.email` | La clave `email` dentro de `cliente`. |
| `pedidos[*].tarjeta` | `tarjeta` en cualquier elemento de `pedidos`. |
| `pedidos[0].tarjeta` | Solo en el primero. |
| `pedidos.tarjeta` | Igual que `pedidos[*].tarjeta`: los índices son opcionales. |
| `cliente.*` | Cualquier clave directa de `cliente`. |
| `**.email` | `email` a cualquier profundidad. |
| `["clave.con.puntos"]` | Claves con caracteres especiales. |

### Acciones

| Acción | Parámetros | Ejemplo |
|---|---|---|
| `keep` | — | se deja igual (y no se analiza) |
| `drop` | — | la clave desaparece; en listas, el elemento |
| `redact` | `label` | `"[REDACTADO]"`, `"[SECRETO]"` |
| `replace` | `value` | cualquier valor fijo: `null`, `""`, `0` |
| `pseudo` | `prefix`, `namespace`, `length` | `"Laura Gómez"` → `"CLI-4KJ7QAXM"` |
| `pseudo_id` | `preserve`, `separators`, `namespace` | `"cli-laura-gomez-000123"` → `"cli-7W4SFSX6-CY7G7MOQ-000123"` |
| `hash` | `length`, `namespace` | HMAC-SHA256 en hexadecimal |
| `mask` | `keep_start`, `keep_end`, `mask_char` | `"4111 1111 1111 1234"` → `"**** **** **** 1234"` |
| `detect` | — | `"Llamar a Laura al 612 345 678"` → `"Llamar a [NOMBRE] al [TELEFONO]"` |
| `round` | `decimals` | `37.888213` → `37.89` |
| `date` | `precision` (`year`/`month`/`day`) | `"1985-04-12"` → `"1985"` |

**Alias deterministas.** `pseudo`, `pseudo_id`, `hash` y el estilo
`replacement: pseudo` dan siempre el mismo resultado para el mismo valor
mientras `ANON_SECRET` no cambie. Así los datos siguen siendo cruzables: el
cliente de un pedido tiene el mismo alias que en su ficha. Si **no** quieres
que dos campos se puedan relacionar, dales `namespace` distintos.

**Validación.** Las políticas se validan al arrancar. Un error de escritura
(acción inexistente, clave mal puesta, ruta que no se entiende) impide el
arranque con un mensaje que dice el fichero y el campo, en vez de anonimizar
mal en silencio.

---

## Detección automática de PII

Con `strings: detect` (y en `/v1/text`) cada texto pasa por varios
reconocedores; si dos encuentran algo en el mismo sitio, gana el de mayor
confianza.

| Etiqueta | Cómo se detecta |
|---|---|
| `EMAIL`, `URL` | Patrón. |
| `IBAN` | Patrón **y** dígito de control mod-97. |
| `TARJETA` | 13–19 dígitos **y** algoritmo de Luhn. |
| `DOC_IDENTIDAD` | DNI/NIE con letra de control, codice fiscale italiano, SSN de EE. UU. |
| `TELEFONO` | Formatos nacionales e internacionales, 9–15 dígitos; se descartan fechas. |
| `IP` | IPv4 e IPv6 válidas. |
| `COORDENADAS` | Pares `lat, lon` con 4+ decimales dentro de rango. |
| `MATRICULA` | Formato español actual (`1234 BCD`). |
| `CODIGO_POSTAL` | 5 cifras **con contexto** (`CP 28013`, `28013 Madrid`); suelto no. |
| `DIRECCION` | Tipo de vía + nombre + número/piso (ES, CA, GL, PT, IT, FR, EN, DE, LV...). |
| `NOMBRE` | Tratamiento (`D.`, `Sra.`, `Dr.`, `Mr.`...) + nombre, o **nombre de pila conocido + apellido**. Con NER, también nombres sin esas pistas. |
| `LUGAR`, `ORGANIZACION` | Solo con NER (spaCy). |

Además, en JSON, el **nombre de la clave** es una pista: `"telefono": "957"`
se censura aunque no tenga forma de teléfono. Las claves se comparan sin
mayúsculas, tildes ni separadores (`first_name` = `firstName` = `First-Name`).
Las pistas ambiguas (`name`, `contacto`, `owner`) solo se aplican si el valor
parece de verdad una persona, para no destrozar `"name": "Sensor Norte"`.

### Límites (léelos)

La detección automática **reduce** el riesgo, no lo elimina:

- Un apellido suelto o un nombre poco común sin tratamiento delante
  (`"Ayer Ximénez dijo..."`) solo lo encuentra el NER, y el NER también falla.
- Los nombres que son palabras corrientes (Rosa, Pilar, Domingo) solo se marcan
  seguidos de apellido; a cambio, `"Rosa Mosqueta"` saldría como nombre (usa
  `allow_terms`).
- Datos indirectos (profesión + pueblo + edad) pueden identificar a alguien
  sin contener ningún dato "personal" por sí solos. Eso no lo detecta ninguna
  herramienta automática.

Para datos que se van a **publicar**, usa reglas explícitas o la política
`estricta`, y revisa una muestra del resultado. El NER mejora mucho la
detección de nombres: `es_core_news_md` o `es_core_news_lg` son bastante más
precisos que `_sm`. El diccionario de nombres de pila
(`data_anonymizer/pii/data/nombres.txt`) se amplía con `DETECTION_NAMES_FILE`.

---

## Metadatos de archivos

El tipo se detecta por el **contenido** del archivo, no por la extensión.

| Formato | Qué se elimina | Cómo |
|---|---|---|
| JPEG | EXIF (GPS, cámara, nº de serie, fechas, autor), XMP, IPTC, comentarios, miniaturas, datos tras el final de imagen (fotos en movimiento) | Sin recomprimir. Se conserva la orientación. |
| PNG | `tEXt`/`zTXt`/`iTXt`, `eXIf`, `tIME` y chunks privados | Sin recomprimir. |
| WebP | `EXIF` y `XMP` | Sin recomprimir. |
| GIF, TIFF | Comentarios, XMP, etiquetas de autor/software | Reconstruido sin pérdida. |
| PDF | `/Info`, XMP de todo el documento, `/PieceInfo`, autor de los comentarios, revisiones antiguas | Reescrito entero. |
| MP3 | ID3v1, ID3v2 (incluida carátula), APEv2 | Sin recodificar. |
| FLAC, OGG, M4A | Etiquetas y carátulas | Sin recodificar. |
| WAV | `LIST/INFO`, `bext`, `iXML`, ID3... (solo quedan `fmt`, `fact`, `data`) | Sin recodificar. |
| MP4, MOV, MKV, WebM, AVI | Metadatos globales y de pista (ubicación de móvil, autor, fechas), capítulos, pistas de datos (telemetría GPS de cámaras de acción), adjuntos y carátulas | `ffmpeg -c copy`, sin recodificar. |

**Verificación obligatoria.** Después de limpiar, el archivo resultante se
vuelve a inspeccionar. Si queda cualquier metadato identificable, la API
responde `500` y **no entrega el archivo**: es preferible un error a un archivo
que parece limpio y no lo está.

**Lo que NO se toca**, porque es contenido y no metadatos: caras, matrículas o
texto **visibles** en una imagen; el texto de un PDF y sus adjuntos (se avisan
en `warnings`); la voz de un audio. HEIC/HEIF y RAW no están soportados.

---

## Configuración

Por variables de entorno o fichero `.env` (ver `.env.example`).

| Variable | Por defecto | Descripción |
|---|---|---|
| `ANON_SECRET` | *(aleatorio)* | Clave de los alias. **Defínela**: si no, cambian en cada reinicio. |
| `ANON_ALIAS_LENGTH` | `8` | Longitud de los alias (4–32). |
| `POLICIES_DIR` | `policies` | Carpeta de políticas. |
| `DEFAULT_POLICY` | `auto` | Política si la petición no indica `?policy=`. |
| `NER_MODEL` | *(vacío)* | Modelo de spaCy. Vacío = solo reglas. |
| `DETECTION_NAMES_FILE` | *(vacío)* | Fichero extra de nombres de pila. |
| `MAX_UPLOAD_MB` / `MAX_JSON_MB` | `100` / `10` | Límites de tamaño. |
| `FFMPEG_PATH` / `FFPROBE_PATH` | `ffmpeg` / `ffprobe` | Rutas de ffmpeg. |
| `MEDIA_TIMEOUT_SECONDS` | `120` | Tiempo máximo de ffmpeg por archivo. |
| `API_KEYS` | *(vacío)* | Claves de acceso separadas por comas. Vacío = sin autenticación. |
| `CORS_ORIGINS` | *(vacío)* | Orígenes web permitidos, separados por comas. |
| `DOCS_ENABLED` | `true` | Publicar `/docs`, `/redoc` y `/openapi.json`. |
| `PUBLIC_URL` | *(vacío)* | URL pública para Swagger si va detrás de un proxy. |
| `LOG_LEVEL` | `INFO` | Nivel de log. |

Genera un secreto con:

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

---

## Seguridad y límites

- **Pseudonimizar no es anonimizar del todo.** Con `ANON_SECRET` se pueden
  recalcular los alias, así que, a efectos del RGPD, unos datos pseudonimizados
  siguen siendo datos personales. Guarda el secreto como una contraseña y no lo
  compartas con quien recibe los datos. Si no necesitas cruzar datos, usa
  `redact`, `drop` o `replace`.
- **Nada se registra.** El servicio no escribe en los logs ni el contenido de
  las peticiones ni los valores detectados; el `report` solo lleva recuentos.
- **Expuesto a internet**: define `API_KEYS`, pon un proxy con HTTPS delante y
  considera `DOCS_ENABLED=false`.
- **Archivos**: se procesan en memoria y en ficheros temporales que se borran
  al terminar. ffmpeg se ejecuta con tiempo máximo. El contenedor de
  `docker-compose.yml` es de solo lectura, sin privilegios y con usuario no root.

---

## Desarrollo

```bash
pip install -e ".[dev,ner]"
python -m spacy download es_core_news_sm   # para el test del modelo real
pytest --cov                               # falla si la cobertura baja del 80 %
ruff check .
```

Los tests generan todos sus archivos de prueba (imágenes, PDF, audio, vídeo)
al vuelo: el repositorio no lleva binarios. Los de vídeo y algunos de audio se
saltan si no hay ffmpeg, y el del modelo real de spaCy si no está instalado.

```text
data_anonymizer/
├── main.py            API (FastAPI)
├── config.py          Variables de entorno
├── services.py        Arranque: secreto, políticas, NER, ffmpeg
├── core/
│   ├── policy.py      Formato de las políticas y rutas
│   ├── engine.py      Recorrido del JSON y aplicación de reglas
│   ├── pseudonymize.py  Alias HMAC
│   └── transforms.py  mask, round, date
├── pii/
│   ├── patterns.py    Reconocedores con validación (IBAN, Luhn, DNI...)
│   ├── names.py       Nombres de pila  (data/nombres.txt)
│   ├── hints.py       Pistas por nombre de clave
│   ├── ner.py         Adaptador opcional de spaCy
│   └── detector.py    Combinación y resolución de solapes
└── media/
    ├── sniff.py       Tipo de archivo por contenido
    ├── images.py · pdf.py · audio.py · video.py
    └── service.py     Inspección, limpieza y verificación
policies/              auto.yaml · ejemplo.yaml · estricta.yaml
examples/clientes.json
```

### Añadir un tipo de PII

1. Añade el patrón y, si existe, su validador en `pii/patterns.py`.
2. Regístralo en `RECOGNIZERS` con su etiqueta y confianza.
3. Si es una etiqueta nueva, añádela a `TEXT_ENTITIES`.
4. Añade casos positivos **y negativos** en `tests/test_patterns.py`.

## Licencia

[MIT](LICENSE)
