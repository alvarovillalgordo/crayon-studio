import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';

export const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));

export const sha256 = (value) =>
  createHash('sha256').update(value).digest('hex');

/**
 * Semilla determinista: mismo styleId + slug + plano => misma imagen.
 * Se guarda en seed-map.json para poder reproducir un plano suelto.
 */
export const seedFor = (styleId, slug, frame) => {
  const hex = sha256(`${styleId}:${slug}:${frame}`).slice(0, 8);
  return parseInt(hex, 16) % 2147483647;
};

/** El modelo no acepta negative prompt: las prohibiciones van dentro del texto. */
export const buildPrompt = (style, shot) =>
  `${style.prefix}. ${shot.prompt}. ${style.suffix}`;

export const pad = (frame) => String(frame).padStart(2, '0');

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
