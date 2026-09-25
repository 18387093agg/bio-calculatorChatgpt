-- Additive catalog/upload normalization. Existing logs and references are preserved.
alter table nutrients add column if not exists slug text unique;
alter table nutrients add column if not exists subcategory text;
alter table nutrients add column if not exists display_unit text;
alter table nutrients add column if not exists source_version text;
alter table user_target_overrides add column if not exists custom_min numeric check(custom_min >= 0);
alter table user_target_overrides add column if not exists custom_max numeric check(custom_max >= custom_min);
create table if not exists supplement_forms (
 id uuid primary key default gen_random_uuid(), nutrient_id uuid not null references nutrients(id), name text not null,
 chemical_form text not null, category text not null, default_unit text not null, supported_units text[] not null,
 typical_dose_min numeric, typical_dose_max numeric, conversion_to_base_nutrient numeric,
 notes text, evidence_id text references evidence_sources(id), unique(nutrient_id, chemical_form));
create table if not exists lab_report_uploads (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 file_name text not null, media_type text not null, storage_key text, parser_provider text,
 status text not null check(status in ('pending','parsed','needs_review','failed')), created_at timestamptz not null default now());
alter table lab_report_uploads enable row level security;
create policy "own lab uploads" on lab_report_uploads for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create index if not exists foods_name_search_idx on foods using gin(to_tsvector('english', name));
create index if not exists supplement_forms_name_search_idx on supplement_forms using gin(to_tsvector('english', name || ' ' || chemical_form));
alter table biomarker_results add column if not exists source_upload_id uuid references lab_report_uploads(id);
alter table biomarker_results add column if not exists extraction_confidence numeric check(extraction_confidence between 0 and 1);
