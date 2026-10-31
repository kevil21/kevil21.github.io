---
title: Fully offline mock mode for CI
project: policy-to-pipelines
context: The platform targets real GCP with Gemini 2.5 Pro on Vertex AI; CI cannot depend on live cloud or model calls.
decision: Every provider and model call has a mock implementation so the full pipeline runs offline in CI.
consequence: Deterministic tests; provider-pluggable design (AWS and Azure scaffolded next).
order: 4
source: KPOS/site/index.html#L394-L473
---
