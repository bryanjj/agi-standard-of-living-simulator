import { describe, expect, it } from 'vitest';
import {
  aiTaskShare,
  anthropicScenarioById,
  anthropicScenarios,
  MODEL_END_YEAR,
  MODEL_START_YEAR,
} from './anthropic';
import { parametersFromScenario, simulatePublishedScenario, simulateScenarioPath } from './anthropicSimulation';

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

  it.each(anthropicScenarios)('reproduces the published $name 2030 checkpoints', (scenario) => {
    const final = simulatePublishedScenario(scenario).at(-1)!;
    expect(final.gdpGap).toBeCloseTo(scenario.outcomes.gdpAboveNoAi.value, 0);
    expect(final.gdpGrowth).toBeCloseTo(scenario.outcomes.gdpGrowth.value, 0);
    expect(final.averageWageGap).toBeCloseTo(scenario.outcomes.averageWageAboveNoAi.value, 0);
    expect(final.cognitiveWageGap).toBeCloseTo(scenario.outcomes.cognitiveWageAboveNoAi.value, 0);
    expect(final.otherWageGap).toBeCloseTo(scenario.outcomes.otherWageAboveNoAi.value, 0);
    expect(final.laborShare).toBeCloseTo(scenario.outcomes.laborShare.value, 0);
    expect(final.totalUnemployment).toBeCloseTo(scenario.outcomes.totalUnemployment.value, 0);
  });

  it('responds continuously to a custom parameter edit', () => {
    const base = parametersFromScenario(anthropicScenarioById.substantial);
    const lowerAutomation = simulateScenarioPath({ ...base, automationShare: 0.5 }).at(-1)!;
    const higherAutomation = simulateScenarioPath({ ...base, automationShare: 0.9 }).at(-1)!;
    expect(higherAutomation.laborShare).toBeLessThan(lowerAutomation.laborShare);
    expect(higherAutomation.totalUnemployment).toBeGreaterThan(lowerAutomation.totalUnemployment);
  });

  it('preserves every published-horizon value when the terminal year is extended', () => {
    const parameters = parametersFromScenario(anthropicScenarioById.substantial);
    const publishedPath = simulateScenarioPath(parameters);
    const extendedPath = simulateScenarioPath(parameters, { terminalYear: 2040 });

    expect(extendedPath.slice(0, publishedPath.length)).toEqual(publishedPath);
    expect(extendedPath).toHaveLength((2040 - 2026) * 12 + 1);
  });

  it('continues the technology paths smoothly through the 2030 checkpoint', () => {
    const path = simulateScenarioPath(
      parametersFromScenario(anthropicScenarioById.substantial),
      { terminalYear: 2031 },
    );
    const checkpoint = path.findIndex((point) => Math.abs(point.date - 2030) < 1e-9);
    const before = path[checkpoint - 1];
    const at = path[checkpoint];
    const after = path[checkpoint + 1];

    for (const key of ['affectedTaskMass', 'diffusion', 'productivityGain'] as const) {
      const changeBefore = at[key] - before[key];
      const changeAfter = after[key] - at[key];
      expect(Math.abs(changeAfter - changeBefore)).toBeLessThan(0.02);
    }
  });

  it.each(anthropicScenarios)('returns finite monthly outcomes through 2050 for $name', (scenario) => {
    const path = simulateScenarioPath(parametersFromScenario(scenario), { terminalYear: 2050 });
    expect(path).toHaveLength((2050 - 2026) * 12 + 1);
    expect(path.at(-1)?.date).toBeCloseTo(2050, 10);
    for (const point of path) {
      for (const value of Object.values(point)) {
        if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true);
      }
      expect(point.totalUnemployment).toBeGreaterThanOrEqual(0);
      expect(point.totalUnemployment).toBeLessThanOrEqual(100);
      expect(point.cognitiveUnemployment).toBeGreaterThanOrEqual(0);
      expect(point.cognitiveUnemployment).toBeLessThanOrEqual(100);
      expect(point.otherUnemployment).toBeGreaterThanOrEqual(0);
      expect(point.otherUnemployment).toBeLessThanOrEqual(100);
      expect(point.laborShare + point.capitalShare).toBeCloseTo(100, 10);
    }
  });
});
