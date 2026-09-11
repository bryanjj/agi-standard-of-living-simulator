export type Provenance = 'DATA' | 'PAPER' | 'ASSUMPTION' | 'CALCULATED';

export type SourcedValue = {
  value: number;
  provenance: Provenance;
  source: string;
  year: number;
  note: string;
};

export type AnthropicScenarioId = 'modest' | 'substantial' | 'extreme';

export type AnthropicScenario = {
  id: AnthropicScenarioId;
  name: string;
  description: string;
  color: string;
  inputs: {
    affectedTaskMass: SourcedValue;
    diffusion: SourcedValue;
    productivityGain: SourcedValue;
    automationShare: SourcedValue;
    reinstatementRatio: SourcedValue;
    searchDiscount: SourcedValue;
    postingSpeed: SourcedValue;
  };
  outcomes: {
    gdpAboveNoAi: SourcedValue;
    gdpGrowth: SourcedValue;
    averageWageAboveNoAi: SourcedValue;
    cognitiveWageAboveNoAi: SourcedValue;
    otherWageAboveNoAi: SourcedValue;
    laborShare: SourcedValue;
    capitalShare: SourcedValue;
    capitalIncomeAboveNoAi: SourcedValue;
    cognitiveEmploymentChange: SourcedValue;
    cognitiveUnemployment: SourcedValue;
    totalUnemployment: SourcedValue;
  };
};

export const MODEL_START_YEAR = 2026;
export const MODEL_END_YEAR = 2030;
export const NORMAL_UNEMPLOYMENT_RATE = 3.8;
export const NORMAL_COGNITIVE_UNEMPLOYMENT_RATE = 2.9;

const paperValue = (value: number, note: string): SourcedValue => ({
  value,
  provenance: 'PAPER',
  source: 'Korinek et al. (2026), Economic Scenarios for Transformative AI, Tables 1 and 3',
  year: 2030,
  note,
});

const scenario = (
  id: AnthropicScenarioId,
  name: string,
  description: string,
  color: string,
  values: number[],
): AnthropicScenario => {
  const [affectedTaskMass, diffusion, productivityGain, automationShare, reinstatementRatio, searchDiscount, postingSpeed,
    gdpAboveNoAi, gdpGrowth, averageWageAboveNoAi, cognitiveWageAboveNoAi, otherWageAboveNoAi,
    laborShare, capitalShare, capitalIncomeAboveNoAi, cognitiveEmploymentChange, cognitiveUnemployment, totalUnemployment] = values;

  return {
    id,
    name,
    description,
    color,
    inputs: {
      affectedTaskMass: paperValue(affectedTaskMass, 'Share of the economy’s tasks within AI capability by 2030.'),
      diffusion: paperValue(diffusion, 'Share of affected task instances performed with AI by 2030.'),
      productivityGain: paperValue(productivityGain, 'Log productivity gain on an AI-performed task instance in 2030.'),
      automationShare: paperValue(automationShare, 'Share of AI-performed task instances completed by capital rather than augmented labor.'),
      reinstatementRatio: paperValue(reinstatementRatio, 'New labor-task mass created per unit of automated task mass.'),
      searchDiscount: paperValue(searchDiscount, 'Relative effectiveness of search outside a worker’s occupation group.'),
      postingSpeed: paperValue(postingSpeed, 'Share of expanding occupations’ employment shortfall posted as vacancies each month.'),
    },
    outcomes: {
      gdpAboveNoAi: paperValue(gdpAboveNoAi, 'U.S. GDP relative to the no-AI path.'),
      gdpGrowth: paperValue(gdpGrowth, 'Annualized real GDP growth during the twelve months to 2030.'),
      averageWageAboveNoAi: paperValue(averageWageAboveNoAi, 'Average wage relative to the no-AI path.'),
      cognitiveWageAboveNoAi: paperValue(cognitiveWageAboveNoAi, 'Cognitive-occupation wage relative to the no-AI path.'),
      otherWageAboveNoAi: paperValue(otherWageAboveNoAi, 'All-other-occupation wage relative to the no-AI path.'),
      laborShare: paperValue(laborShare, 'Share of national income paid to labor.'),
      capitalShare: paperValue(capitalShare, 'Share of national income paid to capital.'),
      capitalIncomeAboveNoAi: paperValue(capitalIncomeAboveNoAi, 'Capital income relative to the no-AI path.'),
      cognitiveEmploymentChange: paperValue(cognitiveEmploymentChange, 'Change in cognitive employment since mid-2026.'),
      cognitiveUnemployment: paperValue(cognitiveUnemployment, 'Unemployment rate among workers who began in cognitive occupations.'),
      totalUnemployment: paperValue(totalUnemployment, 'Economy-wide unemployment rate.'),
    },
  };
};

export const anthropicScenarios: AnthropicScenario[] = [
  scenario('modest', 'Modest change', 'AI has an impact comparable to a major general-purpose technology, arriving gradually.', '#397765', [
    0.20, 0.20, 0.30, 0.50, 0.50, 0.17, 0.10,
    1.6, 2.4, 0.7, 0.4, 1.1, 59.4, 40.6, 3.1, -0.5, 2.9, 3.9,
  ]),
  scenario('substantial', 'Substantial change', 'AI transforms a meaningful share of knowledge work while adoption remains incomplete.', '#c09532', [
    0.30, 0.40, 0.45, 0.75, 0.25, 0.08, 0.25,
    8.3, 5.4, 2.1, -0.3, 5.9, 56.1, 43.9, 18.9, -3.9, 4.5, 4.6,
  ]),
  scenario('extreme', 'Extreme change', 'AI rapidly automates most affected knowledge work and creates no replacement human tasks.', '#c85b2f', [
    0.50, 0.60, 0.80, 0.90, 0, 0.04, 0.50,
    32.4, 15.4, 9.7, -11.5, 33.6, 45.2, 54.8, 81.4, -21.5, 17.9, 11.9,
  ]),
];

export const anthropicScenarioById = Object.fromEntries(
  anthropicScenarios.map((item) => [item.id, item]),
) as Record<AnthropicScenarioId, AnthropicScenario>;

export const aiTaskShare = (item: AnthropicScenario) => (
  item.inputs.affectedTaskMass.value * item.inputs.diffusion.value
);
