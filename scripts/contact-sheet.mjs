#!/usr/bin/env node
/**
 * Hoja de contactos para revisar los planos de un video de un vistazo.
 *
 * Uso: node scripts/contact-sheet.mjs --slug=lehman
 * Salida: out/sheet-<slug>.jpg
 *
 * Si images.json esta vacio, usa los placeholders de public/<slug>/NN.png.
 * Es una herramienta de revision: el texto de las etiquetas no acaba en el video.
 */
import {mkdir, readFile, access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import sharp from 'sharp';
import {readJson} from './lib/prompts.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, '').split('=');
    return [key, value ?? 'true'];
  }),
);
const slug = args.get('slug') ?? 'lehman';

const COLUMNS = Number(args.get('cols') ?? 4);
const TILE = Number(args.get('tile') ?? 380);
const GAP = 12;
const LABEL = 34;

const only = args.has('frames')
  ? new Set(
      args
        .get('frames')
        .split(',')
        .flatMap((part) => {
          const [from, to] = part.split('-').map(Number);
          if (!to) return [from];
          return Array.from({length: to - from + 1}, (_, index) => from + index);
        }),
    )
  : null;

const exists = async (file) => {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
};

const readJsonIfExists = async (file) => {
  try {
    return await readJson(file);
  } catch {
    return null;
  }
};

const generated =
  (await readJsonIfExists(path.join(ROOT, `src/videos/${slug}/images.json`))) ?? {};

const frames = Array.from({length: 13}, (_, index) => index + 1).filter(
  (frame) => !only || only.has(frame),
);

const tiles = [];
for (const frame of frames) {
  const pad = String(frame).padStart(2, '0');
  const entry = generated[String(frame)];
  const generatedPath = typeof entry === 'string' ? entry : entry?.src;
  const file = generatedPath
    ? path.join(ROOT, 'public', generatedPath)
    : path.join(ROOT, `public/${slug}/${pad}.png`);

  if (!(await exists(file))) {
    console.log(`[${pad}] sin imagen, se omite`);
    continue;
  }
  tiles.push({frame, file});
}

if (tiles.length === 0) {
  console.error('No hay imagenes para montar la hoja.');
  process.exit(1);
}

const rows = Math.ceil(tiles.length / COLUMNS);
const width = COLUMNS * TILE + (COLUMNS + 1) * GAP;
const height = rows * (TILE + LABEL) + (rows + 1) * GAP;
const composites = [];

for (const [index, tile] of tiles.entries()) {
  const column = index % COLUMNS;
  const row = Math.floor(index / COLUMNS);
  const left = GAP + column * (TILE + GAP);
  const top = GAP + row * (TILE + LABEL + GAP);

  const image = await sharp(tile.file)
    .resize(TILE, TILE, {fit: 'cover'})
    .toBuffer();

  composites.push({input: image, left, top});

  const label = Buffer.from(
    `<svg width="${TILE}" height="${LABEL}">
       <rect width="100%" height="100%" fill="#12100E"/>
       <text x="12" y="24" font-family="monospace" font-size="20" fill="#F5EDE0">
         ${String(tile.frame).padStart(2, '0')}
       </text>
     </svg>`,
  );
  composites.push({input: label, left, top: top + TILE});
}

await mkdir(path.join(ROOT, 'out'), {recursive: true});
const suffix = only ? `-${args.get('frames').replace(/[^0-9,-]/g, '')}` : '';
const output = path.join(ROOT, `out/sheet-${slug}${suffix}.jpg`);

await sharp({
  create: {
    width,
    height,
    channels: 3,
    background: '#2a2622',
  },
})
  .composite(composites)
  .jpeg({quality: 88})
  .toFile(output);

console.log(`${tiles.length} planos -> ${path.relative(ROOT, output)} (${width}x${height})`);
