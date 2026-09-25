import test from 'node:test'; import assert from 'node:assert/strict'; import { readFileSync } from 'node:fs';
const sql=readFileSync('supabase/migrations/202609250003_scientific_audit_and_integrity.sql','utf8');
const required=['zip4.saturation.v1','zinc.copper.drain.v1','vitamin_d.magnesium.drain.v1','ttfd.magnesium.drain.v1','ttfd.potassium.drain.v1','methylation.stoichiometry.v1','intracellular.conversion.v1','systemic_pool.conversion.v1','active_form.conversion.v1','pathology.malabsorption.generic.v1','iron.heme.absorption_range.v1','iron.nonheme.absorption_range.v1','b12.food_bound.absorption_range.v1','b12.free.absorption_range.v1','thiamine.energy.optimization.v1','pral.remer_manz.v1'];
test('every audited important model has a unique classified canonical row',()=>{for(const key of required)assert.equal(sql.match(new RegExp(`'${key.replaceAll('.','\\.')}'`,'g'))?.length,1,key);assert.match(sql,/classification in \('A','B','C','D','E','F'\)/);});
test('database prevents unsupported models from being enabled',()=>assert.match(sql,/classification <> 'F' or enabled = false/));

test('hypochlorhydria and celiac audit records explicitly disable unsupported condition coefficients',()=>{
 const conditionSql=readFileSync('supabase/migrations/202609250008_hypochlorhydria_celiac_evidence_audit.sql','utf8');
 for(const key of ['b12.food_bound.pii_acid_suppression.v1','iron.nonheme.hypochlorhydria.v1','celiac.active.mucosal-malabsorption.v1','celiac.treated.recovery.v1'])assert.match(conditionSql,new RegExp(`'${key.replaceAll('.','\\.')}'`));
 assert.match(conditionSql,/,'F','(?:low|moderate)',false\)/);
});

test('Crohn and ulcerative-colitis audit records independently disable unsupported models',()=>{const conditionSql=readFileSync('supabase/migrations/202609250009_crohn_uc_evidence_audit.sql','utf8');for(const key of ['crohn.active.mucosal-absorption.v1','crohn.ileal.b12-absorption.v1','crohn.active.iron-loss.v1','crohn.vitamin-d-absorption.v1','uc.active.iron-loss.v1','uc.vitamin-d-absorption.v1','uc.micronutrient-status.v1'])assert.match(conditionSql,new RegExp(`'${key.replaceAll('.','\\.')}'`));assert.match(conditionSql,/crohn\.ileal\.b12-absorption-risk/);assert.match(conditionSql,/uc\.active\.iron-gastrointestinal-loss/);assert.match(conditionSql,/,'F','(?:low|moderate)',false\)/);});
test('PEI and bariatric audit records explicitly disable untransferable coefficients',()=>{const conditionSql=readFileSync('supabase/migrations/202609250010_pei_bariatric_evidence_audit.sql','utf8');for(const key of ['pei.fat-digestion.v1','pei.pert-nutrient-restoration.v1','pei.micronutrient-status.v1','rygb.micronutrient-handling.v1','sg.micronutrient-handling.v1','bpd_ds.micronutrient-handling.v1'])assert.match(conditionSql,new RegExp(`'${key.replaceAll('.','\\.')}'`));assert.match(conditionSql,/,'F','(?:low|moderate)',false\)/);assert.match(conditionSql,/not converted into an absorption coefficient/);});

test('SBS, CKD, and liver ledgers disable every candidate numerical model',()=>{
 for(const [file,keys] of [
  ['202609250012_sbs_evidence_audit.sql',['sbs.surface-area.absorption.v1','sbs.b12.absorption.v1','sbs.fat-soluble-vitamin.absorption.v1','sbs.stomal-loss.v1','sbs.adaptation.v1']],
  ['202609250013_ckd_evidence_audit.sql',['ckd.vitamin-d-activation.v1','ckd.mineral-excretion.v1','ckd.iron-absorption.v1','ckd.dialysis-micronutrient-loss.v1','ckd.clinical-target-multiplier.v1']],
  ['202609250014_liver_evidence_audit.sql',['liver.generic-absorption.v1','liver.vitamin-conversion.v1','liver.cholestasis-fat-soluble.v1','liver.iron-status.v1','liver.trace-mineral-status.v1']]
 ]){
  const migration=readFileSync(`supabase/migrations/${file}`,'utf8');
  for(const key of keys){assert.equal(migration.match(new RegExp(`'${key.replaceAll('.','\\.')}'`,'g'))?.length,1,key);}
  assert.equal((migration.match(/,'F','(?:low|moderate)',false\)/g)??[]).length,keys.length);
  assert.match(migration,/condition_nutrient_effects/);assert.doesNotMatch(migration,/insert into nutrient_effect_models|insert into model_registry/);
 }
});

test('CKD and liver evidence stages cannot masquerade as generic intestinal absorption',()=>{
 const ckd=readFileSync('supabase/migrations/202609250013_ckd_evidence_audit.sql','utf8');
 assert.match(ckd,/Renal vitamin-D activation','conversion'/);assert.match(ckd,/Renal mineral handling','loss'/);assert.match(ckd,/Anemia and iron regulation','systemic'/);
 const liver=readFileSync('supabase/migrations/202609250014_liver_evidence_audit.sql','utf8');
 assert.match(liver,/Hepatic conversion, storage and transport','conversion'/);assert.match(liver,/Cholestatic bile-mediated fat handling','digestion'/);
});
