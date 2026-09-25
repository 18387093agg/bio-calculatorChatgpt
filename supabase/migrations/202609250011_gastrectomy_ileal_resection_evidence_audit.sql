-- Gastrectomy and ileal-resection evidence audit. Every mechanism is qualitative: reviewed
-- human literature establishes anatomy and physiology, but not a transferable, nutrient/form-
-- specific meal coefficient for this calculator.
insert into evidence_sources(id,title,organization,url,publication_year,source_type,population,notes) values
 ('gastrectomy-b12-review-2023','Vitamin B12 deficiency after gastrectomy for gastric cancer: an analysis of clinical patterns and a review of literature','peer-reviewed literature','https://doi.org/10.5230/jgc.2013.13.3.194',2013,'review','adults after partial or total gastrectomy','Explains loss/reduction of acid, pepsin, and intrinsic factor and reports postoperative B12 status/clinical management. Status and treatment findings do not provide a food-bound or crystalline-B12 meal absorption coefficient.'),
 ('gastrectomy-iron-review-2021','Iron deficiency after partial gastrectomy','peer-reviewed literature','https://pmc.ncbi.nlm.nih.gov/articles/PMC1935982/',1961,'review','people after partial gastrectomy','Describes impaired non-heme iron handling and multiple contributors including intake and blood loss. It does not establish a contemporary, form-specific oral absorption fraction transferable to individuals.'),
 ('gastrectomy-nutrition-review-2020','Nutritional support after gastrectomy','peer-reviewed literature','https://doi.org/10.5230/jgc.2016.16.4.299',2016,'review','adults after gastrectomy','Reviews postoperative micronutrient monitoring and supplementation. Folate, calcium, and vitamin-D status/guidance are not meal absorption, conversion, or requirement equations.'),
 ('ileal-resection-b12-review-2024','Vitamin B12 malabsorption in patients with limited ileal resection','peer-reviewed literature','https://doi.org/10.1136/gut.16.12.971',1975,'human-study','people with terminal ileal resection','Reports B12 absorption/status in a surgical population. Heterogeneous anatomy and clinical outcomes do not support a universal length-to-meal-absorption equation.'),
 ('ileal-resection-nutrition-review-2022','Guidelines for management of patients with a short bowel','British Society of Gastroenterology','https://doi.org/10.1136/gut.2005.078626',2006,'guideline','adults with intestinal resection/short bowel','Describes terminal-ileal bile-acid reclamation, fat malabsorption, and anatomy-dependent management. It is used only for qualitative isolated-ileal-resection mechanisms; it does not create a short-bowel model or a shared fat-soluble-vitamin multiplier.')
on conflict(id) do nothing;

update clinical_conditions set description='Select documented partial or total gastrectomy only. The states are anatomically distinct; no time-since-surgery, reconstruction, residual tissue, or intrinsic-factor percentage is inferred.',evidence_id='gastrectomy-b12-review-2023',input_schema='["state: partial|total"]'::jsonb where id='gastrectomy';
update clinical_conditions set description='Select documented ileal resection only. It is separate from Crohn''s ileal involvement and from clinically defined short bowel syndrome; length and colon continuity are not inferred.',evidence_id='ileal-resection-b12-review-2024',input_schema='["state: documented_resection"]'::jsonb where id='ileal_resection';

insert into condition_mechanisms(id,condition_id,physiological_process,model_stage,evidence_id,limitation) values
 ('gastrectomy.partial.b12-gastric-processing','gastrectomy','Partial-gastrectomy food-bound B12 release and intrinsic-factor handling','absorption','gastrectomy-b12-review-2023','No transferable food-bound/free B12 absorption fraction or personalized requirement.'),
 ('gastrectomy.total.b12-intrinsic-factor-loss','gastrectomy','Total-gastrectomy acid, pepsin, and intrinsic-factor loss','absorption','gastrectomy-b12-review-2023','Passive diffusion at pharmacologic doses is not a coefficient for ordinary intake.'),
 ('gastrectomy.partial.nonheme-iron-gastric-handling','gastrectomy','Partial-gastrectomy acid-dependent non-heme iron handling','absorption','gastrectomy-iron-review-2021','No heme/non-heme meal coefficient; deficiency, blood loss, and intake are not converted.'),
 ('gastrectomy.total.nonheme-iron-gastric-handling','gastrectomy','Total-gastrectomy achlorhydric non-heme iron handling','absorption','gastrectomy-iron-review-2021','Not modeled as twice partial gastrectomy; no requirement coefficient.'),
 ('gastrectomy.micronutrient-status-monitoring','gastrectomy','Post-gastrectomy folate, calcium, and vitamin-D status monitoring','systemic','gastrectomy-nutrition-review-2020','Status and guidance do not establish absorption, conversion, or requirement coefficients.'),
 ('ileal-resection.b12-terminal-ileum-handling','ileal_resection','Terminal-ileal intrinsic-factor–B12 uptake','absorption','ileal-resection-b12-review-2024','No universal resection-length threshold or B12 absorption equation.'),
 ('ileal-resection.bile-acid-fat-handling','ileal_resection','Ileal bile-acid reclamation and downstream fat handling','digestion','ileal-resection-nutrition-review-2022','A, D, E, and K remain separate qualitative mechanisms; no shared multiplier.'),
 ('ileal-resection.mineral-status-monitoring','ileal_resection','Anatomy-dependent calcium and magnesium status context','systemic','ileal-resection-nutrition-review-2022','No oral absorption, loss, or requirement coefficient.')
on conflict(id) do nothing;

insert into condition_nutrient_effects(mechanism_id,nutrient_id,effect_type,quantitative_model_key,coefficient_json,conditions_json,classification,confidence,evidence_id,limitation)
select v.mechanism_id,n.id,v.effect_type,null,null,v.conditions::jsonb,'F',v.confidence,v.evidence_id,v.limitation
from (values
 ('gastrectomy.partial.b12-gastric-processing','vitamin_b12','reduced_absorption','{"state":"partial"}','moderate','gastrectomy-b12-review-2023','No food-bound/free B12 coefficient.'),
 ('gastrectomy.total.b12-intrinsic-factor-loss','vitamin_b12','reduced_absorption','{"state":"total"}','high','gastrectomy-b12-review-2023','No ordinary-intake passive-diffusion coefficient.'),
 ('gastrectomy.partial.nonheme-iron-gastric-handling','iron','reduced_absorption','{"state":"partial"}','moderate','gastrectomy-iron-review-2021','No heme/non-heme coefficient.'),
 ('gastrectomy.total.nonheme-iron-gastric-handling','iron','reduced_absorption','{"state":"total"}','moderate','gastrectomy-iron-review-2021','No heme/non-heme coefficient.'),
 ('gastrectomy.micronutrient-status-monitoring','folate','altered_systemic_availability','{"state":"partial_or_total"}','low','gastrectomy-nutrition-review-2020','Status is not absorption.'),
 ('gastrectomy.micronutrient-status-monitoring','calcium','altered_systemic_availability','{"state":"partial_or_total"}','low','gastrectomy-nutrition-review-2020','Status is not absorption.'),
 ('gastrectomy.micronutrient-status-monitoring','vitamin_d','altered_systemic_availability','{"state":"partial_or_total"}','low','gastrectomy-nutrition-review-2020','Status is not absorption.'),
 ('ileal-resection.b12-terminal-ileum-handling','vitamin_b12','reduced_absorption','{"state":"documented_resection"}','moderate','ileal-resection-b12-review-2024','No resection-length equation.'),
 ('ileal-resection.bile-acid-fat-handling','vitamin_a','impaired_digestion','{"state":"documented_resection"}','moderate','ileal-resection-nutrition-review-2022','No vitamin coefficient.'),
 ('ileal-resection.bile-acid-fat-handling','vitamin_d','impaired_digestion','{"state":"documented_resection"}','moderate','ileal-resection-nutrition-review-2022','No vitamin coefficient.'),
 ('ileal-resection.bile-acid-fat-handling','vitamin_e','impaired_digestion','{"state":"documented_resection"}','moderate','ileal-resection-nutrition-review-2022','No vitamin coefficient.'),
 ('ileal-resection.bile-acid-fat-handling','vitamin_k','impaired_digestion','{"state":"documented_resection"}','moderate','ileal-resection-nutrition-review-2022','No vitamin coefficient.'),
 ('ileal-resection.mineral-status-monitoring','calcium','altered_systemic_availability','{"state":"documented_resection"}','low','ileal-resection-nutrition-review-2022','No calcium coefficient.'),
 ('ileal-resection.mineral-status-monitoring','magnesium','altered_systemic_availability','{"state":"documented_resection"}','low','ileal-resection-nutrition-review-2022','No magnesium coefficient.')
) as v(mechanism_id,nutrient_key,effect_type,conditions,confidence,evidence_id,limitation)
join nutrients n on n.canonical_key=v.nutrient_key
on conflict(mechanism_id,nutrient_id,effect_type) do nothing;
