# Model

## Scope

The model runs on a monthly grid from mid-2026 through a user-selected terminal year from 2030 to 2040. It adapts the framework in Korinek et al. (2026), then adds explicit assumptions for a technology frontier that can expand beyond cognitive tasks.

## Monthly implementation

`model/anthropic.ts` contains the three published scenario calibrations and their Table 3 outcomes. The interface derives the share of task instances performed with AI as:

`affected task mass × diffusion share`

This gives 4% in the modest scenario, 12% in the substantial scenario, and 30% in the extreme scenario at the 2030 checkpoint.

`model/anthropicSimulation.ts` implements the monthly recursion. It begins from the calibrated 2024 steady state and evaluates the technology, production, capital, wage, job-flow, matching, and ideas equations each month. Monthly chart values are model solutions rather than interpolation.

The monthly sequence follows the paper:

1. Logistic paths for affected task mass and diffusion, plus a smooth scenario path for productivity gain.
2. The exact closed-form production block and the capital-market root.
3. Wages, labor and capital shares, and occupation-group employment targets.
4. Cognitive wage rigidity, labor demand, quits, and displacement layoffs.
5. Vacancy posting, effective search, matching, hiring, and occupation switching.
6. Monthly employment and unemployment stocks.
7. GDP reporting and the ideas-stock update.

The preset inputs still reach the published affected-task masses in 2030. Economic outcomes remain close to the published scenarios, but they are not exact replications because the affected-task path and symmetric job-adjustment rule differ.

## Editable scenarios

The three presets can be used as starting points. Editing any control creates a custom scenario with these paths and frictions:

- annual affected-task expansion rate;
- diffusion share in 2030;
- log productivity gain in mid-2026 and 2030;
- automation share;
- reinstatement ratio;
- cross-occupation search discount; and
- monthly job-adjustment speed.

Affected task mass begins at 14% in mid-2026 and follows a 100%-ceiling logistic. If `r` is the annual expansion rate and `m0 = 0.14`, then:

`m(t) = odds(t) / [1 + odds(t)]`

`odds(t) = [m0 / (1 - m0)] × exp[r(t - 2026.5)]`

The preset rates are calculated so affected task mass reaches 20%, 30%, and 50% in 2030. The substantial rate is approximately 27.7% per year and implies approximately 87.2% affected task mass in 2040.

## Exposure across occupation groups

Affected tasks stay within the cognitive group through 2030. After 2030, new exposure is allocated cumulatively across remaining tasks so neither group ever loses affected task mass. Let `m30` be total affected mass in 2030, `R = 1 - m30`, `N` be the initially non-cognitive task share, `q = N / R`, `k = q / (1 - q)`, and `u = clamp[(m - m30) / R, 0, 1]`. Non-cognitive affected mass is:

`mN = R × {u - [1 - (1 - u)^(k + 1)] / (k + 1)}`

Cognitive affected mass is `mC = m - mN`. The marginal allocation to non-cognitive tasks begins at zero, rises smoothly, and reaches the amount required for `mC + mN` to approach 100% without exceeding either group’s task mass.

## Other extension assumptions

Diffusion continues along the logistic calibrated to its 2026 anchor and 2030 setting. Automation and reinstatement shares remain constant. Task productivity follows its linear path through 2030, then matches its 2030 level and slope while approaching an assumed 30x task-output ceiling.

The production block tracks remaining labor-task mass separately for both occupation groups. Employment gaps close at the selected monthly adjustment speed. A smooth positive-part function replaces hard layoff and vacancy thresholds, and the matching function is expressed in its differentiable CES form. Workers can continue searching across groups through the existing search matrix.
