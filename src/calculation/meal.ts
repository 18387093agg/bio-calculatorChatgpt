import type { ClinicalContext, MealItem, Result } from '../domain/types.js';
const bounded = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export interface NutrientTotal { nutrientKey: string; unit: string; gross: Result; absorbed: Result; sources: Record<string, number>; }
export function calculateMeal(items: MealItem[], context: ClinicalContext): NutrientTotal[] {
  const totals = new Map<string, NutrientTotal>();
  for (const item of items) for (const nutrient of item.food.nutrients) {
    if (!Number.isFinite(item.grams) || item.grams < 0) throw new Error('Meal weights must be non-negative finite numbers.');
    const retention = item.preparation?.retention[nutrient.form.nutrientKey];
    const factor = retention ? (retention.min + retention.max) / 2 : 1;
    const amount = nutrient.amountPer100g * item.grams / 100 * factor;
    const prior = totals.get(nutrient.form.nutrientKey);
    const sources = { ...(prior?.sources ?? {}), [nutrient.form.origin]: (prior?.sources[nutrient.form.origin] ?? 0) + amount };
    const gross = (prior?.gross.value ?? 0) + amount;
    totals.set(nutrient.form.nutrientKey, { nutrientKey: nutrient.form.nutrientKey, unit: nutrient.unit, sources, gross: { value: gross, unit: nutrient.unit, status: 'measured', confidence: retention ? 'moderate' : 'high', evidenceIds: retention ? [retention.evidenceId] : [], assumptions: [], warnings: [] }, absorbed: absorption(nutrient.form.nutrientKey, nutrient.form.origin, nutrient.form.foodBound === true, amount, context) });
  }
  return [...totals.values()].map(total => ({ ...total, absorbed: aggregateAbsorbed(items, total, context) }));
}
function absorption(key: string, origin: string, foodBound: boolean, amount: number, context: ClinicalContext): Result {
  if (key === 'iron') { const nonHeme = origin !== 'animal'; const acidPenalty = nonHeme && context.gastricAcid !== 'normal' ? 0.7 : 1; const rate: readonly [number, number] = nonHeme ? [0.03, 0.12] : [0.15, 0.35]; return range(amount, rate[0] * acidPenalty, rate[1] * acidPenalty, 'mg', ['iron-model'], nonHeme ? ['Meal modifiers are bounded and only apply to non-heme iron.'] : []); }
  if (key === 'vitamin_b12') { const penalty = foodBound && context.gastricAcid !== 'normal' ? 0.65 : 1; return range(amount, 0.3 * penalty, 0.6 * penalty, 'µg', ['b12-mechanism'], foodBound ? ['Food-bound release is modeled separately from intrinsic-factor physiology.'] : ['Crystalline/free B12 has no food-protein release penalty.']); }
  return { unit: 'mg', status: 'unavailable', confidence: 'low', evidenceIds: [], assumptions: [], warnings: ['Quantitative absorption is not modeled for this nutrient.'] };
}
function aggregateAbsorbed(items: MealItem[], total: NutrientTotal, context: ClinicalContext): Result {
  const matching = items.flatMap(item => item.food.nutrients.filter(n => n.form.nutrientKey === total.nutrientKey).map(n => absorption(n.form.nutrientKey, n.form.origin, n.form.foodBound === true, n.amountPer100g * item.grams / 100, context)));
  const modeled = matching.filter(x => x.min !== undefined && x.max !== undefined);
  if (!modeled.length) return matching[0] ?? total.absorbed;
  return { min: modeled.reduce((s, x) => s + (x.min ?? 0), 0), max: modeled.reduce((s, x) => s + (x.max ?? 0), 0), unit: total.unit, status: 'modeled', confidence: 'low', evidenceIds: [...new Set(modeled.flatMap(x => x.evidenceIds))], assumptions: modeled.flatMap(x => x.assumptions), warnings: [] };
}
function range(amount: number, minRate: number, maxRate: number, unit: string, evidenceIds: string[], assumptions: string[]): Result { return { min: bounded(amount * minRate, 0, amount), max: bounded(amount * maxRate, 0, amount), unit, status: 'modeled', confidence: 'low', evidenceIds, assumptions, warnings: [] }; }
