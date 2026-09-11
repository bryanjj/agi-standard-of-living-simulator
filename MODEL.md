# Model

## Scope

The model begins in mid-2026 and runs on a monthly grid. The default terminal year is 2030, matching the horizon in Korinek et al. (2026). A documented extension can continue the same system through a user-selected terminal year from 2030 to 2050.

## Monthly implementation

`model/anthropic.ts` contains the three published scenario calibrations and their Table 3 outcomes. The interface derives the share of task instances performed with AI as:

`affected task mass × diffusion share`

This gives 4% in the modest scenario, 12% in the substantial scenario, and 30% in the extreme scenario at the 2030 checkpoint.

`model/anthropicSimulation.ts` implements the monthly recursion in Appendix A. It begins from the calibrated 2024 steady state and evaluates the scenario paths each month. At the default horizon, it returns the 49 observations from January 2026 through January 2030 shown in the interface. The values between endpoints are therefore model solutions, not linear interpolation.

The monthly sequence follows the paper:

1. Logistic paths for affected task mass and diffusion, plus the scenario path for productivity gain.
2. The exact closed-form production block and the capital-market root.
3. Wages, labor and capital shares, and occupation-group employment targets.
4. Cognitive wage rigidity, labor demand, quits, and displacement layoffs.
5. Vacancy posting, effective search, matching, hiring, and occupation switching.
6. Monthly employment and unemployment stocks.
7. GDP reporting and the ideas-stock update.

For the published presets, the implementation reproduces the paper’s Table 3 GDP, GDP growth, wage, labor-share, and unemployment checkpoints to rounding precision.

## Editable scenarios

The three presets can be used as starting points. Editing any control creates a custom scenario with these paths and frictions:

- economy-wide task mass that technology can perform in 2030 and 2040, shown as two checkpoints on one capability path;
- diffusion share in 2030;
- task productivity gain in mid-2026 and 2030, displayed as a percentage and converted to log units internally;
- automation share;
- reinstatement ratio;
- cross-occupation search discount; and
- monthly vacancy-posting speed.

Affected mass and diffusion use the logistic paths in Equation (8). The log productivity gain follows the paper’s linear path. The remaining scenario parameters are held constant through the simulation, as they are in the published presets.

## Post-2030 extension

The 2030 result remains the paper checkpoint. Selecting a later terminal year does not change any monthly input or output through January 2030. Tests compare the entire 2026 to 2030 path from an extended run with the default run.

After 2030, affected task mass and diffusion continue along the same logistic curves calibrated to their 2026 anchors and 2030 scenario values. Automation share, reinstatement ratio, matching frictions, capital supply, and the other paper parameters remain unchanged.

The interface presents the 2030 and 2040 capability settings as the same economy-wide measure. Internally, the 2030 setting calibrates the original affected group. The minimum 2040 value continues that original path; moving the 2040 setting higher adds tasks from the initially unexposed group.

Let `r2040` be the selected fraction of the initially unexposed group that technology can perform by 2040, and let `p = clamp((t - 2030) / 10, 0, 1)`. Its path is:

`r(t) = r2040 × p³(6p² - 15p + 10)`

This single quintic smoothstep applies to every slider value, including 100%. It has zero slope at both checkpoints, reaches the selected value in 2040, and holds the added exposure constant afterward. The original affected-group path can still continue growing after 2040. The economy-wide mass newly exposed at time `t` is the initially unexposed task share multiplied by `r(t)`.

Newly exposed tasks inherit the existing diffusion, task-productivity, automation-share, and reinstatement settings. This is an explicit simplifying assumption. It keeps the extension to one new parameter rather than adding separate paths for robotics adoption, productivity, autonomy, and task creation.

The paper's log productivity gain is linear through 2030. A permanently linear extrapolation would eventually become implausibly large and hit a hard cap. The extension instead uses a smooth saturation path. If the log productivity slope at 2030 is positive, productivity approaches an assumed 30x task-output ceiling while matching both the 2030 level and slope:

`a(t) = ln(30) - [ln(30) - a(2030)] × exp{-g[t - 2030] / [ln(30) - a(2030)]}`

For a negative 2030 slope, the same construction approaches zero while matching the 2030 level and slope. This avoids a level jump or growth-rate kink at the paper boundary.

The source model's two occupation groups remain fixed as worker cohorts. The interface labels them “initially AI-exposed occupations” and “initially unexposed occupations.” The new control changes the task exposure inside the second cohort rather than moving workers between the labels.

The production block already allows the aggregate technology terms to sum over affected task types. The extension tracks the remaining labor-task mass separately for each cohort and assigns the full-employment target across groups in proportion to those remaining task masses. If the initially unexposed group moves above its next-month target, a share of the employment overhang is removed at the selected monthly job-adjustment speed after normal quits. If either group is below demand, it posts vacancies at that speed. The existing search matrix then lets unemployed workers seek jobs in either group. This preserves the published labor-market path when exposure expansion is zero while preventing the extension from jumping immediately to a new employment target.
