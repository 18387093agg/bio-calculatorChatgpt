-- Chronic liver disease: etiology/stage-correct qualitative mechanisms only.
insert into evidence_sources(id,title,organization,url,publication_year,source_type,population,notes) values
 ('espens-liver-guideline-2019','ESPEN guideline on clinical nutrition in liver disease','ESPEN','https://doi.org/10.1016/j.clnu.2018.12.022',2019,'clinical-guideline','adults with acute or chronic liver disease','Status, storage, metabolism, intake and clinical nutrition guidance are not universal dietary absorption coefficients.'),
 ('easl-cholestatic-liver-disease-2009','EASL Clinical Practice Guidelines: Management of cholestatic liver diseases','EASL','https://doi.org/10.1016/j.jhep.2009.04.009',2009,'clinical-guideline','adults with cholestatic liver diseases','Cholestasis provides a bile-mediated fat-soluble-vitamin mechanism but no transferable common meal fraction.')
on conflict(id) do nothing;

update clinical_conditions set description='Cholestatic and non-cholestatic contexts are distinct.',evidence_id='espens-liver-guideline-2019',input_schema='["state: stable_noncholestatic|decompensated_noncholestatic|cholestatic"]'::jsonb where id='chronic_liver_disease';

insert into condition_mechanisms(id,condition_id,physiological_process,model_stage,evidence_id,limitation) values
 ('liver.hepatic-conversion-storage-transport','chronic_liver_disease','Hepatic conversion, storage and transport','conversion','espens-liver-guideline-2019','No conversion or store coefficient.'),
 ('liver.cholestasis.bile-fat-soluble-handling','chronic_liver_disease','Cholestatic bile-mediated fat handling','digestion','easl-cholestatic-liver-disease-2009','No common A/D/E/K fraction.'),
 ('liver.iron-regulation-storage-context','chronic_liver_disease','Iron regulation and storage','systemic','espens-liver-guideline-2019','Not intestinal absorption.'),
 ('liver.trace-mineral-status-context','chronic_liver_disease','Trace-mineral systemic status','systemic','espens-liver-guideline-2019','No status coefficient.'),
 ('liver.decompensated-loss-management-context','chronic_liver_disease','Decompensation-related losses and management','loss','espens-liver-guideline-2019','No fixed loss or requirement.')
on conflict(id) do nothing;

insert into model_assumptions(model_key,description,formula,parameters_json,conditions_json,limitations,status,evidence_id,classification,confidence,enabled) values
 ('liver.generic-absorption.v1','Generic liver disease absorption candidate',null,'{}','{}','Disabled: no transferable human equation.','unsupported','project-audit-2026','F','low',false),
 ('liver.vitamin-conversion.v1','Hepatic vitamin conversion/storage candidate',null,'{}','{}','Disabled: no transferable human equation.','unsupported','project-audit-2026','F','low',false),
 ('liver.cholestasis-fat-soluble.v1','Cholestasis A/D/E/K common fraction candidate',null,'{}','{}','Disabled: no transferable human equation.','unsupported','project-audit-2026','F','low',false),
 ('liver.iron-status.v1','Liver disease iron coefficient candidate',null,'{}','{}','Disabled: no transferable human equation.','unsupported','project-audit-2026','F','low',false),
 ('liver.trace-mineral-status.v1','Liver disease trace mineral coefficient candidate',null,'{}','{}','Disabled: no transferable human equation.','unsupported','project-audit-2026','F','low',false)
on conflict(model_key) do update set classification=excluded.classification,confidence=excluded.confidence,enabled=false;

insert into condition_nutrient_effects(mechanism_id,nutrient_id,effect_type,quantitative_model_key,coefficient_json,conditions_json,classification,confidence,evidence_id,limitation)
select v.mechanism_id,n.id,v.effect_type,null,null,v.conditions::jsonb,'F',v.confidence,v.evidence_id,v.limitation from (values
 ('liver.hepatic-conversion-storage-transport','vitamin_a','altered_conversion_storage_transport','{"liver_disease":"documented"}','moderate','espens-liver-guideline-2019','No tissue-store or conversion coefficient.'),
 ('liver.hepatic-conversion-storage-transport','vitamin_d','altered_conversion_storage_transport','{"liver_disease":"documented"}','moderate','espens-liver-guideline-2019','No 25-hydroxylation or serum coefficient.'),
 ('liver.hepatic-conversion-storage-transport','folate','altered_conversion_storage_transport','{"liver_disease":"documented"}','moderate','espens-liver-guideline-2019','No systemic-pool coefficient.'),
 ('liver.hepatic-conversion-storage-transport','vitamin_b12','altered_conversion_storage_transport','{"liver_disease":"documented"}','moderate','espens-liver-guideline-2019','No storage coefficient.'),
 ('liver.cholestasis.bile-fat-soluble-handling','vitamin_a','impaired_bile_mediated_digestion','{"cholestasis":true}','high','easl-cholestatic-liver-disease-2009','No common A/D/E/K fraction.'),
 ('liver.cholestasis.bile-fat-soluble-handling','vitamin_d','impaired_bile_mediated_digestion','{"cholestasis":true}','high','easl-cholestatic-liver-disease-2009','No common A/D/E/K fraction.'),
 ('liver.cholestasis.bile-fat-soluble-handling','vitamin_e','impaired_bile_mediated_digestion','{"cholestasis":true}','high','easl-cholestatic-liver-disease-2009','No common A/D/E/K fraction.'),
 ('liver.cholestasis.bile-fat-soluble-handling','vitamin_k','impaired_bile_mediated_digestion','{"cholestasis":true}','high','easl-cholestatic-liver-disease-2009','No common A/D/E/K fraction.'),
 ('liver.iron-regulation-storage-context','iron','altered_systemic_availability','{"liver_disease":"documented"}','moderate','espens-liver-guideline-2019','Not intestinal absorption.'),
 ('liver.trace-mineral-status-context','zinc','altered_systemic_availability','{"liver_disease":"documented"}','low','espens-liver-guideline-2019','Class F status coefficient disabled.'),
 ('liver.trace-mineral-status-context','copper','altered_systemic_availability','{"liver_disease":"documented"}','low','espens-liver-guideline-2019','Class F status coefficient disabled.'),
 ('liver.trace-mineral-status-context','magnesium','altered_systemic_availability','{"liver_disease":"documented"}','low','espens-liver-guideline-2019','Class F status coefficient disabled.')
) as v(mechanism_id,nutrient_key,effect_type,conditions,confidence,evidence_id,limitation)
join nutrients n on n.canonical_key=v.nutrient_key
on conflict(mechanism_id,nutrient_id,effect_type) do nothing;
