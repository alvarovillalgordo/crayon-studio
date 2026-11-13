import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';

type Props = {
  src: string;
  index: number;
  durationInFrames: number;
  /** Color del borde de la imagen: evita la costura contra el papel. */
  background?: string;
};

/**
 * Plano con Ken Burns suave. Alterna zoom in / zoom out.
 * La imagen va en "contain": las bandas superior e inferior quedan
 * pintadas con el color del propio dibujo.
 */
export const Scene: React.FC<Props> = ({src, index, durationInFrames, background}) => {
  const frame = useCurrentFrame();
  const zoomIn = index % 2 === 0;

  const scale = interpolate(
    frame,
    [0, durationInFrames],
    zoomIn ? [1.0, 1.07] : [1.07, 1.0],
    {extrapolateRight: 'clamp'},
  );

  const drift = interpolate(
    frame,
    [0, durationInFrames],
    zoomIn ? [-8, 8] : [8, -8],
    {extrapolateRight: 'clamp'},
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: background ?? 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <Img
        src={staticFile(src)}
        style={{
          width: '112%',
          objectFit: 'contain',
          transform: `scale(${scale}) translateX(${drift}px)`,
        }}
      />
    </AbsoluteFill>
  );
};
