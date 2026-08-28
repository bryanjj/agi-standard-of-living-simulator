export type ProvenanceKind = 'DATA' | 'PAPER' | 'ASSUMPTION' | 'CALCULATED';

export type SourcedValue = {
  value: number;
  provenance: ProvenanceKind;
  source: string;
  year?: number;
  note: string;
};

export type HousingStatus = 'rent' | 'mortgage' | 'own';

export type Household = {
  annualIncome: number;
  householdSize: number;
  investments: number;
  housing: HousingStatus;
};

export type Scenario = {
  id: string;
  name: string;
  policy: string;
  horizonYears: number;
};

export type Decomposition = {
  labor: number;
  capital: number;
  transfers: number;
  taxes: number;
  productivity: number;
  scarcity: number;
};

export type SimulationYear = {
  year: number;
  standardOfLiving: number;
  noAgiBaseline: number;
  automation: number;
  employment: number;
  output: number;
  laborShare: number;
  wageIndex: number;
  laborIncome: number;
  capitalIncome: number;
  transfers: number;
  taxes: number;
  resourceShares: { labor: number; capital: number; transfers: number };
  prices: { reproducible: number; scarce: number; householdBasket: number };
  decomposition: Decomposition;
};

export type SimulationResult = {
  scenario: Scenario;
  household: Household;
  years: SimulationYear[];
};
