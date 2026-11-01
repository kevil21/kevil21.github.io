---
title: 'Data Workbench: three reproducible ELK pipelines'
project: incident-tickets
machine: data-workbench
summary: 'Overlay-Insights, Incident Ticket Management and IT Asset Analytics: three script-driven pipelines that clean records, index them into Elasticsearch with deterministic IDs and light Kibana dashboards.'
order: 4
---

## The same bench, three times

Each station on the Data Workbench is a pipeline with the same silhouette: raw records come in, a script cleans them, Elasticsearch fills, Kibana lights up. All three are public repositories.

**Overlay-Insights** is a Python toolkit that finds repeated overlay patterns across hostnames and quantifies their business impact in cost and brand value. Overlay HTML signatures are clustered with token-level n-grams and cosine similarity, each cluster is scored by frequency × user impact × support tickets, and the top clusters are rendered in Kibana and Jupyter for product review. The previous site's case study reports six high-impact recurring overlays accounting for about forty percent of observed overlay events.

**Incident Ticket Management** is an end-to-end ELK pipeline that cleans, indexes, transforms and visualises incident-ticket data, fully script-driven and reproducible. Tickets are bulk-indexed with deterministic document IDs so a re-run never duplicates a record; MTTR rollups and a Kibana severity heatmap, team-load and weekly-trend views sit on top. The previous site's case study reports analyst prep time cut from about three hours per dump to about ten minutes.

**IT Asset Analytics** cleans, indexes, transforms and visualises asset data with pandas, NumPy, Elasticsearch and Kibana. The previous site's case study reports about twelve percent of assets surfaced as past end-of-life and unbudgeted, and owner resolution lifted from 71% to 96%.

## On this floor

Run a station and watch its jar fill. The records are synthetic; the numbers above are labelled by where they come from, and none of them is on the résumé.
