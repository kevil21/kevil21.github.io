---
name: Smart Energy Forecasting
tagline: LSTM load forecasting on AWS across 500+ households and transformers.
kind: pilot
parent: vit-vellore-btech
period:
  start: 2024-03
  label: Mar 2024
summary: LSTM forecasting on AWS Kinesis, S3 and SageMaker across 500+ households and transformers, with a load-balancing module for distribution optimisation.
approach:
  - Streaming ingestion through Kinesis into S3.
  - LSTM training and inference on SageMaker.
  - Load-balancing module acting on forecasts.
outcomes:
  - text: +25% grid resilience in a pilot deployment.
    source: KPOS/site/app.js#L1571-L1632
  - text: Operators got a 30-minute heads-up on overload events.
    source: KPOS/site/app.js#L1571-L1632
stack: [aws-kinesis, aws-s3, aws-sagemaker, python, lstm]
skills: [time-series, aws, machine-learning]
evidence: []
order: 8
sources:
  - KPOS/site/index.html#L534-L593
  - KPOS/site/app.js#L1571-L1632
  - KPOS/site/Kevil_Resume_2026.md#L100-L101
  - KPOS/Kevil_Resume_12.docx
---

No public repository is linked for this project in the source material (the old card linked the GitHub
profile), so it carries no repository evidence.
