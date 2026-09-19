# Ruleta de nombres — Notas del proyecto

Registro de lo construido y de las decisiones tomadas.

## Qué es

Web estática, pensada para funcionar bien en celulares, para cargar nombres y elegir uno al azar con una ruleta de colores.

- **Stack:** Vite + JavaScript vanilla, sin framework.
- **Repo:** https://github.com/GALC55/SelectRandom
- **Hosting:** Cloudflare Workers (static assets) conectado a GitHub. Cada push a `main` despliega solo.

## Funcionalidades

### Carga de nombres
- **A mano:** separados por coma, punto y coma, tab o salto de línea. `Ctrl/Cmd + Enter` agrega.
- **CSV:** detecta el separador `,` o `;` (Excel en español exporta con `;`), respeta comillas y quita el BOM.
- **Excel / ODS** (`.xlsx`, `.xls`, `.ods`): lee la primera hoja.
- **TXT:** mismo parseo que la carga a mano.
- **Encabezados:** si la primera fila es un encabezado (`Nombre`, `Nombres`, `Name`, `Participantes`, `Alumnos`, `Jugadores`, `Personas`), se usan solo esas columnas. Si no, se usan todas las celdas.
- La lista se guarda en `localStorage`. Se puede quitar cada nombre, mezclar o borrar todo.

### Ruleta
- Dibujada en canvas, nítida en pantallas retina.
- Paleta de 12 colores. El texto es claro u oscuro según el fondo, y los nombres largos se cortan con `…`.
- El azar usa `crypto.getRandomValues`, sin sesgo de módulo.
- Gira tocando la ruleta, el botón central o el botón de abajo. Dura de 5 a 6 s con desaceleración, y respeta `prefers-reduced-motion`.

### Modos
Selector **Selección | Ganador**. El modo elegido se guarda en `localStorage`.

| | Selección | Ganador |
|---|---|---|
| Título del dialog | "Resultado" | 🏆 "¡Ganador!" |
| Confeti | No | Sí |
| Quitar de la lista | Botón y casilla de quitar automático | No existe |
| Botones | Quitar de la lista / Continuar | Girar de nuevo / Cerrar |
| Rueda después del giro | Normal | El segmento ganador queda marcado (resto oscurecido) y su chip de la lista en dorado |

En modo Ganador, la marca se borra al volver a girar, al editar la lista o al cambiar de modo.

### Nombres forzados / excluidos (env de build)
Variables opcionales. Los nombres van separados por coma.

- `VITE_EXCLUDE_NAMES`: nunca ganan.
- `VITE_FORCE_NAMES`: si alguno está en la lista, gana uno de ellos al azar.

Reglas (`src/pick.js`):
1. Candidatos = forzados que están en la lista y no están excluidos.
2. Si no hay ninguno: todos los que no están excluidos.
3. Si todos están excluidos: sorteo normal, para que el giro nunca se trabe.
4. Si un nombre está en las dos listas, gana la exclusión.

Coincidencia:
- No distingue mayúsculas ni acentos, e ignora espacios de más.
- Tiene que ser el nombre completo: `jose perez` = `José Pérez`, pero `jose` ≠ `José Pérez`.

La animación siempre cae dentro del segmento elegido, así que se ve natural.

⚠️ **Advertencias:**
- Vite incluye las variables en el JS publicado, así que son visibles en DevTools.
- Se aplican en los **dos modos**. En Selección, los forzados salen primero.
- Como son de build, al cambiarlas hay que redesplegar.

## Estructura

```
index.html            UI (header, selector de modo, ruleta, panel, dialog)
src/main.js           estado, eventos, modos, persistencia
src/wheel.js          clase Wheel (canvas, giro, resaltado), paleta, randomInt
src/pick.js           elección del ganador (reglas de env)
src/parse.js          parseo de texto / CSV / Excel (SheetJS con carga diferida)
src/confetti.js       animación de confeti
src/style.css         estilos (tema oscuro, responsive)
public/_headers       headers de seguridad + caché larga en /assets/*
public/favicon.svg
wrangler.toml         config de Cloudflare Workers (sirve ./dist, fallback SPA)
vite.config.js        chunkSizeWarningLimit (SheetJS pesa ~500 KB sin comprimir)
.env.example          plantilla de variables de build
.redeploy             marca de tiempo para forzar un redeploy
```

**SheetJS** (`xlsx`) se instala desde el CDN oficial (`cdn.sheetjs.com`), porque la versión de npm está desactualizada y tiene CVEs. Se carga con `import()` solo al subir un Excel: la carga inicial pesa ~6 KB gzip.

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # genera dist/
```

Para probar las variables en local, creá un `.env` (está en `.gitignore`) a partir de `.env.example`. Después de editarlo hay que reiniciar `npm run dev`.

## Deploy (Cloudflare Workers Builds)

Se basó en la configuración de `PaginaZia` (Workers static assets). No se usa GitHub Actions: Cloudflare está conectado directo al repo.

Configuración del Worker:
- **Nombre:** `select-random`. Tiene que coincidir con `name` en `wrangler.toml`.
- **Build command:** `npm run build`
- **Deploy command:** `npx wrangler deploy`
- **Root directory:** `/`
- **Variables de build:** Settings → Build → *Variables and secrets* (no las de runtime).

Redeploy sin cambios de código:
- **Commit vacío:** no sirve. Workers Builds lo saltea porque no toca archivos (*build watch paths*).
- **Commit que cambia `.redeploy`:** sí dispara el build.
- **Dashboard:** Deployments → *Retry build*.

## Git / GitHub

- Los commits salen como `GALC55`.
- En el llavero de macOS había otra credencial (`Gus5554`) sin acceso al repo. Por eso el remote incluye el usuario: `https://GALC55@github.com/GALC55/SelectRandom.git`. Así el llavero guarda una credencial aparte para GALC55.
- Se necesita un token classic con los scopes `repo` + `workflow`.
- ⚠️ Pendiente: rotar el token que se pegó en el chat y actualizarlo en el llavero.

## Historial

1. Versión inicial: carga manual / CSV / Excel, ruleta, deploy con GitHub Actions.
2. Se reemplazó GitHub Actions por Workers Builds (Cloudflare conectado al repo).
3. Textos en español neutro (antes con voseo).
4. Modos Selección y Ganador.
5. Nombres forzados / excluidos con variables de entorno de build.
6. Archivo `.redeploy` para forzar builds.
