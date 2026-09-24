import type { ClinicalContext, MealItem, Result } from '../../domain/types.js';
import { calculateMeal } from '../meal.js';
export type ModelStage = 'GROSS_ONLY' | 'ABSORPTION_MODELED' | 'CONVERSION_MODELED';
export interface NutrientPipelineResult { nutrientKey: string; modelStage: ModelStage; gross: Result; bioaccessible: Result | null; absorbed: Result | null; systemic: Result | null; converted: Result | null; active: Result | null; sourceContributions: Record<string, number>; }
/** Canonical orchestration: it never turns unavailable physiology into a zero. */
export function calculateNutrientPipeline(items: MealItem[], context: ClinicalContext): NutrientPipelineResult[] {
 return calculateMeal(items, context).map(total => { const modeled = total.absorbed.status !== 'unavailable'; return { nutrientKey: total.nutrientKey, modelStage: modeled ? 'ABSORPTION_MODELED' : 'GROSS_ONLY', gross: total.gross, bioaccessible: null, absorbed: modeled ? total.absorbed : null, systemic: null, converted: null, active: null, sourceContributions: total.sources }; });
}
export function assertFiniteNonNegative(value: number, label: string): void { if (!Number.isFinite(value) || value < 0) throw new Error(`${label} must be a finite non-negative number.`); }
