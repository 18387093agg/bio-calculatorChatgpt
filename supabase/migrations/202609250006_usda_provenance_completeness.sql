-- Preserve USDA identities without guessing nutrient origin or derivation metadata.
alter table nutrient_forms drop constraint nutrient_forms_origin_type_check;
alter table nutrient_forms add constraint nutrient_forms_origin_type_check
  check (origin_type in ('animal','plant','supplement','unknown'));

alter table foods add column publication_date date;
alter table food_nutrients add column external_nutrient_id integer;
alter table food_nutrients add column external_nutrient_number text;
alter table food_nutrients add column data_point_count integer check (data_point_count is null or data_point_count >= 0);
alter table food_nutrients add column derivation_code text;
alter table food_nutrients add column derivation_description text;
alter table food_nutrients add constraint food_nutrients_external_identity_unique
  unique (food_id, external_nutrient_id);
