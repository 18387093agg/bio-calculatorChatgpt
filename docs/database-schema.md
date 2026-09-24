# Database schema

The migrations create a normalized, form-aware PostgreSQL/Supabase schema. `nutrients` and `nutrient_forms` are the canonical identities; composition, targets, retention, interactions, supplements, biomarker definitions, and evidence rows point to these identities rather than re-creating nutrient lists. `202609230002_complete_canonical_pipeline.sql` adds composition metadata, target-model assumptions, biomarkers/ranges/interpretation rules, supplement logs, and food exclusions to the initial schema.

Reference data is intended to be readable through controlled application queries. User-owned tables (`user_profiles`, meals/items, biomarkers, overrides, supplement logs, and exclusions) have RLS enabled and are only accessible when `auth.uid()` owns the relevant row; meal items inherit ownership through their parent meal. No service-role credential is required or exposed by the public demo.
