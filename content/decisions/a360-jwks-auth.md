---
title: Azure AD tokens validated with JWKS at the gateway
project: a360
context: One FastAPI gateway fronts Elasticsearch, Kibana, Cosmos DB, LiteLLM and the insights engine for several tenants.
decision: Authenticate with Azure AD and validate tokens against JWKS at the gateway; authorised users are maintained per tenant in Cosmos DB.
consequence: A single enforcement point for identity across all downstream services.
order: 3
source: KPOS/site/index.html#L384-L389
---
