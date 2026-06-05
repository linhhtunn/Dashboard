FROM python:3.12-slim AS builder

# Copy uv binary into the image
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_PROJECT_ENVIRONMENT=/opt/venv

WORKDIR /build

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project --no-dev


FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    VIRTUAL_ENV=/opt/venv \
    PATH=/opt/venv/bin:$PATH \
    PORT=7860

WORKDIR /app

RUN addgroup --system app \
    && adduser --system --ingroup app app

# Copy virtual environment from builder stage
COPY --from=builder /opt/venv /opt/venv
COPY app ./app
COPY scripts ./scripts
COPY README.md ./

USER app

EXPOSE 7860

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import os, urllib.request; urllib.request.urlopen(f'http://127.0.0.1:{os.getenv(\"PORT\", \"7860\")}/health', timeout=3).read()"

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-7860}"]
