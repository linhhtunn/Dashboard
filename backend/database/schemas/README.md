# Models / Schemas

Noi nay chua Pydantic schema validate du lieu truoc khi ghi DB.

- `app.py`: Supabase app data nhu patient, device, alert.
- `timeseries.py`: TigerData/TimescaleDB rows nhu raw event, continuous, intervals, measurements, motion, ECG, sleep, features, latest cache.

Schema chi validate shape/range co ban. Mapping tu simulator payload sang row DB nen nam o ingestion/normalizer layer.
