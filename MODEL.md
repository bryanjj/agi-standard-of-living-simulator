# Model

## Scope

The model covers mid-2026 through the start of 2030 on a monthly grid, matching the horizon in Korinek et al. (2026). The published framework maps assumptions about AI capability, diffusion, productivity, automation, new human tasks, capital supply, wage adjustment, and occupational reallocation into economic outcomes.

## Current implementation milestone

`model/anthropic.ts` contains the three published scenario calibrations and their Table 3 outcomes. The interface derives the share of task instances performed with AI as:

`affected task mass × diffusion share`

This gives 4% in the modest scenario, 12% in the substantial scenario, and 30% in the extreme scenario.

The current interface presents published checkpoints rather than interpolating invented paths between 2026 and 2030. A subsequent milestone will implement the paper’s 44-equation monthly recursion and validate it against these checkpoints.

## Planned equation blocks

1. Logistic paths for affected task mass and diffusion, plus the scenario path for productivity gain.
2. Production, capital demand and supply, wages, factor shares, and employment targets.
3. Cognitive wage rigidity and displacement layoffs.
4. Vacancy posting, effective search, matching, hiring, and occupation switching.
5. Monthly employment and unemployment stocks.
6. Ideas production and the resulting measured productivity contribution.

## Horizon boundary

The paper directly exposes cognitive tasks to AI and treats all other occupations as the destination for displaced cognitive workers. It does not model rapid progress in robotics or physical-task automation. Beyond 2030, that second group may no longer be an unaffected destination.

The framework also uses one capital good, an exogenous capital-supply schedule, and no explicit saving decision. The authors describe these assumptions as short- and medium-run. The project therefore stops in 2030 until a distinct long-run extension is specified.
