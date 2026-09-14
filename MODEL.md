# Model

## Scope

The model runs on a monthly grid from 2026 through a user-selected terminal year from 2030 to 2040. It preserves the production, capital, ideas, and matching blocks in Korinek et al. (2026), then adds explicit assumptions for a technology frontier that can expand beyond cognitive tasks.

The post-2030 labor market uses one economy-wide worker pool. This is necessary because the paper's two-group target is derived from the assumption that the second group is never directly affected by AI. Once AI or robotics can reach those tasks, that group can no longer serve as a permanent destination for displaced workers.

## Monthly implementation

`model/anthropic.ts` contains the three published scenario calibrations and their Table 3 outcomes. The interface derives the share of task instances performed with AI as:

`affected task mass × diffusion share`

This gives 4% in the modest scenario, 12% in the substantial scenario, and 30% in the extreme scenario at the 2030 checkpoint.

`model/anthropicSimulation.ts` implements the monthly recursion. It begins from the calibrated 2024 steady state and evaluates the technology, production, capital, employment-target, matching, and ideas equations each month. Monthly chart values are model solutions rather than interpolation.

The monthly sequence is:

1. Evaluate logistic paths for affected task mass and diffusion, plus the smooth productivity path.
2. Solve the paper's exact task-production block and capital-market root.
3. Convert net automated task mass into a target for human employment.
4. Count ordinary quits toward any required employment contraction, then close a fraction of the remaining gap through layoffs.
5. Post vacancies only for human jobs that remain in the target.
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
- monthly employment-adjustment speed.

Affected task mass begins at 14% in mid-2026 and follows a 100%-ceiling logistic. If `r` is the annual expansion rate and `m0 = 0.14`, then:

`m(t) = odds(t) / [1 + odds(t)]`

`odds(t) = [m0 / (1 - m0)] × exp[r(t - 2026.5)]`

The preset rates are calculated so affected task mass reaches 20%, 30%, and 50% in 2030. The substantial rate is approximately 27.7% per year and implies approximately 87.2% affected task mass in 2040.

## One-pool labor adjustment

The paper's task framework distinguishes automation, which moves a task from labor to capital, from reinstatement, which creates new tasks for labor. Those channels enter the paper's `lN` term together with affected task mass, diffusion, and productivity on augmented tasks. Equation (15) gives the increase in jobs outside the affected occupation group needed to absorb released workers. Before 2030, the implied number of jobs that must change is approximately:

`other-group employment × [exp(lN) - 1]`

The extension keeps this local quantity but removes the permanent group boundary. Let `sN = 0.37647` be the paper's 2025 all-other employment share and `E0` normal-times employment. The bounded cumulative job-elimination target is:

`J*(t) = E0 × tanh{sN × [exp(lN(t)) - 1]}`

The hyperbolic tangent is an extension assumption. It agrees with the paper's expression to first order for small shocks and keeps cumulative elimination below the labor force as affected task mass approaches 100%. The 2024 value is treated as already embodied in the observed baseline, so the human-employment target is `E*(t) = E0 - [J*(t) - J*(2024)]`.

Unlike the previous implementation, eliminating a job does not create a replacement opening. Reinstatement reduces `lN` by offsetting automated task mass. Augmented tasks remain human tasks, although greater productivity can reduce the labor required per unit of output through the production block.

Each month, ordinary quits count toward any decline in `E*`. If employment after quits still exceeds next month's target, the selected adjustment-speed fraction of that excess becomes layoffs. If employment is below the target, employers post only enough vacancies to fill the remaining human jobs. The paper's bounded matching function determines how many of those vacancies produce hires.

There is one unemployment stock and one vacancy market. The matching function is the bounded CES form from Equation (34) of the paper. The former cross-occupation search parameter is reinterpreted as displaced-worker search effectiveness. Normal unemployment supplies one unit of search per worker; unemployment above the normal pool supplies the selected fraction. This retains the paper's idea that displaced workers may search less effectively because their previous skills or occupation no longer match available work, without assigning them to a permanent origin group.

## Other extension assumptions

Diffusion continues along the logistic calibrated to its 2026 anchor and 2030 setting. Automation and reinstatement shares remain constant. Task productivity follows its linear path through 2030, then matches its 2030 level and slope while approaching an assumed 30x task-output ceiling.

A smooth positive-part function is used for employment gaps and excess unemployment. The technology, production, employment-target, vacancy, and matching rules therefore change continuously without a special switch at 2030.
