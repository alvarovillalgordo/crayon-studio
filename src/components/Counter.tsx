import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';

type Props = {
  to: number;
  /** Frames de espera antes de arrancar. */
  delay?: number;
  /** Frames que tarda en llegar. */
  duration?: number;
};

/** Numero que sube desde cero. Para ganchos del tipo "158 anos". */
export const Counter: React.FC<Props> = ({to, delay = 4, duration = 20}) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [delay, delay + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // easing de salida: rapido al principio, frena al final
  const eased = 1 - Math.pow(1 - progress, 3);

  return <>{Math.round(to * eased)}</>;
};
