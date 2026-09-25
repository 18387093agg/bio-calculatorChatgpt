# Bio Calculator MVP

A dependency-free nutrition calculator with a canonical calculation engine. Production loads only `public/canonical-foods.json`, generated from authenticated USDA FoodData Central API responses. Supabase is not required for the local workspace.

## Quick start

```bash
git clone <repository-url>
cd bio-calculator
npm install
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

## Canonical food data

`data/fdc-food-manifest.json` defines the required food identities. With `USDA_FDC_API_KEY` set only in the process environment, `npm run import:fdc` resolves the manifest through the official API and atomically writes `public/canonical-foods.json` plus `data/fdc-resolution-report.json`. The application fails visibly if the complete canonical dataset is unavailable; it never substitutes sample composition data.

## Evidence-bounded personalization

The healthy baseline is the default. The single canonical engine supports qualitative, state-aware mechanisms for hypochlorhydria, celiac disease, Crohn's disease, ulcerative colitis, pancreatic exocrine insufficiency, bariatric surgery, gastrectomy, ileal resection, short bowel syndrome, chronic kidney disease, and chronic liver disease. Conditions do not apply generic multipliers or modify official population references; unavailable quantitative physiology remains unavailable.

## Supabase (optional persistence)

The public calculator deliberately has no browser Supabase dependency. To add persistence/authentication:

1. Create a Supabase project and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`.
2. Apply `supabase/migrations/202609230001_normalized_nutrition.sql` from a clean database using the Supabase CLI or SQL editor.
3. Import reference data using the validated importer workflow in `docs/importer-spec.md`; never use a service-role key in browser code.
4. Keep SQL reference records aligned with the canonical USDA identifiers and provenance.

A local Supabase workflow is optional: install the Supabase CLI, run `supabase start`, then apply the migration with `supabase db reset`. The MVP is usable without it.
