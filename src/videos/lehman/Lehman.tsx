import React from 'react';
import {Audio, Sequence, staticFile, useVideoConfig} from 'remotion';
import {Karaoke} from '../../components/Karaoke';
import {Paper} from '../../components/Paper';
import {Scene} from '../../components/Scene';
import {SfxLayer, type Cue} from '../../components/SfxLayer';
import {TopTitle} from '../../components/TopTitle';
import imagesJson from './images.json';
import timelineJson from './timeline.json';
import type {Scene as SceneType, Timeline, Word} from './types';

const timeline = timelineJson as unknown as Timeline;

/**
 * Mapa plano -> imagen generada. Lo escribe scripts/generate-images.mjs.
 * Si un plano no esta generado todavia, cae al placeholder dibujado a mano.
 * Acepta el formato antiguo (string) y el actual ({src, bg}).
 */
type GeneratedImage = string | {src: string; bg?: string};

const generated = imagesJson as unknown as Record<string, GeneratedImage>;

const imageFor = (frame: number) => {
  const entry = generated[String(frame)];
  if (typeof entry === 'string') return {src: entry, background: undefined};
  return {src: entry?.src, background: entry?.bg};
};

type Title = {text: string; count?: number; countSuffix?: string};

const TITLES: Record<number, Title> = {
  1: {text: '158 AÑOS', count: 158, countSuffix: ' AÑOS'},
  2: {text: 'MEDIO MUNDO'},
  3: {text: 'FÁCIL'},
  4: {text: 'UNA CASA'},
  5: {text: 'Y OTRA. Y OTRA.'},
  6: {text: 'AVALAR'},
  7: {text: 'TODOS GANAN'},
  8: {text: 'PAQUETES "SEGUROS"'},
  9: {text: 'LOS PRECIOS BAJAN'},
  10: {text: 'NADIE PAGA'},
  11: {text: 'LEHMAN BROTHERS'},
  12: {text: 'EL LUNES'},
  13: {text: 'Y TÚ TAMBIÉN'},
};

const allWords: Word[] = timeline.lines.flatMap((line) => line.words);

const wordsForScene = (scene: SceneType): Word[] =>
  allWords.filter(
    (word) => word.start >= scene.start - 0.05 && word.start < scene.end - 0.02,
  );

/**
 * Cues de sonido: aire al entrar el plano y rotulador cuando se traza
 * el subrayado del titulo (empieza en el frame 8 del plano).
 */
const cues: Cue[] = timeline.scenes.flatMap((scene, index) => {
  const sceneCues: Cue[] = [
    {from: scene.start + 0.02, sound: 'whoosh', volume: 0.24},
    {from: scene.start + 0.28, sound: 'scribble', volume: 0.28},
  ];
  if (index === timeline.scenes.length - 1) {
    sceneCues.push({from: scene.start + 0.6, sound: 'thud', volume: 0.4});
  }
  return sceneCues;
});

export const Lehman: React.FC = () => {
  const {fps} = useVideoConfig();

  return (
    <Paper>
      <Audio src={staticFile('lehman/voice.mp3')} />
      <SfxLayer cues={cues} />

      {timeline.scenes.map((scene, index) => {
        const from = Math.round(scene.start * fps);
        const durationInFrames = Math.max(
          1,
          Math.round(scene.end * fps) - from,
        );
        const image = imageFor(scene.frame);

        return (
          <Sequence key={scene.frame} from={from} durationInFrames={durationInFrames}>
            <Scene
              src={
                image.src ??
                `lehman/${String(scene.frame).padStart(2, '0')}.png`
              }
              background={image.background}
              index={index}
              durationInFrames={durationInFrames}
            />
            <TopTitle
              text={TITLES[scene.frame]?.text ?? ''}
              count={TITLES[scene.frame]?.count}
              countSuffix={TITLES[scene.frame]?.countSuffix}
            />
            <Karaoke words={wordsForScene(scene)} sceneStart={scene.start} />
          </Sequence>
        );
      })}
    </Paper>
  );
};

export const lehmanDurationInFrames = Math.round(timeline.video_duration * 30);
