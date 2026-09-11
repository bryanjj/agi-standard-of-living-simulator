# Limitations

- **Scenario tool, not a probability distribution.** The presets and custom settings receive no probability weights and should not be interpreted as forecasts.
- **Aggregate monthly paths.** The model solves aggregate stocks and flows. Monthly points do not represent observations of individual workers.
- **Post-2030 extension.** Results through 2030 reproduce the paper. Later values extrapolate its equations under additional assumptions and are not results reported by the authors.
- **No physical-task automation.** The paper exposes cognitive occupations directly to AI but does not model rapid advances in robotics.
- **Two fixed occupation groups.** The interface calls the paper’s cognitive group “AI-exposed occupations.” Group membership does not expand after 2030, even as the share of tasks within AI capability grows.
- **Assumed productivity ceiling.** Beyond 2030, task productivity smoothly approaches an assumed 30x output ceiling. Other ceilings would change long-run results.
- **No worker-level distribution.** The source model does not follow individual workers, earnings histories, households, savings, or poverty.
- **Simplified capital.** Compute and other capital are combined, capital follows an exogenous supply schedule, and saving decisions are not explicit.
- **No policy response.** Taxes, transfers, unemployment insurance, retraining programs, and new distribution mechanisms are outside the published scenarios.
- **No aggregate-demand or financial disruption.** Business cycles, price rigidities, financial-market disruptions, political economy, and catastrophic risks are omitted.
- **Independent implementation.** This project is not an official Anthropic replication package and is not endorsed by the authors.
