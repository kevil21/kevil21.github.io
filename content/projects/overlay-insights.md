---
name: Overlay-Insights
tagline: Finds repeated overlay patterns across hostnames and quantifies their business impact.
kind: open-source
parent: vit-vellore-btech
period:
  start: "2024"
  label: "2024"
summary: Python toolkit that finds repeated overlay patterns (modals, banners, pop-ups) across hostnames and quantifies business impact in cost and brand value. ELK pipeline with Jupyter notebooks for analysis.
problem: Customer-facing applications were shipping recurring overlay patterns without anyone tracking the cumulative cost.
approach:
  - Crawl rendered DOM into Elasticsearch.
  - Cluster overlays with n-gram and cosine similarity.
  - Score by frequency × impact × linked tickets; explore in Kibana and Jupyter.
outcomes:
  - text: Found 6 high-impact recurring overlays accounting for ~40% of all observed overlay events.
    source: KPOS/site/app.js#L1571-L1632
  - text: Drove consolidation into a single shared component-library proposal.
    source: KPOS/site/app.js#L1571-L1632
stack: [python, elasticsearch, kibana, pandas, jupyter]
skills: [data-engineering, python]
evidence: [repo-overlay-insights]
order: 3
sources:
  - KPOS/site/index.html#L534-L593
  - KPOS/site/app.js#L1571-L1632
  - KPOS/site/Kevil_Resume_2026.md#L85-L86
---
