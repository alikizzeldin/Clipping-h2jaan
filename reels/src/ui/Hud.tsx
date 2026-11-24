import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, F} from '../theme';
import {ease} from './motion';
import {lookHud} from '../looks/fx/hud';

// The top bar on every frame: brand, file number, a REC light and progress.
export const Hud: React.FC<{series: string; episode: number}> = ({series, episode}) => {
  const Styled = lookHud();
  return Styled ? <Styled series={series} episode={episode} /> : <BarHud series={series} episode={episode} />;
};

const BarHud: React.FC<{series: string; episode: number}> = ({series, episode}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const enter = ease(frame, 4, 22);
  const progress = frame / durationInFrames;
  const blink = Math.floor(frame / 15) % 2 === 0;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute', top: 150, left: 60, right: 60, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', opacity: enter, transform: `translateY(${(1 - enter) * -30}px)`,
        }}
      >
        <div style={{display: 'flex', alignItems: 'center', gap: 14}}>
          <div
            style={{
              fontFamily: F.brand, fontWeight: 900, fontSize: 34, letterSpacing: 1,
              background: `linear-gradient(90deg, ${C.pink}, ${C.orange})`, WebkitBackgroundClip: 'text', color: 'transparent',
            }}
          >
            GTA6FIED
          </div>
          <div style={{width: 2, height: 30, background: 'rgba(255,255,255,0.35)'}} />
          <div style={{fontFamily: F.mono, fontWeight: 700, fontSize: 24, color: 'rgba(255,255,255,0.85)', letterSpacing: 3}}>
            {series} #{String(episode).padStart(3, '0')}
          </div>
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: 10, fontFamily: F.mono, fontSize: 22, color: '#fff', letterSpacing: 2}}>
          <div style={{width: 16, height: 16, borderRadius: 8, background: C.red, opacity: blink ? 1 : 0.25, boxShadow: `0 0 14px ${C.red}`}} />
          REC
        </div>
      </div>
      <div style={{position: 'absolute', top: 212, left: 60, right: 60, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.15)', opacity: enter}}>
        <div
          style={{
            width: `${progress * 100}%`, height: '100%', borderRadius: 3,
            background: `linear-gradient(90deg, ${C.pink}, ${C.orange})`, boxShadow: `0 0 12px ${C.pink}`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
