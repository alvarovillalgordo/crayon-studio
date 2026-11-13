import React from 'react';
import {Composition} from 'remotion';
import {video} from './theme';
import {Demo} from './videos/demo/Demo';
import {VIDEOS} from './videos/registry';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {VIDEOS.map((entry) => (
        <Composition
          key={entry.id}
          id={entry.id}
          component={entry.component}
          durationInFrames={entry.durationInFrames}
          fps={entry.fps}
          width={video.width}
          height={video.height}
        />
      ))}
      <Composition
        id="Demo"
        component={Demo}
        durationInFrames={180}
        fps={video.fps}
        width={video.width}
        height={video.height}
      />
    </>
  );
};
