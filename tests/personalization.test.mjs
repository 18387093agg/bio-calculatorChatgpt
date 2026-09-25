import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateZincAbsorption, resolveConditionEffects, runNutrientPipeline, describeMealInteractions } from '../public/calculation-engine.js';

test('Miller zinc model is saturable rather than linearly unbounded',()=>{
 const low=estimateZincAbsorption(10,500), high=estimateZincAbsorption(100,500), veryHigh=estimateZincAbsorption(1000,500);
 assert.ok(low.value>0);assert.ok(high.value>low.value);assert.ok(veryHigh.value>high.value);
 assert.ok(high.value/low.value<10);assert.ok(veryHigh.value<1000);assert.equal(high.modelKey,'zinc.miller.phytate.saturation.v1');
});
test('zinc population model requires explicit daily scope and phytate input',()=>{
 const [mealOnly]=runNutrientPipeline([{nutrientKey:'zinc',formId:'zinc',origin:'plant',amount:10,unit:'mg'}]);
 const [daily]=runNutrientPipeline([{nutrientKey:'zinc',formId:'zinc',origin:'plant',amount:10,unit:'mg'}],{zincModelScope:'daily',dietaryZincMg:10,phytateMg:500});
 assert.equal(mealOnly.absorption.status,'unavailable');assert.equal(daily.absorption.status,'modeled');
});
test('normal zinc does not create copper depletion; high supplemental zinc flags copper absorption only',()=>{
 assert.equal(describeMealInteractions('copper',{supplementalZincMg:20}).length,0);
 const high=describeMealInteractions('copper',{supplementalZincMg:50});assert.equal(high.length,1);assert.equal(high[0].quantitative,false);
 const [copper]=runNutrientPipeline([{nutrientKey:'copper',formId:'copper',origin:'plant',amount:1,unit:'mg'}],{mealModifiers:{supplementalZincMg:50}});
 assert.equal(copper.grossIntake.value,1);assert.equal(copper.conditionEffects.length,0);assert.equal(copper.mealInteractions.observations.length,1);
});
test('condition effects are nutrient-specific, qualitative where unquantified, and deduplicated',()=>{
 const effects=resolveConditionEffects(['hypochlorhydria','gastrectomy']);
 assert.ok(effects.some(x=>x.nutrients.includes('vitamin_b12')));assert.ok(effects.every(x=>x.quantitative===false));
 assert.equal(effects.filter(x=>x.mechanismId==='gastric-acid.food-release').length,1);
 const [b12]=runNutrientPipeline([{nutrientKey:'vitamin_b12',formId:'b12_food',origin:'animal',foodBound:true,amount:2,unit:'µg'}],{conditions:['hypochlorhydria']});
 assert.equal(b12.conditionEffects.length,1);assert.equal(b12.conditionEffects[0].type,'reduced_absorption');
});
test('magnesium/vitamin D and magnesium/thiamine mechanisms remain qualitative, with no TTFD potassium drain',()=>{
 assert.equal(describeMealInteractions('vitamin_d',{magnesiumStatus:'low'})[0].quantitative,false);
 assert.equal(describeMealInteractions('thiamine',{magnesiumStatus:'low'})[0].quantitative,false);
 assert.equal(describeMealInteractions('potassium',{ttfdMg:100}).length,0);
});
