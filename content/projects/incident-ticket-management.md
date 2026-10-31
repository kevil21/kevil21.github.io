---
name: Incident Ticket Management
tagline: A reproducible ELK pipeline for incident-ticket analytics.
kind: open-source
parent: vit-vellore-btech
period:
  start: "2024"
  label: "2024"
summary: End-to-end ELK pipeline that cleans, indexes, transforms and visualises incident-ticket data — fully script-driven and reproducible.
approach:
  - Script-driven cleaning and normalisation of ticket dumps.
  - Indexing and transforms in Elasticsearch; dashboards in Kibana.
outcomes:
  - text: Cut analyst preparation time from ~3 hours per dump to ~10 minutes.
    source: KPOS/site/app.js#L1571-L1632
  - text: Made historical trend comparisons trivial.
    source: KPOS/site/app.js#L1571-L1632
stack: [python, elasticsearch, kibana]
skills: [data-engineering, python]
evidence: [repo-incident-ticket-management]
order: 4
sources:
  - KPOS/site/index.html#L534-L593
  - KPOS/site/app.js#L1571-L1632
  - KPOS/site/Kevil_Resume_2026.md#L88-L89
---
