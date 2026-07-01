FROM python:3.10-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV UV_SYSTEM_PYTHON=1

WORKDIR /app/backend

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

COPY simulator/pipeline/requirements.txt ./simulator-pipeline-requirements.txt
RUN uv pip install --no-cache --system -r simulator-pipeline-requirements.txt

COPY . .

CMD ["python", "-m", "simulator.pipeline.jobs.generate_and_replay"]
