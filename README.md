# Ruleta de nombres

Web estática (Vite + JS vanilla) para cargar nombres (a mano, CSV o Excel) y elegir uno al azar con una ruleta.

## Desarrollo

```bash
npm install
npm run dev
```

## Deploy en Cloudflare (Workers static assets)

Config en `wrangler.toml` (sirve `./dist`).

**Manual:**

```bash
npx wrangler login
npm run deploy
```

**Automático (GitHub Actions):** `.github/workflows/deploy.yml` despliega en cada push a `main`.
Secrets requeridos en el repo (mismos nombres que PaginaZia):

- `CF_API_TOKEN` — token con permiso *Workers Scripts: Edit*
- `CF_ACCOUNT_ID`

URL resultante: `https://select-random.<tu-subdominio>.workers.dev` (dominio propio: Workers → Settings → Domains & Routes).
