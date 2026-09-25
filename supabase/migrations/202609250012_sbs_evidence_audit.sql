-- SBS is anatomy- and adaptation-dependent. These records intentionally expose
-- mechanisms while disabling candidate meal-level coefficients (class F).
alter table condition_mechanisms drop constraint condition_mechanisms_model_stage_check;
alter table condition_mechanisms add constraint condition_mechanisms_model_stage_check check (model_stage in ('digestion','absorption','loss','requirement','conversion','utilization','turnover','storage','systemic','intracellular','clinical_management'));
alter table condition_nutrient_effects drop constraint condition_nutrient_effects_effect_type_check;
alter table condition_nutrient_effects add constraint condition_nutrient_effects_effect_type_check check (effect_type in ('impaired_digestion','reduced_absorption','increased_absorption','increased_requirement','increased_loss_excretion','impaired_conversion','impaired_utilization','increased_turnover','reduced_storage','altered_systemic_availability','altered_intracellular_availability','altered_absorption_context','altered_renal_handling','dialysis_loss_context','clinical_management_context','clinical_target_context','altered_conversion_storage_transport','impaired_bile_mediated_digestion','loss_and_clinical_management_context'));
insert into evidence_sources(id,title,organization,url,publication_year,source_type,population,notes) values
 ('espens-chronic-intestinal-failure-2023','ESPEN guideline on chronic intestinal failure in adults - Update 2023','ESPEN','https://doi.org/10.1016/j.clnu.2023.10.010',2023,'clinical-guideline','adults with chronic intestinal failure including SBS','Anatomy, colon continuity, adaptation, oral/enteral/parenteral support, fluid losses, bile-acid handling, B12 and micronutrient monitoring; prescriptions and prevalence are not absorption fractions.'),
 ('aga-sbs-update-2022','AGA Clinical Practice Update on Management of Short Bowel Syndrome','American Gastroenterological Association','https://doi.org/10.1016/j.cgh.2022.05.032',2022,'clinical-guideline','adults with SBS','Best-practice advice emphasizes anatomy, adaptation and multidisciplinary intestinal rehabilitation; it does not supply nutrient-specific meal coefficients.')
on conflict(id) do nothing;

update clinical_conditions set description='Clinician-documented SBS; anatomy, colon continuity and intestinal-failure context are explicit.',evidence_id='espens-chronic-intestinal-failure-2023',input_schema='["state: jejunostomy_no_colon|jejunocolonic_no_terminal_ileum|jejunoileocolonic_terminal_ileum|intestinal_failure_nutrition_support"]'::jsonb where id='short_bowel_syndrome';

insert into condition_mechanisms(id,condition_id,physiological_process,model_stage,evidence_id,limitation) values
 ('sbs.surface-area.micronutrient-absorption','short_bowel_syndrome','Anatomy-dependent absorptive surface','absorption','espens-chronic-intestinal-failure-2023','No remaining-length coefficient.'),
 ('sbs.no-terminal-ileum.b12-uptake','short_bowel_syndrome','Terminal-ileal intrinsic-factor B12 uptake','absorption','espens-chronic-intestinal-failure-2023','No ordinary-meal fraction.'),
 ('sbs.ileal-loss.bile-fat-handling','short_bowel_syndrome','Bile-acid reclamation and fat handling','digestion','espens-chronic-intestinal-failure-2023','No A/D/E/K multiplier.'),
 ('sbs.colon-continuity.fluid-energy-salvage','short_bowel_syndrome','Colon fluid and energy salvage','absorption','espens-chronic-intestinal-failure-2023','No patient-specific coefficient.'),
 ('sbs.no-colon.fluid-magnesium-loss','short_bowel_syndrome','No-colon stomal losses','loss','espens-chronic-intestinal-failure-2023','No fixed loss.'),
 ('sbs.adaptation-time-context','short_bowel_syndrome','Post-resection adaptation','systemic','aga-sbs-update-2022','No time correction factor.'),
 ('sbs.intestinal-failure.nutrition-support','short_bowel_syndrome','Specialist nutrition support','clinical_management','espens-chronic-intestinal-failure-2023','No prescription or absorption coefficient.')
on conflict(id) do nothing;

insert into model_assumptions(model_key,description,formula,parameters_json,conditions_json,limitations,status,evidence_id,classification,confidence,enabled) values
 ('sbs.surface-area.absorption.v1','SBS remaining-length nutrient absorption candidate',null,'{}','{}','Disabled: no transferable human equation.','unsupported','project-audit-2026','F','low',false),
 ('sbs.b12.absorption.v1','SBS terminal-ileum B12 fraction candidate',null,'{}','{}','Disabled: no transferable human equation.','unsupported','project-audit-2026','F','moderate',false),
 ('sbs.fat-soluble-vitamin.absorption.v1','SBS common A/D/E/K fraction candidate',null,'{}','{}','Disabled: no transferable human equation.','unsupported','project-audit-2026','F','low',false),
 ('sbs.stomal-loss.v1','SBS fixed stomal electrolyte loss candidate',null,'{}','{}','Disabled: no transferable human equation.','unsupported','project-audit-2026','F','low',false),
 ('sbs.adaptation.v1','SBS time-since-surgery adaptation factor candidate',null,'{}','{}','Disabled: no transferable human equation.','unsupported','project-audit-2026','F','low',false)
on conflict(model_key) do update set classification=excluded.classification,confidence=excluded.confidence,enabled=false;

insert into condition_nutrient_effects(mechanism_id,nutrient_id,effect_type,quantitative_model_key,coefficient_json,conditions_json,classification,confidence,evidence_id,limitation)
select v.mechanism_id,n.id,v.effect_type,null,null,v.conditions::jsonb,'F',v.confidence,v.evidence_id,v.limitation from (values
 ('sbs.surface-area.micronutrient-absorption','iron','reduced_absorption','{"anatomy":"documented_sbs"}','low','espens-chronic-intestinal-failure-2023','Class F candidate disabled; length alone is not a transferable fraction.'),
 ('sbs.surface-area.micronutrient-absorption','calcium','reduced_absorption','{"anatomy":"documented_sbs"}','low','espens-chronic-intestinal-failure-2023','No meal coefficient.'),
 ('sbs.surface-area.micronutrient-absorption','magnesium','reduced_absorption','{"anatomy":"documented_sbs"}','low','espens-chronic-intestinal-failure-2023','No meal coefficient.'),
 ('sbs.surface-area.micronutrient-absorption','zinc','reduced_absorption','{"anatomy":"documented_sbs"}','low','espens-chronic-intestinal-failure-2023','No meal coefficient.'),
 ('sbs.surface-area.micronutrient-absorption','folate','reduced_absorption','{"anatomy":"documented_sbs"}','low','espens-chronic-intestinal-failure-2023','No meal coefficient.'),
 ('sbs.no-terminal-ileum.b12-uptake','vitamin_b12','reduced_absorption','{"terminal_ileum":false}','moderate','espens-chronic-intestinal-failure-2023','No ordinary-meal B12 absorption fraction.'),
 ('sbs.ileal-loss.bile-fat-handling','vitamin_a','impaired_digestion','{"terminal_ileum":false}','moderate','espens-chronic-intestinal-failure-2023','No shared fat-soluble-vitamin multiplier.'),
 ('sbs.ileal-loss.bile-fat-handling','vitamin_d','impaired_digestion','{"terminal_ileum":false}','moderate','espens-chronic-intestinal-failure-2023','No shared fat-soluble-vitamin multiplier.'),
 ('sbs.ileal-loss.bile-fat-handling','vitamin_e','impaired_digestion','{"terminal_ileum":false}','moderate','espens-chronic-intestinal-failure-2023','No shared fat-soluble-vitamin multiplier.'),
 ('sbs.ileal-loss.bile-fat-handling','vitamin_k','impaired_digestion','{"terminal_ileum":false}','moderate','espens-chronic-intestinal-failure-2023','No shared fat-soluble-vitamin multiplier.')
) as v(mechanism_id,nutrient_key,effect_type,conditions,confidence,evidence_id,limitation)
join nutrients n on n.canonical_key=v.nutrient_key
on conflict(mechanism_id,nutrient_id,effect_type) do nothing;
