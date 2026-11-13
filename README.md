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
npm run images:sheet      # hoja de contactos en out/sheet-<slug>.jpg
# Revisión a tamaño completo, en tandas de cuatro:
node scripts/contact-sheet.mjs --slug=lehman --frames=1-4 --cols=2 --tile=760

# Crear esqueleto para un video nuevo
npm run new-video -- --slug=crisis-2008 --title="La crisis de 2008" --frames=10
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

## Crear un video nuevo

1. `npm run new-video -- --slug=<slug> --title="..." --frames=<N>` crea el guion vacío,
   los prompts, `meta.json` e `images.json`.
2. Escribe **una frase por plano** en `scripts/narration/<slug>.txt` y prepara un prompt por plano
   en `scripts/shots/<slug>.json`. Las imágenes generadas no deben contener texto.
3. Instala la dependencia local de voz una vez (`python3 -m pip install -r scripts/requirements.txt`)
   y ejecuta `npm run voice -- --slug=<slug>`. Requiere `ffmpeg` y `ffprobe`; produce la voz y
   `timeline.json` con tiempos por palabra.
4. Genera y revisa imágenes con
   `npm run images:gen -- --slug=<slug> --provider=cloudflare` y
   `npm run images:qa -- --slug=<slug>`. En GitHub Actions el workflow `images` acepta el slug.
5. Añade el video a `src/videos/registry.tsx` con `defineVideo(meta, timeline, images)`:

   ```tsx
   import crisisMeta from './crisis-2008/meta.json';
   import crisisImages from './crisis-2008/images.json';
   import crisisTimeline from './crisis-2008/timeline.json';

   // En VIDEOS:
   defineVideo(
     crisisMeta as VideoMeta,
     crisisTimeline as unknown as Timeline,
     crisisImages as Record<string, string>,
   ),
   ```

6. `npm run typecheck` y `npm run validate` comprueban datos, continuidad de planos, imágenes,
   voz y SFX. El workflow `render` ejecuta ambas puertas antes de empezar a renderizar.

La composición y el Player son genéricos (`src/videos/Video.tsx`): no hace falta escribir un
componente React por cada nuevo video. `scripts/validate-video.mjs` también rechaza prompts vacíos
antes del render; el generador de imágenes los rechaza antes de llamar al proveedor.

## Imágenes IA (Fase 2)

Tres piezas:

- `scripts/style.json` — hoja de estilo única (paleta, prefijo y prohibiciones). Todo prompt la hereda.
- `scripts/shots/<slug>.json` — un prompt por plano.
- `scripts/generate-images.mjs` — genera las imágenes y escribe `src/videos/<slug>/seed-map.json`.

La semilla se deriva de forma determinista: `sha256(styleId:slug:plano)`. **Ojo:** `flux-1-schnell`
no expone `seed` en su esquema REST (`prompt` y `steps` solamente), así que hoy la semilla queda
registrada en `seed-map.json` como procedencia pero no altera el resultado. Por eso las imágenes
se generan una vez, se revisan y se versionan: el render de CI nunca vuelve a llamar al modelo.

`scripts/qa-images.mjs` es la puerta de calidad: rechaza imágenes de menos de 1000 px, lienzos
vacíos, texto legible (OCR con confianza ≥ 70 %) y marcas de agua. Escribe `qa/ocr-report.json`
y sale con código 1 para cortar el workflow.

**Límite conocido del OCR:** detecta texto tipográfico, pero no lettering dibujado a mano
(inclinado, blanco sobre color, integrado en el dibujo). Un `BANK` pintado en una fachada pasó
la puerta sin ser detectado. Por eso la revisión visual a tamaño completo sigue siendo
obligatoria antes de dar un plano por bueno.

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

## Escena y sonido (Fase 3)

- `Scene` aplica Ken Burns, line boil (10 Hz) y un spring de entrada. Los bordes superior e
  inferior de la imagen se funden con el papel con una máscara de degradado asimétrica (14 % arriba,
  6 % abajo): deja de verse el rectángulo sin recortar el dibujo.
- `TopTitle` traza un subrayado de rotulador (`Marker`) y anima el número del gancho (`Counter`).
- SFX sintetizados en `scripts/sfx.mjs` (ruido filtrado y envolventes, sin samples): `whoosh`,
  `scribble`, `pop` y `thud`. Se disparan con `SfxLayer` en segundos absolutos.

```bash
node scripts/sfx.mjs   # regenera public/sfx/*.wav, determinista
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
