"""Ingestion package: validate broker payloads and persist vitals.

Import submodules directly, e.g. ``from ingestion.cleaner import VitalCleaner``.
CLI: ``python -m ingestion`` (see ``ingestion/__main__.py``).
"""

__all__ = [
    "cleaner",
    "consumer",
    "db_connector",
    "mock_producer",
    "pipeline",
]
