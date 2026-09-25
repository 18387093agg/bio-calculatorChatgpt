-- Final scientific metadata and relationship integrity.
alter table model_assumptions add column parameter_units_json jsonb not null default '{}'::jsonb;
alter table interactions add column interaction_key text;
alter table interactions add column classification text check(classification in ('A','B','C','D','E','F'));
alter table interactions add column parameter_units_json jsonb not null default '{}'::jsonb;
alter table interactions add column limitations text;
alter table interactions add column enabled boolean not null default false;
alter table interactions add constraint interactions_key_unique unique(interaction_key);
alter table interactions add constraint unsupported_interactions_disabled check(classification <> 'F' or enabled = false);
alter table retention_factors add constraint retention_food_method_nutrient_unique unique(food_id,preparation_method_id,nutrient_id);
alter table biomarker_reference_ranges add constraint biomarker_range_population_unique unique(marker_id,sex,age_min,age_max,evidence_id);
alter table meal_logs add constraint meal_log_user_date_slot_unique unique(user_id,logged_on,meal_slot);
alter table supplement_logs add column evidence_id text references evidence_sources(id);
alter table targets add constraint official_target_requires_evidence check(evidence_id is not null);

update model_assumptions set parameter_units_json = case model_key
 when 'iron.heme.absorption_range.v1' then '{"min":"fraction","max":"fraction"}'::jsonb
 when 'iron.nonheme.absorption_range.v1' then '{"min":"fraction","max":"fraction"}'::jsonb
 when 'iron.nonheme.low_acid.v1' then '{"multiplier":"fraction"}'::jsonb
 when 'b12.food_bound.absorption_range.v1' then '{"min":"fraction","max":"fraction"}'::jsonb
 when 'b12.free.absorption_range.v1' then '{"min":"fraction","max":"fraction"}'::jsonb
 when 'b12.food_bound.low_acid.v1' then '{"multiplier":"fraction"}'::jsonb
 when 'thiamine.energy.optimization.v1' then '{"min_mg_per_1000_kcal":"mg/1000 kcal","max_mg_per_1000_kcal":"mg/1000 kcal"}'::jsonb
 when 'pral.remer_manz.v1' then '{"protein":"mEq/g","phosphorus":"mEq/mg","potassium":"mEq/mg","magnesium":"mEq/mg","calcium":"mEq/mg"}'::jsonb
 else '{}'::jsonb end;
