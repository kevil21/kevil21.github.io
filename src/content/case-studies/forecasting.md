---
title: 'Forecasting: migration risk, grid load and irrigation'
project: smart-energy
machine: forecast-engine
summary: 'Three time-series projects — an LSTM for climate-induced migration, per-transformer LSTMs for grid load on AWS, and a regression-and-rules hybrid for irrigation — and what each outcome actually states.'
order: 3
---

## Three streams, one engine

The Forecast Engine stands for three projects that share a shape: a stream of measurements goes in, a forecast ribbon comes out, and an operator acts on it.

**Climate Mitigation Tool** (2023, as tagged on the previous site). Migration-risk forecasting had been done with single-feature regressors on stale data, missing the correlation with extreme events. The replacement aggregates three or more real-time weather APIs into a unified hourly tensor and feeds a multi-modal LSTM with separate encoders for weather, displacement history and infrastructure exposure. Accuracy was measured with rolling-window cross-validation on held-out districts, and forecasts surface as district-level risk heatmaps. The résumé states +15% accuracy over baseline.

**Smart Energy Forecasting** (2024). Grid operators wanted sub-hourly load forecasts at the transformer level so they could schedule pre-emptive shedding. Smart-meter telemetry is ingested through Kinesis into S3; one LSTM per transformer is trained on SageMaker with shared embeddings, so sparse transformers learn from dense ones; forecasts are written to a low-latency read store for the operations dashboard. The résumé states 500+ households and transformers and +25% grid resilience in pilot deployment. The previous site's case study adds that operators got a thirty-minute heads-up on overload events.

**OptiCrop** (2024). Smallholder farmers were watering inconsistently and tracking expenses on paper. Crop, soil and weather features feed a regression-and-rules hybrid that sets daily water targets; receipt OCR and a rule engine categorise expenses automatically; a mobile-first dashboard reads it all back. The résumé states +35% water-use efficiency and −50% manual expense entry. This stream is not an LSTM, and the engine says so when you select it.

## On this floor

Choose a stream, change the horizon, show the baseline. The weather and load series the engine draws are synthetic and seeded; the resilience dial reports only what the résumé states, with the label to prove it.
