# Rebuild audit

## Current state, re-audited
The prior commit was a TypeScript foundation, not a web application: it had no framework dependency, no `app/page.tsx`, no `dev`/`start` scripts, no real food-selector flow, no seed data, and no environment/launch documentation. `npm install`, TypeScript, lint, tests, and TypeScript-only build passed, but it could not start a web server. `npm install next@16 react@19 react-dom@19` was attempted and failed with npm `E403` because this environment blocks registry access.

## Working-MVP decision
A dependency-free Node web server (`server.mjs`) and browser application (`public/index.html` / `public/app.js`) provide the minimum end-to-end calculator now, rather than claiming a nonexistent Next app works. The browser loads a canonical USDA JSON data source, needs no database/authentication, and fails visibly if that data cannot load. A future Next adapter can consume the same calculation/domain model when package installation is available.

## Data and migration status
The included non-destructive normalized migration remains the schema for optional persistence and has user-data RLS policies. The application requires the generated canonical FDC dataset and fails visibly if it is absent or incomplete; no composition fallback is shipped.
