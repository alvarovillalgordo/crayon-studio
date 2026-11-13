import React from 'react';
import {Audio, Sequence, staticFile, useVideoConfig} from 'remotion';

export type Cue = {
  /** Segundo absoluto del video. */
  from: number;
  sound: 'whoosh' | 'scribble' | 'pop' | 'thud';
  volume: number;
};

/**
 * Dispara los SFX en los tiempos indicados.
 * Van en secuencias con premount para que no se pierda el ataque.
 */
export const SfxLayer: React.FC<{cues: Cue[]}> = ({cues}) => {
  const {fps} = useVideoConfig();

  return (
    <>
      {cues.map((cue, index) => (
        <Sequence
          key={`${cue.sound}-${cue.from}-${index}`}
          from={Math.round(cue.from * fps)}
          durationInFrames={Math.ceil(1.5 * fps)}
          premountFor={fps}
        >
          <Audio src={staticFile(`sfx/${cue.sound}.wav`)} volume={cue.volume} />
        </Sequence>
      ))}
    </>
  );
};
