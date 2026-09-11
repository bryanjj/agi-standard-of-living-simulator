# Limitations

- **Scenario tool, not a probability distribution.** The presets and custom settings receive no probability weights and should not be interpreted as forecasts.
- **Aggregate monthly paths.** The model solves aggregate stocks and flows. Monthly points do not represent observations of individual workers.
- **Post-2030 extension.** Results through 2030 reproduce the paper. Later values extrapolate its equations under additional assumptions and are not results reported by the authors.
- **Simplified physical-task exposure.** A single post-2030 control can expand technology into initially unexposed work. Newly exposed tasks reuse the software-AI diffusion, productivity, automation, and reinstatement settings rather than a separately calibrated robotics model.
- **Two fixed occupation cohorts.** The labels track where workers began. The task exposure within the initially unexposed cohort can grow, but the model does not add detailed occupations, skills, industries, or distinct kinds of robots.
- **Target-based robotics displacement.** Post-2030 employment above the initially unexposed group’s changing target becomes layoffs after normal quits. This extension is not calibrated to observed robotics transitions.
- **Assumed productivity ceiling.** Beyond 2030, task productivity smoothly approaches an assumed 30x output ceiling. Other ceilings would change long-run results.
- **No worker-level distribution.** The source model does not follow individual workers, earnings histories, households, savings, or poverty.
- **Simplified capital.** Compute and other capital are combined, capital follows an exogenous supply schedule, and saving decisions are not explicit.
- **No policy response.** Taxes, transfers, unemployment insurance, retraining programs, and new distribution mechanisms are outside the published scenarios.
- **No aggregate-demand or financial disruption.** Business cycles, price rigidities, financial-market disruptions, political economy, and catastrophic risks are omitted.
- **Independent implementation.** This project is not an official Anthropic replication package and is not endorsed by the authors.
