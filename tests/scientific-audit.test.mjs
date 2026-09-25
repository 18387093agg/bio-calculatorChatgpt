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
