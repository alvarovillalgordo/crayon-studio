#!/usr/bin/env node
/**
 * Genera las imagenes de un video a partir de scripts/shots/<slug>.json.
 *
 * Uso:
 *   node scripts/generate-images.mjs --slug=lehman
 *   node scripts/generate-images.mjs --slug=lehman --only=3,7 --force
 *   node scripts/generate-images.mjs --slug=lehman --provider=pollinations
 *
 * Proveedores:
 *   cloudflare  Workers AI flux-1-schnell (10.000 neuronos/dia gratis, sin marca de agua)
 *   pollinations  sin clave, pero 1 imagen/45 s, modelo sana y marca de agua
 *
 * Nunca imprime credenciales. Si falta la clave en CI, falla en vez de degradar.
 */
import {mkdir, readFile, writeFile, access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import sharp from 'sharp';
import {
  buildPrompt,
  pad,
  readJson,
  seedFor,
  sha256,
  sleep,
} from './lib/prompts.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, '').split('=');
    return [key, value ?? 'true'];
  }),
);

const slug = args.get('slug') ?? 'lehman';
const providerArg = args.get('provider') ?? 'auto';
const force = args.get('force') === 'true';
const only = args.has('only')
  ? new Set(args.get('only').split(',').map((n) => Number(n.trim())))
  : null;

const style = await readJson(path.join(ROOT, 'scripts/style.json'));
const storyboard = await readJson(path.join(ROOT, `scripts/shots/${slug}.json`));

const outDir = path.join(ROOT, `public/${slug}/ai`);
const seedMapPath = path.join(ROOT, `src/videos/${slug}/seed-map.json`);
const imagesJsonPath = path.join(ROOT, `src/videos/${slug}/images.json`);
const cacheDir = path.join(ROOT, '.cache');

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

const resolveProvider = () => {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;

  if (providerArg === 'cloudflare') {
    if (!token || !account) {
      throw new Error(
        'Faltan CLOUDFLARE_API_TOKEN o CLOUDFLARE_ACCOUNT_ID. En local: exportalos o usa --provider=pollinations.',
      );
    }
    return {name: 'cloudflare', token, account};
  }

  if (providerArg === 'pollinations') return {name: 'pollinations'};

  if (token && account) return {name: 'cloudflare', token, account};
  return {name: 'pollinations'};
};

const provider = resolveProvider();
console.log(`Proveedor: ${provider.name}`);

/* ---------------------------------------------------------------- cloudflare */

const generateCloudflare = async (prompt, seed) => {
  const {model, steps} = style.providers.cloudflare;
  const url = `https://api.cloudflare.com/client/v4/accounts/${provider.account}/ai/run/${model}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${provider.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      steps,
      seed,
      width: style.size,
      height: style.size,
    }),
  });

  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`Respuesta no JSON (${response.status}): ${text.slice(0, 200)}`);
  }

  if (!response.ok || payload.success === false) {
    const detail = JSON.stringify(payload.errors ?? payload).slice(0, 300);
    const error = new Error(`Cloudflare ${response.status}: ${detail}`);
    error.status = response.status;
    throw error;
  }

  const raw = payload.result?.image ?? payload.result;
  if (typeof raw !== 'string') {
    throw new Error('Cloudflare no devolvio una imagen en base64');
  }
  const base64 = raw.startsWith('data:') ? raw.split(',')[1] : raw;
  return Buffer.from(base64, 'base64');
};

/* -------------------------------------------------------------- pollinations */

const pollinationsStatePath = path.join(cacheDir, 'pollinations.json');

const generatePollinations = async (prompt, seed) => {
  const {model, nologo} = style.providers.pollinations;
  const params = new URLSearchParams({
    width: String(style.size),
    height: String(style.size),
    seed: String(seed),
    model,
    nologo: String(nologo),
    referrer: 'crayon-studio',
  });
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params}`;

  const state = (await readJsonIfExists(pollinationsStatePath)) ?? {last: 0};
  const wait = 46_000 - (Date.now() - state.last);
  if (wait > 0) {
    console.log(`  esperando ${Math.ceil(wait / 1000)}s (limite de Pollinations)...`);
    await sleep(wait);
  }

  const response = await fetch(url);
  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(pollinationsStatePath, JSON.stringify({last: Date.now()}));

  if (!response.ok) {
    const error = new Error(
      `Pollinations ${response.status}: ${buffer.toString('utf8').slice(0, 200)}`,
    );
    error.status = response.status;
    throw error;
  }
  return buffer;
};

const generate = (prompt, seed) =>
  provider.name === 'cloudflare'
    ? generateCloudflare(prompt, seed)
    : generatePollinations(prompt, seed);

const withRetry = async (fn, attempts = 3) => {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;
      const backoff = error.status === 429 ? 15_000 : 4_000 * attempt;
      console.log(`  reintento ${attempt}/${attempts - 1} en ${backoff / 1000}s (${error.message.slice(0, 90)})`);
      await sleep(backoff);
    }
  }
  throw lastError;
};

/* -------------------------------------------------------------------- runner */

await mkdir(outDir, {recursive: true});
await mkdir(cacheDir, {recursive: true});

const previous = (await readJsonIfExists(seedMapPath)) ?? {shots: {}};
const previousImages = (await readJsonIfExists(imagesJsonPath)) ?? {};

const shots = {};
const images = {...previousImages};
const failures = [];

for (const shot of storyboard.shots) {
  const frame = shot.frame;
  if (only && !only.has(frame)) {
    if (previous.shots[frame]) shots[frame] = previous.shots[frame];
    continue;
  }

  const prompt = buildPrompt(style, shot);
  const promptHash = sha256(prompt);
  const seed = previous.shots[frame]?.seedOverride ?? seedFor(style.styleId, slug, frame);
  const fileName = `${pad(frame)}.jpg`;
  const relPath = `${slug}/ai/${fileName}`;
  const dest = path.join(outDir, fileName);

  const cached = previous.shots[frame];
  if (
    !force &&
    cached &&
    cached.promptHash === promptHash &&
    (await exists(dest))
  ) {
    shots[frame] = cached;
    images[frame] = relPath;
    console.log(`[${pad(frame)}] sin cambios`);
    continue;
  }

  console.log(`[${pad(frame)}] generando (seed ${seed})...`);
  try {
    const buffer = await withRetry(() => generate(prompt, seed));
    const meta = await sharp(buffer).metadata();
    const written = await sharp(buffer)
      .jpeg({quality: 92, chromaSubsampling: '4:4:4'})
      .toFile(dest);

    shots[frame] = {
      seed,
      prompt,
      promptHash,
      file: `public/${relPath}`,
      provider: provider.name,
      model:
        provider.name === 'cloudflare'
          ? style.providers.cloudflare.model
          : `pollinations/${style.providers.pollinations.model}`,
      width: written.width,
      height: written.height,
      sourceWidth: meta.width,
      sourceHeight: meta.height,
      bytes: written.size,
      generatedAt: new Date().toISOString(),
    };
    images[frame] = relPath;
    console.log(
      `[${pad(frame)}] ok ${written.width}x${written.height} ${(written.size / 1024).toFixed(0)} KB`,
    );
  } catch (error) {
    failures.push({frame, message: error.message});
    console.error(`[${pad(frame)}] FALLO ${error.message.slice(0, 160)}`);
    if (previous.shots[frame]) {
      shots[frame] = previous.shots[frame];
      images[frame] = previousImages[frame];
    }
  }
}

const seedMap = {
  slug,
  styleId: style.styleId,
  size: style.size,
  provider: provider.name,
  model:
    provider.name === 'cloudflare'
      ? style.providers.cloudflare.model
      : `pollinations/${style.providers.pollinations.model}`,
  updatedAt: new Date().toISOString(),
  shots,
};

await writeFile(seedMapPath, `${JSON.stringify(seedMap, null, 2)}\n`);
await writeFile(imagesJsonPath, `${JSON.stringify(images, null, 2)}\n`);

console.log(`\nseed-map: ${path.relative(ROOT, seedMapPath)}`);
console.log(`images:   ${path.relative(ROOT, imagesJsonPath)} (${Object.keys(images).length} planos)`);

if (failures.length > 0) {
  console.error(`\n${failures.length} plano(s) fallido(s): ${failures.map((f) => f.frame).join(', ')}`);
  process.exit(1);
}
