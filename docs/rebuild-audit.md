# Rebuild audit

## Baseline
The supplied repository contains only `.gitkeep` and the initial commit: no application, package manifest, Next.js installation, SQL, tests, importers, server actions, Supabase client, or `AGENTS.md`. `npm run lint`, `npm test`, and `npm run build` fail because `package.json` was absent; `npx tsc --noEmit` printed help and exited 1 because no project existed. Consequently there are no active calculation paths, registries, coefficients, duplicate naming/target systems, old files, or extant RLS policies to preserve or migrate.

## Migration strategy
This rebuild starts with a normalized, form-aware schema and uses a non-destructive migration. Legacy import must first validate and preview rows, then map old food and nutrient identifiers to `foods` and `nutrient_forms`, dry-run, transact, and compare row counts. No production reset is included.

## Scientific audit position
No inherited scientific constants exist. New modeled quantities are ranges, carry evidence IDs/assumptions, and intentionally stop at gross intake when absorption is not defensibly modeled.
