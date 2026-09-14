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
  laborShare: number;
  capitalShare: number;
  totalUnemployment: number;
  cognitiveEmploymentShare: number;
  otherEmploymentShare: number;
};

type TechnologyPath = {
  m: number;
  mC: number;
  mN: number;
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
  laborTaskShares: [number, number];
};

type SteadyState = {
  ell0: number[];
  UBar: number[];
  fBarO: number[];
  piBar: number[];
  chi: number;
  uBar: number;
};

type SimulationRow = {
  t: number;
  x: TechnologyPath;
  lnYAct: number;
  wCAct: number;
  wNAct: number;
  wAvgAct: number;
  lnSLAct: number;
  ell: number[];
  U: number[];
  Ut: number;
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
  wageRigidityAnnual: 0.5,
  normalSearchDiscount: 0.17,
  start: 2024,
  anchor: 2026.5,
  end: 2030,
  step: 1 / 12,
} as const;

// DATA: 2025 CPS occupation-group calibration distributed with Anthropic's explorer.
// These groups remain internal bookkeeping categories; the public charts show all workers.
const GROUP_WEIGHTS = [0.6235251662150673, 0.3764748337849327] as const;

// DATA: IPUMS-CPS 2010-2019 separation-rate relatives reported by Anthropic's explorer.
const SEPARATION_RELATIVES = [0.6890214806466161, 1.5150488573690546] as const;

// ASSUMPTION: a narrow smooth transition allocates frontier expansion from the
// initially AI-exposed group into other work without a kink at the group boundary.
const TASK_FRONTIER_TRANSITION_WIDTH = 0.002;

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
  // ASSUMPTION after 2030: continue the paper's linear log-productivity path through 2040.
  const slope = (parameters.productivityGain - parameters.productivityAnchor2026) / (FIXED.end - FIXED.anchor);
  return parameters.productivityAnchor2026 + slope * (time - FIXED.anchor);
};

const softplus = (value: number) => (
  Math.max(value, 0) + Math.log1p(Math.exp(-Math.abs(value)))
);

// CALCULATED: the unified affected-task frontier reaches the paper's cognitive
// task group first, then spills smoothly into the remaining task group.
const splitAffectedTaskMass = (totalMass: number): [number, number] => {
  const cognitiveCeiling = GROUP_WEIGHTS[0];
  const scaledDistance = (cognitiveCeiling - totalMass) / TASK_FRONTIER_TRANSITION_WIDTH;
  const cognitiveMass = cognitiveCeiling
    - TASK_FRONTIER_TRANSITION_WIDTH * softplus(scaledDistance);
  return [Math.max(0, cognitiveMass), Math.max(0, totalMass - cognitiveMass)];
};

const technologyAt = (time: number, parameters: EditableScenarioParameters): TechnologyPath => {
  const dSlope = logisticSlope(0.1, parameters.diffusion, 1);
  const m = affectedTaskMassAt(time, parameters.affectedTaskGrowth);
  const [mC, mN] = splitAffectedTaskMass(m);

  return {
    m,
    mC,
    mN,
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
  const laborTaskShares: [number, number] = [
    Math.max(GROUP_WEIGHTS[0] - tech.mC * laborTaskReduction, 1e-12),
    Math.max(GROUP_WEIGHTS[1] - tech.mN * laborTaskReduction, 1e-12),
  ];
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

  return { lN, lnSL, lnW, lnYL, xr: rentalGap, lnK, laborTaskShares };
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

const targetsFromTaskShares = (baseEmployment: number[], taskShares: [number, number]) => {
  const totalEmployment = baseEmployment[0] + baseEmployment[1];
  const totalTaskShare = taskShares[0] + taskShares[1];
  return taskShares.map((share) => totalEmployment * share / totalTaskShare);
};

const weightedMean = (weights: readonly number[], values: number[]) => (
  weights.reduce((sum, weight, index) => sum + weight * values[index], 0)
);

const hires = (efficiency: number, search: number, vacancies: number) => {
  const smaller = Math.min(search, vacancies);
  const larger = Math.max(search, vacancies);
  if (smaller <= 0) return 0;
  return efficiency * smaller / Math.pow(
    1 + Math.pow(smaller / larger, FIXED.matchingCurvature),
    1 / FIXED.matchingCurvature,
  );
};

const fillingRateAtRest = (efficiency: number, hiresPerSearch: number) => {
  const ratio = hiresPerSearch / efficiency;
  if (ratio >= 1) return Number.NaN;
  return efficiency * Math.pow(1 - Math.pow(ratio, FIXED.matchingCurvature), 1 / FIXED.matchingCurvature);
};

const steadyState = (): SteadyState => {
  const employment = GROUP_WEIGHTS.map((weight) => weight * (1 - NORMAL_UNEMPLOYMENT));
  const baseMonthlyQuit = FIXED.normalQuitRateAnnual / 12;
  const qXO = SEPARATION_RELATIVES.map((relative) => (
    (1 - FIXED.responsiveQuitShare) * baseMonthlyQuit * relative
  ));
  const qTO = SEPARATION_RELATIVES.map((relative) => (
    FIXED.responsiveQuitShare * baseMonthlyQuit * relative
  ));
  const quitRates = qXO.map((base, index) => fractionToRate(base + qTO[index]));
  const normalHires = quitRates.map((rate, index) => rate * employment[index]);
  const mu = [[1, FIXED.normalSearchDiscount], [FIXED.normalSearchDiscount, 1]];
  const unemployed = [NORMAL_UNEMPLOYMENT / 2, NORMAL_UNEMPLOYMENT / 2];

  for (let iteration = 0; iteration < 200; iteration += 1) {
    const share = unemployed[0] / NORMAL_UNEMPLOYMENT;
    const candidate = [share * NORMAL_UNEMPLOYMENT, (1 - share) * NORMAL_UNEMPLOYMENT];
    const search = [0, 0];
    for (let destination = 0; destination < 2; destination += 1) {
      for (let origin = 0; origin < 2; origin += 1) {
        search[destination] += mu[origin][destination] * candidate[origin];
      }
    }
    const finding = [0, 0];
    for (let origin = 0; origin < 2; origin += 1) {
      for (let destination = 0; destination < 2; destination += 1) {
        finding[origin] += mu[origin][destination] * normalHires[destination] / search[destination];
      }
    }
    const implied = normalHires.map((flow, index) => flow / finding[index]);
    const total = implied[0] + implied[1];
    unemployed[0] = NORMAL_UNEMPLOYMENT * implied[0] / total;
    unemployed[1] = NORMAL_UNEMPLOYMENT - unemployed[0];
  }

  const search = [
    unemployed[0] + FIXED.normalSearchDiscount * unemployed[1],
    FIXED.normalSearchDiscount * unemployed[0] + unemployed[1],
  ];
  const finding = [
    normalHires[0] / search[0] + FIXED.normalSearchDiscount * normalHires[1] / search[1],
    FIXED.normalSearchDiscount * normalHires[0] / search[0] + normalHires[1] / search[1],
  ];
  const hiresPerSearch = normalHires.map((flow, index) => flow / search[index]);
  let low = Math.max(...hiresPerSearch);
  let high = Math.max(1, low * 2);
  const meanFill = (efficiency: number) => weightedMean(
    GROUP_WEIGHTS,
    hiresPerSearch.map((rate) => fillingRateAtRest(efficiency, rate)),
  );
  while (meanFill(high) < FIXED.meanFillingRate && high < 1_000_000) high *= 2;
  for (let iteration = 0; iteration < 200; iteration += 1) {
    const middle = (low + high) / 2;
    if (meanFill(middle) >= FIXED.meanFillingRate) high = middle;
    else low = middle;
  }
  const chi = Math.min(1, high);
  return {
    ell0: employment,
    UBar: unemployed,
    fBarO: finding,
    piBar: hiresPerSearch.map((rate) => fillingRateAtRest(chi, rate)),
    chi,
    uBar: NORMAL_UNEMPLOYMENT,
  };
};

const actualEconomy = (
  potential: PotentialEconomy,
  ideasGap: number,
  cognitiveShare: number,
  employment: number[],
  baseEmployment: number[],
) => {
  const sigma = FIXED.sigma;
  const complementarity = 1 - sigma;
  const sL = FIXED.laborShare;
  const sK = 1 - sL;
  const [lambdaC, lambdaN] = potential.laborTaskShares;
  const otherShare = 1 - cognitiveShare;
  const capitalBlock = (1 - sL * Math.exp(potential.lnSL)) * Math.exp(-complementarity * potential.xr);
  const cognitiveEmploymentRatio = Math.max(employment[0] / baseEmployment[0], 1e-12);
  const otherEmploymentRatio = Math.max(employment[1] / baseEmployment[1], 1e-12);
  const cognitivePrice = (Math.log(lambdaC / cognitiveShare) - Math.log(cognitiveEmploymentRatio)) / sigma;
  const otherPrice = (Math.log(lambdaN / otherShare) - Math.log(otherEmploymentRatio)) / sigma;
  const priceBlock = sL * lambdaC * Math.exp(complementarity * (cognitivePrice - ideasGap))
    + sL * lambdaN * Math.exp(complementarity * (otherPrice - ideasGap));

  const evaluate = (rentalGap: number) => {
    const laborShare = clamp(
      1 - capitalBlock * Math.exp(complementarity * rentalGap),
      1e-12,
      1 - 1e-12,
    );
    const outputComponent = sigma / complementarity * Math.log(laborShare / priceBlock);
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
  const result = evaluate((low + high) / 2);
  return {
    lnWC: result.outputComponent / sigma + cognitivePrice,
    lnWN: result.outputComponent / sigma + otherPrice,
    lnY: result.lnY,
    lnSL: Math.log(result.laborShare / sL),
  };
};

const demandGivenCognitiveWage = (
  potential: PotentialEconomy,
  ideasGap: number,
  cognitiveShare: number,
  cognitiveWage: number,
  otherEmployment: number,
  baseEmployment: number[],
) => {
  const sigma = FIXED.sigma;
  const complementarity = 1 - sigma;
  const sL = FIXED.laborShare;
  const sK = 1 - sL;
  const [lambdaC, lambdaN] = potential.laborTaskShares;
  const otherShare = 1 - cognitiveShare;
  const capitalBlock = (1 - sL * Math.exp(potential.lnSL)) * Math.exp(-complementarity * potential.xr);
  const otherPrice = (
    Math.log(lambdaN / otherShare) - Math.log(Math.max(otherEmployment / baseEmployment[1], 1e-12))
  ) / sigma;
  const cognitiveBlock = sL * lambdaC * Math.exp(complementarity * (cognitiveWage - ideasGap));

  const evaluate = (rentalGap: number) => {
    const laborShare = clamp(
      1 - capitalBlock * Math.exp(complementarity * rentalGap),
      cognitiveBlock + 1e-12,
      1 - 1e-12,
    );
    const lnWN = ideasGap + Math.log((laborShare - cognitiveBlock) / (sL * lambdaN)) / complementarity;
    const outputComponent = sigma * (lnWN - otherPrice);
    const lnY = outputComponent + complementarity * ideasGap;
    const ellC = baseEmployment[0] * (lambdaC / cognitiveShare)
      * Math.exp(-sigma * (cognitiveWage - outputComponent / sigma));
    return {
      ellC,
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
  return evaluate((low + high) / 2).ellC;
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
  const qBase = SEPARATION_RELATIVES.map((relative) => (
    (1 - FIXED.responsiveQuitShare) * FIXED.normalQuitRateAnnual / 12 * relative
  ));
  const qResponsive = SEPARATION_RELATIVES.map((relative) => (
    FIXED.responsiveQuitShare * FIXED.normalQuitRateAnnual / 12 * relative
  ));
  const wagePersistence = Math.pow(FIXED.wageRigidityAnnual, FIXED.step);
  const searchMatrix = [[1, parameters.reemploymentEffectiveness], [parameters.reemploymentEffectiveness, 1]];
  const cognitiveShare = GROUP_WEIGHTS[0];

  let employment = ss.ell0.slice();
  let unemployed = ss.UBar.slice();
  let priorFinding = ss.fBarO.slice();
  let stickyWageGap = 0;
  let ideasGap = 0;
  const rows: SimulationRow[] = [];
  const months = Math.round((terminalYear - FIXED.start) / FIXED.step);

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
    const potential = potentialEconomy(tech, ideasGap);
    const nextPotential = potentialEconomy(nextTech, ideasGap);
    const nextTarget = targetsFromTaskShares(ss.ell0, nextPotential.laborTaskShares);
    const quitRates = qBase.map((base, index) => (
      fractionToRate(base + qResponsive[index] * priorFinding[index] / ss.fBarO[index])
    ));

    const attachedCognitive = employment[0] + smoothPositive(unemployed[0] - ss.UBar[0], 1e-8);
    const clearing = actualEconomy(
      potential,
      ideasGap,
      cognitiveShare,
      [attachedCognitive, employment[1]],
      ss.ell0,
    );
    const clearingGap = clearing.lnWC - potential.lnW;
    stickyWageGap = wagePersistence * stickyWageGap + (1 - wagePersistence) * clearingGap;
    const cognitiveWage = potential.lnW + stickyWageGap;
    let cognitiveDemand = demandGivenCognitiveWage(
      potential,
      ideasGap,
      cognitiveShare,
      cognitiveWage,
      employment[1],
      ss.ell0,
    );
    if (!Number.isFinite(cognitiveDemand) || cognitiveDemand < 0) cognitiveDemand = employment[0];

    const excessCognitive = smoothPositive(employment[0] - cognitiveDemand, 1e-8);
    const cognitiveShortfall = smoothPositive(cognitiveDemand - employment[0], 1e-8);
    const otherOverhang = smoothPositive(Math.log(employment[1]) - Math.log(nextTarget[1]), 1e-8);
    const otherShortfall = smoothPositive(Math.log(nextTarget[1]) - Math.log(employment[1]), 1e-8);
    const layoffs = [
      smoothPositive(excessCognitive - quitRates[0] * employment[0], 1e-8),
      smoothPositive((otherOverhang - quitRates[1]) * employment[1], 1e-8),
    ];
    const vacancies = [
      (smoothPositive(quitRates[0] * employment[0] - excessCognitive, 1e-8)
        + parameters.postingSpeed * cognitiveShortfall) / ss.piBar[0],
      (smoothPositive(quitRates[1] - otherOverhang, 1e-8)
        + parameters.postingSpeed * otherShortfall) * employment[1] / ss.piBar[1],
    ];

    const effectiveSearch = [0, 0];
    for (let destination = 0; destination < 2; destination += 1) {
      for (let origin = 0; origin < 2; origin += 1) {
        effectiveSearch[destination] += searchMatrix[origin][destination] * unemployed[origin];
      }
    }
    const hiresByDestination = effectiveSearch.map((search, index) => (
      hires(ss.chi, search, vacancies[index])
    ));
    const findingByOrigin = [0, 0];
    for (let origin = 0; origin < 2; origin += 1) {
      for (let destination = 0; destination < 2; destination += 1) {
        findingByOrigin[origin] += effectiveSearch[destination] > 0
          ? searchMatrix[origin][destination] * hiresByDestination[destination] / effectiveSearch[destination]
          : 0;
      }
    }

    const actual = actualEconomy(potential, ideasGap, cognitiveShare, employment, ss.ell0);
    const averageWage = Math.log(
      (Math.exp(cognitiveWage) * employment[0] + Math.exp(actual.lnWN) * employment[1])
        / (employment[0] + employment[1]),
    );
    rows.push({
      t: time,
      x: tech,
      lnYAct: actual.lnY,
      wCAct: cognitiveWage,
      wNAct: actual.lnWN,
      wAvgAct: averageWage,
      lnSLAct: actual.lnSL,
      ell: employment.slice(),
      U: unemployed.slice(),
      Ut: unemployed[0] + unemployed[1],
    });

    const nextEmployment = employment.map((stock, index) => (
      (1 - quitRates[index]) * stock - layoffs[index] + hiresByDestination[index]
    ));
    const nextUnemployed = unemployed.map((stock, index) => (
      stock + quitRates[index] * employment[index] + layoffs[index] - findingByOrigin[index] * stock
    ));
    employment = nextEmployment;
    unemployed = nextUnemployed;
    priorFinding = findingByOrigin;
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
  const referenceLnW = interpolateRow(rows, referenceYear, (row) => row.wAvgAct);
  const initialNetAutomatedTaskShare = netEliminatedTaskShareAt(FIXED.start, safe);
  // CALCULATED from the paper's no-shock TFP and labor-force growth calibration.
  const baselineWageGrowth = FIXED.baselineTfpGrowth / FIXED.laborShare;
  const baselineGdpGrowth = baselineWageGrowth + FIXED.laborForceGrowth;

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
      eliminatedJobShare: 100 * (
        (netEliminatedTaskShare(row.x) - initialNetAutomatedTaskShare)
        / (1 - initialNetAutomatedTaskShare)
      ),
      gdpGap: percentGap(row.lnYAct),
      realGdpTrillions: REAL_GDP_2026_TRILLIONS * Math.exp(
        baselineGdpGrowth * (row.t - referenceYear) + row.lnYAct - referenceLnY
      ),
      gdpGrowth: 100 * (baselineGdpGrowth + annualGapChange),
      averageWageGap: percentGap(row.wAvgAct),
      realAnnualWage: REAL_ANNUAL_WAGE_2026 * Math.exp(
        baselineWageGrowth * (row.t - referenceYear) + row.wAvgAct - referenceLnW
      ),
      laborShare: 100 * FIXED.laborShare * Math.exp(row.lnSLAct),
      capitalShare: 100 * (1 - FIXED.laborShare * Math.exp(row.lnSLAct)),
      totalUnemployment: row.Ut * 100,
      cognitiveEmploymentShare: row.ell[0] * 100,
      otherEmploymentShare: row.ell[1] * 100,
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
