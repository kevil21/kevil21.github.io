---
title: Azure Data Explorer as source of truth, Elasticsearch as the dashboard projection
project: a360
context: Agent telemetry arrives as OpenTelemetry spans from many tenants and must serve both analytical queries and interactive Kibana dashboards.
decision: Normalise everything into Azure Data Explorer (fact tables, dimensions and 31 materialized views) and project the materialized views into per-tenant Elasticsearch indices for dashboarding, rather than querying one store for both.
consequence: Analytical truth lives in one place; dashboards stay fast and tenant-isolated; the sync service becomes a critical, owned component.
order: 1
source: KPOS/site/index.html#L336-L359
---
