import { describe, expect, it } from 'vitest';
import { transformative20Year } from '../scenarios/transformative20yr';
import type { Household } from './types';
import { simulate } from './simulation';
import { interventions } from '../scenarios/interventions';
import { quintilePresets } from '../calibration/quintiles';
import { afterTaxIncomeIndex, purchasingPowerIndex, simulateHouseholdPaths, weeklyHouseholdOutcomes } from './comparison';

const household: Household = {
  annualIncome: 85_000,
  householdSize: 2,
  equityHoldings: 120_000,
  housing: 'mortgage',
};

describe('simulate', () => {
  it('is deterministic', () => {
    expect(simulate(transformative20Year, household)).toEqual(simulate(transformative20Year, household));
  });

  it('reproduces the household baseline at zero automation', () => {
    const today = simulate(transformative20Year, household).years[0];
    expect(today.automation).toBe(0);
    expect(today.standardOfLiving).toBeCloseTo(100, 10);
    expect(today.prices.householdBasket).toBe(1);
  });

  it('keeps automation and employment inside accounting bounds', () => {
    for (const year of simulate(transformative20Year, household).years) {
      expect(year.automation).toBeGreaterThanOrEqual(0);
      expect(year.automation).toBeLessThanOrEqual(1);
      expect(year.employment).toBeGreaterThanOrEqual(0);
      expect(year.employment).toBeLessThanOrEqual(1);
    }
  });

  it('has zero employment and labor income at full automation', () => {
    const final = simulate(transformative20Year, household).years[20];
    expect(final.automation).toBe(1);
    expect(final.employment).toBe(0);
    expect(final.laborIncome).toBe(0);
  });

  it('pays no capital income to a household with no equity holdings', () => {
    const result = simulate(transformative20Year, { ...household, equityHoldings: 0 });
    for (const year of result.years) expect(year.capitalIncome).toBe(0);
  });

  it('does not treat the lowest quintile\'s broad financial assets as AI equity', () => {
    expect(quintilePresets[0].household.equityHoldings).toBe(0);
    expect(simulate(transformative20Year, quintilePresets[0].household).years[20].capitalIncome).toBe(0);
  });

  it('reconciles household resource shares', () => {
    for (const year of simulate(transformative20Year, household).years) {
      expect(year.resourceShares.labor + year.resourceShares.capital + year.resourceShares.transfers).toBeCloseTo(1, 10);
    }
  });

  it('reconciles national factor shares with output', () => {
    for (const year of simulate(transformative20Year, household).years) {
      const laborFactorIncome = year.output * year.laborShare;
      const capitalFactorIncome = year.output * (1 - year.laborShare);
      expect(laborFactorIncome + capitalFactorIncome).toBeCloseTo(year.output, 10);
    }
  });

  it('reconciles the standard-of-living waterfall exactly', () => {
    for (const year of simulate(transformative20Year, household).years) {
      const totalContribution = Object.values(year.decomposition).reduce((sum, value) => sum + value, 0);
      expect(100 + totalContribution).toBeCloseTo(year.standardOfLiving, 8);
    }
  });

  it('normalizes every income quintile to 100 today', () => {
    for (const preset of quintilePresets) {
      expect(simulate(transformative20Year, preset.household).years[0].standardOfLiving).toBeCloseTo(100, 10);
    }
  });

  it('compares every quintile against Q3 purchasing power today', () => {
    const results = quintilePresets.map((preset) => simulate(transformative20Year, preset.household));
    const reference = results[2];
    expect(results.map((result) => Math.round(purchasingPowerIndex(result, reference, 0))))
      .toEqual([23, 63, 100, 162, 347]);
  });

  it('separates after-tax income from price-adjusted purchasing power', () => {
    const result = simulate(transformative20Year, quintilePresets[2].household);
    expect(afterTaxIncomeIndex(result, result, 0)).toBe(100);
    expect(purchasingPowerIndex(result, result, 0)).toBe(100);
    expect(afterTaxIncomeIndex(result, result, 20)).not.toBeCloseTo(purchasingPowerIndex(result, result, 20), 5);
  });

  it('declines smoothly from the current employment rate to zero', () => {
    const result = simulate(transformative20Year, quintilePresets[2].household);
    const timeline = weeklyHouseholdOutcomes(result, result);
    expect(timeline[0].employmentProbability).toBeCloseTo(0.959, 10);
    expect(timeline[520].employmentProbability).toBeCloseTo(0.4795, 10);
    expect(timeline[1040].employmentProbability).toBe(0);
    for (let week = 1; week < timeline.length; week += 1) {
      expect(timeline[week].employmentProbability).toBeLessThan(timeline[week - 1].employmentProbability);
    }
  });

  it('creates stable weekly Monte Carlo paths with one irreversible displacement', () => {
    const result = simulate(transformative20Year, quintilePresets[2].household);
    const first = simulateHouseholdPaths(result, result, 100, 2026);
    const second = simulateHouseholdPaths(result, result, 100, 2026);
    expect(first).toEqual(second);
    expect(first).toHaveLength(100);
    expect(first.every((path) => path.displacementWeek >= 0 && path.displacementWeek <= 1040)).toBe(true);
    expect(first.every((path) => path.incomeValues.length === 1041 && path.purchasingPowerValues.length === 1041)).toBe(true);
    const timeline = weeklyHouseholdOutcomes(result, result);
    expect(first.every((path) => path.incomeValues[1040] === timeline[1040].displacedIncome)).toBe(true);
  });

  it('drops income immediately but smooths purchasing power for one year', () => {
    const result = simulate(transformative20Year, quintilePresets[2].household);
    const timeline = weeklyHouseholdOutcomes(result, result);
    const paths = simulateHouseholdPaths(result, result, 100, 8);
    const path = paths.find((candidate) => candidate.displacementWeek > 0 && candidate.displacementWeek <= 988);
    expect(path).toBeDefined();
    if (!path) throw new Error('Expected a path displaced before the final year');
    const week = path.displacementWeek;
    expect(path.incomeValues[week]).toBeCloseTo(timeline[week].displacedIncome, 10);
    expect(path.purchasingPowerValues[week]).toBeCloseTo(timeline[week - 1].employedPurchasingPower, 10);
    expect(path.purchasingPowerValues[week + 52]).toBeCloseTo(timeline[week + 52].displacedPurchasingPower, 10);
  });

  it('makes interventions explicit and leaves status quo as the default', () => {
    const implicit = simulate(transformative20Year, household);
    const explicit = simulate(transformative20Year, household, interventions['status-quo']);
    expect(implicit).toEqual(explicit);
    expect(simulate(transformative20Year, household, interventions['safety-net']).years[20].standardOfLiving)
      .toBeGreaterThan(explicit.years[20].standardOfLiving);
  });

  it('distributes the same dollar citizen dividend to every household', () => {
    const lowStatus = simulate(transformative20Year, quintilePresets[0].household, interventions['status-quo']).years[20];
    const lowDividend = simulate(transformative20Year, quintilePresets[0].household, interventions['citizen-dividend']).years[20];
    const highStatus = simulate(transformative20Year, quintilePresets[4].household, interventions['status-quo']).years[20];
    const highDividend = simulate(transformative20Year, quintilePresets[4].household, interventions['citizen-dividend']).years[20];
    expect(lowDividend.transfers - lowStatus.transfers).toBeCloseTo(highDividend.transfers - highStatus.transfers, 8);
  });
});
