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
  simulateFrozen2026Baseline,
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

  it.each([
    ['modest', 0.3, Math.exp(0.3)],
    ['substantial', 0.7357142857142858, Math.exp(0.7357142857142858)],
    ['extreme', 1.8, Math.exp(1.8)],
  ] as const)('continues the %s log-productivity trend through 2040', (scenarioId, logGain, multiplier) => {
    const path = simulateScenarioPath(
      parametersFromScenario(anthropicScenarioById[scenarioId]),
      { terminalYear: 2040 },
    );
    const final = path.at(-1)!;
    expect(final.productivityGain).toBeCloseTo(logGain, 10);
    expect(Math.exp(final.productivityGain)).toBeCloseTo(multiplier, 10);
  });

  it.each(anthropicScenarios)('keeps the $name log-productivity slope smooth at 2030', (scenario) => {
    const path = simulateScenarioPath(parametersFromScenario(scenario), { terminalYear: 2040 });
    const checkpointIndex = path.findIndex((point) => Math.abs(point.date - 2030) < 1e-8);
    const slopeBefore = path[checkpointIndex].productivityGain
      - path[checkpointIndex - 1].productivityGain;
    const slopeAfter = path[checkpointIndex + 1].productivityGain
      - path[checkpointIndex].productivityGain;
    expect(slopeAfter).toBeCloseTo(slopeBefore, 10);
  });

  it('anchors GDP and real wages to observed 2026 dollar levels', () => {
    const path = simulateScenarioPath(
      parametersFromScenario(anthropicScenarioById.substantial),
      { terminalYear: 2040 },
    );
    expect(path[0].realGdpTrillions).toBeCloseTo(32.486066, 10);
    expect(path[0].realAnnualWage).toBeCloseTo(1289.34 * 52, 10);
  });

  it('freezes technology after the mid-2026 anchor while ordinary economics continue', () => {
    const parameters = parametersFromScenario(anthropicScenarioById.extreme);
    const scenario = simulateScenarioPath(parameters, { terminalYear: 2040 });
    const baseline = simulateFrozen2026Baseline(parameters, { terminalYear: 2040 });
    const anchorIndex = baseline.findIndex((point) => Math.abs(point.date - 2026.5) < 1e-8);

    expect(baseline.slice(0, anchorIndex + 1)).toEqual(scenario.slice(0, anchorIndex + 1));
    for (const point of baseline.slice(anchorIndex + 1)) {
      expect(point.affectedTaskMass).toBeCloseTo(baseline[anchorIndex].affectedTaskMass, 10);
      expect(point.diffusion).toBeCloseTo(baseline[anchorIndex].diffusion, 10);
      expect(point.productivityGain).toBeCloseTo(baseline[anchorIndex].productivityGain, 10);
    }
    expect(baseline.at(-1)!.realGdpTrillions).toBeGreaterThan(baseline[0].realGdpTrillions);
    expect(baseline.at(-1)!.realAnnualWage).toBeGreaterThan(baseline[0].realAnnualWage);
  });

  it.each(anthropicScenarios)('keeps the $name exposure and net-automated-task paths monotone and bounded', (scenario) => {
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

  it.each(anthropicScenarios)('derives $name net automated task mass from the four task parameters', (scenario) => {
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

  it('keeps net automated task mass independent of task productivity', () => {
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
    expect(high.at(-1)!.totalUnemployment).not.toBeCloseTo(low.at(-1)!.totalUnemployment, 6);
  });

  it('fully offsets automation when the reinstatement ratio is one', () => {
    const base = parametersFromScenario(anthropicScenarioById.extreme);
    const path = simulateScenarioPath(
      { ...base, reinstatementRatio: 1 },
      { terminalYear: 2040 },
    );
    expect(path.every((point) => Math.abs(point.eliminatedJobShare) < 1e-10)).toBe(true);
  });

  it.each(anthropicScenarios)('stays close to Anthropic’s published 2030 unemployment for $name', (scenario) => {
    const final = simulatePublishedScenario(scenario).at(-1)!;
    expect(Math.abs(
      final.totalUnemployment - scenario.outcomes.totalUnemployment.value,
    )).toBeLessThan(1);
  });

  it('creates an expanding destination for workers when remaining human task demand rises', () => {
    const final = simulatePublishedScenario(anthropicScenarioById.extreme).at(-1)!;
    expect(final.cognitiveEmploymentShare).toBeLessThan(60);
    expect(final.otherEmploymentShare).toBeGreaterThan(36.2);
    expect(final.otherEmploymentShare).toBeCloseTo(41.1, 1);
  });

  it('uses cross-occupation search effectiveness in reemployment', () => {
    const base = parametersFromScenario(anthropicScenarioById.extreme);
    const weakSearch = simulateScenarioPath(
      { ...base, reemploymentEffectiveness: 0.01 },
      { terminalYear: 2030 },
    ).at(-1)!;
    const effectiveSearch = simulateScenarioPath(
      { ...base, reemploymentEffectiveness: 1 },
      { terminalYear: 2030 },
    ).at(-1)!;
    expect(effectiveSearch.totalUnemployment).toBeLessThan(weakSearch.totalUnemployment);
  });

  it.each(anthropicScenarios)('preserves labor-force accounting for $name', (scenario) => {
    const path = simulateScenarioPath(parametersFromScenario(scenario), { terminalYear: 2040 });
    for (const point of path) {
      expect(
        point.cognitiveEmploymentShare + point.otherEmploymentShare + point.totalUnemployment,
      ).toBeCloseTo(100, 9);
    }
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
