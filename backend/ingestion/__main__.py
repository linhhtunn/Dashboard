"""Entry point: python -m ingestion [health|file|consume]"""

from ingestion.pipeline import main

if __name__ == "__main__":
    raise SystemExit(main())
