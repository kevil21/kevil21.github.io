---
title: Overlapping sync windows with deterministic document IDs
project: a360
context: The ADX → Elasticsearch sync runs on a schedule; late-arriving telemetry and retries must not create duplicates or gaps.
decision: Hourly views sync with a 70-minute overlap and daily views with a 25-hour overlap; document IDs are SHA-256 hashes of natural keys so re-syncing the same row is idempotent.
consequence: Idempotent, replay-safe synchronisation at the cost of some redundant writes.
order: 2
source: KPOS/site/index.html#L384-L389
---
