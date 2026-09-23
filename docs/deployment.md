# Deployment

This MVP is deployable to any Node 22+ host; it is not a Next.js application because no Next.js package was present and registry access was unavailable during the rebuild.

1. Set Node to version 22 or later.
2. Run `npm ci`, `npm run lint`, `npx tsc --noEmit`, `npm test`, and `npm run build`.
3. Start with `npm start`. The process serves `dist/public` and honors `PORT`.
4. Configure a health check for `/`.

Supabase is optional. If persistence is added, configure only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in host settings and apply the migration separately. Do not configure a service-role secret for this public app.

## Vercel

Vercel's standard Next.js deployment is not applicable until a real Next.js dependency can be installed. Deploy this build with a Node-compatible host (or adapt the static `dist/public` output for static hosting). Do not claim a Next.js deployment configuration exists.
