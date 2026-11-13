import React from 'react';
import {video} from '../theme';
import {Video, durationInFramesFor} from './Video';
import type {Timeline, VideoMeta} from './types';
import lehmanImages from './lehman/images.json';
import lehmanMeta from './lehman/meta.json';
import lehmanTimeline from './lehman/timeline.json';

export type VideoEntry = {
  id: string;
  label: string;
  slug: string;
  component: React.ComponentType;
  durationInFrames: number;
  fps: number;
};

/**
 * Registra un video a partir de sus tres archivos de datos.
 * Un video nuevo = una linea mas en VIDEOS.
 */
export const defineVideo = (
  meta: VideoMeta,
  timeline: Timeline,
  images: Record<string, string>,
): VideoEntry => {
  const component: React.FC = () => (
    <Video
      slug={meta.slug}
      timeline={timeline}
      images={images}
      titles={meta.titles}
    />
  );
  component.displayName = meta.id;

  return {
    id: meta.id,
    label: meta.title,
    slug: meta.slug,
    component,
    durationInFrames: durationInFramesFor(timeline, video.fps),
    fps: video.fps,
  };
};

export const VIDEOS: VideoEntry[] = [
  defineVideo(
    lehmanMeta as VideoMeta,
    lehmanTimeline as unknown as Timeline,
    lehmanImages as Record<string, string>,
  ),
];
