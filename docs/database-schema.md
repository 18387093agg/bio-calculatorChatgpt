# Database schema
See `supabase/migrations/202609230001_normalized_nutrition.sql`. Canonical nutrition data is relational, not duplicated columns. Personal tables have RLS policies anchored to `auth.uid()`; `meal_items` accesses through its owning meal.
