import {useCurrentFrame} from 'remotion';

/**
 * "Line boil": el temblor de los dibujos animados a mano.
 * Cambia 10 veces por segundo, no en cada frame, para que se lea
 * como papel animado y no como ruido.
 */
export const useBoil = (amount = 1) => {
  const frame = useCurrentFrame();
  const step = Math.floor(frame / 3);

  const jitter = (seed: number) => {
    const value = Math.sin(step * 12.9898 + seed * 78.233) * 43758.5453;
    return (value - Math.floor(value)) * 2 - 1;
  };

  return {
    rotate: jitter(1) * 0.18 * amount,
    x: jitter(2) * 1.3 * amount,
    y: jitter(3) * 1.3 * amount,
  };
};
