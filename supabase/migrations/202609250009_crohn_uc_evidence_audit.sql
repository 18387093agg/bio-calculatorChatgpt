-- Evidence audit for Crohn's disease and ulcerative colitis. These are deliberately
-- disabled qualitative records: status/deficiency, anemia, and serum endpoints are not
-- converted into food-intake absorption, loss, or requirement coefficients.
insert into evidence_sources(id,title,organization,url,publication_year,source_type,population,notes) values
 ('ecco-iron-anemia-2015','European Consensus on the Diagnosis and Management of Iron Deficiency and Anaemia in Inflammatory Bowel Diseases','European Crohn''s and Colitis Organisation','https://doi.org/10.1093/ecco-jcc/jjv137',2015,'guideline','people with Crohn''s disease or ulcerative colitis','Recognizes blood loss, inflammation/hepcidin-mediated restriction, and reduced intake/absorption as distinct contributors to iron deficiency/anemia. It does not provide an individual daily blood-loss volume or dietary heme/non-heme absorption coefficient.'),
 ('crohn-b12-ileal-review-2014','Vitamin B12 deficiency in inflammatory bowel disease: prevalence, risk factors, and signs of functional deficiency','Inflammatory Bowel Diseases','https://pubmed.ncbi.nlm.nih.gov/24739632/',2014,'observational-study','adults with inflammatory bowel disease','Associates Crohn''s ileal disease/resection with B12 deficiency risk. Serum/deficiency endpoints do not quantify absorption from a defined oral food dose; resection is outside this run.'),
 ('crohn-nutrition-review-2020','Nutritional management of Crohn''s disease','Nutrients','https://doi.org/10.3390/nu12072065',2020,'review','people with Crohn''s disease','Summarizes activity-, location-, treatment-, intake-, and surgery-dependent nutrient risk. It does not establish nutrient/form-specific transferable meal absorption fractions.'),
 ('uc-nutrition-review-2021','Nutritional status and diet in ulcerative colitis','Nutrients','https://doi.org/10.3390/nu13093148',2021,'review','adults with ulcerative colitis','Summarizes micronutrient status, dietary intake, inflammatory activity, and treatment associations. Serum/status associations are not oral absorption coefficients.'),
 ('aga-ibd-nutrition-2024','AGA Clinical Practice Update on Diet and Nutritional Therapies in Patients With Inflammatory Bowel Disease','American Gastroenterological Association','https://doi.org/10.1053/j.gastro.2024.01.046',2024,'guideline','people with inflammatory bowel disease','Supports individualized assessment by disease activity, location, anatomy, diet, and treatment; it supplies no universal nutrient multiplier.')
on conflict(id) do nothing;

-- Explicitly audit every candidate numerical model as unsupported, preserving endpoint and context.
insert into model_assumptions(model_key,description,formula,parameters_json,conditions_json,limitations,status,evidence_id,classification,confidence,enabled) values
 ('crohn.active.mucosal-absorption.v1','Active Crohn''s oral nutrient absorption',null,'{}','{"condition":"crohn_disease","states":["active_ileal","active_nonileal"],"nutrients":["iron","vitamin_d","folate","calcium","magnesium","zinc","vitamin_a","vitamin_e","vitamin_k"],"endpoint":"status/intake/heterogeneous studies"}','No human nutrient/form-specific oral absorption fraction compatible with the healthy meal model was identified. Deficiency prevalence and serum values are not coefficients.','unsupported','crohn-nutrition-review-2020','F','low',false),
 ('crohn.ileal.b12-absorption.v1','Crohn''s terminal-ileal B12 absorption',null,'{}','{"condition":"crohn_disease","states":["active_ileal","remission_ileal"],"nutrient":"vitamin_b12","form":"food_bound_or_unspecified","anatomy":"ileal involvement without resection","endpoint":"deficiency/serum risk"}','Ileal disease is a plausible B12 absorption context, but direct dietary absorption data that yield a transferable coefficient were not identified. Ileal resection is intentionally not modeled here.','unsupported','crohn-b12-ileal-review-2014','F','moderate',false),
 ('crohn.active.iron-loss.v1','Crohn''s active-disease iron loss and regulation',null,'{}','{"condition":"crohn_disease","states":["active_ileal","active_nonileal"],"nutrient":"iron","forms":["heme","nonheme"],"endpoint":"anemia/clinical bleeding"}','Guidance identifies blood loss and inflammatory regulation, but not a reliable individual blood-loss amount or separate heme/non-heme dietary absorption coefficient.','unsupported','ecco-iron-anemia-2015','F','moderate',false),
 ('crohn.vitamin-d-absorption.v1','Crohn''s vitamin D handling',null,'{}','{"condition":"crohn_disease","nutrient":"vitamin_d","endpoint":"25-OH-D/status"}','Low 25-OH-D and deficiency risk do not establish intestinal vitamin D absorption, fat-malabsorption, metabolism, or a meal-level coefficient.','unsupported','crohn-nutrition-review-2020','F','low',false),
 ('uc.active.iron-loss.v1','Ulcerative colitis active-disease iron loss',null,'{}','{"condition":"ulcerative_colitis","state":"active","nutrient":"iron","endpoint":"anemia/clinical bleeding"}','Blood loss is recognized but no transferable individual daily loss, requirement increment, or heme/non-heme absorption coefficient was identified.','unsupported','ecco-iron-anemia-2015','F','moderate',false),
 ('uc.vitamin-d-absorption.v1','Ulcerative colitis vitamin D handling',null,'{}','{"condition":"ulcerative_colitis","nutrient":"vitamin_d","endpoint":"25-OH-D/status"}','Serum status, inflammation, treatment, and intake studies do not measure an oral absorption fraction or metabolic conversion coefficient.','unsupported','uc-nutrition-review-2021','F','low',false),
 ('uc.micronutrient-status.v1','Ulcerative colitis folate, calcium, magnesium, and zinc handling',null,'{}','{"condition":"ulcerative_colitis","nutrients":["folate","calcium","magnesium","zinc"],"endpoint":"status/intake"}','No nutrient-specific transferable loss, requirement, absorption, conversion, or utilization coefficient was identified.','unsupported','uc-nutrition-review-2021','F','low',false)
on conflict(model_key) do nothing;

update clinical_conditions set description='Clinician-documented activity and ileal involvement are material; ileal resection remains a separate condition model.',evidence_id='aga-ibd-nutrition-2024',input_schema='["state: active_ileal|active_nonileal|remission_ileal|remission_nonileal"]'::jsonb where id='crohn_disease';
update clinical_conditions set description='Clinician-documented activity is material; active disease and remission have independent evidence records.',evidence_id='aga-ibd-nutrition-2024',input_schema='["state: active|remission"]'::jsonb where id='ulcerative_colitis';

insert into condition_mechanisms(id,condition_id,physiological_process,model_stage,evidence_id,limitation) values
 ('crohn.active.mucosal-nutrient-handling','crohn_disease','Active-disease nutrient handling','absorption','crohn-nutrition-review-2020','Heterogeneous intake, status, and disease studies do not provide a meal absorption coefficient.'),
 ('crohn.ileal.b12-absorption-risk','crohn_disease','Terminal-ileal B12 absorption risk without resection','absorption','crohn-b12-ileal-review-2014','Deficiency/serum risk is not direct absorption measurement; resection is excluded.'),
 ('crohn.active.iron-loss-and-regulation','crohn_disease','Gastrointestinal iron loss and inflammatory iron regulation','loss','ecco-iron-anemia-2015','No individual loss volume or form-specific absorption coefficient.'),
 ('crohn.remission.nutrition-monitoring','crohn_disease','Nutrition status monitoring in remission','systemic','aga-ibd-nutrition-2024','No persistent penalty or recovery coefficient is inferred.'),
 ('uc.active.iron-gastrointestinal-loss','ulcerative_colitis','Gastrointestinal iron loss and inflammatory iron regulation','loss','ecco-iron-anemia-2015','No individual blood-loss volume, requirement increment, or absorption coefficient.'),
 ('uc.active.nutrient-status','ulcerative_colitis','Micronutrient status during active disease','systemic','uc-nutrition-review-2021','Status and serum observations do not identify absorption or conversion fractions.'),
 ('uc.remission.nutrition-monitoring','ulcerative_colitis','Nutrition status monitoring in remission','systemic','aga-ibd-nutrition-2024','No persistent penalty or recovery coefficient is inferred.')
on conflict(id) do nothing;

insert into condition_nutrient_effects(mechanism_id,nutrient_id,effect_type,quantitative_model_key,coefficient_json,conditions_json,classification,confidence,evidence_id,limitation)
select mechanism_id,n.id,effect_type,null,null,conditions::jsonb,'F',confidence,evidence_id,limitation
from (values
 ('crohn.active.mucosal-nutrient-handling','iron','reduced_absorption','{"states":["active_ileal","active_nonileal"]}','low','crohn-nutrition-review-2020','No numerical absorption model.'),
 ('crohn.active.mucosal-nutrient-handling','vitamin_d','reduced_absorption','{"states":["active_ileal","active_nonileal"]}','low','crohn-nutrition-review-2020','25-OH-D is not an absorption endpoint.'),
 ('crohn.ileal.b12-absorption-risk','vitamin_b12','reduced_absorption','{"states":["active_ileal","remission_ileal"],"anatomy":"ileal involvement without resection"}','moderate','crohn-b12-ileal-review-2014','No food-dose absorption fraction.'),
 ('crohn.active.iron-loss-and-regulation','iron','increased_loss_excretion','{"states":["active_ileal","active_nonileal"]}','moderate','ecco-iron-anemia-2015','No individualized blood-loss amount.'),
 ('uc.active.iron-gastrointestinal-loss','iron','increased_loss_excretion','{"state":"active"}','moderate','ecco-iron-anemia-2015','No individualized blood-loss amount.'),
 ('uc.active.nutrient-status','vitamin_d','altered_systemic_availability','{"state":"active"}','low','uc-nutrition-review-2021','No absorption/conversion coefficient.')
) as v(mechanism_id,nutrient_key,effect_type,conditions,confidence,evidence_id,limitation)
join nutrients n on n.canonical_key=v.nutrient_key
on conflict(mechanism_id,nutrient_id,effect_type) do nothing;

insert into condition_recommendations(condition_id,mechanism_id,category,recommendation,rationale,evidence_id,evidence_strength,caution,clinician_supervision) values
 ('crohn_disease','crohn.ileal.b12-absorption-risk','medical evaluation','Discuss clinician-directed nutrient-status assessment when Crohn''s disease involves the terminal ileum.','Ileal involvement changes B12 risk but does not determine an individual dietary absorption fraction.','crohn-b12-ileal-review-2014','observational risk evidence','This is not a supplement recommendation and does not diagnose deficiency.',true),
 ('crohn_disease','crohn.active.iron-loss-and-regulation','medical evaluation','Discuss evaluation of active-disease anemia/iron status with the treating team.','Blood loss and inflammatory regulation require clinical assessment rather than a dietary multiplier.','ecco-iron-anemia-2015','guideline','No iron dose, food substitution, or presumed blood-loss quantity is provided.',true),
 ('ulcerative_colitis','uc.active.iron-gastrointestinal-loss','medical evaluation','Discuss evaluation of active-disease bleeding and iron status with the treating team.','Blood loss is a clinical mechanism, not a meal absorption penalty.','ecco-iron-anemia-2015','guideline','No iron dose or blood-loss quantity is provided.',true)
on conflict do nothing;

-- Complete per-nutrient provenance for all qualitative catalog effects; each has a NULL
-- model key and coefficient so UI/catalog records cannot silently become numerical.
insert into condition_nutrient_effects(mechanism_id,nutrient_id,effect_type,quantitative_model_key,coefficient_json,conditions_json,classification,confidence,evidence_id,limitation)
select mechanism_id,n.id,effect_type,null,null,conditions::jsonb,'F',confidence,evidence_id,limitation
from (values
 ('crohn.active.mucosal-nutrient-handling','folate','reduced_absorption','{"states":["active_ileal","active_nonileal"]}','low','crohn-nutrition-review-2020','No numerical absorption model.'),
 ('crohn.active.mucosal-nutrient-handling','calcium','reduced_absorption','{"states":["active_ileal","active_nonileal"]}','low','crohn-nutrition-review-2020','No numerical absorption model.'),
 ('crohn.active.mucosal-nutrient-handling','magnesium','reduced_absorption','{"states":["active_ileal","active_nonileal"]}','low','crohn-nutrition-review-2020','No numerical absorption model.'),
 ('crohn.active.mucosal-nutrient-handling','zinc','reduced_absorption','{"states":["active_ileal","active_nonileal"]}','low','crohn-nutrition-review-2020','No numerical absorption model.'),
 ('crohn.active.mucosal-nutrient-handling','vitamin_a','reduced_absorption','{"states":["active_ileal","active_nonileal"]}','low','crohn-nutrition-review-2020','No numerical absorption model.'),
 ('crohn.active.mucosal-nutrient-handling','vitamin_e','reduced_absorption','{"states":["active_ileal","active_nonileal"]}','low','crohn-nutrition-review-2020','No numerical absorption model.'),
 ('crohn.active.mucosal-nutrient-handling','vitamin_k','reduced_absorption','{"states":["active_ileal","active_nonileal"]}','low','crohn-nutrition-review-2020','No numerical absorption model.'),
 ('crohn.remission.nutrition-monitoring','iron','altered_systemic_availability','{"states":["remission_ileal","remission_nonileal"]}','low','aga-ibd-nutrition-2024','No persistent penalty or recovery coefficient.'),
 ('crohn.remission.nutrition-monitoring','vitamin_d','altered_systemic_availability','{"states":["remission_ileal","remission_nonileal"]}','low','aga-ibd-nutrition-2024','No persistent penalty or recovery coefficient.'),
 ('crohn.remission.nutrition-monitoring','folate','altered_systemic_availability','{"states":["remission_ileal","remission_nonileal"]}','low','aga-ibd-nutrition-2024','No persistent penalty or recovery coefficient.'),
 ('crohn.remission.nutrition-monitoring','calcium','altered_systemic_availability','{"states":["remission_ileal","remission_nonileal"]}','low','aga-ibd-nutrition-2024','No persistent penalty or recovery coefficient.'),
 ('crohn.remission.nutrition-monitoring','magnesium','altered_systemic_availability','{"states":["remission_ileal","remission_nonileal"]}','low','aga-ibd-nutrition-2024','No persistent penalty or recovery coefficient.'),
 ('crohn.remission.nutrition-monitoring','zinc','altered_systemic_availability','{"states":["remission_ileal","remission_nonileal"]}','low','aga-ibd-nutrition-2024','No persistent penalty or recovery coefficient.'),
 ('crohn.remission.nutrition-monitoring','vitamin_a','altered_systemic_availability','{"states":["remission_ileal","remission_nonileal"]}','low','aga-ibd-nutrition-2024','No persistent penalty or recovery coefficient.'),
 ('crohn.remission.nutrition-monitoring','vitamin_e','altered_systemic_availability','{"states":["remission_ileal","remission_nonileal"]}','low','aga-ibd-nutrition-2024','No persistent penalty or recovery coefficient.'),
 ('crohn.remission.nutrition-monitoring','vitamin_k','altered_systemic_availability','{"states":["remission_ileal","remission_nonileal"]}','low','aga-ibd-nutrition-2024','No persistent penalty or recovery coefficient.'),
 ('uc.active.nutrient-status','folate','altered_systemic_availability','{"state":"active"}','low','uc-nutrition-review-2021','No absorption/conversion coefficient.'),
 ('uc.active.nutrient-status','calcium','altered_systemic_availability','{"state":"active"}','low','uc-nutrition-review-2021','No absorption/conversion coefficient.'),
 ('uc.active.nutrient-status','magnesium','altered_systemic_availability','{"state":"active"}','low','uc-nutrition-review-2021','No absorption/conversion coefficient.'),
 ('uc.active.nutrient-status','zinc','altered_systemic_availability','{"state":"active"}','low','uc-nutrition-review-2021','No absorption/conversion coefficient.'),
 ('uc.remission.nutrition-monitoring','iron','altered_systemic_availability','{"state":"remission"}','low','aga-ibd-nutrition-2024','No persistent penalty or recovery coefficient.'),
 ('uc.remission.nutrition-monitoring','vitamin_d','altered_systemic_availability','{"state":"remission"}','low','aga-ibd-nutrition-2024','No persistent penalty or recovery coefficient.'),
 ('uc.remission.nutrition-monitoring','folate','altered_systemic_availability','{"state":"remission"}','low','aga-ibd-nutrition-2024','No persistent penalty or recovery coefficient.'),
 ('uc.remission.nutrition-monitoring','calcium','altered_systemic_availability','{"state":"remission"}','low','aga-ibd-nutrition-2024','No persistent penalty or recovery coefficient.'),
 ('uc.remission.nutrition-monitoring','magnesium','altered_systemic_availability','{"state":"remission"}','low','aga-ibd-nutrition-2024','No persistent penalty or recovery coefficient.'),
 ('uc.remission.nutrition-monitoring','zinc','altered_systemic_availability','{"state":"remission"}','low','aga-ibd-nutrition-2024','No persistent penalty or recovery coefficient.')
) as v(mechanism_id,nutrient_key,effect_type,conditions,confidence,evidence_id,limitation)
join nutrients n on n.canonical_key=v.nutrient_key
on conflict(mechanism_id,nutrient_id,effect_type) do nothing;
