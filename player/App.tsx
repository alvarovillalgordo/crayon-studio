import React from 'react';
import {Player} from '@remotion/player';
import {Demo} from '../src/videos/demo/Demo';
import '../src/fonts';

/**
 * Preview web de la composicion (GitHub Pages).
 * Permite revisar en el movil sin renderizar nada en local.
 */
export const App: React.FC = () => {
  return (
    <div
      style={{
        minHeight: '100vh',
        margin: 0,
        background: '#1a1815',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 20,
        boxSizing: 'border-box',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div style={{color: '#F5EDE0', fontSize: 14, letterSpacing: 3}}>CRAYON STUDIO · PREVIEW</div>
      <div style={{width: '100%', maxWidth: 420}}>
        <Player
          component={Demo}
          durationInFrames={180}
          fps={30}
          compositionWidth={1080}
          compositionHeight={1920}
          style={{width: '100%', borderRadius: 12, overflow: 'hidden'}}
          controls
          loop
          autoPlay
        />
      </div>
    </div>
  );
};
