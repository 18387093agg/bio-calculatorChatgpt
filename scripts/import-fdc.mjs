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
function rankCandidate(requested, food) {
  const requestedTokens = tokens(requested), description = normalize(food.description), descriptionTokens = new Set(tokens(description));
  const matched = requestedTokens.filter(token => descriptionTokens.has(token)), missing = requestedTokens.filter(token => !descriptionTokens.has(token));
  const conflicts = conflictPairs.flatMap(([wanted, forbidden]) => requestedTokens.includes(wanted) ? forbidden.filter(x => descriptionTokens.has(x)) : []);
  const coverage = matched.length / requestedTokens.length;
  const score = Math.round(coverage * 100 + (description.includes(normalize(requested)) ? 25 : 0) + (preferredType.get(food.dataType) ?? 0) - conflicts.length * 45);
  return { food, score, coverage, matched, missing, conflicts };
}
function selectCandidate(requested, candidates, usedIds) {
  const ranked = candidates.filter(food => Number.isInteger(food.fdcId) && DATA_TYPES.includes(food.dataType) && !usedIds.has(food.fdcId)).map(food => rankCandidate(requested, food)).sort((a, b) => b.score - a.score || b.coverage - a.coverage || a.food.fdcId - b.food.fdcId);
  const selected = ranked[0];
  if (!selected || selected.coverage < 0.67 || selected.conflicts.length) return { selected: null, ranked, reason: selected ? `Best result failed identity criteria (coverage ${selected.coverage.toFixed(2)}, conflicts: ${selected.conflicts.join(', ') || 'none'}).` : 'Search returned no unused result with an allowed USDA data type.' };
  return { selected, ranked, reason: `Highest deterministic identity score (${selected.score}); matched ${selected.matched.join(', ')}; preferred data type ${selected.food.dataType}; FDC ID used as final tie-breaker.` };
}
function canonicalFood(record) {
  if (!Number.isInteger(record.fdcId) || !record.description || !record.dataType || !Array.isArray(record.foodNutrients)) throw new Error('Food-detail response is missing fdcId, description, dataType, or foodNutrients.');
  const fdcNutrients = record.foodNutrients.map(entry => ({ nutrientId: entry.nutrient?.id ?? entry.nutrientId ?? null, nutrientNumber: entry.nutrient?.number ?? null, nutrientName: entry.nutrient?.name ?? entry.nutrientName ?? null, unit: unit(entry.nutrient?.unitName ?? entry.unitName), amount: entry.amount, dataPoints: entry.dataPoints ?? null, derivationCode: entry.foodNutrientDerivation?.code ?? null, derivationDescription: entry.foodNutrientDerivation?.description ?? null })).filter(entry => Number.isInteger(entry.nutrientId) && entry.nutrientName && entry.unit && Number.isFinite(entry.amount));
  if (!fdcNutrients.length) throw new Error(`FDC ${record.fdcId} contains no valid nutrient values.`);
  const mapped = new Map([[1008, 'energy'], [1003, 'protein'], [1004, 'fat'], [1005, 'carbohydrate'], [1079, 'fiber'], [1087, 'calcium'], [1089, 'iron_total'], [1092, 'potassium'], [1095, 'zinc'], [1162, 'vitamin_c'], [1165, 'thiamine'], [1178, 'vitamin_b12_food']]);
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
    const search = await cachedRequest('/foods/search', { query: requestedFood, dataType: DATA_TYPES, pageSize: 50, pageNumber: 1 }, apiKey);
    if (!Array.isArray(search.foods)) throw new Error(`USDA FDC search response for manifest entry ${manifestIdentifier} has no foods array.`);
    const resolution = selectCandidate(requestedFood, search.foods, usedIds);
    const matchSearchInformation = { endpoint: '/foods/search', query: requestedFood, allowedDataTypes: DATA_TYPES, returnedCount: search.foods.length, totalHits: search.totalHits ?? null, topCandidates: resolution.ranked.slice(0, 5).map(x => ({ fdcId: x.food.fdcId, description: x.food.description, dataType: x.food.dataType, score: x.score, coverage: x.coverage })) };
    if (!resolution.selected) { entries.push({ manifestIdentifier, requestedFood, selectedFdcId: null, selectedDescription: null, dataType: null, matchSearchInformation, resolutionStatus: 'unresolved', reasonForSelection: null, unresolvedReason: resolution.reason }); continue; }
    const selected = resolution.selected.food, detail = await cachedRequest(`/food/${selected.fdcId}`, {}, apiKey);
    try { const food = canonicalFood(detail); usedIds.add(food.fdcId); foods.push(food); entries.push({ manifestIdentifier, requestedFood, selectedFdcId: food.fdcId, selectedDescription: food.name, dataType: food.dataType, matchSearchInformation, resolutionStatus: 'resolved', reasonForSelection: resolution.reason, unresolvedReason: null, detailEndpoint: `/food/${food.fdcId}` }); }
    catch (error) { entries.push({ manifestIdentifier, requestedFood, selectedFdcId: selected.fdcId, selectedDescription: selected.description, dataType: selected.dataType, matchSearchInformation, resolutionStatus: 'unresolved', reasonForSelection: resolution.reason, unresolvedReason: error.message }); }
  }
  const acquiredAt = new Date().toISOString(), resolved = entries.filter(x => x.resolutionStatus === 'resolved').length;
  const report = { schemaVersion: 2, generatedAt: acquiredAt, acquisitionSource: { name: 'USDA FoodData Central API', official: true, origin: API_ORIGIN, searchEndpoint: '/foods/search', detailEndpoint: '/food/{fdcId}' }, total: entries.length, resolved, unresolved: entries.length - resolved, entries };
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
export { canonicalFood, rankCandidate, selectCandidate, validateManifest };
