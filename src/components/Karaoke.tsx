import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {fonts, palette, safe} from '../theme';
import type {Word} from '../videos/lehman/types';

type Props = {
  words: Word[];
  /** Segundo absoluto en el que empieza el plano. */
  sceneStart: number;
};

/**
 * Subtitulos karaoke: la palabra activa se agranda y pasa a mostaza.
 * El contorno en color papel garantiza legibilidad sobre el dibujo.
 */
export const Karaoke: React.FC<Props> = ({words, sceneStart}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const time = sceneStart + frame / fps;

  let active = -1;
  words.forEach((word, index) => {
    if (word.start <= time + 0.02) {
      active = index;
    }
  });

  const blockIn = interpolate(frame, [0, 4], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        left: 54,
        right: 54,
        bottom: safe.bottom + 44,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'flex-end',
        columnGap: 14,
        rowGap: 2,
        opacity: blockIn,
      }}
    >
      {words.map((word, index) => {
        const isActive = index === active;
        const age = isActive ? (time - word.start) * fps : 99;
        const scale = isActive
          ? interpolate(age, [0, 7], [1.16, 1], {extrapolateRight: 'clamp'})
          : 1;

        return (
          <span
            key={`${word.start}-${index}`}
            style={{
              display: 'inline-block',
              fontFamily: fonts.body,
              fontSize: 56,
              lineHeight: 1.12,
              color: isActive ? palette.mustard : palette.ink,
              WebkitTextStroke: `11px ${palette.cream}`,
              paintOrder: 'stroke',
              transform: `scale(${scale})`,
              transformOrigin: 'center bottom',
            }}
          >
            {word.text}
          </span>
        );
      })}
    </div>
  );
};
