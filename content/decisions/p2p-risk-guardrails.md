---
title: Deterministic guardrails over model judgement for risk scoring
project: policy-to-pipelines
context: An LLM proposes remediation plans; some actions must never be auto-approved regardless of the model's confidence.
decision: Blocked patterns force the maximum risk score (10); high-risk patterns add a fixed penalty (+6); plans below a threshold (4) auto-approve, everything else waits for a human.
consequence: The model can propose but never bypass policy; risk scoring is explainable.
order: 2
source: KPOS/site/index.html#L423-L471
---
