import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {palette} from '../theme';

type Props = {
  width: number;
  /** Frames de espera antes de empezar a trazar. */
  delay?: number;
  /** Frames que tarda el trazo. */
  duration?: number;
  color?: string;
  thickness?: number;
};

/**
 * Subrayado de rotulador que se traza de izquierda a derecha.
 * `pathLength={1}` normaliza el trazo, asi no hay que medir el path.
 */
export const Marker: React.FC<Props> = ({
  width,
  delay = 6,
  duration = 12,
  color = palette.mustard,
  thickness = 8,
}) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [delay, delay + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const height = 18;
  const path = `M 3 ${height - 7} C ${width * 0.18} 3, ${width * 0.34} ${height - 2}, ${
    width * 0.52
  } ${height - 9} S ${width * 0.82} ${height - 1}, ${width - 3} 6`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{overflow: 'visible', marginTop: -4}}
    >
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={thickness}
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - progress}
      />
    </svg>
  );
};
