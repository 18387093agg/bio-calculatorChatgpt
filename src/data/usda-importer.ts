export interface UsdaColumn { name: string; foodId?: string; nutrientFormId?: string; unit?: string; }
export interface UsdaImportIssue { row: number; field: string; reason: string; }
export interface UsdaPreview { accepted: Array<{ foodId: string; nutrientFormId: string; amountPer100g: number; unit: string }>; issues: UsdaImportIssue[]; dryRun: boolean; }
const supportedUnits = new Set(['mg', 'µg', 'g', 'kcal']);
export function previewUsdaRows(rows: ReadonlyArray<Record<string, unknown>>, knownFoodIds: ReadonlySet<string>, knownFormIds: ReadonlySet<string>): UsdaPreview {
 const accepted: UsdaPreview['accepted'] = []; const issues: UsdaImportIssue[] = []; const pairs = new Set<string>();
 rows.forEach((row, index) => { const rowNumber=index+1; const foodId=String(row.food_id ?? ''); const formId=String(row.nutrient_form_id ?? ''); const unit=String(row.unit ?? ''); const value=Number(row.amount_per_100g); const pair=`${foodId}:${formId}`;
 if (!foodId || !knownFoodIds.has(foodId)) issues.push({row:rowNumber,field:'food_id',reason:'Unknown or missing food identifier.'}); else if (!formId || !knownFormIds.has(formId)) issues.push({row:rowNumber,field:'nutrient_form_id',reason:'Unknown or missing nutrient form identifier.'}); else if (!supportedUnits.has(unit)) issues.push({row:rowNumber,field:'unit',reason:'Unsupported unit; no implicit conversion was applied.'}); else if (!Number.isFinite(value) || value < 0) issues.push({row:rowNumber,field:'amount_per_100g',reason:'Amount must be finite and non-negative.'}); else if (pairs.has(pair)) issues.push({row:rowNumber,field:'food_id,nutrient_form_id',reason:'Duplicate food/form row.'}); else { pairs.add(pair); accepted.push({foodId,nutrientFormId:formId,amountPer100g:value,unit}); } });
 return { accepted, issues, dryRun:true };
}
