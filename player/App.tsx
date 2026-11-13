import React, {useState} from 'react';
import {Player} from '@remotion/player';
import {Demo} from '../src/videos/demo/Demo';
import {VIDEOS} from '../src/videos/registry';
import '../src/fonts';

type Entry = {
  id: string;
  label: string;
  component: React.ComponentType;
  durationInFrames: number;
  fps: number;
};

const ENTRIES: Entry[] = [
  ...VIDEOS.map((entry) => ({
    id: entry.id,
    label: entry.label,
    component: entry.component,
    durationInFrames: entry.durationInFrames,
    fps: entry.fps,
  })),
  {
    id: 'Demo',
    label: 'Demo',
    component: Demo,
    durationInFrames: 180,
    fps: 30,
  },
];

/**
 * Preview web de las composiciones (GitHub Pages).
 * Permite revisar en el movil sin renderizar nada en local.
 */
export const App: React.FC = () => {
  const [activeId, setActiveId] = useState(ENTRIES[0].id);
  const active = ENTRIES.find((entry) => entry.id === activeId) ?? ENTRIES[0];

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
      <div style={{color: '#F5EDE0', fontSize: 13, letterSpacing: 3}}>CRAYON STUDIO · PREVIEW</div>

      <div style={{display: 'flex', gap: 8}}>
        {ENTRIES.map((entry) => (
          <button
            key={entry.id}
            onClick={() => setActiveId(entry.id)}
            style={{
              padding: '8px 16px',
              borderRadius: 999,
              border: '1px solid #E8B23A',
              background: entry.id === active.id ? '#E8B23A' : 'transparent',
              color: entry.id === active.id ? '#12100E' : '#E8B23A',
              fontSize: 13,
              letterSpacing: 1,
              cursor: 'pointer',
            }}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <div style={{width: '100%', maxWidth: 420}}>
        <Player
          key={active.id}
          component={active.component}
          durationInFrames={active.durationInFrames}
          fps={active.fps}
          compositionWidth={1080}
          compositionHeight={1920}
          style={{width: '100%', borderRadius: 12, overflow: 'hidden'}}
          controls
          loop
        />
      </div>
    </div>
  );
};
