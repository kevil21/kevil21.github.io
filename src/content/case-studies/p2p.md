---
title: 'Policy → Pipelines: plain English into enforced guardrails'
project: p2p
machine: policy-sorter
summary: 'A five-agent LangGraph platform that compiles natural-language cloud policies, detects drift, plans reversible remediation, scores risk with guardrails before the model, and files audit-ready evidence.'
order: 2
---

## Why it exists

Cloud governance policies are written in plain English and enforced by hand. Drift goes unnoticed; remediation, when it happens, leaves no audit trail. Policy → Pipelines takes a sentence like "All GCS buckets must have cost_center, environment and team labels" and turns it into compiled rules, live drift detection, risk-scored remediation plans, human-in-the-loop approvals and audit-ready evidence. It runs against real GCP with Gemini 2.5 Pro on Vertex AI, or fully offline in mock mode for CI.

## Five agents on one belt

The **Policy Compiler** turns the sentence into a structured constraint with a few-shot LLM and rejects greetings, off-topic requests and ambiguous policies. The **Drift Scanner** queries live GCS, Compute, IAM and SQL state and emits structured violations. The **Remediation Planner** writes ordered, reversible gcloud commands per violation, with rollback hints and blast-radius estimates. The **Risk Assessor** applies guardrails first and only then asks the model for a rubric score from 0 to 10. The **Change Executor** runs approved commands, re-queries the resource for post-state proof and refuses anything unapproved.

## Guardrails outrank the model

This is the decision the Policy Sorter's risk gauge embodies. BLOCKED patterns force the score to 10. HIGH_RISK patterns add 6 to the model's score so they cannot slip under the line. Plans scoring below 4 are auto-approved; everything else waits at a human gate. The LangGraph state machine's conditional routers short-circuit on rejection or cloud error, and per-stage timings let the UI draw a Gantt chart of the agents' execution.

## Providers, templates and evidence

LLM and cloud providers are pluggable: mock, LiteLLM or Vertex AI for the model; mock or GCP for the cloud, with AWS and Azure scaffolded next. A library of seven-plus YAML controls covers GCS, Compute, IAM, Cloud SQL and VPC. Every change produces an evidence pack bundling policy, finding, plan, before/after state and execution log, persisted to Firestore. The résumé records the outcome: taken from hackathon prototype to production track.

## On this floor

The Policy Sorter drops sample policy cards through the five stages. The three sample policies and every violation it finds are invented for the simulation and labelled as such; the thresholds and the agent order are the real ones.
