# Limitations

- **Scenario tool, not a probability distribution.** The presets and custom settings receive no probability weights and should not be interpreted as forecasts.
- **Aggregate monthly paths.** The model solves aggregate stocks and flows. Monthly points do not represent observations of individual workers.
- **Fixed 2040 endpoint.** The interface always displays the full path through 2040. Results after 2030 rely on independent assumptions and are not values reported by the original authors; the later years are most useful as a sensitivity test.
- **Unified technology frontier.** One affected-task path combines advances in software AI and robotics. It does not separately calibrate their speed, diffusion, productivity, or capital requirements.
- **Two broad occupation groups.** The labor market retains the paper's initially exposed and other groups for internal reallocation, but does not model detailed occupations, skills, switching routes, hours, or the task bundles inside individual jobs.
- **Post-2030 group boundary.** The technology frontier moves smoothly into other work near the paper's 62.35% group boundary. The width of that transition is an implementation assumption, not an empirical estimate.
- **Cross-occupation search.** The paper's search discount is retained, but a two-group model cannot represent the wide variation in how easily particular workers move between occupations.
- **Post-2030 task productivity.** The extension carries each scenario's 2030 linear log-productivity trend through 2040. Anthropic does not specify that continuation.
- **Employment adjustment.** Expanding groups post a fixed share of their modeled employment shortfall as vacancies each month. That paper parameter is not separately calibrated to long-run robotics transitions.
- **Aggregate labor demand.** Output growth, task complementarity, wages, vacancy posting, and reinstatement all affect employment, but the two-group structure remains a compressed representation of job creation and destruction.
- **Frozen-2026 comparison.** The comparison is a model counterfactual, not an observed control group. It preserves the selected scenario's technology through mid-2026 and then stops further capability, adoption, and AI task-productivity growth while ordinary economic dynamics continue.
- **Dollar-level anchors.** GDP is expressed at an annual rate in constant 2026 dollars using the 2026 Q2 current-dollar GDP level as its reference. Wages use June 2026 average weekly earnings for private nonfarm payroll employees, multiplied by 52. This is a mean payroll-worker wage, not a median household income, and neither anchor makes the later model path an official statistical projection.
- **No worker-level distribution.** The source model does not follow individual workers, earnings histories, households, savings, or poverty.
- **Simplified capital.** Compute and other capital are combined, capital follows an exogenous supply schedule, and saving decisions are not explicit.
- **No policy response.** Taxes, transfers, unemployment insurance, retraining programs, and new distribution mechanisms are outside the published scenarios.
- **No aggregate-demand or financial disruption.** Business cycles, price rigidities, financial-market disruptions, political economy, and catastrophic risks are omitted.
- **Independent implementation.** This project is not an official Anthropic replication package and is not endorsed by the authors.
