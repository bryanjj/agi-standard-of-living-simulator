# Model

## Scope

The public interface runs on a monthly grid from 2026 through a fixed 2040 endpoint. It preserves the production, capital, ideas, wage, and labor-matching blocks in Korinek et al. (2026), then adds an explicit assumption for a technology frontier that can expand beyond the paper's initially exposed occupations.

The labor market retains the paper's two internal occupation groups so workers displaced from contracting work can move toward expanding work. The public interface reports all-worker outcomes. After the affected-task frontier reaches the initially exposed group, additional exposure passes smoothly into the second group rather than treating it as permanently protected.

## Monthly implementation

`model/anthropic.ts` contains the three published scenario calibrations and their Table 3 outcomes. The interface calculates the share of task instances performed with AI as:

`affected task mass × diffusion share`

This gives 4% in the modest scenario, 12% in the substantial scenario, and 30% in the extreme scenario at the 2030 checkpoint.

`model/anthropicSimulation.ts` implements the monthly recursion. It begins from the calibrated 2024 steady state and evaluates technology, production, capital, labor demand, vacancies, matching, and ideas each month:

1. Evaluate logistic paths for affected task mass and diffusion, plus the smooth productivity path.
2. Solve the paper's task-production block and capital-market root.
3. Calculate the human task share and relative desired employment in each internal occupation group.
4. Let contracting work shed labor through quits and layoffs while expanding work posts vacancies toward its target.
5. Match unemployed workers to both groups with the paper's bounded CES matching function and cross-occupation search friction.
6. Apply the paper's wage rigidity to the initially exposed group.
7. Update employment, unemployment, GDP, wages, factor shares, and the ideas stock.

The preset inputs still reach affected-task masses of 20%, 30%, and 50% in 2030. Their simulated unemployment rates are 3.90%, 4.59%, and 12.53%, close to the paper's reported 3.9%, 4.6%, and 11.9%. After 2030, both groups can eventually be reached by the unified technology frontier, so later values are extension outputs rather than paper replications.

## Editable scenarios

The three presets can be used as starting points. Editing any control creates a custom scenario with these paths and frictions:

- annual affected-task expansion rate;
- diffusion share in 2030;
- log productivity gain in mid-2026 and 2030;
- automation share;
- reinstatement ratio;
- cross-occupation search effectiveness; and
- monthly vacancy-posting speed.

Affected task mass begins at 14% in mid-2026 and follows a 100%-ceiling logistic. If `r` is the annual expansion rate and `m0 = 0.14`, then:

`m(t) = odds(t) / [1 + odds(t)]`

`odds(t) = [m0 / (1 - m0)] × exp[r(t - 2026.5)]`

The preset rates are calculated so affected task mass reaches 20%, 30%, and 50% in 2030. The substantial rate is approximately 27.7% per year and implies approximately 87.2% affected task mass in 2040.

## Labor reallocation and matching

The task framework distinguishes automation, which moves a task from labor to capital, from reinstatement, which creates new tasks for labor. Let `m(t)` be affected task mass, `d(t)` diffusion, `psi` automation share, and `rho` the reinstatement ratio. Net automated task mass is:

`N(t) = m(t) × d(t) × psi × (1 - rho)`

Tasks where AI augments a worker rather than automating the task remain human tasks. Each reinstated task offsets one automated task unit. This quantity is shown in the technology-exposure chart, but it is not treated as a one-for-one loss of jobs.

Internally, the paper's calibration assigns 62.35% of initial task mass to the initially exposed group and 37.65% to other work. A narrow smooth transition lets the frontier spill into other work as total affected task mass passes the first group's boundary. This preserves the unified 100%-ceiling technology path without a discontinuity.

Production determines how much human task demand remains in each group. Those shares define relative desired employment while total desired employment remains at the calibrated normal-employment level. A contraction in one group can therefore coexist with openings in the other. There is no assumption that every automated task creates one job, and there is no assumption that automation permanently removes the same percentage of aggregate jobs.

Each month, the initially exposed group's labor demand also responds to its sticky wage using the paper's demand equation. The other group's target follows its remaining human task share. Ordinary quits absorb some contraction, layoffs close excess employment, and expanding groups post vacancies equal to the selected fraction of their employment shortfall.

Unemployed workers retain their occupation of origin for search accounting. They search most effectively within that group and contribute the selected fraction of effective search to the other group's vacancies. The bounded matching function from Equation (34) limits hires when either search or vacancies are scarce. Output growth and complementarity can create demand for human work, but openings do not become hires automatically.

At the extreme 2030 preset, the model moves from roughly 60.0% to 46.4% employed in the initially exposed group and from roughly 36.2% to 41.1% employed in other work, leaving 12.5% unemployed.

## Frozen-2026 comparison

GDP, real wages, and unemployment are shown against a second run of the same model. The comparison follows the selected scenario through the mid-2026 technology anchor, then holds affected task mass, diffusion, and AI task productivity fixed at those levels. Automation and reinstatement shares are constant scenario parameters. Ordinary TFP, labor-force, ideas, capital, quit, vacancy, and matching dynamics continue.

GDP and real wages are displayed in constant 2026 dollars. GDP is anchored to the BEA's 2026 Q2 seasonally adjusted annual rate of $32.486 trillion. Wages are anchored to the BLS June 2026 average weekly earnings of $1,289.34 for private nonfarm payroll workers, annualized to $67,045.68. Their common trend growth is calculated from the paper's baseline calibration. These anchors change the units, not the relative shape or scenario comparison.

## Other extension assumptions

Diffusion continues along the logistic calibrated to its 2026 anchor and 2030 setting. Automation and reinstatement shares remain constant. After 2030, task productivity continues at the same scenario-specific linear log growth rate used through 2030. At 2040, this gives task-output multipliers of approximately 1.35x in the modest scenario, 2.09x in the substantial scenario, and 6.05x in the extreme scenario. Anthropic does not specify this post-2030 continuation.

A smooth positive-part function is used for employment gaps, and the affected-task split uses a smooth frontier transition. The technology, production, vacancy, and matching rules change continuously without a special switch at 2030.
