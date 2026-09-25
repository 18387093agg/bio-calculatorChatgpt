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
    } else assert.ok(entry.unresolvedReason);
  }
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

test('browser loads canonical dataset before explicit demo fallback', () => {
  const app = readFileSync('public/app.js', 'utf8');
  assert.ok(app.indexOf("fetch('/canonical-foods.json')") < app.indexOf("fetch('/demo-foods.json')"));
  assert.match(app, /datasetMode='demo-fallback'/);
});
