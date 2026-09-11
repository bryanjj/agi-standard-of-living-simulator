# Limitations

- **Scenario tool, not a probability distribution.** The presets and custom settings receive no probability weights and should not be interpreted as forecasts.
- **Aggregate monthly paths.** The model solves aggregate stocks and flows. Monthly points do not represent observations of individual workers.
- **2030 boundary.** The implementation does not extrapolate beyond the paper’s supported horizon.
- **No physical-task automation.** The paper exposes cognitive occupations directly to AI but does not model rapid advances in robotics.
- **Two occupation groups.** Workers differ only between cognitive and all-other occupations in the source framework.
- **No worker-level distribution.** The source model does not follow individual workers, earnings histories, households, savings, or poverty.
- **Simplified capital.** Compute and other capital are combined, capital follows an exogenous supply schedule, and saving decisions are not explicit.
- **No policy response.** Taxes, transfers, unemployment insurance, retraining programs, and new distribution mechanisms are outside the published scenarios.
- **No aggregate-demand or financial disruption.** Business cycles, price rigidities, financial-market disruptions, political economy, and catastrophic risks are omitted.
- **Independent implementation.** This project is not an official Anthropic replication package and is not endorsed by the authors.
