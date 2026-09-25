export type Confidence = 'high' | 'moderate' | 'low';
export type ResultStatus = 'measured' | 'estimated' | 'modeled' | 'unavailable';
export type Origin = 'animal' | 'plant' | 'supplement';
export type GastricAcid = 'normal' | 'low' | 'absent';
export interface Evidence { id: string; source: string; class: 'guideline' | 'human-study' | 'database' | 'model-assumption'; confidence: Confidence; limitation: string; }
export interface Result { value?: number; min?: number; max?: number; unit: string; status: ResultStatus; confidence: Confidence; evidenceIds: string[]; assumptions: string[]; warnings: string[]; }
export interface NutrientForm { id: string; nutrientKey: string; label: string; origin: Origin; foodBound?: boolean; }
export interface FoodNutrient { form: NutrientForm; amountPer100g: number; unit: 'mg' | 'µg' | 'kcal'; }
export interface Food { id: string; name: string; category: string; nutrients: FoodNutrient[]; metadata?: { phytateMg?: number; vitaminCMg?: number; fatG?: number }; }
export interface MealItem { food: Food; grams: number; preparation?: Preparation; }
export interface Preparation { method: string; yieldMin: number; yieldMax: number; retention: Record<string, { min: number; max: number; evidenceId: string }>; }
export interface ClinicalContext { gastricAcid: GastricAcid; }
/** Official references, project model targets, and personal overrides are intentionally distinct. */
export interface TargetSet { rda?: number; ai?: number; pri?: number; ear?: number; ar?: number; optimalMin?: number; optimalMax?: number; ul?: number; userOptimalMin?: number; userOptimalMax?: number; unit: string; assumptions: string[]; }
