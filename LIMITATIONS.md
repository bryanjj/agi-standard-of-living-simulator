# Limitations

- **Scenario tool, not a probability distribution.** The presets and custom settings receive no probability weights and should not be interpreted as forecasts.
- **Aggregate monthly paths.** The model solves aggregate stocks and flows. Monthly points do not represent observations of individual workers.
- **Post-2030 extension.** Results after 2030 rely on independent assumptions and are not values reported by the original authors.
- **Unified technology frontier.** One affected-task path combines advances in software AI and robotics. It does not separately calibrate their speed, diffusion, productivity, or capital requirements.
- **One worker pool.** The extension removes the paper's cognitive and all-other occupation groups once both can be exposed. It cannot show occupation-specific wages, unemployment, switching routes, or skill requirements.
- **Task-to-job mapping.** The extension assumes task mass is weighted by required labor and maps net eliminated task mass one-for-one to the long-run human-employment target. It does not estimate heterogeneous task weights, hours, occupations, or the number of tasks bundled into a job.
- **Re-employment effectiveness.** The paper's cross-occupation search discount is reinterpreted as the relative search effectiveness of displaced workers. This preserves a matching friction but is not a separately estimated parameter.
- **Assumed productivity ceiling.** Task productivity approaches an assumed 30x output ceiling after 2030.
- **Employment adjustment.** The paper's posting-speed input is reinterpreted as the monthly speed at which employment above the task-based target contracts after ordinary quits. This is not separately calibrated to long-run robotics transitions.
- **No automatic scale-effect hiring.** Productivity affects output, wages, and factor shares, but does not independently add human jobs in the one-pool extension. New human-task capacity comes from the reinstatement ratio.
- **Frozen-2026 comparison.** The comparison is a model counterfactual, not an observed control group. It preserves the selected scenario's technology through mid-2026 and then stops further capability, adoption, and AI task-productivity growth while ordinary economic dynamics continue.
- **Dollar-level anchors.** GDP is expressed at an annual rate in constant 2026 dollars using the 2026 Q2 current-dollar GDP level as its reference. Wages use June 2026 average weekly earnings for private nonfarm payroll employees, multiplied by 52. This is a mean payroll-worker wage, not a median household income, and neither anchor makes the later model path an official statistical projection.
- **No worker-level distribution.** The source model does not follow individual workers, earnings histories, households, savings, or poverty.
- **Simplified capital.** Compute and other capital are combined, capital follows an exogenous supply schedule, and saving decisions are not explicit.
- **No policy response.** Taxes, transfers, unemployment insurance, retraining programs, and new distribution mechanisms are outside the published scenarios.
- **No aggregate-demand or financial disruption.** Business cycles, price rigidities, financial-market disruptions, political economy, and catastrophic risks are omitted.
- **Independent implementation.** This project is not an official Anthropic replication package and is not endorsed by the authors.
