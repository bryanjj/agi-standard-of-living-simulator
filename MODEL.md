# Model

## Scope

The public interface runs on a monthly grid from 2026 through a fixed 2040 endpoint. It preserves the production, capital, ideas, and matching blocks in Korinek et al. (2026), then adds explicit assumptions for a technology frontier that can expand beyond cognitive tasks. The implementation can still calculate a shorter path for testing and the published 2030 checkpoint, but the interface presents the complete extension.

The post-2030 labor market uses one economy-wide worker pool. This is necessary because the paper's two-group target is derived from the assumption that the second group is never directly affected by AI. Once AI or robotics can reach those tasks, that group can no longer serve as a permanent destination for displaced workers.

## Monthly implementation

`model/anthropic.ts` contains the three published scenario calibrations and their Table 3 outcomes. The interface derives the share of task instances performed with AI as:

`affected task mass × diffusion share`

This gives 4% in the modest scenario, 12% in the substantial scenario, and 30% in the extreme scenario at the 2030 checkpoint.

`model/anthropicSimulation.ts` implements the monthly recursion. It begins from the calibrated 2024 steady state and evaluates the technology, production, capital, employment-target, matching, and ideas equations each month. Monthly chart values are model solutions rather than interpolation.

The monthly sequence is:

1. Evaluate logistic paths for affected task mass and diffusion, plus the smooth productivity path.
2. Solve the paper's exact task-production block and capital-market root.
3. Calculate net human task elimination from the four technology parameters, then apply the job-loss pass-through to obtain the target reduction in total employment.
4. Count ordinary quits toward any required employment contraction, then close a fraction of the remaining gap through layoffs.
5. Post vacancies only for human jobs that remain in the target.
6. Match unemployed workers to vacancies with the paper's bounded CES matching function.
7. Update employment, unemployment, GDP, wages, factor shares, and the ideas stock.

The preset inputs still reach the published affected-task masses in 2030. Their pass-through values are calibrated to reproduce the paper's aggregate unemployment rates at that checkpoint. With restored employment, the production block also produces GDP, average wage, and factor-share results close to Table 3 without a separate GDP calibration.

## Editable scenarios

The three presets can be used as starting points. Editing any control creates a custom scenario with these paths and frictions:

- annual affected-task expansion rate;
- diffusion share in 2030;
- log productivity gain in mid-2026 and 2030;
- automation share;
- reinstatement ratio;
- job-loss pass-through;
- displaced-worker search effectiveness; and
- monthly employment-adjustment speed.

Affected task mass begins at 14% in mid-2026 and follows a 100%-ceiling logistic. If `r` is the annual expansion rate and `m0 = 0.14`, then:

`m(t) = odds(t) / [1 + odds(t)]`

`odds(t) = [m0 / (1 - m0)] × exp[r(t - 2026.5)]`

The preset rates are calculated so affected task mass reaches 20%, 30%, and 50% in 2030. The substantial rate is approximately 27.7% per year and implies approximately 87.2% affected task mass in 2040.

## One-pool labor adjustment

The paper's task framework distinguishes automation, which moves a task from labor to capital, from reinstatement, which creates new tasks for labor. In the one-pool extension, human job capacity is determined directly by the four technology parameters. Let `m(t)` be affected task mass, `d(t)` diffusion, `psi` automation share, and `rho` the reinstatement ratio. Net eliminated human task mass is:

`N(t) = m(t) × d(t) × psi × (1 - rho)`

Tasks where AI augments a worker rather than automating the task remain human tasks. Each reinstated task offsets one automated task unit. Productivity changes output per AI-used task but does not independently add or remove human tasks.

Let `N0` be the task elimination already embodied in the calibrated 2024 labor market, `E0` normal-times employment, and `beta` job-loss pass-through. The change from that baseline and the human-employment target are:

`Delta N(t) = [N(t) - N0] / [1 - N0]`

`E*(t) = E0 × [1 - beta × Delta N(t)]`

Job-loss pass-through is the share of residual task displacement that reduces the aggregate job pool after demand growth and jobs created elsewhere are counted. It is calibrated to the paper's 2030 unemployment result for each preset: 8.0% in modest, 12.5% in substantial, and 31.1% in extreme. These are reduced-form calibration values, not empirical estimates. A value of zero fully absorbs displacement elsewhere; a value of one maps residual task displacement one-for-one to lost job capacity.

Each month, ordinary quits count toward any decline in `E*`. If employment after quits still exceeds next month's target, the selected adjustment-speed fraction of that excess becomes layoffs. If employment is below the target, employers post only enough vacancies to fill the remaining human jobs. The paper's bounded matching function determines how many of those vacancies produce hires.

There is one unemployment stock and one vacancy market. Total unemployment combines the normal unemployment pool, structural employment loss implied by `beta × Delta N`, and any temporary gap caused by supported jobs remaining unfilled. The matching function is the bounded CES form from Equation (34) of the paper. The former cross-occupation search parameter is reinterpreted as displaced-worker search effectiveness. Normal unemployment supplies one unit of search per worker; unemployment above the normal pool supplies the selected fraction.

## Frozen-2026 comparison

GDP, real wages, and unemployment are shown against a second run of the same model. The comparison follows the selected scenario through the mid-2026 technology anchor, then holds affected task mass, diffusion, and AI task productivity fixed at those levels. Automation and reinstatement shares are already constant scenario parameters. Ordinary TFP, labor-force, ideas, capital, quit, vacancy, and matching dynamics continue.

GDP and real wages are displayed in constant 2026 dollars. The GDP path is anchored to the BEA's 2026 Q2 seasonally adjusted annual rate of $32.486 trillion. The wage path is anchored to the BLS June 2026 average weekly earnings of $1,289.34 for private nonfarm payroll workers, annualized to $67,045.68. Their common trend growth is calculated from the paper's baseline calibration: real wages grow with labor-augmenting ideas at `baseline TFP growth / labor share`, and GDP also includes labor-force growth. These anchors change the units, not the relative shape or scenario comparison.

## Other extension assumptions

Diffusion continues along the logistic calibrated to its 2026 anchor and 2030 setting. Automation and reinstatement shares remain constant. After 2030, task productivity continues at the same scenario-specific linear log growth rate used through 2030. At 2040, this gives task-output multipliers of approximately 1.35x in the modest scenario, 2.09x in the substantial scenario, and 6.05x in the extreme scenario. Anthropic does not specify this post-2030 continuation.

A smooth positive-part function is used for employment gaps and excess unemployment. The technology, production, employment-target, vacancy, and matching rules therefore change continuously without a special switch at 2030.
