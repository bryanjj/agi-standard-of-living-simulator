# Model

## Scope

The model covers mid-2026 through the start of 2030 on a monthly grid, matching the horizon in Korinek et al. (2026). The published framework maps assumptions about AI capability, diffusion, productivity, automation, new human tasks, capital supply, wage adjustment, and occupational reallocation into economic outcomes.

## Monthly implementation

`model/anthropic.ts` contains the three published scenario calibrations and their Table 3 outcomes. The interface derives the share of task instances performed with AI as:

`affected task mass × diffusion share`

This gives 4% in the modest scenario, 12% in the substantial scenario, and 30% in the extreme scenario at the 2030 checkpoint.

`model/anthropicSimulation.ts` implements the monthly recursion in Appendix A. It begins from the calibrated 2024 steady state, evaluates the scenario paths each month, and returns the 49 observations from January 2026 through January 2030 shown in the interface. The values between endpoints are therefore model solutions, not linear interpolation.

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

- affected task mass in 2030;
- diffusion share in 2030;
- log productivity gain in mid-2026 and 2030;
- automation share;
- reinstatement ratio;
- cross-occupation search discount; and
- monthly vacancy-posting speed.

Affected mass and diffusion use the logistic paths in Equation (8). The log productivity gain follows the paper’s linear path. The remaining scenario parameters are held constant through the simulation, as they are in the published presets.

## Horizon boundary

The paper directly exposes cognitive tasks to AI and treats all other occupations as the destination for displaced cognitive workers. It does not model rapid progress in robotics or physical-task automation. Beyond 2030, that second group may no longer be an unaffected destination.

The framework also uses one capital good, an exogenous capital-supply schedule, and no explicit saving decision. The authors describe these assumptions as short- and medium-run. The project therefore stops in 2030 until a distinct long-run extension is specified.
