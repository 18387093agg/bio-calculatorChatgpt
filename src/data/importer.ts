export interface ImportRow { foodId: string; nutrientFormId: string; amountPer100g: number; unit: 'mg' | 'µg' | 'kcal'; }
export interface ImportReport { accepted: ImportRow[]; rejected: { row: number; reason: string }[]; dryRun: boolean; }
const units = new Set(['mg', 'µg', 'kcal']);
export function validateFoodNutrientRows(rows: unknown[], knownFoodIds: Set<string>, knownFormIds: Set<string>, dryRun = true): ImportReport {
 const accepted: ImportRow[] = []; const rejected: { row: number; reason: string }[] = []; const seen = new Set<string>();
 rows.forEach((raw, index) => { const row = raw as Partial<ImportRow>; const key = `${row.foodId}|${row.nutrientFormId}`; if (!row.foodId || !knownFoodIds.has(row.foodId)) rejected.push({ row: index + 1, reason: 'Unknown or missing food ID.' }); else if (!row.nutrientFormId || !knownFormIds.has(row.nutrientFormId)) rejected.push({ row: index + 1, reason: 'Unknown or missing nutrient form ID.' }); else if (!units.has(row.unit ?? '')) rejected.push({ row: index + 1, reason: 'Unsupported or missing unit.' }); else if (!Number.isFinite(row.amountPer100g) || (row.amountPer100g ?? -1) < 0) rejected.push({ row: index + 1, reason: 'Amount must be a non-negative finite number.' }); else if (seen.has(key)) rejected.push({ row: index + 1, reason: 'Duplicate food/nutrient form pair.' }); else { seen.add(key); accepted.push(row as ImportRow); } });
 return { accepted, rejected, dryRun };
}
