import React from 'react';
import {AbsoluteFill} from 'remotion';
import {grainSvg, palette} from '../theme';

/** Fondo de papel con grano y vineta. */
export const Paper: React.FC<{children?: React.ReactNode}> = ({children}) => {
  return (
    <AbsoluteFill style={{backgroundColor: palette.cream}}>
      {children}
      <AbsoluteFill
        style={{
          backgroundImage: grainSvg,
          opacity: 0.16,
          mixBlendMode: 'multiply',
          pointerEvents: 'none',
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(18,16,14,0.10) 100%)`,
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};
