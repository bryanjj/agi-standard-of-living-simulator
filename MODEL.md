# Model

## Scope

The model runs on a monthly grid from 2026 through a user-selected terminal year from 2030 to 2040. It preserves the production, capital, ideas, and matching blocks in Korinek et al. (2026), then adds explicit assumptions for a technology frontier that can expand beyond cognitive tasks.

The post-2030 labor market uses one economy-wide worker pool. This is necessary because the paper's two-group target is derived from the assumption that the second group is never directly affected by AI. Once AI or robotics can reach those tasks, that group can no longer serve as a permanent destination for displaced workers.

## Monthly implementation

`model/anthropic.ts` contains the three published scenario calibrations and their Table 3 outcomes. The interface derives the share of task instances performed with AI as:

`affected task mass × diffusion share`

This gives 4% in the modest scenario, 12% in the substantial scenario, and 30% in the extreme scenario at the 2030 checkpoint.

`model/anthropicSimulation.ts` implements the monthly recursion. It begins from the calibrated 2024 steady state and evaluates the technology, production, capital, job-transition, matching, and ideas equations each month. Monthly chart values are model solutions rather than interpolation.

The monthly sequence is:

1. Evaluate logistic paths for affected task mass and diffusion, plus the smooth productivity path.
2. Solve the paper's exact task-production block and capital-market root.
3. Convert the change in human task demand into a cumulative share of jobs that must transition.
4. Move a fraction of the remaining job-transition gap each month.
5. Post replacement roles and ordinary replacement vacancies into one labor market.
6. Match unemployed workers to vacancies with the paper's bounded CES matching function.
7. Update employment, unemployment, GDP, wages, factor shares, and the ideas stock.

The preset inputs still reach the published affected-task masses in 2030. The economic outcomes are no longer intended to replicate the paper's group-specific unemployment results because the post-2030 extension removes the permanent unexposed occupation group on which those results depend.

## Editable scenarios

The three presets can be used as starting points. Editing any control creates a custom scenario with these paths and frictions:

- annual affected-task expansion rate;
- diffusion share in 2030;
- log productivity gain in mid-2026 and 2030;
- automation share;
- reinstatement ratio;
- displaced-worker search effectiveness; and
- monthly job-transition speed.

Affected task mass begins at 14% in mid-2026 and follows a 100%-ceiling logistic. If `r` is the annual expansion rate and `m0 = 0.14`, then:

`m(t) = odds(t) / [1 + odds(t)]`

`odds(t) = [m0 / (1 - m0)] × exp[r(t - 2026.5)]`

The preset rates are calculated so affected task mass reaches 20%, 30%, and 50% in 2030. The substantial rate is approximately 27.7% per year and implies approximately 87.2% affected task mass in 2040.

## One-pool labor transition

Equation (15) in the paper gives `lN`, the log increase in jobs outside the affected occupation group needed to absorb released workers. Before 2030, the implied number of workers changing jobs is approximately:

`other-group employment × [exp(lN) - 1]`

The extension keeps that local behavior but removes the permanent group boundary. Let `sN = 0.37647` be the paper's 2025 all-other employment share and `E0` normal-times employment. The cumulative job-transition target is:

`J*(t) = E0 × tanh{sN × [exp(lN(t)) - 1]}`

The hyperbolic tangent is an extension assumption. It is smooth, agrees with the paper's expression to first order for small shocks, and limits cumulative transitions to the number of employed workers as affected task mass approaches 100%.

Each month, employers complete the selected adjustment-speed fraction of `J*(t+1) - J(t)`. These transitions are worker displacement events: the old role ends and a replacement role is posted. Ordinary quits and replacement vacancies continue alongside them.

There is one unemployment stock and one vacancy market. The matching function is the bounded CES form from Equation (34) of the paper. The former cross-occupation search parameter is reinterpreted as displaced-worker search effectiveness. Normal unemployment supplies one unit of search per worker; unemployment above the normal pool supplies the selected fraction. This retains the paper's idea that displaced workers may search less effectively because their previous skills or occupation no longer match available work, without assigning them to a permanent origin group.

## Other extension assumptions

Diffusion continues along the logistic calibrated to its 2026 anchor and 2030 setting. Automation and reinstatement shares remain constant. Task productivity follows its linear path through 2030, then matches its 2030 level and slope while approaching an assumed 30x task-output ceiling.

A smooth positive-part function is used for job-transition gaps and excess unemployment. The technology, production, reallocation, vacancy, and matching rules therefore change continuously without a special switch at 2030.
