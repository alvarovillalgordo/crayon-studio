#!/usr/bin/env node
/**
 * Sintetiza los efectos de sonido del canal. Sin bancos de samples,
 * sin licencias y sin dependencias: solo matematica y un WAV a mano.
 *
 * Uso: node scripts/sfx.mjs
 * Salida: public/sfx/{whoosh,scribble,pop,thud}.wav
 *
 * Todo es determinista (PRNG con semilla fija), asi que regenerar
 * produce exactamente los mismos archivos.
 */
import {mkdir, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT = path.join(ROOT, 'public/sfx');
const RATE = 44100;

/* ------------------------------------------------------------------ utiles */

const mulberry32 = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** Filtro de un polo: suaviza la senal hacia la frecuencia de corte. */
const onePole = (cutoff, rate = RATE) => {
  const alpha = 1 - Math.exp((-2 * Math.PI * cutoff) / rate);
  let state = 0;
  return (input) => {
    state += alpha * (input - state);
    return state;
  };
};

const noise = (random) => random() * 2 - 1;

const normalize = (samples, peak = 0.9) => {
  const max = Math.max(...samples.map(Math.abs)) || 1;
  return samples.map((sample) => (sample / max) * peak);
};

const fadeEdges = (samples, ms = 4) => {
  const n = Math.floor((ms / 1000) * RATE);
  return samples.map((sample, index) => {
    if (index < n) return sample * (index / n);
    if (index > samples.length - n) return sample * ((samples.length - index) / n);
    return sample;
  });
};

const wav = (samples) => {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((sample, index) => {
    const clamped = Math.max(-1, Math.min(1, sample));
    data.writeInt16LE(Math.round(clamped * 32767), index * 2);
  });

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);

  return Buffer.concat([header, data]);
};

/* ----------------------------------------------------------------- efectos */

/** Aire que pasa: ruido con paso bajo que barre de grave a agudo y vuelve. */
const whoosh = () => {
  const random = mulberry32(11);
  const duration = 0.55;
  const samples = [];
  let cutoff = 300;
  let filtered = 0;

  for (let i = 0; i < duration * RATE; i++) {
    const t = i / (duration * RATE);
    // curva de campana asimetrica: entra rapido, sale lento
    const envelope = Math.pow(Math.sin(Math.PI * Math.pow(t, 0.75)), 2);
    cutoff = 250 + 3800 * Math.pow(Math.sin(Math.PI * t), 1.6);
    const alpha = 1 - Math.exp((-2 * Math.PI * cutoff) / RATE);
    filtered += alpha * (noise(random) - filtered);
    samples.push(filtered * envelope * 0.9);
  }

  return normalize(fadeEdges(samples), 0.85);
};

/** Rotulador sobre papel: ruido agudo troceado en pasadas. */
const scribble = () => {
  const random = mulberry32(23);
  const duration = 0.62;
  const high = onePole(5200);
  const low = onePole(900);
  const samples = [];
  let gate = 0;
  let nextStroke = 0;

  for (let i = 0; i < duration * RATE; i++) {
    const t = (i / RATE) * 1000;
    if (t >= nextStroke) {
      gate = 0.55 + random() * 0.45;
      nextStroke = t + 55 + random() * 70;
    }
    gate *= 0.986;

    const source = noise(random);
    const band = high(source) - low(source);
    const envelope = Math.sin(Math.PI * (i / (duration * RATE)));
    samples.push(band * gate * envelope * 0.5);
  }

  return normalize(fadeEdges(samples, 6), 0.7);
};

/** Burbuja al aparecer un elemento. */
const pop = () => {
  const duration = 0.16;
  const samples = [];
  let phase = 0;
  const random = mulberry32(37);

  for (let i = 0; i < duration * RATE; i++) {
    const t = i / (duration * RATE);
    const frequency = 720 - 520 * Math.pow(t, 0.6);
    phase += (2 * Math.PI * frequency) / RATE;
    const envelope = Math.exp(-t * 9) * (1 - Math.exp(-t * 400));
    const click = noise(random) * Math.exp(-t * 60) * 0.25;
    samples.push((Math.sin(phase) * 0.8 + click) * envelope);
  }

  return normalize(fadeEdges(samples, 2), 0.8);
};

/** Golpe seco y grave, para cerrar una idea. */
const thud = () => {
  const duration = 0.34;
  const samples = [];
  let phase = 0;
  const random = mulberry32(53);
  const low = onePole(220);

  for (let i = 0; i < duration * RATE; i++) {
    const t = i / (duration * RATE);
    const frequency = 130 * Math.exp(-t * 2.2) + 45;
    phase += (2 * Math.PI * frequency) / RATE;
    const body = Math.sin(phase) * Math.exp(-t * 8);
    const burst = low(noise(random)) * Math.exp(-t * 40) * 1.6;
    samples.push((body + burst) * (1 - Math.exp(-t * 300)));
  }

  return normalize(fadeEdges(samples, 3), 0.85);
};

/* ------------------------------------------------------------------- main */

await mkdir(OUT, {recursive: true});

const effects = {whoosh, scribble, pop, thud};
for (const [name, build] of Object.entries(effects)) {
  const samples = build();
  const file = path.join(OUT, `${name}.wav`);
  await writeFile(file, wav(samples));
  const seconds = (samples.length / RATE).toFixed(2);
  const kb = (samples.length * 2 + 44) / 1024;
  console.log(`${name.padEnd(9)} ${seconds}s  ${kb.toFixed(0)} KB`);
}

console.log(`\nEscritos en ${path.relative(ROOT, OUT)}`);
