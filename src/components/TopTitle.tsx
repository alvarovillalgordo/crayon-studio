import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {fonts, palette, safe} from '../theme';

type Props = {
  text: string;
};

/** Titulo del plano, arriba, fuera de la zona de la UI de Shorts. */
export const TopTitle: React.FC<Props> = ({text}) => {
  const frame = useCurrentFrame();
  const inSpring = interpolate(frame, [0, 8], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{alignItems: 'center', pointerEvents: 'none'}}>
      <div
        style={{
          marginTop: safe.top + 34,
          fontFamily: fonts.body,
          fontSize: 34,
          letterSpacing: 8,
          color: palette.green,
          opacity: inSpring,
          transform: `translateY(${(1 - inSpring) * -14}px)`,
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};
