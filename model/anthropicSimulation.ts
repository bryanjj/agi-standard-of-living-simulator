import type { AnthropicScenario, AnthropicScenarioId } from './anthropic';

export type EditableScenarioParameters = {
  affectedTaskGrowth: number;
  diffusion: number;
  productivityGain: number;
  automationShare: number;
  reinstatementRatio: number;
  jobLossPassThrough: number;
  reemploymentEffectiveness: number;
  postingSpeed: number;
  productivityAnchor2026: number;
};

export type ScenarioSimulationOptions = {
  terminalYear?: number;
  freezeTechnologyAfter?: number;
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
  realGdpTrillions: number;
  gdpGrowth: number;
  averageWageGap: number;
  realAnnualWage: number;
  laborIncomePerParticipant: number;
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

// DATA: BEA, NIPA account A191RC, 2026 Q2, seasonally adjusted annual rate.
// The current-dollar level is used only to express the model's real GDP path in 2026 dollars.
export const REAL_GDP_2026_TRILLIONS = 32.486066;

// DATA: BLS CES series CES0500000011, June 2026, seasonally adjusted.
export const AVERAGE_WEEKLY_EARNINGS_2026 = 1289.34;
// CALCULATED: 52 weeks × the June 2026 average weekly earnings observation.
export const REAL_ANNUAL_WAGE_2026 = AVERAGE_WEEKLY_EARNINGS_2026 * 52;

// ASSUMPTION: The public interface uses 2040 as its fixed long-run scenario endpoint.
export const MODEL_TERMINAL_YEAR = {
  value: 2040,
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
  // CALCULATED: reduced-form labor absorption calibrated so each preset reproduces
  // the paper's 2030 aggregate unemployment while retaining its production inputs.
  jobLossPassThrough: scenario.id === 'modest'
    ? 0.07994812151388901
    : scenario.id === 'extreme'
      ? 0.3110093964982952
      : 0.12533275982016237,
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
  jobLossPassThrough: { min: 0, max: 1, step: 0.01 },
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
  // ASSUMPTION after 2030: continue the paper's linear log-productivity path through 2040.
  const slope = (parameters.productivityGain - parameters.productivityAnchor2026) / (FIXED.end - FIXED.anchor);
  return parameters.productivityAnchor2026 + slope * (time - FIXED.anchor);
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

// ASSUMPTION: preserve the paper's production block through its 2030 boundary.
// Beyond 2030, displacement absorbed by demand or replacement jobs is represented
// as new human-task demand in the production block. The flat-at-zero exponential
// ramp makes the extension differentiable where it begins.
const smoothIncrementBeyond = (value: number, width = 0.001) => (
  value <= 0 ? 0 : value * Math.exp(-width / value)
);

const technologyForProduction = (
  tech: TechnologyPath,
  parameters: EditableScenarioParameters,
): TechnologyPath => {
  const anchor = technologyAt(FIXED.end, parameters);
  const automatedTaskMass = tech.m * tech.d * tech.psi;
  if (automatedTaskMass <= 0) return tech;

  const anchorElimination = anchor.m * anchor.d * anchor.psi * (1 - anchor.rho);
  const currentElimination = automatedTaskMass * (1 - tech.rho);
  const incrementalElimination = smoothIncrementBeyond(currentElimination - anchorElimination);
  const absorbedHumanTasks = (1 - parameters.jobLossPassThrough) * incrementalElimination;

  return {
    ...tech,
    rho: clamp(tech.rho + absorbedHumanTasks / automatedTaskMass, tech.rho, 1),
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
const netEliminatedTaskShare = (tech: TechnologyPath) => (
  tech.m * tech.d * tech.psi * (1 - tech.rho)
);

export const netEliminatedTaskShareAt = (
  time: number,
  parameters: EditableScenarioParameters,
) => netEliminatedTaskShare(technologyAt(time, parameters));

// ASSUMPTION: task mass is weighted by required labor. Job-loss pass-through is
// the reduced-form share of residual task displacement that lowers long-run human
// employment after demand and jobs elsewhere are counted. The 2024 technology
// state is already embodied in the observed baseline and is removed from changes.
const humanEmploymentTarget = (
  tech: TechnologyPath,
  baseEmployment: number,
  initialNetEliminatedShare: number,
  jobLossPassThrough: number,
) => {
  const currentNetEliminatedShare = netEliminatedTaskShare(tech);
  const changeFromBaseline = (
    (currentNetEliminatedShare - initialNetEliminatedShare)
    / (1 - initialNetEliminatedShare)
  );
  return baseEmployment * (1 - jobLossPassThrough * changeFromBaseline);
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
  freezeTechnologyAfter?: number,
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
    const technologyTime = freezeTechnologyAfter == null
      ? time
      : Math.min(time, freezeTechnologyAfter);
    const nextTechnologyTime = freezeTechnologyAfter == null
      ? time + FIXED.step
      : Math.min(time + FIXED.step, freezeTechnologyAfter);
    const tech = technologyAt(technologyTime, parameters);
    const nextTech = technologyAt(nextTechnologyTime, parameters);
    const productionTech = technologyForProduction(tech, parameters);
    const potential = potentialEconomy(productionTech, ideasGap);
    const quitRate = fractionToRate(qBase + qResponsive * priorFinding / ss.fBar);
    const quits = quitRate * employment;
    const employmentTarget = humanEmploymentTarget(
      tech,
      ss.ell0,
      initialNetEliminatedShare,
      parameters.jobLossPassThrough,
    );
    const nextEmploymentTarget = humanEmploymentTarget(
      nextTech,
      ss.ell0,
      initialNetEliminatedShare,
      parameters.jobLossPassThrough,
    );

    // ASSUMPTION: normal attrition absorbs contraction first. Layoffs close the
    // remaining gap at the selected adjustment speed. Labor absorption is already
    // included in the pass-through-adjusted target; vacancies are posted only for
    // the human jobs supported by that target.
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
    jobLossPassThrough: clamp(parameters.jobLossPassThrough, 0, 1),
    reemploymentEffectiveness: clamp(parameters.reemploymentEffectiveness, 0.01, 1),
    postingSpeed: clamp(parameters.postingSpeed, 0.01, 1),
    productivityAnchor2026: clamp(parameters.productivityAnchor2026, 0, 1.5),
  };
  const terminalYear = clamp(
    Math.round(options.terminalYear ?? MODEL_TERMINAL_YEAR.value),
    FIXED.end,
    MODEL_TERMINAL_YEAR.value,
  );
  const freezeTechnologyAfter = options.freezeTechnologyAfter == null
    ? undefined
    : clamp(options.freezeTechnologyAfter, FIXED.start, terminalYear);
  const { rows } = runMonthlySystem(safe, terminalYear, freezeTechnologyAfter);
  const referenceYear = 2026;
  const referenceLnY = interpolateRow(rows, referenceYear, (row) => row.lnYAct);
  const referenceLnW = interpolateRow(rows, referenceYear, (row) => row.wageAct);
  // CALCULATED from the paper's no-shock TFP and labor-force growth calibration.
  const baselineWageGrowth = FIXED.baselineTfpGrowth / FIXED.laborShare;
  const baselineGdpGrowth = baselineWageGrowth + FIXED.laborForceGrowth;

  return rows.filter((row) => row.t >= 2026 - 1e-9 && row.t <= terminalYear + 1e-9).map((row) => {
    const priorYear = row.t - 1;
    const annualGapChange = row.t >= 2025
      ? row.lnYAct - interpolateRow(rows, priorYear, (item) => item.lnYAct)
      : 0;
    const realAnnualWage = REAL_ANNUAL_WAGE_2026 * Math.exp(
      baselineWageGrowth * (row.t - referenceYear) + row.wageAct - referenceLnW
    );
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
      realGdpTrillions: REAL_GDP_2026_TRILLIONS * Math.exp(
        baselineGdpGrowth * (row.t - referenceYear) + row.lnYAct - referenceLnY
      ),
      gdpGrowth: 100 * (baselineGdpGrowth + annualGapChange),
      averageWageGap: percentGap(row.wageAct),
      realAnnualWage,
      laborIncomePerParticipant: realAnnualWage * (1 - row.unemployment),
      laborShare: 100 * FIXED.laborShare * Math.exp(row.lnSLAct),
      capitalShare: 100 * (1 - FIXED.laborShare * Math.exp(row.lnSLAct)),
      totalUnemployment: row.unemployment * 100,
    };
  });
};

// CALCULATED comparison path: follow the selected scenario through the paper's
// mid-2026 technology anchor, then hold capability, diffusion, and task productivity fixed.
export const simulateFrozen2026Baseline = (
  parameters: EditableScenarioParameters,
  options: Omit<ScenarioSimulationOptions, 'freezeTechnologyAfter'> = {},
) => simulateScenarioPath(parameters, {
  ...options,
  freezeTechnologyAfter: FIXED.anchor,
});

export const simulatePublishedScenario = (scenario: AnthropicScenario) => (
  simulateScenarioPath(parametersFromScenario(scenario), { terminalYear: FIXED.end })
);

export const publishedScenarioParameters = (scenarios: AnthropicScenario[]) => {
  return Object.fromEntries(
    scenarios.map((scenario) => [scenario.id, parametersFromScenario(scenario)]),
  ) as Record<AnthropicScenarioId, EditableScenarioParameters>;
};
