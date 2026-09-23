# Bio Calculator MVP

A working, dependency-free meal calculator MVP. It serves a public, local demo data set and does **not** require Supabase to render or calculate a meal.

## Quick start

```bash
git clone <repository-url>
cd bio-calculator
npm install
cp .env.example .env.local   # optional for this demo; do not add secrets to git
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Select a food, enter grams, select preparation, and choose **Add to meal**. The dashboard updates macros, micronutrients, source-aware intake bars, targets, and available estimates.

## Production verification

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
npm start
```

The production server serves the built `dist/public` bundle at port 3000. Set `PORT` to choose another port.

## Demo/reference data

`public/demo-foods.json` is the single demo composition data source. It includes beef, chicken, egg, milk, rice, potato, spinach, lentils, orange, and oats. The file identifies USDA FoodData Central as the source and is deliberately scoped to MVP demonstrations; verify values and retain FDC provenance before a clinical/production data release.

## Supabase (optional persistence)

The public calculator deliberately has no browser Supabase dependency. To add persistence/authentication:

1. Create a Supabase project and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`.
2. Apply `supabase/migrations/202609230001_normalized_nutrition.sql` from a clean database using the Supabase CLI or SQL editor.
3. Import reference data using the validated importer workflow in `docs/importer-spec.md`; never use a service-role key in browser code.
4. Keep demo mode available while the database has no validated food rows.

A local Supabase workflow is optional: install the Supabase CLI, run `supabase start`, then apply the migration with `supabase db reset`. The MVP is usable without it.
