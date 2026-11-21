import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Background} from '../ui/Background';
import {clamp, ease, pop} from '../ui/motion';
import {Arabic, SceneIn, StepLabel} from '../ui/Pieces';
import {C, F} from '../theme';
import {TimeScene} from '../types';

const STEP = 12; // frames between clock changes
const ROLL = 8; // frames a digit takes to roll

const Digit: React.FC<{prev: string; next: string; changedAt: number}> = ({prev, next, changedAt}) => {
  const frame = useCurrentFrame();
  const p = prev === next ? 1 : interpolate(frame, [changedAt, changedAt + ROLL], [0, 1], clamp);
  const style: React.CSSProperties = {position: 'absolute', left: 0, right: 0, textAlign: 'center'};
  return (
    <div style={{position: 'relative', width: next === ':' ? 70 : 132, height: 230, overflow: 'hidden'}}>
      <div style={{...style, transform: `translateY(${-p * 100}%)`, opacity: 1 - p}}>{prev}</div>
      <div style={{...style, transform: `translateY(${(1 - p) * 100}%)`, opacity: p}}>{next}</div>
    </div>
  );
};

export const Time: React.FC<{s: TimeScene}> = ({s}) => {
  const frame = useCurrentFrame();
  const panel = pop(frame, 4, 13, 0.6, 150);
  const step = Math.min(s.times.length - 1, Math.max(0, Math.floor((frame - 10) / STEP) + 1));
  const now = s.times[step];
  const before = s.times[Math.max(0, step - 1)];
  const changedAt = 10 + (step - 1) * STEP;
  const final = step === s.times.length - 1;
  const glow = final ? 0.6 + 0.4 * Math.sin(frame / 4) : 0.35;
  return (
    <AbsoluteFill>
      <SceneIn>
        <Background broll={s.broll} />
      </SceneIn>
      <StepLabel step={s.step} label={s.label} />
      <div
        style={{
          position: 'absolute', top: 520, left: 70, width: 940, height: 420, borderRadius: 40,
          background: 'rgba(6,6,20,0.6)', backdropFilter: 'blur(16px)', border: `3px solid ${final ? C.green : 'rgba(255,255,255,0.25)'}`,
          boxShadow: `0 0 ${60 * glow}px ${C.green}${final ? '88' : '22'}, inset 0 0 50px rgba(140,255,90,0.08)`,
          opacity: Math.min(1, panel * 1.4), transform: `scale(${0.85 + 0.15 * panel})`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <div style={{position: 'absolute', top: 30, left: 40, fontFamily: F.mono, fontWeight: 800, fontSize: 28, color: '#06060F', background: C.green, padding: '4px 14px', borderRadius: 6, letterSpacing: 3}}>
          AFTER
        </div>
        <svg width={90} height={90} viewBox="0 0 100 100" style={{position: 'absolute', top: 26, right: 40}}>
          <path d="M70 15 A40 40 0 1 0 85 70 A32 32 0 1 1 70 15 Z" fill="#F4F1D0" style={{filter: 'drop-shadow(0 0 14px #F4F1D0)'}} />
        </svg>
        <div style={{display: 'flex', alignItems: 'flex-end', gap: 10, marginTop: 30}}>
          <div style={{display: 'flex', fontFamily: F.mono, fontWeight: 800, fontSize: 210, color: '#fff', lineHeight: '230px', textShadow: `0 0 30px ${C.green}88`}}>
            {now.split('').map((ch, i) => (
              <Digit key={i} prev={before[i] ?? ch} next={ch} changedAt={changedAt} />
            ))}
          </div>
          <div style={{fontFamily: F.brand, fontWeight: 900, fontSize: 70, color: C.green, marginBottom: 34}}>{s.suffix}</div>
        </div>
        <div style={{fontFamily: F.mono, fontWeight: 700, fontSize: 32, color: 'rgba(255,255,255,0.8)', letterSpacing: 12, marginTop: 10}}>{s.note}</div>
      </div>
      <Arabic text={s.ar} delay={20} top={1010} />
      <div style={{position: 'absolute', top: 1110, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 16, opacity: ease(frame, 26, 40)}}>
        {Array.from({length: 12}).map((_, i) => (
          <div key={i} style={{width: 46, height: 8, borderRadius: 4, background: i <= ((frame / 3) % 12) ? C.green : 'rgba(255,255,255,0.15)'}} />
        ))}
      </div>
    </AbsoluteFill>
  );
};
