#!/usr/bin/env node
/**
 * Crea el esqueleto para un nuevo video en el canal.
 *
 * Uso:
 *   node scripts/new-video.mjs --slug=crisis-2008 --title="La crisis de 2008" --frames=10
 *
 * Crea:
 *   - scripts/narration/<slug>.txt
 *   - scripts/shots/<slug>.json
 *   - src/videos/<slug>/meta.json
 *   - src/videos/<slug>/images.json
 *   - public/<slug>/.gitkeep
 */
import {mkdir, writeFile, access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const args = new Map(
  process.argv.slice(2).map((arg) => {
    const separator = arg.indexOf('=');
    const key = (separator < 0 ? arg : arg.slice(0, separator)).replace(/^--/, '');
    const value = separator < 0 ? undefined : arg.slice(separator + 1);
    return [key, value ?? 'true'];
  }),
);

const slug = args.get('slug');
const title = args.get('title') ?? slug;
const frames = Number(args.get('frames') ?? 8);

if (!slug) {
  console.error('Uso: node scripts/new-video.mjs --slug=<nombre> --title="..." --frames=<N>');
  process.exit(1);
}
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
  console.error('El slug solo puede contener letras minusculas, numeros y guiones.');
  process.exit(1);
}
if (!Number.isInteger(frames) || frames < 1 || frames > 40) {
  console.error('--frames debe ser un entero entre 1 y 40.');
  process.exit(1);
}

const exists = async (file) => {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
};

const narrationPath = path.join(ROOT, `scripts/narration/${slug}.txt`);
const shotsPath = path.join(ROOT, `scripts/shots/${slug}.json`);
const metaPath = path.join(ROOT, `src/videos/${slug}/meta.json`);
const imagesPath = path.join(ROOT, `src/videos/${slug}/images.json`);
const gitkeepPath = path.join(ROOT, `public/${slug}/.gitkeep`);

const targets = [narrationPath, shotsPath, metaPath, imagesPath, gitkeepPath];
const collisions = [];
for (const target of targets) {
  if (await exists(target)) collisions.push(path.relative(ROOT, target));
}
if (collisions.length > 0) {
  console.error(`No creo el esqueleto: ya existen archivos para '${slug}':`);
  collisions.forEach((target) => console.error(`  - ${target}`));
  process.exit(1);
}

await mkdir(path.dirname(narrationPath), {recursive: true});
await mkdir(path.dirname(shotsPath), {recursive: true});
await mkdir(path.dirname(metaPath), {recursive: true});
await mkdir(path.dirname(imagesPath), {recursive: true});
await mkdir(path.dirname(gitkeepPath), {recursive: true});

// 1. Narration
const narrationLines = Array.from(
  {length: frames},
  (_, i) => `# Plano ${i + 1}\nEscribe aqui la frase para el plano ${i + 1}.`,
).join('\n\n');
await writeFile(narrationPath, narrationLines + '\n', 'utf8');

// 2. Shots
const shots = {
  slug,
  title,
  note: 'Un prompt por plano. Sin texto: todo el texto lo dibuja Remotion.',
  shots: Array.from({length: frames}, (_, i) => ({
    frame: i + 1,
    prompt: '',
  })),
  animation: 'crayon line art, simple stick figures, pastel paper background, children book illustration',
};
await writeFile(shotsPath, JSON.stringify(shots, null, 2) + '\n', 'utf8');

// 3. Meta
const id = slug
  .split('-')
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join('');
const meta = {
  id,
  slug,
  title,
  titles: Object.fromEntries(
    Array.from({length: frames}, (_, i) => [String(i + 1), {text: `PLANO ${i + 1}`}]),
  ),
};
await writeFile(metaPath, JSON.stringify(meta, null, 2) + '\n', 'utf8');

// 4. Images json
await writeFile(imagesPath, '{}\n', 'utf8');

// 5. Gitkeep
await writeFile(gitkeepPath, '', 'utf8');

console.log(`Esqueleto creado para "${slug}" (${frames} planos):\n`);
console.log(`  1. Rellena el guion:  scripts/narration/${slug}.txt`);
console.log(`  2. Genera la voz:    npm run voice -- --slug=${slug}`);
console.log(`  3. Rellena prompts:  scripts/shots/${slug}.json`);
console.log(`  4. Genera imagenes:  node scripts/generate-images.mjs --slug=${slug} --provider=cloudflare`);
console.log(`  5. Registralo en:    src/videos/registry.tsx`);
console.log(`  6. Valida y render:  npm run validate\n`);
