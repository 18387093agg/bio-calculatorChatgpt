import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SUPPLEMENT_FORMS, foodEntities, UnconfiguredLabReportParser } from '../public/application/catalogs.js';

test('supplement catalog contains multiple magnesium and B12 forms with explicit units', () => {
  const magnesium = SUPPLEMENT_FORMS.filter(x => x.nutrientId === 'magnesium');
  const b12 = SUPPLEMENT_FORMS.filter(x => x.nutrientId === 'vitamin_b12');
  assert.ok(magnesium.length >= 7);
  assert.ok(b12.length >= 4);
  assert.ok(magnesium.every(x => x.defaultUnit === 'mg'));
  assert.ok(b12.every(x => x.defaultUnit === 'µg'));
});

test('food entities retain separate USDA-backed preparation records', () => {
  const foods = [
    { id: 'raw', fdcId: 1, name: 'Potato, raw', category: 'Vegetables', nutrients: { iron: 1 }, preparations: [{ method: 'raw' }] },
    { id: 'baked', fdcId: 2, name: 'Potato, baked', category: 'Vegetables', nutrients: { iron: 2 }, preparations: [{ method: 'baked' }] }
  ];
  const entities = foodEntities(foods);
  assert.equal(entities.length, 1);
  assert.deepEqual(entities[0].variants.map(x => x.preparation), ['raw', 'baked']);
  assert.notEqual(entities[0].variants[0].nutrients.iron, entities[0].variants[1].nutrients.iron);
});

test('unconfigured lab parser refuses to manufacture extracted values', async () => {
  await assert.rejects(new UnconfiguredLabReportParser().parse({ name: 'lab.pdf' }), /No document extraction provider/);
});

test('new scientific UI workflows are present', () => {
  const app = readFileSync('public/app.js', 'utf8');
  for (const text of ['Estimated absorbed', 'Converted / bioactive', 'No official UL', 'Save personal target ranges', 'Search supplements or forms...', 'UPLOAD LAB REPORT', 'Health Context']) assert.ok(app.includes(text), text);
});
