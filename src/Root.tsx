import React from 'react';
import {Composition} from 'remotion';
import {video} from './theme';
import {Demo} from './videos/demo/Demo';

export const RemotionRoot: React.FC = () => {
  return (
    <>
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
