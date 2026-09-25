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
 const effects=resolveConditionEffects(['hypochlorhydria',{id:'gastrectomy',state:'partial'}]);
 assert.ok(effects.some(x=>x.nutrients.includes('vitamin_b12')));assert.ok(effects.every(x=>x.quantitative===false));
 assert.equal(effects.filter(x=>x.mechanismId==='gastric-acid.food-release').length,0);assert.ok(effects.some(x=>x.mechanismId==='gastrectomy.partial.b12-gastric-processing'));
 const [b12]=runNutrientPipeline([{nutrientKey:'vitamin_b12',formId:'b12_food',origin:'animal',foodBound:true,amount:2,unit:'µg'}],{conditions:['hypochlorhydria']});
 assert.equal(b12.conditionEffects.length,1);assert.equal(b12.conditionEffects[0].type,'reduced_absorption');
});
test('magnesium/vitamin D and magnesium/thiamine mechanisms remain qualitative, with no TTFD potassium drain',()=>{
 assert.equal(describeMealInteractions('vitamin_d',{magnesiumStatus:'low'})[0].quantitative,false);
 assert.equal(describeMealInteractions('thiamine',{magnesiumStatus:'low'})[0].quantitative,false);
 assert.equal(describeMealInteractions('potassium',{ttfdMg:100}).length,0);
});

test('hypochlorhydria states preserve the healthy numeric baseline and form boundaries',()=>{
 const entries=[
  {nutrientKey:'vitamin_b12',formId:'b12_food',origin:'animal',foodBound:true,amount:2,unit:'µg'},
  {nutrientKey:'vitamin_b12',formId:'b12_free',origin:'supplement',foodBound:false,amount:2,unit:'µg'},
  {nutrientKey:'iron',formId:'iron_nonheme',origin:'plant',amount:10,unit:'mg'},
  {nutrientKey:'iron',formId:'iron_heme',origin:'animal',amount:10,unit:'mg'}];
 const baseline=runNutrientPipeline(entries,{});
 for(const state of ['suspected','documented','achlorhydria','acid_suppression']){
  const result=runNutrientPipeline(entries,{conditions:[{id:'hypochlorhydria',state}]});
  assert.deepEqual(result.map(x=>x.absorption),baseline.map(x=>x.absorption),state);
  const b12=result.find(x=>x.nutrientKey==='vitamin_b12'),iron=result.find(x=>x.nutrientKey==='iron');
  assert.ok(b12.conditionEffects.every(x=>x.quantitative===false));
  assert.ok(iron.conditionEffects.every(x=>x.quantitative===false));
 }
 const medication=resolveConditionEffects([{id:'hypochlorhydria',state:'acid_suppression'}]);
 assert.deepEqual(medication.map(x=>x.mechanismId),['gastric-acid.medication-food-release']);
});

test('celiac state is explicit, qualitative, and leaves unrelated nutrients and RDA unchanged',()=>{
 const entries=[{nutrientKey:'iron',formId:'iron_nonheme',origin:'plant',amount:10,unit:'mg'},{nutrientKey:'calcium',formId:'calcium',origin:'plant',amount:500,unit:'mg'},{nutrientKey:'thiamine',formId:'thiamine',origin:'plant',amount:1,unit:'mg'}];
 const targets={iron:{rda:8,unit:'mg'},calcium:{rda:1000,unit:'mg'}};
 const baseline=runNutrientPipeline(entries,{},targets);
 for(const state of ['active_untreated','treated_adherent']){
  const result=runNutrientPipeline(entries,{conditions:[{id:'celiac_disease',state}]},targets);
  assert.deepEqual(result.map(x=>x.absorption),baseline.map(x=>x.absorption));
  assert.equal(result.find(x=>x.nutrientKey==='iron').conditionEffects[0].input,state);
  assert.equal(result.find(x=>x.nutrientKey==='calcium').conditionEffects[0].quantitative,false);
  assert.equal(result.find(x=>x.nutrientKey==='thiamine').conditionEffects.length,0);
  assert.equal(result.find(x=>x.nutrientKey==='iron').targetComparison.target.rda,8);
 }
});

test('combined hypochlorhydria and active celiac preserve both mechanisms without double-counting coefficients',()=>{
 const entries=[{nutrientKey:'vitamin_b12',formId:'b12_food',origin:'animal',foodBound:true,amount:2,unit:'µg'},{nutrientKey:'iron',formId:'iron_nonheme',origin:'plant',amount:10,unit:'mg'}];
 const baseline=runNutrientPipeline(entries,{});
 const low=runNutrientPipeline(entries,{conditions:[{id:'hypochlorhydria',state:'documented'}]});
 const celiac=runNutrientPipeline(entries,{conditions:[{id:'celiac_disease',state:'active_untreated'}]});
 const both=runNutrientPipeline(entries,{conditions:[{id:'hypochlorhydria',state:'documented'},{id:'celiac_disease',state:'active_untreated'}]});
 assert.deepEqual(both.map(x=>x.absorption),baseline.map(x=>x.absorption));
 assert.deepEqual(low.map(x=>x.absorption),baseline.map(x=>x.absorption));
 assert.deepEqual(celiac.map(x=>x.absorption),baseline.map(x=>x.absorption));
 const b12=both.find(x=>x.nutrientKey==='vitamin_b12');
 assert.deepEqual(b12.conditionEffects.map(x=>x.mechanismId),['gastric-acid.food-release','celiac.active.mucosal-malabsorption']);
 assert.equal(new Set(b12.conditionEffects.map(x=>x.mechanismId)).size,b12.conditionEffects.length);
 assert.ok(b12.conditionEffects.every(x=>x.quantitative===false));
});

test('Crohn states are anatomical, qualitative, and preserve the healthy numeric model',()=>{
 const entries=[
  {nutrientKey:'vitamin_b12',formId:'b12_food',origin:'animal',foodBound:true,amount:2,unit:'µg'},
  {nutrientKey:'iron',formId:'iron_nonheme',origin:'plant',amount:10,unit:'mg'},
  {nutrientKey:'vitamin_d',formId:'vitamin_d3',origin:'animal',amount:10,unit:'µg'},
  {nutrientKey:'zinc',formId:'zinc',origin:'plant',amount:4,unit:'mg'},
  {nutrientKey:'thiamine',formId:'thiamine',origin:'plant',amount:1,unit:'mg'}];
 const targets={iron:{rda:8,unit:'mg'},vitamin_d:{rda:15,unit:'µg'}};
 const baseline=runNutrientPipeline(entries,{},targets);
 for(const state of ['active_ileal','active_nonileal','remission_ileal','remission_nonileal']){
  const result=runNutrientPipeline(entries,{conditions:[{id:'crohn_disease',state}]},targets);
  assert.deepEqual(result.map(x=>x.absorption),baseline.map(x=>x.absorption),state);
  assert.equal(result.find(x=>x.nutrientKey==='thiamine').conditionEffects.length,0);
  assert.equal(result.find(x=>x.nutrientKey==='iron').targetComparison.target.rda,8);
  assert.ok(result.flatMap(x=>x.conditionEffects).every(x=>x.quantitative===false));
 }
 const ileal=runNutrientPipeline(entries,{conditions:[{id:'crohn_disease',state:'active_ileal'}]});
 const nonIleal=runNutrientPipeline(entries,{conditions:[{id:'crohn_disease',state:'active_nonileal'}]});
 assert.ok(ileal.find(x=>x.nutrientKey==='vitamin_b12').conditionEffects.some(x=>x.mechanismId==='crohn.ileal.b12-absorption-risk'));
 assert.equal(nonIleal.find(x=>x.nutrientKey==='vitamin_b12').conditionEffects.length,0);
 assert.ok(ileal.find(x=>x.nutrientKey==='iron').conditionEffects.some(x=>x.stage==='loss'));
});

test('ulcerative colitis has independent active and remission mechanisms, not a Crohn coefficient',()=>{
 const entries=[{nutrientKey:'iron',formId:'iron_heme',origin:'animal',amount:10,unit:'mg'},{nutrientKey:'vitamin_d',formId:'vitamin_d3',origin:'animal',amount:10,unit:'µg'},{nutrientKey:'folate',formId:'folate',origin:'plant',amount:100,unit:'µg'},{nutrientKey:'thiamine',formId:'thiamine',origin:'plant',amount:1,unit:'mg'}];
 const baseline=runNutrientPipeline(entries,{}),active=runNutrientPipeline(entries,{conditions:[{id:'ulcerative_colitis',state:'active'}]}),remission=runNutrientPipeline(entries,{conditions:[{id:'ulcerative_colitis',state:'remission'}]});
 assert.deepEqual(active.map(x=>x.absorption),baseline.map(x=>x.absorption));assert.deepEqual(remission.map(x=>x.absorption),baseline.map(x=>x.absorption));
 const iron=active.find(x=>x.nutrientKey==='iron');assert.deepEqual(iron.conditionEffects.map(x=>x.mechanismId),['uc.active.iron-gastrointestinal-loss']);assert.equal(iron.conditionEffects[0].stage,'loss');
 assert.ok(active.find(x=>x.nutrientKey==='vitamin_d').conditionEffects.some(x=>x.mechanismId==='uc.active.nutrient-status'));
 assert.equal(active.find(x=>x.nutrientKey==='thiamine').conditionEffects.length,0);
 assert.ok(remission.find(x=>x.nutrientKey==='iron').conditionEffects.some(x=>x.mechanismId==='uc.remission.nutrition-monitoring'));
 assert.ok(resolveConditionEffects([{id:'crohn_disease',state:'active_nonileal'}]).every(x=>!x.mechanismId.startsWith('uc.')));
});

test('Crohn/UC combinations retain distinct qualitative provenance without double counting',()=>{
 const entries=[{nutrientKey:'vitamin_b12',formId:'b12_food',origin:'animal',foodBound:true,amount:2,unit:'µg'},{nutrientKey:'iron',formId:'iron_nonheme',origin:'plant',amount:10,unit:'mg'}];
 const baseline=runNutrientPipeline(entries,{});
 for(const conditions of [
  [{id:'crohn_disease',state:'active_ileal'},{id:'hypochlorhydria',state:'documented'}],
  [{id:'crohn_disease',state:'active_ileal'},{id:'celiac_disease',state:'active_untreated'}],
  [{id:'ulcerative_colitis',state:'active'},{id:'hypochlorhydria',state:'documented'}],
  [{id:'ulcerative_colitis',state:'active'},{id:'celiac_disease',state:'active_untreated'}]
 ]){
  const result=runNutrientPipeline(entries,{conditions});assert.deepEqual(result.map(x=>x.absorption),baseline.map(x=>x.absorption));
  for(const nutrient of result)assert.equal(new Set(nutrient.conditionEffects.map(x=>x.mechanismId)).size,nutrient.conditionEffects.length);
  assert.ok(result.flatMap(x=>x.conditionEffects).every(x=>x.quantitative===false));
 }
});

test('PEI is documented, digestion-stage qualitative, and PERT does not imply numerical restoration',()=>{
 const entries=[{nutrientKey:'vitamin_a',formId:'vitamin_a',origin:'animal',amount:100,unit:'µg'},{nutrientKey:'vitamin_d',formId:'vitamin_d3',origin:'animal',amount:10,unit:'µg'},{nutrientKey:'zinc',formId:'zinc',origin:'plant',amount:4,unit:'mg'}],targets={vitamin_a:{rda:900,unit:'µg'}};
 const baseline=runNutrientPipeline(entries,{},targets);
 for(const state of ['documented_without_pert','documented_with_pert']){const result=runNutrientPipeline(entries,{conditions:[{id:'pancreatic_exocrine_insufficiency',state}]},targets);assert.deepEqual(result.map(x=>x.absorption),baseline.map(x=>x.absorption));assert.equal(result.find(x=>x.nutrientKey==='vitamin_a').conditionEffects[0].quantitative,false);assert.equal(result.find(x=>x.nutrientKey==='vitamin_a').targetComparison.target.rda,900)}
 const untreated=resolveConditionEffects([{id:'pancreatic_exocrine_insufficiency',state:'documented_without_pert'}]);assert.equal(untreated[0].stage,'digestion');assert.ok(untreated.some(x=>x.mechanismId==='pei.exocrine-fat-digestion'));
 const pert=resolveConditionEffects([{id:'pancreatic_exocrine_insufficiency',state:'documented_with_pert'}]);assert.ok(pert.some(x=>x.mechanismId==='pei.pert-clinical-context'));assert.ok(pert.every(x=>x.quantitative===false));
});

test('bariatric procedures are independent qualitative models and suppress overlapping acid provenance',()=>{
 const entries=[{nutrientKey:'iron',formId:'iron_nonheme',origin:'plant',amount:10,unit:'mg'},{nutrientKey:'vitamin_b12',formId:'b12_food',origin:'animal',foodBound:true,amount:2,unit:'µg'},{nutrientKey:'vitamin_a',formId:'vitamin_a',origin:'animal',amount:100,unit:'µg'}],targets={iron:{rda:8,unit:'mg'}};
 const baseline=runNutrientPipeline(entries,{},targets);
 for(const state of ['rygb','sleeve_gastrectomy','bpd_ds']){const result=runNutrientPipeline(entries,{conditions:[{id:'bariatric_bypass',state}]},targets);assert.deepEqual(result.map(x=>x.absorption),baseline.map(x=>x.absorption));assert.equal(result.find(x=>x.nutrientKey==='iron').targetComparison.target.rda,8);assert.ok(result.flatMap(x=>x.conditionEffects).every(x=>x.quantitative===false))}
 const rygb=resolveConditionEffects([{id:'bariatric_bypass',state:'rygb'}]),sg=resolveConditionEffects([{id:'bariatric_bypass',state:'sleeve_gastrectomy'}]),ds=resolveConditionEffects([{id:'bariatric_bypass',state:'bpd_ds'}]);
 assert.ok(rygb.some(x=>x.mechanismId==='rygb.iron-gastric-duodenal-handling'));assert.ok(sg.some(x=>x.mechanismId==='sg.iron-gastric-processing'));assert.ok(ds.some(x=>x.mechanismId==='bpd_ds.fat-digestion-and-absorption'));assert.ok(!ds.some(x=>x.mechanismId.startsWith('rygb.')));
 for(const surgery of ['rygb','sleeve_gastrectomy']){const both=runNutrientPipeline(entries,{conditions:[{id:'hypochlorhydria',state:'documented'},{id:'bariatric_bypass',state:surgery}]});assert.deepEqual(both.map(x=>x.absorption),baseline.map(x=>x.absorption));assert.ok(!both.find(x=>x.nutrientKey==='iron').conditionEffects.some(x=>x.mechanismId==='gastric-acid.nonheme-solubilization'))}
});

test('new-condition combinations retain qualitative provenance without multiplication',()=>{
 const entries=[{nutrientKey:'vitamin_b12',formId:'b12_food',origin:'animal',foodBound:true,amount:2,unit:'µg'},{nutrientKey:'vitamin_a',formId:'vitamin_a',origin:'animal',amount:100,unit:'µg'}],baseline=runNutrientPipeline(entries,{});
 for(const conditions of [[{id:'pancreatic_exocrine_insufficiency',state:'documented_without_pert'},{id:'celiac_disease',state:'active_untreated'}],[{id:'pancreatic_exocrine_insufficiency',state:'documented_without_pert'},{id:'crohn_disease',state:'active_ileal'}],[{id:'pancreatic_exocrine_insufficiency',state:'documented_without_pert'},{id:'ulcerative_colitis',state:'active'}],[{id:'bariatric_bypass',state:'rygb'},{id:'celiac_disease',state:'active_untreated'}],[{id:'bariatric_bypass',state:'sleeve_gastrectomy'},{id:'celiac_disease',state:'active_untreated'}],[{id:'bariatric_bypass',state:'bpd_ds'},{id:'celiac_disease',state:'active_untreated'}]]){const result=runNutrientPipeline(entries,{conditions});assert.deepEqual(result.map(x=>x.absorption),baseline.map(x=>x.absorption));assert.ok(result.flatMap(x=>x.conditionEffects).every(x=>x.quantitative===false));for(const nutrient of result)assert.equal(new Set(nutrient.conditionEffects.map(x=>x.mechanismId)).size,nutrient.conditionEffects.length)}
});

test('gastrectomy separates partial and total qualitative anatomy and suppresses acid overlap',()=>{
 const entries=[{nutrientKey:'vitamin_b12',formId:'b12_food',origin:'animal',foodBound:true,amount:2,unit:'µg'},{nutrientKey:'vitamin_b12',formId:'b12_free',origin:'supplement',foodBound:false,amount:2,unit:'µg'},{nutrientKey:'iron',formId:'iron_nonheme',origin:'plant',amount:8,unit:'mg'},{nutrientKey:'iron',formId:'iron_heme',origin:'animal',amount:4,unit:'mg'},{nutrientKey:'thiamine',formId:'thiamine',origin:'plant',amount:1,unit:'mg'}],targets={iron:{rda:8,unit:'mg'}};
 const baseline=runNutrientPipeline(entries,{},targets);
 for(const state of ['partial','total']){const result=runNutrientPipeline(entries,{conditions:[{id:'gastrectomy',state}]},targets);assert.deepEqual(result.map(x=>x.absorption),baseline.map(x=>x.absorption));assert.equal(result.find(x=>x.nutrientKey==='iron').targetComparison.target.rda,8);assert.equal(result.find(x=>x.nutrientKey==='thiamine').conditionEffects.length,0);assert.ok(result.flatMap(x=>x.conditionEffects).every(x=>x.quantitative===false));}
 const partial=resolveConditionEffects([{id:'gastrectomy',state:'partial'}]),total=resolveConditionEffects([{id:'gastrectomy',state:'total'}]);assert.ok(partial.some(x=>x.mechanismId==='gastrectomy.partial.b12-gastric-processing'));assert.ok(total.some(x=>x.mechanismId==='gastrectomy.total.b12-intrinsic-factor-loss'));assert.notDeepEqual(partial.map(x=>x.mechanismId),total.map(x=>x.mechanismId));
 const overlap=runNutrientPipeline(entries,{conditions:[{id:'hypochlorhydria',state:'documented'},{id:'gastrectomy',state:'total'}]});for(const nutrient of overlap)assert.ok(!nutrient.conditionEffects.some(x=>x.mechanismId.startsWith('gastric-acid.')));
 const surgicalConflict=resolveConditionEffects([{id:'gastrectomy',state:'total'},{id:'bariatric_bypass',state:'rygb'}]);assert.ok(surgicalConflict.every(x=>x.conditionId!=='bariatric_bypass'));
});

test('documented ileal resection is qualitative, gates anatomy, and replaces overlapping Crohn B12 notice',()=>{
 const entries=[{nutrientKey:'vitamin_b12',formId:'b12_food',origin:'animal',foodBound:true,amount:2,unit:'µg'},{nutrientKey:'vitamin_a',formId:'vitamin_a',origin:'animal',amount:100,unit:'µg'},{nutrientKey:'vitamin_d',formId:'vitamin_d3',origin:'animal',amount:10,unit:'µg'},{nutrientKey:'vitamin_e',formId:'vitamin_e',origin:'plant',amount:2,unit:'mg'},{nutrientKey:'vitamin_k',formId:'vitamin_k',origin:'plant',amount:80,unit:'µg'},{nutrientKey:'thiamine',formId:'thiamine',origin:'plant',amount:1,unit:'mg'}],targets={vitamin_d:{rda:15,unit:'µg'}};
 const baseline=runNutrientPipeline(entries,{},targets),resection=runNutrientPipeline(entries,{conditions:[{id:'ileal_resection',state:'documented_resection'}]},targets);assert.deepEqual(resection.map(x=>x.absorption),baseline.map(x=>x.absorption));assert.equal(resection.find(x=>x.nutrientKey==='thiamine').conditionEffects.length,0);assert.equal(resection.find(x=>x.nutrientKey==='vitamin_d').targetComparison.target.rda,15);assert.ok(resection.flatMap(x=>x.conditionEffects).every(x=>x.quantitative===false));
 for(const nutrient of ['vitamin_a','vitamin_d','vitamin_e','vitamin_k'])assert.ok(resection.find(x=>x.nutrientKey===nutrient).conditionEffects.some(x=>x.mechanismId==='ileal-resection.bile-acid-fat-handling'));
 assert.equal(resolveConditionEffects([{id:'ileal_resection',state:'unknown'}]).length,0);
 const combined=runNutrientPipeline(entries,{conditions:[{id:'crohn_disease',state:'active_ileal'},{id:'ileal_resection',state:'documented_resection'},{id:'celiac_disease',state:'active_untreated'},{id:'hypochlorhydria',state:'documented'}]});const b12=combined.find(x=>x.nutrientKey==='vitamin_b12');assert.ok(b12.conditionEffects.some(x=>x.mechanismId==='ileal-resection.b12-terminal-ileum-handling'));assert.ok(!b12.conditionEffects.some(x=>x.mechanismId==='crohn.ileal.b12-absorption-risk'));assert.ok(b12.conditionEffects.some(x=>x.mechanismId==='celiac.active.mucosal-malabsorption'));assert.ok(b12.conditionEffects.some(x=>x.mechanismId==='gastric-acid.food-release'));
});
