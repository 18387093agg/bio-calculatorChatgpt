import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { canonicalFood, rankCandidate, selectCandidate, validateManifest } from '../scripts/import-fdc.mjs';

const manifest = JSON.parse(readFileSync('data/fdc-food-manifest.json'));
const report = JSON.parse(readFileSync('data/fdc-resolution-report.json'));

test('the acquisition manifest is exactly 87 unique foods', () => {
  assert.equal(validateManifest(manifest).foods.length, 87);
});

test('resolution report audits every manifest identity', () => {
  assert.equal(report.total, 87);
  assert.equal(report.entries.length, 87);
  for (const entry of report.entries) {
    assert.ok(entry.manifestIdentifier);
    assert.ok(entry.requestedFood);
    assert.ok(['resolved', 'unresolved'].includes(entry.resolutionStatus));
    if (entry.resolutionStatus === 'resolved') {
      assert.ok(entry.selectedFdcId);
      assert.ok(entry.selectedDescription);
      assert.ok(entry.dataType);
      assert.ok(entry.reasonForSelection);
      assert.ok(['A', 'B'].includes(entry.identityAudit?.classification));
    } else assert.ok(entry.unresolvedReason);
  }
});

test('identity audit has no materially ambiguous or incorrect USDA selections', () => {
  assert.deepEqual(report.identityAudit.counts, { A: 28, B: 59, C: 0, D: 0 });
  assert.equal(report.identityAudit.reviewed, true);
});

test('missing API key fails clearly without creating output or using fallback data', () => {
  const run = spawnSync(process.execPath, ['scripts/import-fdc.mjs', '/tmp/must-not-exist.json', '/tmp/must-not-exist-report.json'], { encoding: 'utf8', env: { PATH: process.env.PATH } });
  assert.notEqual(run.status, 0);
  assert.match(run.stderr, /USDA_FDC_API_KEY is required/);
  assert.match(run.stderr, /no fallback dataset will be used/i);
});

test('deterministic matching prefers intended preparation and allowed data type', () => {
  const candidates = [
    { fdcId: 30, description: 'Spinach, raw', dataType: 'Foundation' },
    { fdcId: 20, description: 'Spinach, cooked, boiled, drained', dataType: 'SR Legacy' },
    { fdcId: 10, description: 'Spinach, cooked', dataType: 'Branded' }
  ];
  const result = selectCandidate('spinach cooked', candidates, new Set());
  assert.equal(result.selected.food.fdcId, 20);
  assert.match(result.reason, /deterministic identity score/);
  assert.ok(rankCandidate('spinach cooked', candidates[1]).score > rankCandidate('spinach cooked', candidates[0]).score);
});

test('explicit cooked requests do not resolve to an NFS record without a cooked state', () => {
  const candidates = [
    { fdcId: 1, description: 'Fish, salmon, NFS', dataType: 'Survey (FNDDS)' },
    { fdcId: 2, description: 'Fish, salmon, Chinook, cooked, dry heat', dataType: 'SR Legacy' }
  ];
  const result = selectCandidate('salmon cooked', candidates, new Set());
  assert.equal(result.selected.food.fdcId, 2);
  assert.ok(rankCandidate('salmon cooked', candidates[1]).score > rankCandidate('salmon cooked', candidates[0]).score);
});

test('deterministic matching rejects unrequested identity and processing attributes', () => {
  const collisionCases = [
    ['oyster cooked', 'Ostrich, oyster, cooked'],
    ['banana raw', 'Pepper, banana, raw'],
    ['cheddar cheese', 'Snacks, cheddar cheese pretzel'],
    ['olive oil', 'Anchovies, canned in olive oil, drained'],
    ['flaxseed', 'Oil, flaxseed, cold pressed'],
    ['chicken breast roasted', 'Chicken breast, roll, oven-roasted']
  ];
  for (const [requested, description] of collisionCases) {
    const candidate = rankCandidate(requested, { fdcId: 1, description, dataType: 'Foundation' });
    assert.ok(candidate.conflicts.length, `${requested} must reject ${description}`);
  }
});

test('food detail conversion preserves every valid raw nutrient and USDA provenance', () => {
  const food = canonicalFood({ fdcId: 123, description: 'Food, cooked', dataType: 'Foundation', publicationDate: '2026-01-01', foodCategory: { description: 'Vegetables' }, foodNutrients: [
    { nutrient: { id: 1008, number: '208', name: 'Energy', unitName: 'KCAL' }, amount: 42, dataPoints: 7 },
    { nutrient: { id: 1089, number: '303', name: 'Iron, Fe', unitName: 'MG' }, amount: 1.2 },
    { nutrient: { id: 9999, number: 'X', name: 'Unmapped measured nutrient', unitName: 'UG' }, amount: 3 }
  ] });
  assert.equal(food.fdcNutrients.length, 3);
  assert.equal(food.fdcNutrients[2].unit, 'µg');
  assert.equal(food.nutrients.iron_total, 1.2);
  assert.equal(food.provenance.iron_total.source, 'USDA FoodData Central');
  assert.deepEqual(food.source, { name: 'USDA FoodData Central', official: true, endpoint: '/food/123', fdcId: 123 });
});

test('browser loads only the complete canonical production dataset', () => {
  const app = readFileSync('public/app.js', 'utf8');
  assert.match(app, /fetch\('\/canonical-foods\.json'\)/);
  assert.match(app, /foods\?\.length!==87/);
  assert.doesNotMatch(app, /demo-foods|demo-fallback/);
});
