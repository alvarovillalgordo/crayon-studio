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
import {Paper} from '../../components/Paper';
import {fonts, palette, safe} from '../../theme';

/**
 * Composicion de prueba de la Fase 0.
 * Valida: papel + grano, zoom lento, spring, tipografias OFL y texto en pantalla.
 */
export const Demo: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();

  const zoom = interpolate(frame, [0, durationInFrames], [1.0, 1.06], {
    extrapolateRight: 'clamp',
  });

  const titleIn = spring({frame: frame - 12, fps, config: {damping: 14, mass: 0.6}});
  const subIn = spring({frame: frame - 26, fps, config: {damping: 16, mass: 0.5}});
  const underline = interpolate(frame, [30, 55], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <Paper>
      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          transform: `scale(${zoom})`,
        }}
      >
        <Img
          src={staticFile('demo/frame-01.png')}
          style={{width: '100%', objectFit: 'contain'}}
        />
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          paddingTop: safe.top + 40,
          paddingLeft: safe.side,
          paddingRight: safe.side,
          alignItems: 'center',
        }}
      >
        <div
          style={{
            fontFamily: fonts.body,
            fontSize: 30,
            letterSpacing: 6,
            color: palette.green,
            opacity: titleIn,
            transform: `translateY(${(1 - titleIn) * -18}px)`,
          }}
        >
          PRUEBA DE ESTILO
        </div>

        <div
          style={{
            marginTop: 18,
            fontFamily: fonts.hand,
            fontWeight: 700,
            fontSize: 104,
            lineHeight: 1,
            color: palette.ink,
            textAlign: 'center',
            opacity: titleIn,
            transform: `scale(${0.9 + titleIn * 0.1})`,
          }}
        >
          Render en la nube
        </div>

        <div
          style={{
            height: 10,
            marginTop: 16,
            width: 360 * underline,
            borderRadius: 6,
            backgroundColor: palette.mustard,
          }}
        />

        <div
          style={{
            marginTop: 22,
            fontFamily: fonts.num,
            fontWeight: 700,
            fontSize: 34,
            color: palette.red,
            opacity: subIn,
          }}
        >
          0 € · 0 calor local
        </div>
      </AbsoluteFill>
    </Paper>
  );
};
