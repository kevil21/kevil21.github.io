---
name: Policy → Pipelines (P2P)
shortName: P2P
tagline: Natural-language controls → enforced guardrails and drift remediation.
kind: flagship
org: Kyndryl
parent: kyndryl-associate-sde
period:
  start: 2025-07
  end: present
  label: 2025 → now · hackathon → production track
summary: A 5-agent LangGraph platform that takes a plain-English policy such as "all GCS buckets must have cost_center, environment and team labels" and turns it into compiled constraints, live drift detection, risk-scored gcloud remediation plans, human-in-the-loop approvals and audit-ready evidence packs — running against real GCP (Gemini 2.5 Pro on Vertex AI) or fully offline in mock mode for CI.
problem: Cloud governance policies were written in prose and enforced by hand; drift was found late and remediation was risky and unaudited.
approach:
  - Policy Compiler agent turns natural-language policy into compiled, machine-checkable constraints.
  - Drift Scanner agent inspects live GCP resources for violations.
  - Remediation Planner agent produces gcloud remediation plans.
  - Risk Assessor agent scores each plan; low-risk changes are auto-approved, the rest wait for a human.
  - Change Executor agent applies approved changes and writes an evidence pack.
outcomes:
  - text: Taken from hackathon prototype to production track.
    source: KPOS/site/Kevil_Resume_2026.md#L21-L30
  - text: Policy template library of 7+ YAML controls covering GCS, Compute, IAM, Cloud SQL and VPC.
    source: KPOS/site/index.html#L466-L471
  - text: Provider-pluggable design, with AWS and Azure scaffolded next.
    source: KPOS/site/index.html#L466-L471
stack: [langgraph, langchain, vertex-ai, gemini, fastapi, pydantic, react, vite, apscheduler, cloud-build, firestore, podman, python, typescript, gcp]
skills: [agentic-ai, gcp, cloud-architecture, python, typescript, prompt-engineering]
decisions: [p2p-langgraph-state-machine, p2p-risk-guardrails, p2p-human-in-the-loop, p2p-mock-mode]
evidence: []
architecture:
  source: KPOS/site/index.html#L423-L457
  nodes:
    - { id: policy, label: Plain-English policy, col: 0 }
    - { id: compiler, label: Policy Compiler, sub: agent 1, col: 1 }
    - { id: scanner, label: Drift Scanner, sub: agent 2, col: 2 }
    - { id: planner, label: Remediation Planner, sub: agent 3, col: 3 }
    - { id: risk, label: Risk Assessor, sub: agent 4 · auto-approve < 4, col: 4 }
    - { id: executor, label: Change Executor, sub: agent 5, col: 5 }
    - { id: evidence, label: Evidence pack, sub: Firestore, col: 6 }
  edges:
    - { from: policy, to: compiler }
    - { from: compiler, to: scanner, label: constraints }
    - { from: scanner, to: planner, label: drift }
    - { from: planner, to: risk, label: plan }
    - { from: risk, to: executor, label: approved }
    - { from: executor, to: evidence }
featured: true
order: 2
sources:
  - KPOS/site/index.html#L394-L473
  - KPOS/site/Kevil_Resume_2026.md#L80-L83
---

P2P is a LangGraph state machine. Each stage is an agent with a typed state contract; guardrails are
deterministic (blocked patterns force the maximum risk score) so the model can propose but never bypass
policy. The whole pipeline can run offline in mock mode, which is how it is exercised in CI.
No public repository is linked from the source material, so this project carries no repository evidence.
