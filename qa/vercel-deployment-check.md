# Vercel deployment repair check

The previous public deployment at `https://farmx-3z8b.vercel.app/` returned Vercel `404 NOT_FOUND`. The repository did not include the Nitro Vite plugin or an explicit TanStack Start framework marker, so Vercel had no correct server-function output to serve.

The Vite configuration now includes `nitro()` immediately after `tanstackStart()`, and `vercel.json` explicitly declares the TanStack Start framework. A first local Nitro runtime test exposed a circular import from the legacy custom `src/server.ts` wrapper. That entry was removed so TanStack Start now uses its standard Nitro-compatible server entry.

After a clean production build, the generated `.output` directory starts successfully with `node .output/server/index.mjs`. The production endpoint at `http://localhost:4173/` returns the complete FarmX SSR dashboard, rather than a 404 or a 500 response.
