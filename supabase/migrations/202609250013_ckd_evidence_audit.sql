-- CKD mechanisms are staged as renal handling, conversion, systemic status, or
-- clinical context. No row authorizes an intestinal absorption penalty.
insert into evidence_sources(id,title,organization,url,publication_year,source_type,population,notes) values
 ('kdigo-ckd-mbd-2017','KDIGO 2017 Clinical Practice Guideline Update for CKD-MBD','KDIGO','https://kdigo.org/guidelines/ckd-mbd/',2017,'clinical-guideline','adults with CKD including dialysis','Vitamin-D activation and mineral handling require stage, serial labs and treatment context; targets are not dietary absorption fractions.'),
 ('kdigo-anemia-2012','KDIGO Clinical Practice Guideline for Anemia in CKD','KDIGO','https://kdigo.org/guidelines/anemia-in-ckd/',2012,'clinical-guideline','adults with CKD','Iron assessment and treatment account for erythropoiesis, inflammation and losses; guidance does not define meal absorption.'),
 ('espens-kidney-nutrition-2021','ESPEN guideline on clinical nutrition in hospitalized patients with kidney disease','ESPEN','https://doi.org/10.1016/j.clnu.2021.01.028',2021,'clinical-guideline','adults with kidney disease and kidney replacement therapy','Dialysis losses vary by treatment; no universal daily micronutrient-loss coefficient.'),
 ('kdoqi-nutrition-ckd-2020','KDOQI Clinical Practice Guideline for Nutrition in CKD: 2020 Update','National Kidney Foundation','https://doi.org/10.1053/j.ajkd.2020.05.006',2020,'clinical-guideline','adults with CKD','Clinical protein/energy and electrolyte guidance is separate from population reference values and absorption.')
on conflict(id) do nothing;

update clinical_conditions set description='Stage and dialysis context are explicit; renal handling is not intestinal absorption.',evidence_id='kdigo-ckd-mbd-2017',input_schema='["state: stage_1_2_nondialysis|stage_3_5_nondialysis|hemodialysis|peritoneal_dialysis"]'::jsonb where id='chronic_kidney_disease';

insert into condition_mechanisms(id,condition_id,physiological_process,model_stage,evidence_id,limitation) values
 ('ckd.renal-vitamin-d-activation','chronic_kidney_disease','Renal vitamin-D activation','conversion','kdigo-ckd-mbd-2017','No dietary-to-calcitriol coefficient.'),
 ('ckd.mbd.renal-mineral-handling','chronic_kidney_disease','Renal mineral handling','loss','kdigo-ckd-mbd-2017','No fixed excretion.'),
 ('ckd.anemia.iron-systemic-context','chronic_kidney_disease','Anemia and iron regulation','systemic','kdigo-anemia-2012','Not intestinal absorption.'),
 ('ckd.dialysis.water-soluble-loss-context','chronic_kidney_disease','Dialysis micronutrient losses','loss','espens-kidney-nutrition-2021','No fixed loss coefficient.'),
 ('ckd.early.monitoring-context','chronic_kidney_disease','Early CKD monitoring context','clinical_management','kdigo-ckd-mbd-2017','No abnormal physiology inferred.'),
 ('ckd.protein-energy.clinical-target-context','chronic_kidney_disease','Stage-specific protein and energy guidance','clinical_management','kdoqi-nutrition-ckd-2020','No official-reference change or treatment target.')
on conflict(id) do nothing;

insert into model_assumptions(model_key,description,formula,parameters_json,conditions_json,limitations,status,evidence_id,classification,confidence,enabled) values
 ('ckd.vitamin-d-activation.v1','CKD dietary vitamin D to calcitriol candidate',null,'{}','{}','Disabled: no transferable human equation.','unsupported','project-audit-2026','F','low',false),
 ('ckd.mineral-excretion.v1','CKD fixed mineral excretion candidate',null,'{}','{}','Disabled: no transferable human equation.','unsupported','project-audit-2026','F','low',false),
 ('ckd.iron-absorption.v1','CKD iron absorption candidate',null,'{}','{}','Disabled: no transferable human equation.','unsupported','project-audit-2026','F','low',false),
 ('ckd.dialysis-micronutrient-loss.v1','Dialysis fixed micronutrient loss candidate',null,'{}','{}','Disabled: no transferable human equation.','unsupported','project-audit-2026','F','low',false),
 ('ckd.clinical-target-multiplier.v1','CKD generic clinical target multiplier',null,'{}','{}','Disabled: no transferable human equation.','unsupported','project-audit-2026','F','low',false)
on conflict(model_key) do update set classification=excluded.classification,confidence=excluded.confidence,enabled=false;

insert into condition_nutrient_effects(mechanism_id,nutrient_id,effect_type,quantitative_model_key,coefficient_json,conditions_json,classification,confidence,evidence_id,limitation)
select v.mechanism_id,n.id,v.effect_type,null,null,v.conditions::jsonb,'F',v.confidence,v.evidence_id,v.limitation from (values
 ('ckd.renal-vitamin-d-activation','vitamin_d','impaired_conversion','{"ckd":"stage_3_5_or_dialysis"}','high','kdigo-ckd-mbd-2017','Conversion only; no intestinal coefficient.'),
 ('ckd.mbd.renal-mineral-handling','calcium','altered_renal_handling','{"ckd":"stage_3_5_or_dialysis"}','high','kdigo-ckd-mbd-2017','Lab- and treatment-dependent.'),
 ('ckd.mbd.renal-mineral-handling','phosphorus','altered_renal_handling','{"ckd":"stage_3_5_or_dialysis"}','high','kdigo-ckd-mbd-2017','Restriction is not absorption.'),
 ('ckd.mbd.renal-mineral-handling','magnesium','altered_renal_handling','{"ckd":"stage_3_5_or_dialysis"}','high','kdigo-ckd-mbd-2017','No fixed excretion.'),
 ('ckd.mbd.renal-mineral-handling','potassium','altered_renal_handling','{"ckd":"stage_3_5_or_dialysis"}','high','kdigo-ckd-mbd-2017','No fixed excretion or target.'),
 ('ckd.anemia.iron-systemic-context','iron','altered_systemic_availability','{"ckd":"stage_3_5_or_dialysis"}','high','kdigo-anemia-2012','Not intestinal absorption.'),
 ('ckd.dialysis.water-soluble-loss-context','folate','dialysis_loss_context','{"dialysis":true}','low','espens-kidney-nutrition-2021','Class F fixed loss disabled.'),
 ('ckd.dialysis.water-soluble-loss-context','vitamin_b12','dialysis_loss_context','{"dialysis":true}','low','espens-kidney-nutrition-2021','Class F fixed loss disabled.'),
 ('ckd.dialysis.water-soluble-loss-context','zinc','dialysis_loss_context','{"dialysis":true}','low','espens-kidney-nutrition-2021','Class F fixed loss disabled.')
) as v(mechanism_id,nutrient_key,effect_type,conditions,confidence,evidence_id,limitation)
join nutrients n on n.canonical_key=v.nutrient_key
on conflict(mechanism_id,nutrient_id,effect_type) do nothing;
