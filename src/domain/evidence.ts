import type { Evidence } from './types.js';
export const evidence: Record<string, Evidence> = {
  'nasem-dri': { id: 'nasem-dri', source: 'National Academies Dietary Reference Intakes', class: 'guideline', confidence: 'high', limitation: 'Reference values vary by life stage and jurisdiction.' },
  'iron-model': { id: 'iron-model', source: 'Model assumption: bounded meal-context iron estimate', class: 'model-assumption', confidence: 'low', limitation: 'Not an individual absorption measurement.' },
  'b12-mechanism': { id: 'b12-mechanism', source: 'Mechanistic distinction between food-bound and crystalline B12', class: 'human-study', confidence: 'moderate', limitation: 'Does not quantify intrinsic-factor status.' },
  'retention-data': { id: 'retention-data', source: 'Food preparation retention record', class: 'database', confidence: 'moderate', limitation: 'Food and method specific.' }
};
