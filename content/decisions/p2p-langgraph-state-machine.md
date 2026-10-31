---
title: Model the governance pipeline as a LangGraph state machine
project: policy-to-pipelines
context: Turning a prose policy into enforced cloud controls involves compile, scan, plan, assess and execute steps with different failure modes.
decision: Implement each step as an agent node in a LangGraph state machine with typed state passed between nodes.
consequence: Each agent is testable in isolation; the graph is inspectable and can pause for approvals.
order: 1
source: KPOS/site/index.html#L466-L471
---
