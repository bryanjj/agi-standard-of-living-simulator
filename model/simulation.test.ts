import { describe, expect, it } from 'vitest';
import { transformative20Year } from '../scenarios/transformative20yr';
import type { Household } from './types';
import { simulate } from './simulation';

const household: Household = {
  annualIncome: 85_000,
  householdSize: 2,
  investments: 120_000,
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

  it('pays no capital income to a household with no investments', () => {
    const result = simulate(transformative20Year, { ...household, investments: 0 });
    for (const year of result.years) expect(year.capitalIncome).toBe(0);
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
});
