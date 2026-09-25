-- Condition-specific personalization: reference definitions are public; selections are private.
create table clinical_conditions (
  id text primary key, display_name text not null, description text not null,
  evidence_id text references evidence_sources(id), input_schema jsonb not null default '[]'::jsonb
);
create table condition_mechanisms (
  id text primary key, condition_id text not null references clinical_conditions(id) on delete cascade,
  physiological_process text not null, model_stage text not null check (model_stage in ('absorption','loss','requirement','conversion','utilization','turnover','storage','systemic','intracellular')),
  evidence_id text references evidence_sources(id), limitation text not null
);
create table condition_nutrient_effects (
  id uuid primary key default gen_random_uuid(), mechanism_id text not null references condition_mechanisms(id) on delete cascade,
  nutrient_id uuid not null references nutrients(id), effect_type text not null check (effect_type in ('reduced_absorption','increased_absorption','increased_requirement','increased_loss_excretion','impaired_conversion','impaired_utilization','increased_turnover','reduced_storage','altered_systemic_availability','altered_intracellular_availability')),
  quantitative_model_key text references model_assumptions(model_key), coefficient_json jsonb, parameter_units_json jsonb not null default '{}'::jsonb,
  conditions_json jsonb not null default '{}'::jsonb, classification text not null check (classification in ('A','B','C','D','E','F')),
  confidence text not null check (confidence in ('high','moderate','low')), evidence_id text references evidence_sources(id), limitation text not null,
  unique(mechanism_id,nutrient_id,effect_type)
);
create table user_condition_selections (
  user_id uuid not null references auth.users(id) on delete cascade,
  condition_id text not null references clinical_conditions(id), state_json jsonb not null default '{}'::jsonb,
  selected_at timestamptz not null default now(), primary key(user_id,condition_id)
);
create table condition_recommendations (
  id uuid primary key default gen_random_uuid(), condition_id text not null references clinical_conditions(id) on delete cascade,
  mechanism_id text references condition_mechanisms(id) on delete cascade, category text not null,
  recommendation text not null, rationale text not null, evidence_id text references evidence_sources(id), evidence_strength text not null,
  caution text not null, clinician_supervision boolean not null default false
);
alter table clinical_conditions enable row level security; alter table condition_mechanisms enable row level security;
alter table condition_nutrient_effects enable row level security; alter table condition_recommendations enable row level security;
alter table user_condition_selections enable row level security;
create policy "public condition read" on clinical_conditions for select using (true);
create policy "public condition mechanisms read" on condition_mechanisms for select using (true);
create policy "public condition effects read" on condition_nutrient_effects for select using (true);
create policy "public condition recommendations read" on condition_recommendations for select using (true);
create policy "own condition selections" on user_condition_selections for all using (auth.uid()=user_id) with check (auth.uid()=user_id);

insert into evidence_sources(id,title,organization,url,publication_year,source_type,population,notes) values
 ('miller-zinc-2007','A Mathematical Model of Zinc Absorption in Humans as a Function of Dietary Zinc and Phytate','Journal of Nutrition','https://doi.org/10.1093/jn/137.1.135',2007,'human-study','adult human zinc absorption datasets','Population model; requires total daily dietary zinc and phytate.'),
 ('iom-zinc-dri','Dietary Reference Intakes for Zinc','National Academies','https://www.ncbi.nlm.nih.gov/books/NBK222317/',2001,'guideline','US/Canadian adults','The adult UL is 40 mg/day; adverse copper effects are associated with sustained high intake.'),
 ('acg-celiac-guideline-2023','ACG Clinical Guidelines: Diagnosis and Management of Celiac Disease','American College of Gastroenterology',null,2023,'guideline','patients with celiac disease','Nutrient deficiency risk does not supply a universal absorption coefficient.'),
 ('aga-ibd-nutrition-2024','AGA Clinical Practice Update on Diet and Nutritional Therapies in Patients With IBD','American Gastroenterological Association',null,2024,'guideline','patients with IBD','Effects depend on activity, site, and surgical anatomy.'),
 ('aga-epi-update-2023','AGA Clinical Practice Update on Exocrine Pancreatic Insufficiency','American Gastroenterological Association',null,2023,'guideline','patients with EPI','Fat-soluble vitamin risk needs clinical context.'),
 ('asmbs-nutrition-guidelines-2016','ASMBS Integrated Health Nutritional Guidelines','American Society for Metabolic and Bariatric Surgery',null,2016,'guideline','post-weight-loss-surgery patients','Monitoring guidance is not an individual coefficient.'),
 ('short-bowel-guideline-2023','Short bowel syndrome nutrition guideline','Clinical guideline',null,2023,'guideline','short bowel syndrome','Anatomy-dependent effects are not converted to a universal multiplier.'),
 ('gastric-surgery-nutrition-review','Nutrition after gastrectomy review','Clinical review',null,2020,'review','post-gastrectomy patients','Anatomy-dependent clinical risk; no universal coefficient.'),
 ('kdigo-ckd-mbd-2017','KDIGO CKD-MBD guideline update','KDIGO',null,2017,'guideline','chronic kidney disease','Does not permit dietary-to-calcitriol conversion from intake.'),
 ('espens-liver-guideline-2019','ESPEN Guideline on Clinical Nutrition in Liver Disease','ESPEN',null,2019,'guideline','chronic liver disease','Severity-dependent clinical context required.'),
 ('magnesium-vitamin-d-review','Magnesium and vitamin D metabolism review','Nutrients',null,2018,'review','humans and mechanisms','No validated intake-to-activation coefficient.'),
 ('thiamine-magnesium-review','Thiamine and magnesium in thiamine-dependent enzyme function','Clinical review',null,2021,'review','humans and mechanisms','No TTFD-specific magnesium drain coefficient.'),
 ('betaine-hcl-hypochlorhydria','Betaine HCl in pharmacologically induced hypochlorhydria','Molecular Pharmaceutics','https://doi.org/10.1021/mp500532c',2015,'human-study','healthy volunteers with pharmacologically induced hypochlorhydria','Temporary gastric pH effect; not a nutrient-absorption treatment study.')
on conflict(id) do nothing;

insert into clinical_conditions(id,display_name,description,evidence_id,input_schema) values
 ('hypochlorhydria','Low gastric acid / hypochlorhydria','Documented or medication-associated low acid only; symptoms are not diagnostic.','iom-b12-dri','["state"]'),
 ('celiac_disease','Celiac disease','Diagnosis and treatment state affect clinical risk.','acg-celiac-guideline-2023','["state"]'),
 ('crohn_disease','Crohn''s disease','Activity, ileal involvement and resection matter.','aga-ibd-nutrition-2024','["activity","ileal_involvement","ileal_resection"]'),
 ('ulcerative_colitis','Ulcerative colitis','Activity changes clinical risk.','aga-ibd-nutrition-2024','["activity"]'),
 ('pancreatic_exocrine_insufficiency','Pancreatic exocrine insufficiency','Requires documented diagnosis and clinical management.','aga-epi-update-2023','["enzyme_replacement"]'),
 ('bariatric_bypass','Bariatric surgery / gastric bypass','Surgery type and anatomy matter.','asmbs-nutrition-guidelines-2016','["surgery_type"]'),
 ('ileal_resection','Ileal resection','Extent and remaining anatomy matter.','short-bowel-guideline-2023','["extent"]'),
 ('gastrectomy','Gastrectomy','Partial/total anatomy and intrinsic factor require clinical assessment.','gastric-surgery-nutrition-review','["type"]'),
 ('short_bowel_syndrome','Short bowel syndrome','Adaptation and anatomy matter.','short-bowel-guideline-2023','["anatomy"]'),
 ('chronic_kidney_disease','Chronic kidney disease','Stage-specific metabolism requires clinical guidance.','kdigo-ckd-mbd-2017','["stage"]'),
 ('chronic_liver_disease','Chronic liver disease','Severity and etiology materially alter metabolism.','espens-liver-guideline-2019','["severity"]')
on conflict(id) do nothing;

insert into condition_recommendations(condition_id,category,recommendation,rationale,evidence_id,evidence_strength,caution,clinician_supervision) values
 ('hypochlorhydria','clinician discussion','Betaine HCl may be an evidence-linked option to discuss with a clinician, not a treatment instruction.','It temporarily lowered gastric pH in pharmacologically induced hypochlorhydria, but did not establish restoration of B12 or iron absorption.','betaine-hcl-hypochlorhydria','limited human pharmacological evidence','Do not infer low acid from symptoms. Ulcer, gastritis, reflux/esophageal disease and medication interactions require medical guidance. No dose is provided.',true)
on conflict do nothing;
