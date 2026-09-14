# Limitations

- **Scenario tool, not a probability distribution.** The presets and custom settings receive no probability weights and should not be interpreted as forecasts.
- **Aggregate monthly paths.** The model solves aggregate stocks and flows. Monthly points do not represent observations of individual workers.
- **Post-2030 extension.** Results after 2030 rely on independent assumptions and are not values reported by the original authors.
- **Unified technology frontier.** One affected-task path combines advances in software AI and robotics. It does not separately calibrate their speed, diffusion, productivity, or capital requirements.
- **One worker pool.** The extension removes the paper's cognitive and all-other occupation groups once both can be exposed. It cannot show occupation-specific wages, unemployment, switching routes, or skill requirements.
- **Job-transition mapping.** The cumulative number of jobs that must transition is a smooth, bounded extension of the paper's reallocation equation. It is not estimated from a historical economy-wide AI or robotics transition.
- **Re-employment effectiveness.** The paper's cross-occupation search discount is reinterpreted as the relative search effectiveness of displaced workers. This preserves a matching friction but is not a separately estimated parameter.
- **Assumed productivity ceiling.** Task productivity approaches an assumed 30x output ceiling after 2030.
- **Symmetric job adjustment.** The posting-speed input governs both how quickly old roles transition and how quickly vacancies respond to an employment shortfall. This is not separately calibrated to long-run robotics transitions.
- **No worker-level distribution.** The source model does not follow individual workers, earnings histories, households, savings, or poverty.
- **Simplified capital.** Compute and other capital are combined, capital follows an exogenous supply schedule, and saving decisions are not explicit.
- **No policy response.** Taxes, transfers, unemployment insurance, retraining programs, and new distribution mechanisms are outside the published scenarios.
- **No aggregate-demand or financial disruption.** Business cycles, price rigidities, financial-market disruptions, political economy, and catastrophic risks are omitted.
- **Independent implementation.** This project is not an official Anthropic replication package and is not endorsed by the authors.
