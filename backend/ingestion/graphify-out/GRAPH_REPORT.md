# Graph Report - ingestion  (2026-06-05)

## Corpus Check
- 7 files · ~2,420 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 91 nodes · 216 edges · 11 communities (9 shown, 2 thin omitted)
- Extraction: 84% EXTRACTED · 16% INFERRED · 0% AMBIGUOUS · INFERRED: 34 edges (avg confidence: 0.53)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b8d9c710`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]

## God Nodes (most connected - your core abstractions)
1. `DatabaseConnector` - 24 edges
2. `VitalCleaner` - 15 edges
3. `Any` - 15 edges
4. `str` - 15 edges
5. `CleanVitalRecord` - 13 edges
6. `DataState` - 12 edges
7. `VitalConsumer` - 11 edges
8. `IngestionPipeline` - 10 edges
9. `str` - 7 edges
10. `main()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `CleanVitalRecord` --uses--> `DataState`  [INFERRED]
  db_connector.py → cleaner.py
- `datetime` --uses--> `DataState`  [INFERRED]
  db_connector.py → cleaner.py
- `Any` --uses--> `DataState`  [INFERRED]
  db_connector.py → cleaner.py
- `int` --uses--> `DataState`  [INFERRED]
  db_connector.py → cleaner.py
- `str` --uses--> `DataState`  [INFERRED]
  db_connector.py → cleaner.py

## Import Cycles
- 1-file cycle: `db_connector.py -> db_connector.py`

## Communities (11 total, 2 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.22
Nodes (13): CleanVitalRecord, _magnitude(), _near_zero(), Any, bool, bytes, float, str (+5 more)

### Community 1 - "Community 1"
Cohesion: 0.42
Nodes (4): Any, int, str, Clean vitals joined with raw rows whose ingestion metadata is VALID.

### Community 2 - "Community 2"
Cohesion: 0.33
Nodes (5): DataState, DatabaseSettings, DatabaseConnector, bool, StrEnum

### Community 3 - "Community 3"
Cohesion: 0.39
Nodes (5): CleanVitalRecord, datetime, _enrich_raw_payload(), PostgreSQL connector for raw_vitals and clean_vitals tables., _to_db_timestamp()

### Community 4 - "Community 4"
Cohesion: 0.33
Nodes (8): build_sample_message(), main(), publish_messages(), float, int, str, Publish sample vitals to CloudAMQP for local/E2E testing., MockProducerSettings

### Community 5 - "Community 5"
Cohesion: 0.33
Nodes (5): _configure_logging(), IngestionPipeline, main(), str, E2E ingestion pipeline: RabbitMQ → clean → Supabase.

### Community 6 - "Community 6"
Cohesion: 0.33
Nodes (4): BlockingChannel, bytes, str, RabbitMQSettings

### Community 7 - "Community 7"
Cohesion: 0.40
Nodes (3): BlockingConnection, RabbitMQ consumer for the raw vitals queue (CloudAMQP via RABBITMQ_URL)., VitalConsumer

### Community 8 - "Community 8"
Cohesion: 0.40
Nodes (3): Path, bytes, int

## Knowledge Gaps
- **8 isolated node(s):** `ValidationSettings`, `SensorData`, `str`, `RabbitMQSettings`, `BlockingConnection` (+3 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DatabaseConnector` connect `Community 2` to `Community 0`, `Community 1`, `Community 3`, `Community 5`, `Community 8`?**
  _High betweenness centrality (0.342) - this node is a cross-community bridge._
- **Why does `VitalConsumer` connect `Community 7` to `Community 8`, `Community 5`, `Community 6`?**
  _High betweenness centrality (0.217) - this node is a cross-community bridge._
- **Why does `datetime` connect `Community 3` to `Community 0`, `Community 2`, `Community 4`?**
  _High betweenness centrality (0.183) - this node is a cross-community bridge._
- **Are the 8 inferred relationships involving `DatabaseConnector` (e.g. with `CleanVitalRecord` and `DataState`) actually correct?**
  _`DatabaseConnector` has 8 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `VitalCleaner` (e.g. with `Path` and `IngestionPipeline`) actually correct?**
  _`VitalCleaner` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `Any` (e.g. with `CleanVitalRecord` and `DataState`) actually correct?**
  _`Any` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `str` (e.g. with `CleanVitalRecord` and `DataState`) actually correct?**
  _`str` has 2 INFERRED edges - model-reasoned connections that need verification._