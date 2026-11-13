# Crayon Studio

Pipeline de vídeos explicativos con estética de crayón.
**Coste: 0 €/vídeo · Calor local: 0** (el render corre en GitHub Actions).

## Stack

| Pieza | Herramienta |
|---|---|
| Imágenes | Cloudflare Workers AI (`flux-1-schnell`, 10.000 neuronos/día gratis) |
| Voz | `edge-tts` (`es-ES-AlvaroNeural`) |
| Música | YouTube Audio Library / Freesound (CC0) |
| Montaje | Remotion 4 |
| Render | GitHub Actions |
| Preview | Remotion Player en GitHub Pages |

## Comandos

```bash
npm install                # una sola vez (~1 GB con Chrome headless y cache)
npm run dev                # Remotion Studio (opcional, local)
npm run player             # preview web en local
npm run typecheck          # comprobación de tipos

# Render local (solo para depurar; calienta el Mac)
npm run render -- Demo out/demo.mp4

# Still de un frame (mucho más ligero)
npm run still -- Demo out/frame.png --frame=90

# Imágenes IA + puerta de calidad (OCR)
npm run images:gen
npm run images:qa
```

## Estructura

```
src/
  index.ts             entrada de Remotion
  Root.tsx             registro de composiciones
  theme.ts             paleta, tipografías, formato, safe areas
  fonts.ts             carga de fuentes OFL locales
  components/          piezas reutilizables (Paper, Karaoke, ...)
  videos/<slug>/       cada vídeo: composición, shots.json, audio, imágenes
player/                preview web (GitHub Pages)
public/
  fonts/               tipografías OFL versionadas
  demo/                assets de la composición Demo
scripts/               TTS, generación de imágenes, QA
.github/workflows/     render.yml y pages.yml
```

## Imágenes IA (Fase 2)

Tres piezas:

- `scripts/style.json` — hoja de estilo única (paleta, prefijo y prohibiciones). Todo prompt la hereda.
- `scripts/shots/<slug>.json` — un prompt por plano.
- `scripts/generate-images.mjs` — genera las imágenes y escribe `src/videos/<slug>/seed-map.json`.

La semilla es determinista: `sha256(styleId:slug:plano)`. Mismo prompt + misma semilla = misma imagen.
Si cambias un plano, su hash cambia y solo ese plano se regenera; el resto se salta.

`scripts/qa-images.mjs` es la puerta de calidad: rechaza imágenes de menos de 1000 px, lienzos
vacíos, texto legible (OCR con confianza ≥ 70 %) y marcas de agua. Escribe `qa/ocr-report.json`
y sale con código 1 para cortar el workflow.

En CI: workflow `images`, manual (`workflow_dispatch`). Necesita dos secretos:

| Secreto | Valor |
|---|---|
| `CLOUDFLARE_API_TOKEN` | token con permiso *Account → Workers AI → Read* |
| `CLOUDFLARE_ACCOUNT_ID` | ID de cuenta (dashboard de Workers AI) |

```bash
gh secret set CLOUDFLARE_API_TOKEN
gh secret set CLOUDFLARE_ACCOUNT_ID
```

Pollinations queda solo como prueba de humo (`--provider=pollinations`): su nivel gratuito está
limitado a 1 imagen/45 s, 768 px y lleva marca de agua.

Coste real: `flux-1-schnell` ≈ 57,6 neuronos por imagen 1024². Un vídeo de 13 planos ≈ 750,
el 7,5 % del cupo diario gratuito.

## CI

- **`render.yml`** — manual (`workflow_dispatch`) o al empujar un tag `v*`.
  Instala dependencias, cachea Chrome headless y sube el MP4 como artefacto (14 días).
- **`pages.yml`** — publica el Player en GitHub Pages al hacer push a `main`.

Para activar Pages: *Settings → Pages → Source: GitHub Actions*.

## Tipografías

Caveat, Patrick Hand y Barlow Condensed, todas bajo SIL Open Font License.
Se versionan en `public/fonts` para que el render sea reproducible y offline.

## Licencias

- Remotion: gratis para individuos y equipos de hasta 3 personas.
- Música: solo pistas libres de Content ID (YouTube Audio Library o CC0).
- Imágenes IA: revisar términos del proveedor antes de monetizar.
