---
title: Dogfood the platform with synthetic telemetry
project: a360
context: Real tenant traffic is uneven and cannot be used to exercise new dashboards and insight types safely.
decision: Run a synthetic telemetry generator that produces realistic multi-agent traces on a schedule, so every pipeline stage and dashboard is exercised continuously.
consequence: Faster feedback on pipeline regressions; the generator is itself an owned service.
order: 4
source: KPOS/site/index.html#L384-L389
---
