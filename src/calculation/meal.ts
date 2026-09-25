import type { ClinicalContext, MealItem, Result } from '../domain/types.js';
import { calculateCanonical, normalizePortion } from './engine.js';
export interface NutrientTotal { nutrientKey: string; unit: string; gross: Result; absorbed: Result; sources: Record<string, number>; forms: Record<string, number>; }
export function calculateMeal(items: MealItem[], context: ClinicalContext): NutrientTotal[] {
  const entries=[];
  for (const item of items) for (const nutrient of item.food.nutrients) {
    if (!Number.isFinite(item.grams) || item.grams < 0) throw new Error('Meal weights must be non-negative finite numbers.');
    const retention=item.preparation?.retention[nutrient.form.nutrientKey];const normalized=normalizePortion(nutrient.amountPer100g,item.grams,(item.preparation?{yield:{min:item.preparation.yieldMin,max:item.preparation.yieldMax,evidenceId:`yield:${item.preparation.method}`},...(retention?{retention}:{})}:null) as never);
    if(normalized.reason?.startsWith('Nutrient-specific'))continue;
    entries.push({nutrientKey:nutrient.form.nutrientKey,formId:nutrient.form.id,origin:nutrient.form.origin,foodBound:nutrient.form.foodBound,amount:normalized.amount,unit:nutrient.unit});
  }
  return calculateCanonical(entries,context).map(total=>({nutrientKey:total.nutrientKey,unit:total.unit,sources:total.sources,forms:total.forms,gross:{value:total.gross,unit:total.unit,status:'estimated',confidence:'moderate',evidenceIds:[],assumptions:[],warnings:[]},absorbed:total.absorbed?{min:total.absorbed.min,max:total.absorbed.max,unit:total.absorbed.unit,status:'modeled',confidence:'low',evidenceIds:total.absorbed.modelKeys,assumptions:[],warnings:[]}:{unit:total.unit,status:'unavailable',confidence:'low',evidenceIds:[],assumptions:[],warnings:total.unavailableReasons}}));
}
