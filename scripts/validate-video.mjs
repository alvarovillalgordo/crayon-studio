#!/usr/bin/env node
/**
 * Puerta de calidad previa al render: comprueba que un video tiene todo
 * lo que necesita y que los datos son coherentes entre si.
 *
 * Uso:
 *   node scripts/validate-video.mjs            # todos los videos
 *   node scripts/validate-video.mjs --slug=lehman
 *
 * Comprueba, por video:
 *   - meta.json (id, slug, titulos de todos los planos)
 *   - timeline.json (planos contiguos, sin huecos ni solapes, palabras dentro)
 *   - images.json + archivos (existen, >= 1000 px, tamano razonable)
 *   - voz (public/<slug>/voice.mp3) y duracion
 *   - SFX compartidos
 *   - shots.json (un prompt por plano)
 *
 * Sale con codigo 1 si hay errores: corta el workflow antes de renderizar.
 */
import {readdir, readFile, access, stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const VIDEOS_DIR = path.join(ROOT, 'src/videos');
const SFX = ['whoosh', 'scribble', 'pop', 'thud'];
const MIN_SIZE = 1000;
const MIN_BYTES = 8000;
const TOLERANCE = 0.06;

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, '').split('=');
    return [key, value ?? 'true'];
  }),
);

const errors = [];
const warnings = [];

const error = (slug, message) => errors.push(`[${slug}] ${message}`);
const warn = (slug, message) => warnings.push(`[${slug}] ${message}`);

const exists = async (file) => {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
};

const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));

const probeDuration = (file) => {
  try {
    const out = execFileSync(
      'ffprobe',
      [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        file,
      ],
      {encoding: 'utf8'},
    );
    return Number(out.trim());
  } catch {
    return null;
  }
};

/* ------------------------------------------------------------------ video */

const validateVideo = async (slug) => {
  const dir = path.join(VIDEOS_DIR, slug);
  const metaPath = path.join(dir, 'meta.json');
  const timelinePath = path.join(dir, 'timeline.json');
  const imagesPath = path.join(dir, 'images.json');

  for (const [label, file] of [
    ['meta.json', metaPath],
    ['timeline.json', timelinePath],
    ['images.json', imagesPath],
  ]) {
    if (!(await exists(file))) {
      error(slug, `falta ${label}`);
      return;
    }
  }

  const meta = await readJson(metaPath);
  const timeline = await readJson(timelinePath);
  const images = await readJson(imagesPath);

  if (!meta.id) error(slug, 'meta.json sin id de composicion');
  if (meta.slug !== slug) {
    error(slug, `meta.slug="${meta.slug}" no coincide con la carpeta "${slug}"`);
  }
  if (!meta.title) warn(slug, 'meta.json sin titulo legible');

  const scenes = timeline.scenes ?? [];
  if (scenes.length === 0) {
    error(slug, 'timeline.json sin planos');
    return;
  }

  const duration = Number(timeline.video_duration);
  if (!Number.isFinite(duration) || duration <= 1) {
    error(slug, `video_duration invalida: ${timeline.video_duration}`);
  }

  /* planos: numeracion, orden y continuidad */
  const frames = scenes.map((scene) => scene.frame);
  const expected = scenes.map((_, index) => index + 1);
  if (frames.join(',') !== expected.join(',')) {
    error(slug, `planos no numerados 1..${scenes.length}: ${frames.join(',')}`);
  }

  scenes.forEach((scene, index) => {
    const previous = scenes[index - 1];
    if (previous && scene.start < previous.start) {
      error(slug, `plano ${scene.frame} empieza antes que el anterior`);
    }
    if (previous && Math.abs(scene.start - previous.end) > TOLERANCE) {
      error(
        slug,
        `hueco o solape entre planos ${previous.frame} y ${scene.frame} ` +
          `(${previous.end.toFixed(2)} → ${scene.start.toFixed(2)})`,
      );
    }
    if (scene.end - scene.start <= 0.2) {
      error(slug, `plano ${scene.frame} dura ${(scene.end - scene.start).toFixed(2)}s`);
    }

    const title = meta.titles?.[String(scene.frame)];
    if (!title?.text) warn(slug, `plano ${scene.frame} sin titulo`);

    const words = (timeline.lines ?? [])
      .flatMap((line) => line.words ?? [])
      .filter((word) => word.start >= scene.start - TOLERANCE && word.start < scene.end);
    if (words.length === 0) {
      error(slug, `plano ${scene.frame} sin palabras: karaoke vacio`);
    }
    const outside = (timeline.lines ?? [])
      .flatMap((line) => line.words ?? [])
      .filter(
        (word) =>
          word.start >= scene.start &&
          word.start < scene.end &&
          word.end > scene.end + 0.25,
      );
    if (outside.length > 0) {
      warn(
        slug,
        `plano ${scene.frame}: ${outside.length} palabra(s) acaban despues del plano`,
      );
    }
  });

  if (scenes[0].start > TOLERANCE) {
    error(slug, `el primer plano empieza en ${scenes[0].start.toFixed(2)}s, no en 0`);
  }
  const last = scenes[scenes.length - 1];
  if (Math.abs(last.end - duration) > TOLERANCE) {
    error(
      slug,
      `el ultimo plano acaba en ${last.end.toFixed(2)}s y el video dura ${duration.toFixed(2)}s`,
    );
  }

  /* imagenes */
  for (const scene of scenes) {
    const rel = images[String(scene.frame)];
    if (!rel) {
      error(slug, `plano ${scene.frame} sin imagen en images.json`);
      continue;
    }
    const file = path.join(ROOT, 'public', rel);
    if (!(await exists(file))) {
      error(slug, `plano ${scene.frame}: no existe public/${rel}`);
      continue;
    }
    const {size} = await stat(file);
    if (size < MIN_BYTES) {
      error(slug, `plano ${scene.frame}: ${(size / 1024).toFixed(0)} KB, parece vacia`);
    }
    const info = await sharp(file).metadata();
    if ((info.width ?? 0) < MIN_SIZE || (info.height ?? 0) < MIN_SIZE) {
      error(
        slug,
        `plano ${scene.frame}: ${info.width}x${info.height}, minimo ${MIN_SIZE}px`,
      );
    }
  }

  /* voz */
  const voice = path.join(ROOT, 'public', slug, 'voice.mp3');
  if (!(await exists(voice))) {
    error(slug, `falta public/${slug}/voice.mp3`);
  } else {
    const voiceDuration = probeDuration(voice);
    if (voiceDuration === null) {
      warn(slug, 'no se pudo medir la voz (ffprobe no disponible)');
    } else if (Math.abs(voiceDuration - duration) > 2) {
      error(
        slug,
        `la voz dura ${voiceDuration.toFixed(2)}s y el video ${duration.toFixed(2)}s`,
      );
    }
  }

  /* prompts */
  const shotsPath = path.join(ROOT, `scripts/shots/${slug}.json`);
  if (!(await exists(shotsPath))) {
    error(slug, `falta scripts/shots/${slug}.json`);
  } else {
    const shots = (await readJson(shotsPath)).shots ?? [];
    const shotFrames = shots.map((shot) => shot.frame);
    if (shotFrames.join(',') !== frames.join(',')) {
      error(
        slug,
        `shots.json tiene planos ${shotFrames.join(',')} y el timeline ${frames.join(',')}`,
      );
    }
    const empty = shots.filter((shot) => !shot.prompt?.trim());
    if (empty.length > 0) {
      error(
        slug,
        `sin prompt: ${empty.map((shot) => shot.frame).join(', ')}`,
      );
    }
  }

  return {slug, scenes: scenes.length, duration};
};

/* -------------------------------------------------------------------- sfx */

const validateSfx = async () => {
  for (const name of SFX) {
    const file = path.join(ROOT, `public/sfx/${name}.wav`);
    if (!(await exists(file))) {
      error('sfx', `falta public/sfx/${name}.wav (npm run sfx)`);
      continue;
    }
    const {size} = await stat(file);
    if (size < 4000) error('sfx', `${name}.wav solo pesa ${size} bytes`);
  }
};

/* ------------------------------------------------------------------- main */

const entries = await readdir(VIDEOS_DIR, {withFileTypes: true});
const slugs = args.has('slug')
  ? [args.get('slug')]
  : entries
      .filter((entry) => entry.isDirectory() && entry.name !== 'demo')
      .map((entry) => entry.name)
      .filter((name, index, all) => all.indexOf(name) === index)
      .sort();

const found = [];
for (const slug of slugs) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    error(slug, 'slug invalido: usa solo letras minusculas, numeros y guiones');
    continue;
  }
  if (!(await exists(path.join(VIDEOS_DIR, slug, 'timeline.json')))) {
    warn(slug, 'sin timeline.json, se omite');
    continue;
  }
  const result = await validateVideo(slug);
  if (result) found.push(result);
}

await validateSfx();

for (const video of found) {
  console.log(
    `\u2713 ${video.slug.padEnd(10)} ${String(video.scenes).padStart(2)} planos  ${video.duration.toFixed(2)}s`,
  );
}

if (warnings.length > 0) {
  console.log('\nAvisos:');
  warnings.forEach((message) => console.log(`  ! ${message}`));
}

if (errors.length > 0) {
  console.error('\nErrores:');
  errors.forEach((message) => console.error(`  x ${message}`));
  console.error(`\n${errors.length} error(es): el render no debe continuar.`);
  process.exit(1);
}

console.log('\nTodo en orden.');
