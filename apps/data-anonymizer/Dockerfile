# syntax=docker/dockerfile:1
FROM python:3.12-slim

# WITH_NER=true instala spaCy y descarga el modelo indicado (la imagen crece
# unos cientos de MB). Despues hay que poner NER_MODEL=<modelo> en el .env.
ARG WITH_NER=false
ARG SPACY_MODEL=es_core_news_md

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    POLICIES_DIR=/app/policies

# ffmpeg solo hace falta para limpiar video. Si no lo necesitas puedes quitar
# este paso: el resto funciona y /v1/file responde 501 con los videos.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY pyproject.toml README.md LICENSE ./
COPY data_anonymizer ./data_anonymizer
RUN pip install . \
 && if [ "$WITH_NER" = "true" ]; then \
      pip install ".[ner]" && python -m spacy download "$SPACY_MODEL"; \
    fi
COPY policies ./policies

RUN useradd --system --uid 10001 --no-create-home anon
USER anon

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8080/health', timeout=3)"

CMD ["uvicorn", "data_anonymizer.main:app", "--host", "0.0.0.0", "--port", "8080", "--proxy-headers"]
