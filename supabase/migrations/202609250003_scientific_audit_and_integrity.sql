-- Scientific audit and integrity hardening. This migration is intentionally additive.
alter table model_assumptions
  add column classification text,
  add column confidence text,
  add column conditions_json jsonb not null default '{}'::jsonb,
  add column enabled boolean not null default false;
alter table model_assumptions add constraint model_assumptions_classification_check check (classification in ('A','B','C','D','E','F'));
alter table model_assumptions add constraint model_assumptions_confidence_check check (confidence in ('high','moderate','low'));
alter table model_assumptions add constraint unsupported_models_disabled check (classification <> 'F' or enabled = false);
alter table target_model_rules add column formula text not null default 'unspecified';
alter table target_model_rules add column classification text not null default 'E' check (classification in ('A','B','C','D','E','F'));
alter table target_model_rules add column confidence text not null default 'low' check (confidence in ('high','moderate','low'));
alter table target_model_rules add column limitations text not null default 'Not specified';
alter table user_target_overrides add column custom_min numeric check(custom_min >= 0);
alter table user_target_overrides add column custom_max numeric check(custom_max >= 0);
alter table user_target_overrides alter column custom_value drop not null;
alter table user_target_overrides add constraint override_has_value check (custom_value is not null or custom_min is not null or custom_max is not null);
alter table user_target_overrides add constraint override_range_order check (custom_min is null or custom_max is null or custom_min <= custom_max);

insert into evidence_sources(id,title,organization,url,publication_year,source_type,population,notes) values
 ('hurrell-egli-2010','Iron bioavailability and dietary reference values','American Journal of Clinical Nutrition','https://doi.org/10.3945/ajcn.2010.28674F',2010,'review','humans','Ranges are population-level and context dependent.'),
 ('iom-b12-dri','Dietary Reference Intakes: Vitamin B12','National Academies','https://www.ncbi.nlm.nih.gov/books/NBK114302/',1998,'guideline','US/Canadian population','Food release and intrinsic-factor limitations must remain distinct.'),
 ('usda-retention-2007','USDA Table of Nutrient Retention Factors, Release 6','USDA','https://www.ars.usda.gov/ARSUserFiles/80400525/Data/retn/retn06.pdf',2007,'database','foods and preparation methods','Retention factors are food/method/nutrient specific.'),
 ('remer-manz-1995','Potential renal acid load of foods','Journal of the American Dietetic Association','https://doi.org/10.1016/S0002-8223(95)00219-7',1995,'human-study','healthy adults','PRAL is an estimate, not blood pH.'),
 ('project-audit-2026','Bio Calculator scientific model audit','Bio Calculator',null,2026,'model-assumption','not applicable','Unsupported coefficients remain explicitly disabled.')
on conflict(id) do nothing;

insert into model_assumptions(model_key,description,formula,parameters_json,conditions_json,limitations,status,evidence_id,classification,confidence,enabled) values
 ('iron.heme.absorption_range.v1','Heme iron absorption range','gross_heme * [min,max]','{"min":0.15,"max":0.35}','{"form":"heme","origin":"food"}','Population estimate; not an individual measurement.','model_assumption','hurrell-egli-2010','D','low',true),
 ('iron.nonheme.absorption_range.v1','Non-heme iron absorption range','gross_nonheme * [min,max]','{"min":0.03,"max":0.12}','{"form":"nonheme","origin":"food"}','Iron status and all meal modifiers are not individualized.','model_assumption','hurrell-egli-2010','D','low',true),
 ('iron.nonheme.low_acid.v1','Low-acid sensitivity penalty','nonheme_absorbed * multiplier','{"multiplier":0.70}','{"gastric_acid":["low","absent"],"form":"nonheme"}','Heuristic sensitivity assumption; heme excluded.','heuristic','project-audit-2026','E','low',true),
 ('b12.food_bound.absorption_range.v1','Food-bound B12 bounded absorption','gross_food_bound * [min,max]','{"min":0.30,"max":0.60}','{"food_bound":true}','Does not estimate intrinsic-factor status.','model_assumption','iom-b12-dri','D','low',true),
 ('b12.free.absorption_range.v1','Free/crystalline B12 bounded absorption','gross_free * [min,max]','{"min":0.30,"max":0.60}','{"food_bound":false,"dose_scope":"demo"}','Not valid for high-dose passive diffusion.','model_assumption','iom-b12-dri','D','low',true),
 ('b12.food_bound.low_acid.v1','Food-bound gastric release sensitivity','food_bound_absorbed * multiplier','{"multiplier":0.65}','{"gastric_acid":["low","absent"],"food_bound":true}','Heuristic; free/crystalline B12 excluded.','heuristic','project-audit-2026','E','low',true),
 ('thiamine.energy.optimization.v1','Energy-based project target','energy_kcal / 1000 * [min,max]','{"min_mg_per_1000_kcal":0.60,"max_mg_per_1000_kcal":0.68}','{"target_kind":"project_model"}','Not an official requirement.','heuristic','project-audit-2026','E','low',true),
 ('pral.remer_manz.v1','Potential renal acid load equation','0.49*protein_g + 0.037*phosphorus_mg - 0.021*potassium_mg - 0.026*magnesium_mg - 0.013*calcium_mg','{"protein":0.49,"phosphorus":0.037,"potassium":-0.021,"magnesium":-0.026,"calcium":-0.013}','{}','Estimates renal acid load, not blood pH.','model_assumption','remer-manz-1995','C','moderate',true),
 ('zip4.saturation.v1','ZIP4 saturation coefficient',null,'{}','{}','No validated meal-level coefficient.','unsupported','project-audit-2026','F','low',false),
 ('zinc.copper.drain.v1','Zinc to copper drain',null,'{}','{}','No defensible per-meal coefficient.','unsupported','project-audit-2026','F','low',false),
 ('vitamin_d.magnesium.drain.v1','Vitamin D to magnesium drain',null,'{}','{}','Metabolic involvement does not establish a drain coefficient.','unsupported','project-audit-2026','F','low',false),
 ('ttfd.magnesium.drain.v1','TTFD to magnesium drain',null,'{}','{}','No defensible quantitative evidence.','unsupported','project-audit-2026','F','low',false),
 ('ttfd.potassium.drain.v1','TTFD to potassium drain',null,'{}','{}','No defensible quantitative evidence.','unsupported','project-audit-2026','F','low',false),
 ('methylation.stoichiometry.v1','Dietary methylation stoichiometry',null,'{}','{}','Pathway stoichiometry is not dietary depletion.','unsupported','project-audit-2026','F','low',false),
 ('intracellular.conversion.v1','Generic intracellular conversion',null,'{}','{}','No nutrient-independent conversion exists.','unsupported','project-audit-2026','F','low',false),
 ('systemic_pool.conversion.v1','Generic systemic pool conversion',null,'{}','{}','Patient-specific distribution cannot be inferred.','unsupported','project-audit-2026','F','low',false),
 ('active_form.conversion.v1','Generic active-form conversion',null,'{}','{}','Nutrient- and patient-specific metabolism.','unsupported','project-audit-2026','F','low',false),
 ('pathology.malabsorption.generic.v1','Generic pathology multiplier',null,'{}','{}','Requires diagnosis-specific evidence and clinical data.','unsupported','project-audit-2026','F','low',false)
on conflict(model_key) do nothing;
