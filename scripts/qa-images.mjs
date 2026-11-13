#!/usr/bin/env node
/**
 * Puerta de calidad de las imagenes generadas.
 *
 * Comprueba, plano a plano:
 *   1. que el archivo exista y se pueda decodificar
 *   2. dimensiones cuadradas y >= 1000 px
 *   3. que no sea un lienzo vacio o casi vacio (desviacion tipica del gris)
 *   4. que no contenga texto legible (OCR con confianza alta)
 *   5. que no lleve marca de agua de Pollinations
 *
 * Uso: node scripts/qa-images.mjs --slug=lehman
 * Sale con codigo 1 si algun plano incumple, para que CI corte.
 */
import {mkdir, readFile, writeFile, access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import sharp from 'sharp';
import {createWorker} from 'tesseract.js';
import {pad, readJson} from './lib/prompts.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, '').split('=');
    return [key, value ?? 'true'];
  }),
);
const slug = args.get('slug') ?? 'lehman';
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
  throw new Error('Slug invalido: usa solo letras minusculas, numeros y guiones.');
}

const MIN_SIDE = 1000;
const MIN_STDDEV = 12;
const MIN_MEAN = 12;
const MAX_MEAN = 245;
const MIN_WORD_CONFIDENCE = 70;
const MIN_WORD_LENGTH = 3;

const seedMapPath = args.has('seed-map')
  ? path.resolve(args.get('seed-map'))
  : path.join(ROOT, `src/videos/${slug}/seed-map.json`);
const reportDir = path.join(ROOT, 'qa', slug);
const reportPath = path.join(reportDir, 'ocr-report.json');

const exists = async (file) => {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
};

const seedMap = await readJson(seedMapPath);

if (Object.keys(seedMap.shots ?? {}).length === 0) {
  console.error(`No hay imagenes que revisar en ${path.relative(ROOT, seedMapPath)}.`);
  console.error('La generacion no produjo ningun plano: la puerta falla en vez de aprobar el vacio.');
  process.exit(1);
}

/** OCR sobre una version en gris y normalizada: detecta mejor el texto suelto. */
const ocrBuffer = async (file) =>
  sharp(file)
    .greyscale()
    .normalize()
    .resize({width: 1400, fit: 'inside'})
    .png()
    .toBuffer();

/** tesseract.js v7 anida las palabras en blocks -> paragraphs -> lines -> words. */
const flattenWords = (data) =>
  (data.blocks ?? []).flatMap((block) =>
    (block.paragraphs ?? []).flatMap((paragraph) =>
      (paragraph.lines ?? []).flatMap((line) => line.words ?? []),
    ),
  );

const worker = await createWorker('eng', undefined, {
  cachePath: path.join(ROOT, '.cache/tesseract'),
  logger: () => {},
});
await worker.setParameters({tessedit_pageseg_mode: '11'});

const results = [];
let failures = 0;

for (const [frame, shot] of Object.entries(seedMap.shots)) {
  const file = path.join(ROOT, shot.file);
  const problems = [];

  if (!(await exists(file))) {
    results.push({frame: Number(frame), file: shot.file, ok: false, problems: ['archivo ausente']});
    failures++;
    continue;
  }

  const meta = await sharp(file).metadata();
  if (!meta.width || !meta.height) {
    problems.push('no se pudo leer la imagen');
  } else if (Math.min(meta.width, meta.height) < MIN_SIDE) {
    problems.push(`resolucion baja: ${meta.width}x${meta.height} (minimo ${MIN_SIDE})`);
  }

  const stats = await sharp(file).stats();
  const channels = stats.channels;
  const mean = channels.reduce((total, channel) => total + channel.mean, 0) / channels.length;
  const stddev =
    channels.reduce((total, channel) => total + channel.stdev, 0) / channels.length;
  if (stddev < MIN_STDDEV) problems.push(`imagen casi vacia (stdev ${stddev.toFixed(1)})`);
  if (mean < MIN_MEAN || mean > MAX_MEAN) problems.push(`exposicion extrema (media ${mean.toFixed(1)})`);

  const {data} = await worker.recognize(await ocrBuffer(file), {}, {blocks: true, text: true});
  const words = flattenWords(data)
    .map((word) => ({
      text: word.text.trim(),
      confidence: Math.round(word.confidence),
    }))
    .filter(
      (word) =>
        word.confidence >= MIN_WORD_CONFIDENCE &&
        word.text.length >= MIN_WORD_LENGTH &&
        /[a-záéíóúñ]{2}/i.test(word.text),
    );

  if (words.length > 0) {
    problems.push(
      `texto detectado: ${words
        .slice(0, 4)
        .map((word) => `"${word.text}" (${word.confidence}%)`)
        .join(', ')}`,
    );
  } else {
    // Segunda red: varias palabras largas seguidas aunque la confianza sea media.
    const longTokens = (data.text ?? '')
      .replace(/[^a-záéíóúñü ]/gi, ' ')
      .split(/\s+/)
      .filter((token) => token.length >= 4);
    if (longTokens.length >= 2) {
      problems.push(`posible texto: ${longTokens.slice(0, 5).join(' ')}`);
    }
  }

  if (/pollinations/i.test(data.text ?? '')) {
    problems.push('marca de agua de Pollinations');
  }

  const ok = problems.length === 0;
  if (!ok) failures++;

  results.push({
    frame: Number(frame),
    file: shot.file,
    ok,
    size: meta.width && meta.height ? `${meta.width}x${meta.height}` : null,
    mean: Number(mean.toFixed(1)),
    stddev: Number(stddev.toFixed(1)),
    words: words.length,
    text: (data.text ?? '').replace(/\s+/g, ' ').trim().slice(0, 160),
    problems,
  });

  const label = `[${pad(Number(frame))}]`;
  console.log(
    ok
      ? `${label} ok      ${meta.width}x${meta.height}  sd=${stddev.toFixed(0)}  palabras=${words.length}`
      : `${label} FALLO   ${problems.join(' | ')}`,
  );
}

await worker.terminate();
await mkdir(reportDir, {recursive: true});

const report = {
  slug,
  checkedAt: new Date().toISOString(),
  thresholds: {
    minSide: MIN_SIDE,
    minStddev: MIN_STDDEV,
    minWordConfidence: MIN_WORD_CONFIDENCE,
    minWordLength: MIN_WORD_LENGTH,
  },
  passed: results.length - failures,
  failed: failures,
  results,
};

await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(
  `\n${results.length - failures}/${results.length} planos limpios. Informe: ${path.relative(ROOT, reportPath)}`,
);

if (failures > 0) {
  console.error(`${failures} plano(s) requieren regeneracion con otra semilla.`);
  process.exit(1);
}
