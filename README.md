# Ruleta de nombres

Web estática (Vite + JS vanilla) para cargar nombres (a mano, CSV o Excel) y elegir uno al azar con una ruleta.

## Desarrollo

```bash
npm install
npm run dev
```

## Deploy en Cloudflare (Workers Builds)

Repo conectado a Cloudflare Workers vía GitHub: cada push a `main` despliega solo.
Config de assets en `wrangler.toml` (sirve `./dist`).

Settings del Worker (Settings → Build):

- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Root directory: `/`

Deploy manual (opcional): `npx wrangler login && npm run deploy`
