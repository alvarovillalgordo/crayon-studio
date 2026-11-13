# Crayon Studio

Pipeline de vídeos explicativos con estética de crayón.
**Coste: 0 €/vídeo · Calor local: 0** (el render corre en GitHub Actions).

## Stack

| Pieza | Herramienta |
|---|---|
| Imágenes | Pollinations (Flux) + respaldo Cloudflare Workers AI |
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
