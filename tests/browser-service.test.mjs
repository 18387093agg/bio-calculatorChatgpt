import test from 'node:test';
import assert from 'node:assert/strict';
import { absorptionEstimate, estimateFormAbsorption, progress } from '../public/application/meal-service.js';
import { calculateMeal as calculateDomainMeal } from '../.test-dist/src/calculation/meal.js';
import { createWorkspaceRepository } from '../public/application/repository.js';
import { translateMarkup } from '../public/i18n/messages.js';

test('source-aware frontend iron estimate does not apply the acid penalty to heme iron', () => {
  const value = { animal: 2, plant: 3, supplement: 0 };
  const normal = absorptionEstimate('iron', value, 'normal');
  const low = absorptionEstimate('iron', value, 'low');
  assert.deepEqual(low.sources[0][2], normal.sources[0][2]);
  assert.ok(low.sources[1][2].max < normal.sources[1][2].max);
});

test('frontend B12 estimate does not apply the food release penalty to free supplement', () => {
  const normal = absorptionEstimate('vitamin_b12', { animal: 2, plant: 0, supplement: 10 }, 'normal');
  const low = absorptionEstimate('vitamin_b12', { animal: 2, plant: 0, supplement: 10 }, 'low');
  assert.ok(low.sources[0][2].max < normal.sources[0][2].max);
  assert.deepEqual(low.sources[1][2], normal.sources[1][2]);
});

test('status scale retains exact intake and markers independently', () => {
  const bar = progress(150, { rda: 10, optimalMin: 15, optimalMax: 20, ul: 100, unit: 'mg' });
  assert.equal(bar.actual, 150 / bar.scale * 100);
  assert.ok(bar.markers.rda < bar.markers.ul);
});

test('status scale supports below-RDA, optimal, above-optimal, and above-UL actual values without clamping', () => {
  const target = { rda: 10, optimalMin: 15, optimalMax: 20, ul: 30, unit: 'mg' };
  for (const actual of [5, 17, 25, 35]) {
    const bar = progress(actual, target);
    assert.equal(bar.actual, actual / bar.scale * 100);
    assert.ok(bar.markers.rda < bar.markers.optimalMin);
    assert.ok(bar.markers.optimalMin < bar.markers.optimalMax);
    assert.ok(bar.markers.optimalMax < bar.markers.ul);
  }
});

test('local workspace repository restores persisted user workspace', () => {
  const values = new Map(); const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const first = createWorkspaceRepository(storage); first.replace({ meal: [{ id: 'meal-1' }], settings: { language: 'el' } });
  const restored = createWorkspaceRepository(storage).load();
  assert.equal(restored.meal[0].id, 'meal-1'); assert.equal(restored.settings.language, 'el');
});
test('browser-visible and TypeScript domain results use the same canonical equation',()=>{const canonical=estimateFormAbsorption('iron','plant',false,3,'low');const food={id:'x',name:'x',category:'x',nutrients:[{form:{id:'nonheme',nutrientKey:'iron',label:'Non-heme',origin:'plant'},amountPer100g:3,unit:'mg'}]};const domain=calculateDomainMeal([{food,grams:100}],{gastricAcid:'low'})[0].absorbed;assert.deepEqual({min:domain.min,max:domain.max},{min:canonical.min,max:canonical.max});});
test('Greek localization covers major interactive controls',()=>{const html=translateMarkup('Food Quantity Preparation Clear meal Actual intake Details Save supplement Save result Save settings','el');for(const word of ['Τρόφιμο','Ποσότητα','Παρασκευή','Καθαρισμός','Πραγματική','Λεπτομέρειες','Αποθήκευση'])assert.ok(html.includes(word));});
