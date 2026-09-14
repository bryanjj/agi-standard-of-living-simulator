import { describe, expect, it } from 'vitest';
import {
  aiTaskShare,
  anthropicScenarioById,
  anthropicScenarios,
  MODEL_END_YEAR,
  MODEL_START_YEAR,
} from './anthropic';
import {
  affectedTaskMassAt,
  netEliminatedTaskShareAt,
  parametersFromScenario,
  simulatePublishedScenario,
  simulateScenarioPath,
} from './anthropicSimulation';

describe('Anthropic scenario calibration', () => {
  it('is explicitly bounded to the paper horizon', () => {
    expect(MODEL_START_YEAR).toBe(2026);
    expect(MODEL_END_YEAR).toBe(2030);
  });

  it('preserves the factor-income identity in every published scenario', () => {
    for (const scenario of anthropicScenarios) {
      expect(scenario.outcomes.laborShare.value + scenario.outcomes.capitalShare.value).toBeCloseTo(100, 10);
    }
  });

  it('calculates the share of task instances performed with AI', () => {
    expect(aiTaskShare(anthropicScenarioById.modest)).toBeCloseTo(0.04, 10);
    expect(aiTaskShare(anthropicScenarioById.substantial)).toBeCloseTo(0.12, 10);
    expect(aiTaskShare(anthropicScenarioById.extreme)).toBeCloseTo(0.30, 10);
  });

  it('matches the paper’s headline 2030 unemployment results', () => {
    expect(anthropicScenarioById.modest.outcomes.totalUnemployment.value).toBe(3.9);
    expect(anthropicScenarioById.substantial.outcomes.totalUnemployment.value).toBe(4.6);
    expect(anthropicScenarioById.extreme.outcomes.totalUnemployment.value).toBe(11.9);
    expect(anthropicScenarioById.extreme.outcomes.cognitiveUnemployment.value).toBe(17.9);
  });

  it('produces monthly paths from 2026 through the 2030 checkpoint', () => {
    const path = simulatePublishedScenario(anthropicScenarioById.substantial);
    expect(path).toHaveLength(49);
    expect(path[0].date).toBeCloseTo(2026, 10);
    expect(path.at(-1)?.date).toBeCloseTo(2030, 10);
    expect(path.every((point) => Number.isFinite(point.totalUnemployment))).toBe(true);
  });

  it.each(anthropicScenarios)('maps the $name task-mass setting to its 2030 checkpoint', (scenario) => {
    const final = simulatePublishedScenario(scenario).at(-1)!;
    expect(final.affectedTaskMass).toBeCloseTo(scenario.inputs.affectedTaskMass.value * 100, 10);
    expect(final.totalUnemployment).toBeGreaterThanOrEqual(0);
    expect(final.totalUnemployment).toBeLessThan(100);
  });

  it('responds continuously to a custom parameter edit', () => {
    const base = parametersFromScenario(anthropicScenarioById.substantial);
    const lowerAutomation = simulateScenarioPath(
      { ...base, automationShare: 0.5 },
      { terminalYear: 2030 },
    ).at(-1)!;
    const higherAutomation = simulateScenarioPath(
      { ...base, automationShare: 0.9 },
      { terminalYear: 2030 },
    ).at(-1)!;
    expect(higherAutomation.laborShare).toBeLessThan(lowerAutomation.laborShare);
    expect(higherAutomation.totalUnemployment).toBeGreaterThan(lowerAutomation.totalUnemployment);
  });

  it('maps the substantial growth rate to about 87% affected task mass in 2040', () => {
    const parameters = parametersFromScenario(anthropicScenarioById.substantial);
    expect(affectedTaskMassAt(2026.5, parameters.affectedTaskGrowth)).toBeCloseTo(0.14, 10);
    expect(affectedTaskMassAt(2030, parameters.affectedTaskGrowth)).toBeCloseTo(0.3, 10);
    expect(affectedTaskMassAt(2040, parameters.affectedTaskGrowth)).toBeCloseTo(0.872, 3);
  });

  it('extends the monthly path without changing earlier values', () => {
    const parameters = parametersFromScenario(anthropicScenarioById.substantial);
    const through2030 = simulateScenarioPath(parameters, { terminalYear: 2030 });
    const through2040 = simulateScenarioPath(parameters, { terminalYear: 2040 });
    expect(through2040).toHaveLength((2040 - 2026) * 12 + 1);
    expect(through2040.slice(0, through2030.length)).toEqual(through2030);
  });

  it.each(anthropicScenarios)('keeps the $name exposure and eliminated-job paths monotone and bounded', (scenario) => {
    const path = simulateScenarioPath(parametersFromScenario(scenario), { terminalYear: 2040 });
    for (let index = 1; index < path.length; index += 1) {
      expect(path[index].affectedTaskMass).toBeGreaterThanOrEqual(path[index - 1].affectedTaskMass - 1e-10);
      expect(path[index].eliminatedJobShare).toBeGreaterThanOrEqual(
        path[index - 1].eliminatedJobShare - 1e-10,
      );
      expect(path[index].affectedTaskMass).toBeLessThan(100);
      expect(path[index].eliminatedJobShare).toBeLessThan(100);
    }
  });

  it.each(anthropicScenarios)('derives $name job elimination from the four task parameters', (scenario) => {
    const parameters = parametersFromScenario(scenario);
    const path = simulateScenarioPath(parameters, { terminalYear: 2040 });
    const initial = netEliminatedTaskShareAt(2024, parameters);
    for (const point of path) {
      const expected = 100 * (
        (netEliminatedTaskShareAt(point.date, parameters) - initial) / (1 - initial)
      );
      expect(point.eliminatedJobShare).toBeCloseTo(expected, 10);
      expect(point.eliminatedJobShare).toBeLessThanOrEqual(point.affectedTaskMass + 1e-10);
    }
  });

  it('makes productivity independent of the human-employment target', () => {
    const base = parametersFromScenario(anthropicScenarioById.substantial);
    const low = simulateScenarioPath(
      { ...base, productivityAnchor2026: 0.1, productivityGain: 0.1 },
      { terminalYear: 2040 },
    );
    const high = simulateScenarioPath(
      { ...base, productivityAnchor2026: 1.5, productivityGain: 1.5 },
      { terminalYear: 2040 },
    );
    expect(high.map((point) => point.eliminatedJobShare)).toEqual(
      low.map((point) => point.eliminatedJobShare),
    );
    expect(high.map((point) => point.totalUnemployment)).toEqual(
      low.map((point) => point.totalUnemployment),
    );
  });

  it('fully offsets automation when the reinstatement ratio is one', () => {
    const base = parametersFromScenario(anthropicScenarioById.extreme);
    const path = simulateScenarioPath(
      { ...base, reinstatementRatio: 1 },
      { terminalYear: 2040 },
    );
    expect(path.every((point) => Math.abs(point.eliminatedJobShare) < 1e-10)).toBe(true);
  });

  it('keeps extreme unemployment monotone after 2032 instead of creating a false recovery', () => {
    const path = simulateScenarioPath(
      parametersFromScenario(anthropicScenarioById.extreme),
      { terminalYear: 2040 },
    );
    const annual = path.filter((point) => Math.abs(point.date - Math.round(point.date)) < 1e-8);
    const late = annual.filter((point) => point.date >= 2035);
    const lateChanges = late.slice(1).map(
      (point, index) => point.totalUnemployment - late[index].totalUnemployment,
    );
    expect(lateChanges.every((change) => change >= -1e-8)).toBe(true);
  });

  it('does not create a replacement opening for each automated job', () => {
    const base = parametersFromScenario(anthropicScenarioById.extreme);
    const path = simulateScenarioPath(
      { ...base, reinstatementRatio: 0 },
      { terminalYear: 2040 },
    );
    const annual = path.filter((point) => Math.abs(point.date - Math.round(point.date)) < 1e-8);
    const afterPeak = annual.filter((point) => point.date >= 2032);
    expect(afterPeak.every((point, index) => (
      index === 0 || point.totalUnemployment >= afterPeak[index - 1].totalUnemployment - 1e-8
    ))).toBe(true);
    expect(annual.at(-1)!.totalUnemployment).toBeGreaterThan(
      annual.at(-1)!.eliminatedJobShare,
    );
    expect(annual.at(-1)!.totalUnemployment - annual.at(-1)!.eliminatedJobShare).toBeLessThan(1);
  });

  it('keeps a maximum-disruption custom scenario finite and continuous', () => {
    const base = parametersFromScenario(anthropicScenarioById.extreme);
    const path = simulateScenarioPath({
      ...base,
      affectedTaskGrowth: 0.65,
      diffusion: 1,
      productivityGain: 1.5,
      automationShare: 1,
      reinstatementRatio: 0,
      reemploymentEffectiveness: 0.01,
      postingSpeed: 1,
    }, { terminalYear: 2040 });
    for (let index = 0; index < path.length; index += 1) {
      for (const value of Object.values(path[index])) {
        if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true);
      }
      expect(path[index].laborShare + path[index].capitalShare).toBeCloseTo(100, 10);
      expect(path[index].totalUnemployment).toBeGreaterThanOrEqual(0);
      expect(path[index].totalUnemployment).toBeLessThan(100);
      if (index > 0) {
        expect(Math.abs(path[index].totalUnemployment - path[index - 1].totalUnemployment)).toBeLessThan(6);
      }
    }
  });

  it.each(anthropicScenarios)('returns finite, smoothly evolving outcomes through 2040 for $name', (scenario) => {
    const path = simulateScenarioPath(parametersFromScenario(scenario), { terminalYear: 2040 });
    let maximumMonthlyUnemploymentChange = 0;
    for (let index = 0; index < path.length; index += 1) {
      for (const value of Object.values(path[index])) {
        if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true);
      }
      expect(path[index].laborShare + path[index].capitalShare).toBeCloseTo(100, 10);
      if (index > 0) {
        maximumMonthlyUnemploymentChange = Math.max(
          maximumMonthlyUnemploymentChange,
          Math.abs(path[index].totalUnemployment - path[index - 1].totalUnemployment),
        );
      }
    }
    expect(maximumMonthlyUnemploymentChange).toBeLessThan(2.5);
  });
});
