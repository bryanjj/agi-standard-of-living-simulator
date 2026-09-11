import type { AnthropicScenario, AnthropicScenarioId } from './anthropic';

export type EditableScenarioParameters = {
  affectedTaskMass: number;
  unexposedExposure2040: number;
  diffusion: number;
  productivityGain: number;
  automationShare: number;
  reinstatementRatio: number;
  searchDiscount: number;
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
  newlyExposedTaskMass: number;
  diffusion: number;
  productivityGain: number;
  aiTaskShare: number;
  gdpGap: number;
  gdpGrowth: number;
  averageWageGap: number;
  cognitiveWageGap: number;
  otherWageGap: number;
  laborShare: number;
  capitalShare: number;
  totalUnemployment: number;
  cognitiveUnemployment: number;
  otherUnemployment: number;
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

// ASSUMPTION: The independent extension may run to 2050. The published checkpoint remains 2030.
export const TERMINAL_YEAR_RANGE = {
  min: 2030,
  max: 2050,
  step: 1,
  default: 2030,
  provenance: 'ASSUMPTION',
} as const;

// ASSUMPTION: After 2030, task-level productivity approaches a 30x ceiling smoothly.
const EXTENSION_PRODUCTIVITY_MULTIPLIER_CEILING = {
  value: 30,
  provenance: 'ASSUMPTION',
} as const;

// DATA: 2025 CPS occupation-group calibration distributed with Anthropic's explorer.
const GROUP_WEIGHTS = [0.6235251662150673, 0.3764748337849327];
export const INITIALLY_UNEXPOSED_WORK_SHARE = GROUP_WEIGHTS[1];
const NORMAL_UNEMPLOYMENT = 0.03840656852308217;

// ASSUMPTION: Exposure expansion is calibrated at a fixed date so changing the display horizon never changes the path.
export const EXPOSURE_EXTENSION_CHECKPOINT = {
  year: 2040,
  provenance: 'ASSUMPTION',
} as const;

// DATA: IPUMS-CPS 2010-2019 separation-rate relatives reported by the explorer.
const SEPARATION_RELATIVES = [0.6890214806466161, 1.5150488573690546];

const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
const fractionToRate = (fraction: number) => -Math.log(1 - clamp(fraction, 0, 0.999999));

export const parametersFromScenario = (scenario: AnthropicScenario): EditableScenarioParameters => ({
  affectedTaskMass: scenario.inputs.affectedTaskMass.value,
  unexposedExposure2040: 0,
  diffusion: scenario.inputs.diffusion.value,
  productivityGain: scenario.inputs.productivityGain.value,
  automationShare: scenario.inputs.automationShare.value,
  reinstatementRatio: scenario.inputs.reinstatementRatio.value,
  searchDiscount: scenario.inputs.searchDiscount.value,
  postingSpeed: scenario.inputs.postingSpeed.value,
  productivityAnchor2026: scenario.id === 'modest' ? 0.3 : scenario.id === 'extreme' ? 0.45 : 0.35,
});

export const scenarioParameterRanges: Record<keyof EditableScenarioParameters, {
  min: number;
  max: number;
  step: number;
}> = {
  affectedTaskMass: { min: 0.14, max: GROUP_WEIGHTS[0], step: 0.01 },
  unexposedExposure2040: { min: 0, max: 1, step: 0.01 },
  diffusion: { min: 0.1, max: 1, step: 0.01 },
  productivityGain: { min: 0.1, max: 1.5, step: 0.01 },
  automationShare: { min: 0, max: 1, step: 0.01 },
  reinstatementRatio: { min: 0, max: 1, step: 0.01 },
  searchDiscount: { min: 0.01, max: 1, step: 0.01 },
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
  const gainSlope = (parameters.productivityGain - parameters.productivityAnchor2026) / (FIXED.end - FIXED.anchor);
  const ceiling = Math.log(EXTENSION_PRODUCTIVITY_MULTIPLIER_CEILING.value);
  const linearGain = parameters.productivityAnchor2026 + gainSlope * (time - FIXED.anchor);

  if (time <= FIXED.end) return clamp(linearGain, 0, ceiling);
  if (Math.abs(gainSlope) < 1e-12) return clamp(parameters.productivityGain, 0, ceiling);

  const yearsAfterCheckpoint = time - FIXED.end;
  if (gainSlope > 0) {
    const remainingGain = ceiling - parameters.productivityGain;
    if (remainingGain <= 1e-12) return ceiling;
    return ceiling - remainingGain * Math.exp(-gainSlope * yearsAfterCheckpoint / remainingGain);
  }

  if (parameters.productivityGain <= 1e-12) return 0;
  return parameters.productivityGain * Math.exp(gainSlope * yearsAfterCheckpoint / parameters.productivityGain);
};

const unexposedExposureAt = (time: number, target2040: number) => {
  if (time <= FIXED.end || target2040 <= 0) return 0;
  const yearsSince2030 = time - FIXED.end;
  const checkpointSpan = EXPOSURE_EXTENSION_CHECKPOINT.year - FIXED.end;
  const progress = clamp(yearsSince2030 / checkpointSpan, 0, 1);
  const smoothProgress = progress * progress * progress * (progress * (progress * 6 - 15) + 10);
  return target2040 * smoothProgress;
};

const technologyAt = (time: number, parameters: EditableScenarioParameters): TechnologyPath => {
  const mSlope = logisticSlope(0.14, parameters.affectedTaskMass, GROUP_WEIGHTS[0]);
  const dSlope = logisticSlope(0.1, parameters.diffusion, 1);
  const mC = logisticAt(time, 0.14, GROUP_WEIGHTS[0], mSlope);
  const mN = GROUP_WEIGHTS[1] * unexposedExposureAt(time, parameters.unexposedExposure2040);

  return {
    m: mC + mN,
    mC,
    mN,
    d: logisticAt(time, 0.1, 1, dSlope),
    a: productivityAt(time, parameters),
    psi: parameters.automationShare,
    rho: parameters.reinstatementRatio,
  };
};

// CALCULATED: The original affected-group path at the extension checkpoint, before added exposure.
export const baselineAffectedTaskMassAt2040 = (parameters: EditableScenarioParameters) => (
  technologyAt(EXPOSURE_EXTENSION_CHECKPOINT.year, {
    ...parameters,
    unexposedExposure2040: 0,
  }).m
);

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
    GROUP_WEIGHTS[0] - tech.mC * laborTaskReduction,
    GROUP_WEIGHTS[1] - tech.mN * laborTaskReduction,
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

const weightedMean = (weights: number[], values: number[]) => (
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
  const piBar = hiresPerSearch.map((rate) => fillingRateAtRest(chi, rate));

  return {
    ell0: employment,
    UBar: unemployed,
    fBarO: finding,
    piBar,
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
  const cognitiveEmploymentRatio = employment[0] / baseEmployment[0];
  const otherEmploymentRatio = employment[1] / baseEmployment[1];
  const cognitivePrice = (Math.log(lambdaC / cognitiveShare) - Math.log(cognitiveEmploymentRatio)) / sigma;
  const otherPrice = (Math.log(lambdaN / otherShare) - Math.log(otherEmploymentRatio)) / sigma;
  const priceBlock = sL * lambdaC * Math.exp(complementarity * (cognitivePrice - ideasGap))
    + sL * lambdaN * Math.exp(complementarity * (otherPrice - ideasGap));

  const evaluate = (rentalGap: number) => {
    const laborShare = 1 - capitalBlock * Math.exp(complementarity * rentalGap);
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
  const rentalGap = (low + high) / 2;
  const result = evaluate(rentalGap);
  const lnWC = result.outputComponent / sigma + cognitivePrice;
  const lnWN = result.outputComponent / sigma + otherPrice;
  return {
    lnWC,
    lnWN,
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
    Math.log(lambdaN / otherShare) - Math.log(otherEmployment / baseEmployment[1])
  ) / sigma;
  const cognitiveBlock = sL * lambdaC * Math.exp(complementarity * (cognitiveWage - ideasGap));

  const evaluate = (rentalGap: number) => {
    const laborShare = 1 - capitalBlock * Math.exp(complementarity * rentalGap);
    const lnWN = ideasGap + Math.log((laborShare - cognitiveBlock) / (sL * lambdaN)) / complementarity;
    const outputComponent = sigma * (lnWN - otherPrice);
    const lnY = outputComponent + complementarity * ideasGap;
    const ellC = baseEmployment[0] * (lambdaC / cognitiveShare)
      * Math.exp(-sigma * (cognitiveWage - outputComponent / sigma));
    return {
      ellC,
      lnWN,
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

const growthGap = (gdpGap: number, ideasGap: number) => {
  const ideasGrowth = FIXED.baselineTfpGrowth / FIXED.laborShare;
  const fishingOutLaborUnits = FIXED.fishingOutTfpUnits * FIXED.laborShare + FIXED.researchReturns;
  return ideasGrowth * (
    Math.exp(FIXED.researchReturns * gdpGap - fishingOutLaborUnits * ideasGap) - 1
  );
};

const runMonthlySystem = (
  parameters: EditableScenarioParameters,
  terminalYear: number,
): { rows: SimulationRow[]; ss: SteadyState } => {
  const ss = steadyState();
  const qBase = SEPARATION_RELATIVES.map((relative) => (
    (1 - FIXED.responsiveQuitShare) * FIXED.normalQuitRateAnnual / 12 * relative
  ));
  const qResponsive = SEPARATION_RELATIVES.map((relative) => (
    FIXED.responsiveQuitShare * FIXED.normalQuitRateAnnual / 12 * relative
  ));
  const wagePersistence = Math.pow(FIXED.wageRigidityAnnual, FIXED.step);
  const searchMatrix = [[1, parameters.searchDiscount], [parameters.searchDiscount, 1]];
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
    const tech = technologyAt(time, parameters);
    const nextTech = technologyAt(time + FIXED.step, parameters);
    const potential = potentialEconomy(tech, ideasGap);
    const nextPotential = potentialEconomy(nextTech, ideasGap);
    const nextTarget = targetsFromTaskShares(ss.ell0, nextPotential.laborTaskShares);
    const quitRates = qBase.map((base, index) => (
      fractionToRate(base + qResponsive[index] * priorFinding[index] / ss.fBarO[index])
    ));

    const attachedCognitive = employment[0] + Math.max(0, unemployed[0] - ss.UBar[0]);
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

    const excessCognitive = Math.max(0, employment[0] - cognitiveDemand);
    const cognitiveShortfall = Math.max(0, cognitiveDemand - employment[0]);
    const otherOverhang = Math.max(0, Math.log(employment[1]) - Math.log(nextTarget[1]));
    const otherShortfall = Math.max(0, Math.log(nextTarget[1]) - Math.log(employment[1]));
    // ASSUMPTION: Post-2030 contraction closes at the same monthly adjustment speed as expansion.
    // Scaling the target gap prevents an instantaneous jump to the new employment target.
    const otherContraction = parameters.postingSpeed * otherOverhang;
    const layoffs = [
      Math.max(0, excessCognitive - quitRates[0] * employment[0]),
      Math.max(0, (otherContraction - quitRates[1]) * employment[1]),
    ];
    const vacancies = [
      (Math.max(0, quitRates[0] * employment[0] - excessCognitive)
        + parameters.postingSpeed * cognitiveShortfall) / ss.piBar[0],
      (Math.max(0, quitRates[1] - otherContraction) + parameters.postingSpeed * otherShortfall)
        * employment[1] / ss.piBar[1],
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
    affectedTaskMass: clamp(parameters.affectedTaskMass, 0.14, GROUP_WEIGHTS[0]),
    unexposedExposure2040: clamp(parameters.unexposedExposure2040, 0, 1),
    diffusion: clamp(parameters.diffusion, 0.1, 1),
    productivityGain: clamp(parameters.productivityGain, 0, 1.5),
    automationShare: clamp(parameters.automationShare, 0, 1),
    reinstatementRatio: clamp(parameters.reinstatementRatio, 0, 1),
    searchDiscount: clamp(parameters.searchDiscount, 0.01, 1),
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
      newlyExposedTaskMass: row.x.mN * 100,
      diffusion: row.x.d * 100,
      productivityGain: row.x.a,
      aiTaskShare: row.x.m * row.x.d * 100,
      gdpGap: percentGap(row.lnYAct),
      gdpGrowth: 2 + 100 * annualGapChange,
      averageWageGap: percentGap(row.wAvgAct),
      cognitiveWageGap: percentGap(row.wCAct),
      otherWageGap: percentGap(row.wNAct),
      laborShare: 100 * FIXED.laborShare * Math.exp(row.lnSLAct),
      capitalShare: 100 * (1 - FIXED.laborShare * Math.exp(row.lnSLAct)),
      totalUnemployment: row.Ut * 100,
      cognitiveUnemployment: 100 * row.U[0] / (row.U[0] + row.ell[0]),
      otherUnemployment: 100 * row.U[1] / (row.U[1] + row.ell[1]),
    };
  });
};

export const simulatePublishedScenario = (scenario: AnthropicScenario) => (
  simulateScenarioPath(parametersFromScenario(scenario))
);

export const publishedScenarioParameters = (scenarios: AnthropicScenario[]) => {
  return Object.fromEntries(
    scenarios.map((scenario) => [scenario.id, parametersFromScenario(scenario)]),
  ) as Record<AnthropicScenarioId, EditableScenarioParameters>;
};
