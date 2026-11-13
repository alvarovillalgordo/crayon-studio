import React from 'react';
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {useBoil} from './useBoil';

/**
 * Fundido vertical: la imagen deja de tener borde y se disuelve en el papel.
 * Los porcentajes son del alto de la imagen, no del frame.
 */
const FADE =
  'linear-gradient(to bottom, transparent 0%, #000 7%, #000 93%, transparent 100%)';

type Props = {
  src: string;
  index: number;
  durationInFrames: number;
};

/**
 * Plano con Ken Burns suave. Alterna zoom in / zoom out.
 * La imagen va en "contain" y sus bordes superior e inferior se funden
 * con el papel con una mascara de degradado: ni rectangulo ni costura.
 */
export const Scene: React.FC<Props> = ({src, index, durationInFrames}) => {
  const frame = useCurrentFrame();
  const zoomIn = index % 2 === 0;
  const {fps} = useVideoConfig();
  const boil = useBoil();

  // entrada: la imagen "aterriza" en 12 frames con un spring corto
  const enter = spring({
    frame,
    fps,
    durationInFrames: 12,
    config: {damping: 16, mass: 0.6},
  });

  const scale = interpolate(
    frame,
    [0, durationInFrames],
    zoomIn ? [1.0, 1.07] : [1.07, 1.0],
    {extrapolateRight: 'clamp'},
  ) * (0.965 + 0.035 * enter);

  const drift = interpolate(
    frame,
    [0, durationInFrames],
    zoomIn ? [-8, 8] : [8, -8],
    {extrapolateRight: 'clamp'},
  );

  return (
    <AbsoluteFill
      style={{
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
          WebkitMaskImage: FADE,
          maskImage: FADE,
          transform: `scale(${scale}) translateX(${drift}px) rotate(${boil.rotate}deg) translate(${boil.x}px, ${boil.y}px)`,
        }}
      />
    </AbsoluteFill>
  );
};
