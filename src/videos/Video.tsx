import React from 'react';
import {Audio, Sequence, staticFile, useVideoConfig} from 'remotion';
import {Karaoke} from '../components/Karaoke';
import {Paper} from '../components/Paper';
import {Scene} from '../components/Scene';
import {SfxLayer, type Cue} from '../components/SfxLayer';
import {TopTitle} from '../components/TopTitle';
import type {Scene as SceneType, Timeline, Title, Word} from './types';

type Props = {
  slug: string;
  timeline: Timeline;
  /** Mapa plano -> imagen. Lo escribe scripts/generate-images.mjs. */
  images: Record<string, string>;
  titles: Record<string, Title>;
};

const wordsForScene = (allWords: Word[], scene: SceneType): Word[] =>
  allWords.filter(
    (word) => word.start >= scene.start - 0.05 && word.start < scene.end - 0.02,
  );

/**
 * Cues de sonido: aire al entrar el plano y rotulador cuando se traza
 * el subrayado del titulo (empieza en el frame 8 del plano).
 */
const buildCues = (timeline: Timeline): Cue[] =>
  timeline.scenes.flatMap((scene, index) => {
    const cues: Cue[] = [
      {from: scene.start + 0.02, sound: 'whoosh', volume: 0.24},
      {from: scene.start + 0.28, sound: 'scribble', volume: 0.28},
    ];
    if (index === timeline.scenes.length - 1) {
      cues.push({from: scene.start + 0.6, sound: 'thud', volume: 0.4});
    }
    return cues;
  });

/**
 * Composicion unica para todos los videos del canal.
 * Toda la diferencia entre videos vive en los datos:
 * timeline.json (voz y tiempos), images.json (planos) y meta.json (titulos).
 */
export const Video: React.FC<Props> = ({slug, timeline, images, titles}) => {
  const {fps} = useVideoConfig();
  const allWords: Word[] = timeline.lines.flatMap((line) => line.words);
  const cues = buildCues(timeline);

  return (
    <Paper>
      <Audio src={staticFile(`${slug}/voice.mp3`)} />
      <SfxLayer cues={cues} />

      {timeline.scenes.map((scene, index) => {
        const from = Math.round(scene.start * fps);
        const durationInFrames = Math.max(
          1,
          Math.round(scene.end * fps) - from,
        );
        const title = titles[String(scene.frame)];

        return (
          <Sequence key={scene.frame} from={from} durationInFrames={durationInFrames}>
            <Scene
              src={
                images[String(scene.frame)] ??
                `${slug}/${String(scene.frame).padStart(2, '0')}.png`
              }
              index={index}
              durationInFrames={durationInFrames}
            />
            <TopTitle
              text={title?.text ?? ''}
              count={title?.count}
              countSuffix={title?.countSuffix}
            />
            <Karaoke
              words={wordsForScene(allWords, scene)}
              sceneStart={scene.start}
            />
          </Sequence>
        );
      })}
    </Paper>
  );
};

export const durationInFramesFor = (timeline: Timeline, fps: number): number =>
  Math.round(timeline.video_duration * fps);
