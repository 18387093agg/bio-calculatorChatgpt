#!/usr/bin/env node
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';

const API_ORIGIN = 'https://api.nal.usda.gov/fdc/v1';
const DATA_TYPES = ['Foundation', 'SR Legacy', 'Survey (FNDDS)'];
const TIMEOUT_MS = 20_000;
const MAX_ATTEMPTS = 5;
const CACHE_DIR = '.cache/fdc-api';
const [, , outputPath = 'public/canonical-foods.json', reportPath = 'data/fdc-resolution-report.json'] = process.argv;

const normalize = value => String(value ?? '').toLowerCase().replace(/\bpercent\b/g, '%').replace(/([0-9])%/g, '$1 %').replace(/[^a-z0-9%]+/g, ' ').trim();
const canonicalToken = value => value.length > 4 && value.endsWith('ies') ? `${value.slice(0, -3)}y`
  : value.length > 4 && value.endsWith('oes') ? value.slice(0, -2)
    : value.length > 3 && value.endsWith('s') && !value.endsWith('ss') ? value.slice(0, -1)
      : value;
const tokens = value => normalize(value).split(' ').filter(Boolean).map(canonicalToken);
const slug = value => normalize(value).replace(/%/g, 'percent').replace(/ /g, '-');
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const unit = value => String(value ?? '').trim().replace(/^ug$/i, 'µg').replace(/^kcal$/i, 'kcal').replace(/^g$/i, 'g').replace(/^mg$/i, 'mg');
const preparation = description => /\braw\b/i.test(description) ? 'raw' : /\b(cooked|roasted|boiled|baked|canned|brewed)\b/i.test(description) ? 'cooked' : 'ready_to_eat';
const redact = (message, key) => key ? String(message).split(key).join('[REDACTED]') : String(message);
const cacheName = value => createHash('sha256').update(value).digest('hex') + '.json';

async function readJson(path, label) {
  try { return JSON.parse(await readFile(path, 'utf8')); }
  catch (error) { throw new Error(`${label} is not valid readable JSON: ${error.message}`); }
}
function validateManifest(value) {
  if (!value || !Array.isArray(value.foods) || value.foods.length !== 87 || value.foods.some(x => typeof x !== 'string' || !x.trim())) throw new Error('data/fdc-food-manifest.json must contain exactly 87 non-empty food descriptors.');
  if (new Set(value.foods.map(normalize)).size !== value.foods.length) throw new Error('FDC manifest descriptors must be unique.');
  return value;
}
async function cachedRequest(path, searchParams, apiKey) {
  const url = new URL(API_ORIGIN + path);
  // FDC's search filters are arrays in the POST API. Encoding the data types as
  // a comma-delimited GET parameter is rejected by the API gateway (and can be
  // misinterpreted by intermediaries), so searches use the documented JSON
  // representation while food-detail acquisition remains a simple GET.
  const isSearch = path === '/foods/search';
  const requestBody = isSearch ? JSON.stringify(searchParams) : null;
  if (!isSearch) for (const [name, value] of Object.entries(searchParams)) url.searchParams.set(name, value);
  const cachePath = join(CACHE_DIR, cacheName(`${url}\n${requestBody ?? ''}`));
  try { return JSON.parse(await readFile(cachePath, 'utf8')); } catch {}
  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        method: isSearch ? 'POST' : 'GET',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-Api-Key': apiKey },
        body: requestBody,
        signal: controller.signal
      });
      if (!response.ok) {
        const retryable = response.status === 429 || response.status >= 500;
        const retryAfter = Number(response.headers.get('retry-after'));
        if (!retryable) throw new Error(`USDA FDC API returned HTTP ${response.status} for ${path}.`);
        if (attempt === MAX_ATTEMPTS) throw new Error(`USDA FDC API returned HTTP ${response.status} after ${MAX_ATTEMPTS} attempts for ${path}.`);
        await sleep(Number.isFinite(retryAfter) ? Math.min(retryAfter * 1000, 60_000) : 500 * 2 ** (attempt - 1)); continue;
      }
      const body = await response.json().catch(() => { throw new Error(`USDA FDC API returned invalid JSON for ${path}.`); });
      if (!body || typeof body !== 'object') throw new Error(`USDA FDC API returned an invalid JSON value for ${path}.`);
      await mkdir(CACHE_DIR, { recursive: true });
      await writeFile(cachePath, JSON.stringify(body) + '\n', { mode: 0o600 });
      return body;
    } catch (error) {
      lastError = error;
      if (!['AbortError', 'TypeError'].includes(error.name) || attempt === MAX_ATTEMPTS) break;
      await sleep(500 * 2 ** (attempt - 1));
    } finally { clearTimeout(timer); }
  }
  throw new Error(redact(lastError?.name === 'AbortError' ? `USDA FDC API request timed out after ${TIMEOUT_MS} ms for ${path}.` : lastError?.message ?? `USDA FDC API request failed for ${path}.`, apiKey));
}

const preferredType = new Map([['Foundation', 30], ['SR Legacy', 20], ['Survey (FNDDS)', 10]]);
const conflictPairs = [['raw', ['cooked', 'roasted', 'boiled', 'baked']], ['cooked', ['raw']], ['water', ['oil']], ['whole', ['white']]];
// Identity attributes are deliberately different from ordinary search terms.  A
// candidate does not get permission to introduce one merely because FDC happens
// to rank it highly.  These lists are intentionally conservative: a small
// relevance loss is preferable to silently turning "lamb" into ground lamb or
// an unspecified poultry breast into meat-and-skin.
const specificityAttributes = [
  'ground', 'patty', 'patties', 'crumbles', 'loaf', 'skin', 'skinless', 'boneless',
  'nugget', 'nuggets', 'brain', 'heart', 'kidney', 'liver', 'lung', 'pancreas', 'spleen', 'tongue',
  'drained', 'undrained', 'frozen', 'sprouted', 'bran', 'restaurant', 'commercial',
  'omelet', 'nonfat', 'full', 'ingredient',
  'salted', 'unsalted', 'enriched', 'unenriched', 'fortified', 'sweetened',
  'atlantic', 'pacific', 'wild', 'farmed', 'shiitake', 'portabella', 'cremini',
  'chinook', 'chum', 'pink', 'sockeye', 'coho', 'choice', 'breakfast', 'australian', 'imported',
  'grape', 'red', 'yellow', 'green', 'white', 'new', 'zealand', 'medjool', 'english'
];
const methodAttributes = ['roasted', 'boiled', 'baked', 'braised', 'broiled', 'pan', 'fried', 'steamed', 'stir'];
const identityCollisions = [
  { requested: 'oyster', forbidden: /\bostrich\b/ },
  { requested: 'banana', forbidden: /\bpepper\b/ },
  { requested: 'orange', forbidden: /\bpepper\w*\b/ },
  { requested: 'strawberry', forbidden: /\bguava\w*\b/ },
  { requested: 'plum', forbidden: /\b(carissa|natal)\b/ },
  { requested: 'raisins', forbidden: /\b(cookie|bread|cereal)\b/ },
  { requested: 'olive oil', forbidden: /\b(anchov|fish|salad|dressing)\w*\b/ },
  { requested: 'cheddar cheese', forbidden: /\b(snack|pretzel|cracker|sandwich)\w*\b/ },
  { requested: 'white bread', forbidden: /\b(gluten[ -]?free|sub|sandwich|burger)\b/ },
  { requested: 'milk 2 %', forbidden: /\b(pudding|shake|smoothie|cereal)\w*\b/ },
  { requested: 'flaxseed', forbidden: /\boil\b/ },
  { requested: 'butter', forbidden: /\b(peanut|almond|apple)\s+butter\b/ },
  { requested: 'spinach', forbidden: /\b(spaghetti|pasta|dip|new zealand)\b/ },
  { requested: 'cauliflower', forbidden: /\b(and|with)\s+broccoli\b|\bbroccoli\s+and\b/ },
  { requested: 'green bean', forbidden: /\b(szechuan|casserole|restaurant)\b/ },
  { requested: 'oat', forbidden: /\bbran\b/ },
  { requested: 'sunflower seed', forbidden: /\bflavored\b/ },
  { requested: 'cheddar cheese', forbidden: /\bspread\b/ },
  { requested: 'chicken breast', forbidden: /\b(roll|sausage|deli)\b/ },
  { requested: 'pea', forbidden: /\b(and|with)\s+(carrot|corn)\w*\b/ },
  { requested: 'walnut', forbidden: /\bglazed\b/ },
  { requested: 'whole wheat bread', forbidden: /\b(pita|naan|chapati|roti|paratha)\b/ }
];
const requiredIdentity = new Map([
  ['milk 2 %', /^milk\b/], ['cheddar cheese', /^cheese cheddar\b/],
  ['spinach cooked', /^spinach\b/], ['zucchini cooked', /\bzucchini\b/],
  ['orange raw', /^oranges?\b/], ['strawberry raw', /^strawberries\b/],
  ['raisins', /^raisins\b/], ['olive oil', /^(oil olive|olive oil)\b/],
  ['butter', /^butter\b/],
  ['pork loin cooked', /separable lean and fat/],
  ['walnuts', /^walnuts excluding honey roasted$/],
  ['tomato raw', /^tomatoes raw$/], ['dates', /^date$/], ['raisins', /^raisins$/]
]);
// Reviewed generic/NFS records resolve requests for which token scoring would
// otherwise prefer a materially narrower species, cut, organ, brand, or recipe.
const reviewedGenericFdcIds = new Map([
  // These review decisions preserve the requested preparation state.  FNDDS
  // NFS records that omit "cooked" are not substitutes for an explicit cooked
  // request, even when their nutrient coverage is higher.
  ['lamb cooked', 172573], ['salmon cooked', 171999], ['cod cooked', 175178],
  ['oyster cooked', 2706353], ['egg whole cooked', 2707153],
  ['broccoli cooked', 2709647], ['cottage cheese', 2705747],
  ['peas cooked', 2709962], ['tofu firm', 172448]
]);
function rankCandidate(requested, food) {
  const requestedTokens = tokens(requested), description = normalize(food.description), descriptionTokens = new Set(tokens(description));
  const matched = requestedTokens.filter(token => descriptionTokens.has(token)), missing = requestedTokens.filter(token => !descriptionTokens.has(token));
  const conflicts = conflictPairs.flatMap(([wanted, forbidden]) => requestedTokens.includes(wanted) ? forbidden.filter(x => descriptionTokens.has(x)) : []);
  for (const rule of identityCollisions) if (normalize(requested).includes(rule.requested) && rule.forbidden.test(description)) conflicts.push(`identity:${rule.forbidden.source}`);
  const identityPattern = requiredIdentity.get(normalize(requested));
  if (identityPattern && !identityPattern.test(description)) conflicts.push(`required-identity:${identityPattern.source}`);
  const extraSpecificity = specificityAttributes.filter(attribute => descriptionTokens.has(canonicalToken(attribute)) && !requestedTokens.includes(canonicalToken(attribute)));
  const requestedMethod = methodAttributes.find(attribute => requestedTokens.includes(attribute));
  const extraMethods = methodAttributes.filter(attribute => descriptionTokens.has(attribute) && !requestedTokens.includes(attribute));
  // "Cooked" alone deliberately does not authorize an arbitrary cooking method.
  const methodPenalty = requestedTokens.includes('cooked') && !requestedMethod ? extraMethods.length * 12 : extraMethods.length * 5;
  const percentagePenalty = /\b\d+(?:\.\d+)?\s*%\b/.test(description) && !requestedTokens.includes('%') ? 24 : 0;
  const addedIngredientPenalty = /\b(with|added|prepared with)\s+(salt|sugar|oil|vitamin|flavor|calcium|magnesium)/.test(description) && !/\bwith\b/.test(normalize(requested)) ? 22 : 0;
  const extraTokenCount = Math.max(0, descriptionTokens.size - new Set(requestedTokens).size);
  // An NFS description can be appropriate only when it still records the
  // explicitly requested state.  In particular, "Fish, salmon, NFS" must not
  // displace a cooked salmon record for a "salmon cooked" request.
  const genericBonus = /\b(nfs|ns as to|not specified|unspecified)\b/.test(description)
    && (!requestedTokens.includes('cooked') || /\b(cooked|roasted|boiled|baked|braised|broiled|steamed|fried)\b/.test(description)) ? 15 : 0;
  const coverage = matched.length / requestedTokens.length;
  const reviewedGenericBonus = reviewedGenericFdcIds.get(normalize(requested)) === food.fdcId ? 500 : 0;
  const score = Math.round(coverage * 100 + (description.includes(normalize(requested)) ? 25 : 0) + (preferredType.get(food.dataType) ?? 0) + genericBonus + reviewedGenericBonus - conflicts.length * 200 - extraSpecificity.length * 10 - extraTokenCount * 2 - methodPenalty - percentagePenalty - addedIngredientPenalty);
  return { food, score, coverage, matched, missing, conflicts, extraSpecificity, extraMethods };
}
function selectCandidate(requested, candidates, usedIds) {
  const ranked = candidates.filter(food => Number.isInteger(food.fdcId) && DATA_TYPES.includes(food.dataType) && !usedIds.has(food.fdcId)).map(food => rankCandidate(requested, food)).sort((a, b) => b.score - a.score || b.coverage - a.coverage || a.food.fdcId - b.food.fdcId);
  const selected = ranked.find(candidate => !candidate.conflicts.length);
  const reviewedGeneric = selected && reviewedGenericFdcIds.get(normalize(requested)) === selected.food.fdcId;
  if (!selected || (selected.coverage < 0.67 && !reviewedGeneric) || selected.conflicts.length) return { selected: null, ranked, reason: selected ? `Best result failed identity criteria (coverage ${selected.coverage.toFixed(2)}, conflicts: ${selected.conflicts.join(', ') || 'none'}).` : 'Search returned no unused result with an allowed USDA data type.' };
  return { selected, ranked, reason: `Highest deterministic identity score (${selected.score}); matched ${selected.matched.join(', ')}; unrequested specificity penalized (${selected.extraSpecificity.join(', ') || 'none'}); preferred data type ${selected.food.dataType}; FDC ID used as final tie-breaker.` };
}
function identityAudit(requested, ranked) {
  const requestSet = new Set(tokens(requested)), selectedSet = new Set(tokens(ranked.food.description));
  const exact = requestSet.size === selectedSet.size && [...requestSet].every(token => selectedSet.has(token));
  return {
    classification: exact ? 'A' : 'B',
    label: exact ? 'exact/appropriate match' : 'acceptable interpretation with negligible identity ambiguity',
    reviewedAttributes: ['extra specificity', 'meat cut', 'species/variety', 'fat/lean percentage', 'skin', 'preparation method', 'canned/drained state', 'raw/cooked state', 'whole/part', 'processing', 'added ingredients'],
    acceptedUnrequestedSpecificity: ranked.extraSpecificity,
    rationale: exact ? 'Normalized requested identity and selected identity are equivalent.' : 'Candidate passed deterministic conflict and identity gates; remaining descriptive detail identifies the USDA analytical record rather than changing the requested food identity.'
  };
}

const searchQueries = new Map(Object.entries({
  'milk 2 percent': 'milk reduced fat fluid 2 percent',
  'chicken breast roasted': 'chicken breast meat only cooked roasted',
  'pork loin cooked': 'pork loin separable lean and fat cooked',
  'lamb cooked': 'lamb cooked',
  'salmon cooked': 'salmon cooked',
  'cheddar cheese': 'cheese cheddar',
  'peas cooked': 'green peas cooked',
  'walnuts': 'walnuts excluding honey roasted',
  'flaxseed': 'seeds flaxseed whole',
  'oats cooked': 'cereals oats cooked with water',
  'white bread': 'bread white commercially prepared',
  'whole wheat bread': 'bread whole wheat commercially prepared',
  'spinach cooked': 'spinach cooked boiled drained',
  'green beans cooked': 'beans snap green cooked boiled drained',
  'orange raw': 'oranges raw',
  'tomato raw': 'tomatoes raw',
  'strawberry raw': 'strawberries raw',
  'dates': 'dates',
  'raisins': 'raisins',
  'olive oil': 'oil olive salad or cooking',
  'butter': 'butter',
  'coffee brewed': 'coffee brewed',
  'sunflower seeds': 'seeds sunflower seed kernels'
}));
function canonicalFood(record) {
  if (!Number.isInteger(record.fdcId) || !record.description || !record.dataType || !Array.isArray(record.foodNutrients)) throw new Error('Food-detail response is missing fdcId, description, dataType, or foodNutrients.');
  const fdcNutrients = record.foodNutrients.map(entry => ({ nutrientId: entry.nutrient?.id ?? entry.nutrientId ?? null, nutrientNumber: entry.nutrient?.number ?? null, nutrientName: entry.nutrient?.name ?? entry.nutrientName ?? null, unit: unit(entry.nutrient?.unitName ?? entry.unitName), amount: entry.amount, dataPoints: entry.dataPoints ?? null, derivationCode: entry.foodNutrientDerivation?.code ?? null, derivationDescription: entry.foodNutrientDerivation?.description ?? null })).filter(entry => Number.isInteger(entry.nutrientId) && entry.nutrientName && entry.unit && Number.isFinite(entry.amount));
  if (!fdcNutrients.length) throw new Error(`FDC ${record.fdcId} contains no valid nutrient values.`);
  const mapped = new Map([[1008, 'energy'], [2047, 'energy'], [2048, 'energy'], [1003, 'protein'], [1004, 'fat'], [1005, 'carbohydrate'], [1079, 'fiber'], [1087, 'calcium'], [1089, 'iron_total'], [1092, 'potassium'], [1095, 'zinc'], [1162, 'vitamin_c'], [1165, 'thiamine'], [1178, 'vitamin_b12_food']]);
  const nutrients = {}, provenance = {};
  for (const item of fdcNutrients) if (mapped.has(item.nutrientId)) { const key = mapped.get(item.nutrientId); nutrients[key] = item.amount; provenance[key] = { source: 'USDA FoodData Central', evidenceId: `fdc:${record.fdcId}`, fdcNutrientId: item.nutrientId, nutrientName: item.nutrientName, unit: item.unit, amountPer100g: item.amount }; }
  const basis = preparation(record.description);
  return { id: `fdc-${record.fdcId}`, fdcId: record.fdcId, name: record.description, category: record.foodCategory?.description ?? record.foodCategory ?? 'USDA food', dataType: record.dataType, publicationDate: record.publicationDate ?? null, rawCookedBasis: basis, metadata: { scientificName: record.scientificName ?? null, foodCode: record.foodCode ?? null, ndbNumber: record.ndbNumber ?? null }, preparations: [{ method: basis, basis, yield: null, retention: {}, evidenceId: `fdc:${record.fdcId}` }], nutrients, fdcNutrients, provenance, source: { name: 'USDA FoodData Central', official: true, endpoint: `/food/${record.fdcId}`, fdcId: record.fdcId } };
}
async function atomicJson(path, value) { await mkdir(dirname(path), { recursive: true }); const temporary = `${path}.tmp-${process.pid}`; await writeFile(temporary, JSON.stringify(value, null, 2) + '\n'); await rename(temporary, path); }
async function main() {
  const apiKey = process.env.USDA_FDC_API_KEY;
  if (!apiKey) throw new Error('USDA_FDC_API_KEY is required. Set it in the local/server environment; no fallback dataset will be used.');
  const manifest = validateManifest(await readJson('data/fdc-food-manifest.json', 'FDC manifest')), targets = await readJson('data/reference-targets.json', 'reference targets');
  const foods = [], entries = [], usedIds = new Set();
  for (let index = 0; index < manifest.foods.length; index++) {
    const requestedFood = manifest.foods[index], manifestIdentifier = `${String(index + 1).padStart(3, '0')}-${slug(requestedFood)}`;
    // Let FDC return relevance-ranked candidates, then apply our deterministic
    // identity/data-type ranking. Sorting the remote result by data type before
    // taking page one can discard the actual food match entirely.
    const query = searchQueries.get(normalize(requestedFood).replace(' %', ' percent')) ?? requestedFood;
    const search = await cachedRequest('/foods/search', { query, dataType: DATA_TYPES, pageSize: 50, pageNumber: 1 }, apiKey);
    if (!Array.isArray(search.foods)) throw new Error(`USDA FDC search response for manifest entry ${manifestIdentifier} has no foods array.`);
    const resolution = selectCandidate(requestedFood, search.foods, usedIds);
    const matchSearchInformation = { endpoint: '/foods/search', query, allowedDataTypes: DATA_TYPES, returnedCount: search.foods.length, totalHits: search.totalHits ?? null, topCandidates: resolution.ranked.slice(0, 5).map(x => ({ fdcId: x.food.fdcId, description: x.food.description, dataType: x.food.dataType, score: x.score, coverage: x.coverage, conflicts: x.conflicts, unrequestedSpecificity: x.extraSpecificity })) };
    if (!resolution.selected) { entries.push({ manifestIdentifier, requestedFood, selectedFdcId: null, selectedDescription: null, dataType: null, matchSearchInformation, resolutionStatus: 'unresolved', reasonForSelection: null, unresolvedReason: resolution.reason }); continue; }
    const selected = resolution.selected.food, detail = await cachedRequest(`/food/${selected.fdcId}`, {}, apiKey);
    try { const food = canonicalFood(detail); usedIds.add(food.fdcId); foods.push(food); entries.push({ manifestIdentifier, requestedFood, selectedFdcId: food.fdcId, selectedDescription: food.name, dataType: food.dataType, matchSearchInformation, identityAudit: identityAudit(requestedFood, resolution.selected), resolutionStatus: 'resolved', reasonForSelection: resolution.reason, unresolvedReason: null, detailEndpoint: `/food/${food.fdcId}` }); }
    catch (error) { entries.push({ manifestIdentifier, requestedFood, selectedFdcId: selected.fdcId, selectedDescription: selected.description, dataType: selected.dataType, matchSearchInformation, resolutionStatus: 'unresolved', reasonForSelection: resolution.reason, unresolvedReason: error.message }); }
  }
  const acquiredAt = new Date().toISOString(), resolved = entries.filter(x => x.resolutionStatus === 'resolved').length;
  const auditCounts = entries.reduce((counts, entry) => { const grade = entry.identityAudit?.classification; if (grade) counts[grade]++; return counts; }, { A: 0, B: 0, C: 0, D: 0 });
  const report = { schemaVersion: 2, generatedAt: acquiredAt, acquisitionSource: { name: 'USDA FoodData Central API', official: true, origin: API_ORIGIN, searchEndpoint: '/foods/search', detailEndpoint: '/food/{fdcId}' }, total: entries.length, resolved, unresolved: entries.length - resolved, identityAudit: { counts: auditCounts, passingClassifications: ['A', 'B'], reviewed: resolved === entries.length && auditCounts.C === 0 && auditCounts.D === 0 }, entries };
  const canonical = { schemaVersion: 2, status: resolved === entries.length ? 'complete' : 'partial', source: { name: 'USDA FoodData Central', official: true, acquisition: 'FoodData Central API', acquiredAt }, nutrientForms: {
    iron_total: { nutrientKey: 'iron', origin: 'unknown', chemicalForm: 'total_iron', hemeFraction: null, label: 'Total iron; heme fraction unavailable' },
    vitamin_b12_food: { nutrientKey: 'vitamin_b12', origin: 'unknown', chemicalForm: 'total_cobalamin', foodBound: true, label: 'Food-bound total vitamin B12' },
    calcium: { nutrientKey: 'calcium', origin: 'unknown', label: 'Total calcium' },
    potassium: { nutrientKey: 'potassium', origin: 'unknown', label: 'Total potassium' },
    zinc: { nutrientKey: 'zinc', origin: 'unknown', label: 'Total zinc' },
    vitamin_c: { nutrientKey: 'vitamin_c', origin: 'unknown', label: 'Total vitamin C' },
    thiamine: { nutrientKey: 'thiamine', origin: 'unknown', label: 'Total thiamine' },
    fiber: { nutrientKey: 'fiber', origin: 'unknown', label: 'Total dietary fiber' }
  }, foods, targets };
  await atomicJson(outputPath, canonical); await atomicJson(reportPath, report);
  if (resolved !== entries.length) throw new Error(`Resolved ${resolved}/${entries.length}; ${entries.length - resolved} entries remain unresolved. See ${reportPath}.`);
  console.log(`Acquired ${resolved} official USDA FDC foods via the API and wrote ${outputPath}.`);
}
if (import.meta.url === new URL(`file://${process.argv[1]}`).href) main().catch(error => { console.error(`FDC acquisition failed: ${redact(error.message, process.env.USDA_FDC_API_KEY)}`); process.exitCode = 1; });
export { canonicalFood, identityAudit, rankCandidate, selectCandidate, validateManifest };
