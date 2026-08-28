import type { PolicyIntervention } from '../model/types';
import { calibration } from '../calibration/usBaseline';

export type InterventionId = 'status-quo' | 'safety-net' | 'citizen-dividend' | 'public-fund';

export const interventions: Record<InterventionId, PolicyIntervention> = {
  'status-quo': {
    id: 'status-quo', name: 'Status quo', shortDescription: 'No changes',
    description: 'Current simplified taxes and benefits continue. New AI capital income follows today’s holdings.',
    laborLossReplacement: calibration.unemploymentReplacement.value, equalDividendShare: 0,
  },
  'safety-net': {
    id: 'safety-net', name: 'Expanded safety net', shortDescription: '35% wage-loss replacement',
    description: 'Existing transfers expand to replace 35% of lost household labor income.',
    laborLossReplacement: calibration.expandedSafetyNetReplacement.value, equalDividendShare: 0,
  },
  'citizen-dividend': {
    id: 'citizen-dividend', name: 'Citizen dividend', shortDescription: '10% shared equally',
    description: 'Ten percent of new national AI capital income is returned as an equal household dividend.',
    laborLossReplacement: calibration.unemploymentReplacement.value, equalDividendShare: calibration.citizenDividendShare.value,
  },
  'public-fund': {
    id: 'public-fund', name: 'Public AI fund', shortDescription: '30% shared equally',
    description: 'A public fund returns 30% of new national AI capital income equally to households.',
    laborLossReplacement: calibration.unemploymentReplacement.value, equalDividendShare: calibration.publicFundDividendShare.value,
  },
};

export const interventionList = Object.values(interventions);
