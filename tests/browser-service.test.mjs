import test from 'node:test';
import assert from 'node:assert/strict';
import { absorptionEstimate, progress } from '../public/application/meal-service.js';
import { createWorkspaceRepository } from '../public/application/repository.js';

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

test('local workspace repository restores persisted user workspace', () => {
  const values = new Map(); const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const first = createWorkspaceRepository(storage); first.replace({ meal: [{ id: 'meal-1' }], settings: { language: 'el' } });
  const restored = createWorkspaceRepository(storage).load();
  assert.equal(restored.meal[0].id, 'meal-1'); assert.equal(restored.settings.language, 'el');
});
