# Deployment

This MVP is deployable to any Node 22+ host; it is not a Next.js application because no Next.js package was present and registry access was unavailable during the rebuild.

1. Set Node to version 22 or later.
2. Run `npm ci`, `npm run lint`, `npx tsc --noEmit`, `npm test`, and `npm run build`.
3. Start with `npm start`. The process serves `dist/public` and honors `PORT`.
4. Configure a health check for `/`.

Supabase is optional. If persistence is added, configure only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in host settings and apply **both** migrations, in timestamp order, separately. Do not configure a service-role secret for this public app. The `.env.example` file lists every supported environment variable without secrets.

## Supabase migration and rollback

Use a clean local database to validate schema changes before production:

```bash
supabase start
supabase db reset
```

`202609230001_normalized_nutrition.sql` creates the canonical reference and user-data schema, and `202609230002_complete_canonical_pipeline.sql` extends it with pipeline, supplement, and biomarker tables. User-owned tables have row-level security and ownership policies; verify them against the deployed project's authenticated and anonymous roles before enabling persistence.

Back up the production database before applying a migration. Roll back an application release by redeploying the preceding build. Database migrations are additive and do not have an automatic down migration: restore the verified backup, or use a reviewed, explicit SQL reversal prepared for the exact migration, rather than dropping live tables ad hoc.

## Vercel

Vercel's standard Next.js deployment is not applicable until a real Next.js dependency can be installed. Deploy this build with a Node-compatible host (or adapt the static `dist/public` output for static hosting). Do not claim a Next.js deployment configuration exists.
