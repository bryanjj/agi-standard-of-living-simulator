import { describe, expect, it } from 'vitest';
import {
  aiTaskShare,
  anthropicScenarioById,
  anthropicScenarios,
  MODEL_END_YEAR,
  MODEL_START_YEAR,
} from './anthropic';

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
});
