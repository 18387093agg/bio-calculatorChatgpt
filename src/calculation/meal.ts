import type { ClinicalContext, MealItem, Result } from '../domain/types.js';
import { estimateFormAbsorption } from '../../public/application/meal-service.js';
export interface NutrientTotal { nutrientKey: string; unit: string; gross: Result; absorbed: Result; sources: Record<string, number>; forms: Record<string, number>; }
export function calculateMeal(items: MealItem[], context: ClinicalContext): NutrientTotal[] {
  const totals = new Map<string, NutrientTotal>();
  for (const item of items) for (const nutrient of item.food.nutrients) {
    if (!Number.isFinite(item.grams) || item.grams < 0) throw new Error('Meal weights must be non-negative finite numbers.');
    const retention = item.preparation?.retention[nutrient.form.nutrientKey];
    const yieldFactor = item.preparation ? (item.preparation.yieldMin + item.preparation.yieldMax) / 2 : 1;
    const factor = yieldFactor * (retention ? (retention.min + retention.max) / 2 : 1);
    const amount = nutrient.amountPer100g * item.grams / 100 * factor;
    const prior = totals.get(nutrient.form.nutrientKey);
    const sources = { ...(prior?.sources ?? {}), [nutrient.form.origin]: (prior?.sources[nutrient.form.origin] ?? 0) + amount };
    const forms = { ...(prior?.forms ?? {}), [nutrient.form.id]: (prior?.forms[nutrient.form.id] ?? 0) + amount };
    const gross = (prior?.gross.value ?? 0) + amount;
    totals.set(nutrient.form.nutrientKey, { nutrientKey: nutrient.form.nutrientKey, unit: nutrient.unit, sources, forms, gross: { value: gross, unit: nutrient.unit, status: item.preparation ? 'estimated' : 'measured', confidence: item.preparation ? 'moderate' : 'high', evidenceIds: retention ? [retention.evidenceId] : [], assumptions: item.preparation ? [`Preparation yield midpoint ${yieldFactor} was applied separately from nutrient retention.`] : [], warnings: [] }, absorbed: absorption(nutrient.form.nutrientKey, nutrient.form.origin, nutrient.form.foodBound === true, amount, context) });
  }
  return [...totals.values()].map(total => ({ ...total, absorbed: aggregateAbsorbed(items, total, context) }));
}
function absorption(key: string, origin: string, foodBound: boolean, amount: number, context: ClinicalContext): Result {
  const estimate=estimateFormAbsorption(key,origin,foodBound,amount,context.gastricAcid);
  if(estimate)return{min:estimate.min,max:estimate.max,unit:estimate.unit,status:'modeled',confidence:'low',evidenceIds:[estimate.modelKey],assumptions:[estimate.assumption],warnings:[]};
  return { unit: 'mg', status: 'unavailable', confidence: 'low', evidenceIds: [], assumptions: [], warnings: ['Quantitative absorption is not modeled for this nutrient.'] };
}
function aggregateAbsorbed(items: MealItem[], total: NutrientTotal, context: ClinicalContext): Result {
  const matching = items.flatMap(item => item.food.nutrients.filter(n => n.form.nutrientKey === total.nutrientKey).map(n => { const retention=item.preparation?.retention[n.form.nutrientKey]; const yieldFactor=item.preparation?(item.preparation.yieldMin+item.preparation.yieldMax)/2:1; const retentionFactor=retention?(retention.min+retention.max)/2:1; return absorption(n.form.nutrientKey,n.form.origin,n.form.foodBound===true,n.amountPer100g*item.grams/100*yieldFactor*retentionFactor,context); }));
  const modeled = matching.filter(x => x.min !== undefined && x.max !== undefined);
  if (!modeled.length) return matching[0] ?? total.absorbed;
  return { min: modeled.reduce((s, x) => s + (x.min ?? 0), 0), max: modeled.reduce((s, x) => s + (x.max ?? 0), 0), unit: total.unit, status: 'modeled', confidence: 'low', evidenceIds: [...new Set(modeled.flatMap(x => x.evidenceIds))], assumptions: modeled.flatMap(x => x.assumptions), warnings: [] };
}
