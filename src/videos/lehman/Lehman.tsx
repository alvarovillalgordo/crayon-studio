import React from 'react';
import {Audio, Sequence, staticFile, useVideoConfig} from 'remotion';
import {Karaoke} from '../../components/Karaoke';
import {Paper} from '../../components/Paper';
import {Scene} from '../../components/Scene';
import {TopTitle} from '../../components/TopTitle';
import imagesJson from './images.json';
import timelineJson from './timeline.json';
import type {Scene as SceneType, Timeline, Word} from './types';

const timeline = timelineJson as unknown as Timeline;

/**
 * Mapa plano -> imagen generada. Lo escribe scripts/generate-images.mjs.
 * Si un plano no esta generado todavia, cae al placeholder dibujado a mano.
 */
const generated = imagesJson as Record<string, string>;

const TITLES: Record<number, string> = {
  1: '158 AÑOS',
  2: 'MEDIO MUNDO',
  3: 'FÁCIL',
  4: 'UNA CASA',
  5: 'Y OTRA. Y OTRA.',
  6: 'AVALAR',
  7: 'TODOS GANAN',
  8: 'PAQUETES "SEGUROS"',
  9: 'LOS PRECIOS BAJAN',
  10: 'NADIE PAGA',
  11: 'LEHMAN BROTHERS',
  12: 'EL LUNES',
  13: 'Y TÚ TAMBIÉN',
};

const allWords: Word[] = timeline.lines.flatMap((line) => line.words);

const wordsForScene = (scene: SceneType): Word[] =>
  allWords.filter(
    (word) => word.start >= scene.start - 0.05 && word.start < scene.end - 0.02,
  );

export const Lehman: React.FC = () => {
  const {fps} = useVideoConfig();

  return (
    <Paper>
      <Audio src={staticFile('lehman/voice.mp3')} />

      {timeline.scenes.map((scene, index) => {
        const from = Math.round(scene.start * fps);
        const durationInFrames = Math.max(
          1,
          Math.round(scene.end * fps) - from,
        );

        return (
          <Sequence key={scene.frame} from={from} durationInFrames={durationInFrames}>
            <Scene
              src={
                generated[String(scene.frame)] ??
                `lehman/${String(scene.frame).padStart(2, '0')}.png`
              }
              index={index}
              durationInFrames={durationInFrames}
            />
            <TopTitle text={TITLES[scene.frame] ?? ''} />
            <Karaoke words={wordsForScene(scene)} sceneStart={scene.start} />
          </Sequence>
        );
      })}
    </Paper>
  );
};

export const lehmanDurationInFrames = Math.round(timeline.video_duration * 30);
