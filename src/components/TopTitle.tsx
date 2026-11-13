import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Counter} from './Counter';
import {Marker} from './Marker';
import {fonts, palette, safe} from '../theme';

type Props = {
  text: string;
  /** Si se indica, el texto arranca en 0 y sube hasta este numero. */
  count?: number;
  countSuffix?: string;
};

/** Titulo del plano, arriba, fuera de la zona de la UI de Shorts. */
export const TopTitle: React.FC<Props> = ({text, count, countSuffix}) => {
  const frame = useCurrentFrame();
  const inSpring = interpolate(frame, [0, 8], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const label = count != null ? `${count}${countSuffix ?? ''}` : text;
  const markerWidth = Math.min(150 + label.length * 15, 620);

  return (
    <AbsoluteFill style={{alignItems: 'center', pointerEvents: 'none'}}>
      <div
        style={{
          marginTop: safe.top + 34,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          opacity: inSpring,
          transform: `translateY(${(1 - inSpring) * -14}px)`,
        }}
      >
        <div
          style={{
            fontFamily: fonts.body,
            fontSize: 34,
            letterSpacing: 8,
            color: palette.green,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {count != null ? (
            <>
              <Counter to={count} />
              {countSuffix ?? ''}
            </>
          ) : (
            text
          )}
        </div>
        <Marker width={markerWidth} delay={8} duration={12} />
      </div>
    </AbsoluteFill>
  );
};
