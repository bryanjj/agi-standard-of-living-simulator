import type { AnthropicScenario, AnthropicScenarioId } from './anthropic';

export type EditableScenarioParameters = {
  affectedTaskGrowth: number;
  diffusion: number;
  productivityGain: number;
  automationShare: number;
  reinstatementRatio: number;
  reemploymentEffectiveness: number;
  postingSpeed: number;
  productivityAnchor2026: number;
};

export type ScenarioSimulationOptions = {
  terminalYear?: number;
};

export type ScenarioPathPoint = {
  date: number;
  label: string;
  affectedTaskMass: number;
  diffusion: number;
  productivityGain: number;
  aiTaskShare: number;
  eliminatedJobShare: number;
  gdpGap: number;
  gdpGrowth: number;
  averageWageGap: number;
  laborShare: number;
  capitalShare: number;
  totalUnemployment: number;
};

type TechnologyPath = {
  m: number;
  d: number;
  a: number;
  psi: number;
  rho: number;
};

type PotentialEconomy = {
  lN: number;
  lnSL: number;
  lnW: number;
  lnYL: number;
  xr: number;
  lnK: number;
  laborTaskShare: number;
};

type SteadyState = {
  ell0: number;
  UBar: number;
  fBar: number;
  piBar: number;
  chi: number;
  uBar: number;
};

type SimulationRow = {
  t: number;
  x: TechnologyPath;
  lnYAct: number;
  wageAct: number;
  lnSLAct: number;
  employment: number;
  unemployment: number;
  employmentTarget: number;
};

// PAPER: Korinek et al. (2026), Tables 1, A.1 and A.2.
const FIXED = {
  sigma: 0.5,
  laborShare: 0.6,
  capitalElasticity: 3,
  researchReturns: 1,
  fishingOutTfpUnits: 3.1,
  baselineTfpGrowth: 0.01,
  laborForceGrowth: 0.0033,
  matchingCurvature: 1.27,
  meanFillingRate: 0.65,
  normalQuitRateAnnual: 0.11,
  responsiveQuitShare: 0.06 / 0.11,
  start: 2024,
  anchor: 2026.5,
  end: 2030,
  step: 1 / 12,
} as const;

const NORMAL_UNEMPLOYMENT = 0.03840656852308217;

// ASSUMPTION: The first long-run implementation can be displayed through 2040.
export const TERMINAL_YEAR_RANGE = {
  min: 2030,
  max: 2040,
  step: 1,
  default: 2040,
  provenance: 'ASSUMPTION',
} as const;

// ASSUMPTION: The productivity path approaches a finite task-output ceiling after 2030.
const EXTENSION_PRODUCTIVITY_MULTIPLIER_CEILING = {
  value: 30,
  provenance: 'ASSUMPTION',
} as const;

const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
const fractionToRate = (fraction: number) => -Math.log(1 - clamp(fraction, 0, 0.999999));
const logit = (value: number) => Math.log(value / (1 - value));

// CALCULATED: A 100%-ceiling logistic rate that passes through the paper's 2030 task-mass setting.
export const affectedTaskGrowthFromMass = (mass2030: number) => (
  (logit(clamp(mass2030, 0.140001, 0.999999)) - logit(0.14)) / (FIXED.end - FIXED.anchor)
);

export const affectedTaskMassAt = (time: number, annualGrowth: number) => {
  const oddsAtAnchor = 0.14 / (1 - 0.14);
  const odds = oddsAtAnchor * Math.exp(Math.max(0, annualGrowth) * (time - FIXED.anchor));
  return odds / (1 + odds);
};

export const parametersFromScenario = (scenario: AnthropicScenario): EditableScenarioParameters => ({
  affectedTaskGrowth: affectedTaskGrowthFromMass(scenario.inputs.affectedTaskMass.value),
  diffusion: scenario.inputs.diffusion.value,
  productivityGain: scenario.inputs.productivityGain.value,
  automationShare: scenario.inputs.automationShare.value,
  reinstatementRatio: scenario.inputs.reinstatementRatio.value,
  reemploymentEffectiveness: scenario.inputs.searchDiscount.value,
  postingSpeed: scenario.inputs.postingSpeed.value,
  productivityAnchor2026: scenario.id === 'modest' ? 0.3 : scenario.id === 'extreme' ? 0.45 : 0.35,
});

export const scenarioParameterRanges: Record<keyof EditableScenarioParameters, {
  min: number;
  max: number;
  step: number;
}> = {
  affectedTaskGrowth: { min: 0, max: 0.65, step: 0.005 },
  diffusion: { min: 0.1, max: 1, step: 0.01 },
  productivityGain: { min: 0.1, max: 1.5, step: 0.01 },
  automationShare: { min: 0, max: 1, step: 0.01 },
  reinstatementRatio: { min: 0, max: 1, step: 0.01 },
  reemploymentEffectiveness: { min: 0.01, max: 1, step: 0.01 },
  postingSpeed: { min: 0.01, max: 1, step: 0.01 },
  productivityAnchor2026: { min: 0.1, max: 1.5, step: 0.01 },
};

const logisticSlope = (anchor: number, target: number, ceiling: number) => {
  if (target <= anchor || target >= ceiling) return target >= ceiling ? 3 : 0;
  return clamp(
    Math.log(((ceiling - anchor) / anchor) * (target / (ceiling - target))) / (FIXED.end - FIXED.anchor),
    0,
    3,
  );
};

const logisticAt = (time: number, anchor: number, ceiling: number, slope: number) => {
  if (slope <= 0 || anchor >= ceiling) return anchor;
  const midpoint = FIXED.anchor + Math.log(ceiling / anchor - 1) / slope;
  return ceiling / (1 + Math.exp(-slope * (time - midpoint)));
};

const productivityAt = (time: number, parameters: EditableScenarioParameters) => {
  const slope = (parameters.productivityGain - parameters.productivityAnchor2026) / (FIXED.end - FIXED.anchor);
  const linear = parameters.productivityAnchor2026 + slope * (time - FIXED.anchor);
  const ceiling = Math.log(EXTENSION_PRODUCTIVITY_MULTIPLIER_CEILING.value);
  if (time <= FIXED.end) return clamp(linear, 0, ceiling);
  if (Math.abs(slope) < 1e-12) return clamp(parameters.productivityGain, 0, ceiling);

  const yearsAfter2030 = time - FIXED.end;
  if (slope > 0) {
    const remaining = ceiling - parameters.productivityGain;
    if (remaining <= 1e-12) return ceiling;
    return ceiling - remaining * Math.exp(-slope * yearsAfter2030 / remaining);
  }
  if (parameters.productivityGain <= 1e-12) return 0;
  return parameters.productivityGain * Math.exp(slope * yearsAfter2030 / parameters.productivityGain);
};

const technologyAt = (time: number, parameters: EditableScenarioParameters): TechnologyPath => {
  const dSlope = logisticSlope(0.1, parameters.diffusion, 1);

  return {
    m: affectedTaskMassAt(time, parameters.affectedTaskGrowth),
    d: logisticAt(time, 0.1, 1, dSlope),
    a: productivityAt(time, parameters),
    psi: parameters.automationShare,
    rho: parameters.reinstatementRatio,
  };
};

const closedForm = (
  tech: TechnologyPath,
  ideasGap: number,
  rentalGap: number,
): PotentialEconomy => {
  const complementarity = 1 - FIXED.sigma;
  const aiMass = tech.m * tech.d;
  const costFactor = Math.exp(-complementarity * tech.a);
  const laborTaskReduction = tech.d * (
    1 - tech.rho * tech.psi - (1 - tech.psi) * costFactor
  );
  const laborTaskShare = 1 - tech.m * laborTaskReduction;
  const lnSL = Math.log(
    1 - tech.psi * aiMass * (costFactor - tech.rho)
      + Math.expm1(-complementarity * rentalGap) / FIXED.laborShare,
  ) + complementarity * rentalGap;
  const lN = -Math.log(
    1 - aiMass * (1 - tech.rho * tech.psi - (1 - tech.psi) * costFactor),
  );
  const lnW = (lnSL + lN) / complementarity + ideasGap;
  const lnYL = lnW - lnSL;
  const lnK = Math.log(
    (1 - FIXED.laborShare * Math.exp(lnSL)) / (1 - FIXED.laborShare),
  ) + lnYL - rentalGap;

  return { lN, lnSL, lnW, lnYL, xr: rentalGap, lnK, laborTaskShare };
};

const potentialEconomy = (tech: TechnologyPath, ideasGap: number): PotentialEconomy => {
  let low = -1;
  let high = 4;
  let lowValue = closedForm(tech, ideasGap, low).lnK - FIXED.capitalElasticity * low;
  for (let iteration = 0; iteration < 100; iteration += 1) {
    const middle = (low + high) / 2;
    const value = closedForm(tech, ideasGap, middle).lnK - FIXED.capitalElasticity * middle;
    if ((value > 0) === (lowValue > 0)) {
      low = middle;
      lowValue = value;
    } else {
      high = middle;
    }
  }
  return closedForm(tech, ideasGap, (low + high) / 2);
};

const hires = (efficiency: number, search: number, vacancies: number) => {
  if (search <= 0 || vacancies <= 0) return 0;
  return efficiency / Math.pow(
    Math.pow(search, -FIXED.matchingCurvature) + Math.pow(vacancies, -FIXED.matchingCurvature),
    1 / FIXED.matchingCurvature,
  );
};

const fillingRateAtRest = (efficiency: number, hiresPerSearch: number) => {
  const ratio = hiresPerSearch / efficiency;
  if (ratio >= 1) return Number.NaN;
  return efficiency * Math.pow(1 - Math.pow(ratio, FIXED.matchingCurvature), 1 / FIXED.matchingCurvature);
};

const steadyState = (): SteadyState => {
  const employment = 1 - NORMAL_UNEMPLOYMENT;
  const quitRate = fractionToRate(FIXED.normalQuitRateAnnual / 12);
  const normalHires = quitRate * employment;
  const finding = normalHires / NORMAL_UNEMPLOYMENT;

  let low = finding;
  let high = Math.max(1, low * 2);
  while (fillingRateAtRest(high, finding) < FIXED.meanFillingRate && high < 1_000_000) high *= 2;
  for (let iteration = 0; iteration < 200; iteration += 1) {
    const middle = (low + high) / 2;
    if (fillingRateAtRest(middle, finding) >= FIXED.meanFillingRate) high = middle;
    else low = middle;
  }
  const chi = Math.min(1, high);
  const piBar = fillingRateAtRest(chi, finding);

  return {
    ell0: employment,
    UBar: NORMAL_UNEMPLOYMENT,
    fBar: finding,
    piBar,
    chi,
    uBar: NORMAL_UNEMPLOYMENT,
  };
};

const actualEconomy = (
  potential: PotentialEconomy,
  ideasGap: number,
  employment: number,
  baseEmployment: number,
) => {
  const sigma = FIXED.sigma;
  const complementarity = 1 - sigma;
  const sL = FIXED.laborShare;
  const sK = 1 - sL;
  const lambda = Math.max(potential.laborTaskShare, 1e-12);
  const capitalBlock = (1 - sL * Math.exp(potential.lnSL)) * Math.exp(-complementarity * potential.xr);
  // CALCULATED: keep the production solver inside the logarithm's numerical
  // domain when a stress-test scenario drives employment effectively to zero.
  const employmentRatio = Math.max(employment / baseEmployment, 1e-9);
  const laborPrice = (Math.log(lambda) - Math.log(employmentRatio)) / sigma;
  const lnPriceBlock = Math.log(sL) + Math.log(lambda)
    + complementarity * (laborPrice - ideasGap);

  const evaluate = (rentalGap: number) => {
    // CALCULATED: the root finder can probe just outside the feasible factor-share
    // interval in near-zero-employment stress tests. The bounded value preserves
    // a finite limit without changing ordinary scenario results.
    const laborShare = clamp(
      1 - capitalBlock * Math.exp(complementarity * rentalGap),
      1e-12,
      1 - 1e-12,
    );
    const outputComponent = sigma / complementarity * (Math.log(laborShare) - lnPriceBlock);
    const lnY = outputComponent + complementarity * ideasGap;
    return {
      laborShare,
      outputComponent,
      lnY,
      lnK: Math.log((1 - laborShare) / sK) + lnY - rentalGap,
    };
  };

  let low = -1;
  let high = 4;
  let lowValue = evaluate(low).lnK - FIXED.capitalElasticity * low;
  for (let iteration = 0; iteration < 100; iteration += 1) {
    const middle = (low + high) / 2;
    const value = evaluate(middle).lnK - FIXED.capitalElasticity * middle;
    if ((value > 0) === (lowValue > 0)) {
      low = middle;
      lowValue = value;
    } else {
      high = middle;
    }
  }
  const rentalGap = (low + high) / 2;
  const result = evaluate(rentalGap);
  const lnW = result.outputComponent / sigma + laborPrice;
  return {
    lnW,
    lnY: result.lnY,
    lnSL: Math.log(result.laborShare / sL),
  };
};

// CALCULATED: human task mass removed after accounting for capability, adoption,
// automation, and the creation of new human tasks. Augmented tasks remain human tasks.
export const netEliminatedTaskShareAt = (
  time: number,
  parameters: EditableScenarioParameters,
) => {
  const tech = technologyAt(time, parameters);
  return tech.m * tech.d * tech.psi * (1 - tech.rho);
};

// ASSUMPTION: task mass is weighted by required labor, so a percentage-point loss
// of net human task mass lowers the long-run human-employment target by the same
// percentage of baseline employment. The 2024 technology state is already embodied
// in the observed baseline and is removed from subsequent changes.
const humanEmploymentTarget = (
  time: number,
  parameters: EditableScenarioParameters,
  baseEmployment: number,
  initialNetEliminatedShare: number,
) => {
  const currentNetEliminatedShare = netEliminatedTaskShareAt(time, parameters);
  const changeFromBaseline = (
    (currentNetEliminatedShare - initialNetEliminatedShare)
    / (1 - initialNetEliminatedShare)
  );
  return baseEmployment * (1 - changeFromBaseline);
};

const growthGap = (gdpGap: number, ideasGap: number) => {
  const ideasGrowth = FIXED.baselineTfpGrowth / FIXED.laborShare;
  const fishingOutLaborUnits = FIXED.fishingOutTfpUnits * FIXED.laborShare + FIXED.researchReturns;
  return ideasGrowth * (
    Math.exp(FIXED.researchReturns * gdpGap - fishingOutLaborUnits * ideasGap) - 1
  );
};

// ASSUMPTION: A smooth positive-part operator avoids hard labor-flow thresholds.
const smoothPositive = (value: number, width = 0.0001) => {
  const scaled = value / width;
  return width * (Math.max(scaled, 0) + Math.log1p(Math.exp(-Math.abs(scaled))));
};

const runMonthlySystem = (
  parameters: EditableScenarioParameters,
  terminalYear: number,
): { rows: SimulationRow[]; ss: SteadyState } => {
  const ss = steadyState();
  const qBase = (1 - FIXED.responsiveQuitShare) * FIXED.normalQuitRateAnnual / 12;
  const qResponsive = FIXED.responsiveQuitShare * FIXED.normalQuitRateAnnual / 12;

  let employment = ss.ell0;
  let unemployed = ss.UBar;
  let priorFinding = ss.fBar;
  let ideasGap = 0;
  const rows: SimulationRow[] = [];
  const months = Math.round((terminalYear - FIXED.start) / FIXED.step);
  const initialNetEliminatedShare = netEliminatedTaskShareAt(FIXED.start, parameters);

  for (let month = 0; month <= months; month += 1) {
    const time = FIXED.start + month * FIXED.step;
    const tech = technologyAt(time, parameters);
    const potential = potentialEconomy(tech, ideasGap);
    const quitRate = fractionToRate(qBase + qResponsive * priorFinding / ss.fBar);
    const quits = quitRate * employment;
    const employmentTarget = humanEmploymentTarget(
      time,
      parameters,
      ss.ell0,
      initialNetEliminatedShare,
    );
    const nextEmploymentTarget = humanEmploymentTarget(
      time + FIXED.step,
      parameters,
      ss.ell0,
      initialNetEliminatedShare,
    );

    // ASSUMPTION: normal attrition absorbs contraction first. Layoffs close the
    // remaining gap at the selected adjustment speed. A technology-eliminated
    // job does not create a replacement vacancy. Vacancies are posted only for
    // human jobs that remain in the task-based employment target.
    const employmentAfterQuits = employment - quits;
    const layoffs = parameters.postingSpeed * smoothPositive(
      employmentAfterQuits - nextEmploymentTarget,
      1e-8,
    );
    const employmentBeforeHires = employmentAfterQuits - layoffs;
    const desiredHires = smoothPositive(nextEmploymentTarget - employmentBeforeHires, 1e-8);
    const vacancies = desiredHires / ss.piBar;
    const displacedUnemployment = smoothPositive(unemployed - ss.UBar);
    const effectiveSearch = unemployed
      - (1 - parameters.reemploymentEffectiveness) * displacedUnemployment;
    const newHires = hires(ss.chi, effectiveSearch, vacancies);
    const findingRate = unemployed > 0 ? newHires / unemployed : 0;

    const actual = actualEconomy(potential, ideasGap, employment, ss.ell0);
    rows.push({
      t: time,
      x: tech,
      lnYAct: actual.lnY,
      wageAct: actual.lnW,
      lnSLAct: actual.lnSL,
      employment,
      unemployment: unemployed,
      employmentTarget,
    });

    employment = employmentBeforeHires + newHires;
    unemployed = unemployed + quits + layoffs - newHires;
    priorFinding = findingRate;
    ideasGap += FIXED.step * growthGap(actual.lnY, ideasGap);
  }

  return { rows, ss };
};

const interpolateRow = (rows: SimulationRow[], time: number, pick: (row: SimulationRow) => number) => {
  const position = (time - rows[0].t) * 12;
  if (position <= 0) return pick(rows[0]);
  const lower = Math.floor(position + 1e-9);
  if (lower >= rows.length - 1) return pick(rows[rows.length - 1]);
  const fraction = position - lower;
  return pick(rows[lower]) * (1 - fraction) + pick(rows[lower + 1]) * fraction;
};

const percentGap = (logGap: number) => 100 * Math.expm1(logGap);

export const simulateScenarioPath = (
  parameters: EditableScenarioParameters,
  options: ScenarioSimulationOptions = {},
): ScenarioPathPoint[] => {
  const safe: EditableScenarioParameters = {
    affectedTaskGrowth: clamp(parameters.affectedTaskGrowth, 0, 0.65),
    diffusion: clamp(parameters.diffusion, 0.1, 1),
    productivityGain: clamp(parameters.productivityGain, 0, 1.5),
    automationShare: clamp(parameters.automationShare, 0, 1),
    reinstatementRatio: clamp(parameters.reinstatementRatio, 0, 1),
    reemploymentEffectiveness: clamp(parameters.reemploymentEffectiveness, 0.01, 1),
    postingSpeed: clamp(parameters.postingSpeed, 0.01, 1),
    productivityAnchor2026: clamp(parameters.productivityAnchor2026, 0, 1.5),
  };
  const terminalYear = clamp(
    Math.round(options.terminalYear ?? TERMINAL_YEAR_RANGE.default),
    TERMINAL_YEAR_RANGE.min,
    TERMINAL_YEAR_RANGE.max,
  );
  const { rows } = runMonthlySystem(safe, terminalYear);

  return rows.filter((row) => row.t >= 2026 - 1e-9 && row.t <= terminalYear + 1e-9).map((row) => {
    const priorYear = row.t - 1;
    const annualGapChange = row.t >= 2025
      ? row.lnYAct - interpolateRow(rows, priorYear, (item) => item.lnYAct)
      : 0;
    return {
      date: row.t,
      label: Math.abs(row.t - Math.round(row.t)) < 1e-8
        ? String(Math.round(row.t))
        : `${Math.floor(row.t)}-${String(Math.round((row.t % 1) * 12) + 1).padStart(2, '0')}`,
      affectedTaskMass: row.x.m * 100,
      diffusion: row.x.d * 100,
      productivityGain: row.x.a,
      aiTaskShare: row.x.m * row.x.d * 100,
      eliminatedJobShare: 100 * (1 - row.employmentTarget / (1 - NORMAL_UNEMPLOYMENT)),
      gdpGap: percentGap(row.lnYAct),
      gdpGrowth: 2 + 100 * annualGapChange,
      averageWageGap: percentGap(row.wageAct),
      laborShare: 100 * FIXED.laborShare * Math.exp(row.lnSLAct),
      capitalShare: 100 * (1 - FIXED.laborShare * Math.exp(row.lnSLAct)),
      totalUnemployment: row.unemployment * 100,
    };
  });
};

export const simulatePublishedScenario = (scenario: AnthropicScenario) => (
  simulateScenarioPath(parametersFromScenario(scenario), { terminalYear: FIXED.end })
);

export const publishedScenarioParameters = (scenarios: AnthropicScenario[]) => {
  return Object.fromEntries(
    scenarios.map((scenario) => [scenario.id, parametersFromScenario(scenario)]),
  ) as Record<AnthropicScenarioId, EditableScenarioParameters>;
};
