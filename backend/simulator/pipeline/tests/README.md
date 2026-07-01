# Pipeline Smoke Tests

Simulator-owned mocks and RabbitMQ smoke checks for local pipeline testing.

These are not production Team 2/3 services. They help Team 1 verify publish and
consume flows while developing simulator data.

```bash
cd backend
python -m simulator.pipeline.tests.mock_team2_worker --limit 10
python -m simulator.pipeline.tests.mock_team3_worker --limit 10
```

RabbitMQ connectivity smoke test:

```bash
cd backend
python -m simulator.pipeline.tests.test_rabbitmq_pika
```

`test_rabbitmq_pika` reads `RABBITMQ_URL` from the environment or from:

```text
backend/simulator/pipeline/jobs/.env
```
