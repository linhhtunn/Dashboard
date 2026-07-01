# Conceptual ERD

Dung cho nguoi moi va report tong quan.

```mermaid
erDiagram
    PATIENT ||--o{ DEVICE : owns
    DEVICE ||--o{ DEVICE_SENSOR : contains
    DEVICE_SENSOR ||--o{ WEARABLE_STREAM : emits
    WEARABLE_STREAM ||--o{ HEALTH_FEATURE : produces
    HEALTH_FEATURE ||--o{ ALERT : triggers

    PATIENT ||--o{ ALERT : has
    CLINICAL_STAFF ||--o{ STAFF_SHIFT : works
    STAFF_SHIFT ||--o{ ALERT : covers
    CLINICAL_STAFF ||--o{ ALERT : claims

    ALERT ||--o{ NOTIFICATION : creates
    ALERT ||--o{ AUDIT_LOG : records
    ALERT ||--o{ ALERT_REVIEW : reviewed_by

    SCENARIO_DEFINITION ||--o{ GROUND_TRUTH_EVENT : defines
    GROUND_TRUTH_EVENT ||--o{ WEARABLE_STREAM : labels
```
