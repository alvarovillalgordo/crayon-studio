/** Tipos compartidos por todas las composiciones de video. */

export type Word = {
  text: string;
  start: number;
  end: number;
};

export type Line = {
  index: number;
  text: string;
  start: number;
  end: number;
  duration: number;
  words: Word[];
};

export type Scene = {
  frame: number;
  start: number;
  end: number;
  duration: number;
  text: string;
};

export type Timeline = {
  voice: string;
  gap: number;
  lines: Line[];
  total: number;
  video_duration: number;
  scenes: Scene[];
};

/** Titulo de plano. Si lleva `count`, el numero sube desde cero. */
export type Title = {
  text: string;
  count?: number;
  countSuffix?: string;
};

/**
 * Metadatos de un video: lo unico que hay que escribir a mano
 * ademas del guion y los prompts. `src/videos/registry.tsx` lo usa
 * para registrar la composicion sin tocar TypeScript.
 */
export type VideoMeta = {
  /** ID de la composicion en Remotion. */
  id: string;
  slug: string;
  /** Etiqueta legible (el Player y la lista de Actions). */
  title: string;
  /** Titulo por numero de plano. */
  titles: Record<string, Title>;
};
