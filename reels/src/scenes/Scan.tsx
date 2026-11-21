import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {Background} from '../ui/Background';
import {clamp, ease, pop, sec} from '../ui/motion';
import {Arabic, StepLabel} from '../ui/Pieces';
import {C, F} from '../theme';
import {ScanScene} from '../types';

// A HUD that locks onto a car and sweeps a scan line over it, ticking off checks.
export const Scan: React.FC<{s: ScanScene}> = ({s}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const {x, y, w, h} = s.target;
  const lock = pop(frame, 6, 14, 0.6, 160);
  const k = interpolate(lock, [0, 1], [1.5, 1]);
  const sweep = ((frame - 10) % 40) / 40;
  const scanning = frame > 10 && frame < durationInFrames - 6;
  const corner = (cx: number, cy: number, rot: number) => (
    <div style={{position: 'absolute', left: cx - 36, top: cy - 36, width: 72, height: 72, transform: `rotate(${rot}deg)`}}>
      <div style={{position: 'absolute', width: 64, height: 9, background: C.teal, boxShadow: `0 0 14px ${C.teal}`}} />
      <div style={{position: 'absolute', width: 9, height: 64, background: C.teal, boxShadow: `0 0 14px ${C.teal}`}} />
    </div>
  );
  return (
    <AbsoluteFill>
      <Background broll={s.broll} />
      <div style={{opacity: Math.min(1, lock * 1.5)}}>
        {corner(x - (w / 2) * k, y - (h / 2) * k, 0)}
        {corner(x + (w / 2) * k, y - (h / 2) * k, 90)}
        {corner(x + (w / 2) * k, y + (h / 2) * k, 180)}
        {corner(x - (w / 2) * k, y + (h / 2) * k, 270)}
      </div>
      {scanning ? (
        <div
          style={{
            position: 'absolute', left: x - w / 2, width: w, top: y - h / 2 + sweep * h, height: 70, marginTop: -60,
            background: `linear-gradient(180deg, transparent, ${C.teal}55 80%, ${C.teal})`, borderBottom: `3px solid ${C.teal}`,
            boxShadow: `0 6px 24px ${C.teal}`, mixBlendMode: 'screen',
          }}
        />
      ) : null}
      <StepLabel step={s.step} label={s.label} />
      <Arabic text={s.ar} delay={12} top={390} size={52} />
      <div style={{position: 'absolute', top: 1110, left: 70, right: 70, display: 'flex', flexDirection: 'column', gap: 18}}>
        {s.checks.map((c, i) => {
          const at = sec(c.at) - 3;
          const a = ease(frame, at, at + 10);
          const tick = pop(frame, at + 6, 9, 0.5, 240);
          if (frame < at) return null;
          return (
            <div
              key={i}
              style={{
                display: 'flex', alignItems: 'center', gap: 20, padding: '18px 26px', borderRadius: 22,
                background: 'rgba(6,14,20,0.82)', border: `2px solid ${C.teal}66`, opacity: a, transform: `translateX(${(1 - a) * -60}px)`,
                boxShadow: `0 0 30px ${C.teal}22`,
              }}
            >
              <div
                style={{
                  width: 52, height: 52, borderRadius: 26, background: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transform: `scale(${tick})`, boxShadow: `0 0 20px ${C.green}`,
                }}
              >
                <svg width={30} height={30} viewBox="0 0 30 30"><path d="M5 16 L12 23 L25 8" stroke="#06060F" strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <div style={{fontFamily: F.brand, fontWeight: 800, fontSize: 40, color: '#fff'}}>{c.text}</div>
            </div>
          );
        })}
      </div>
      <div
        style={{
          position: 'absolute', top: 1440, left: 70, fontFamily: F.mono, fontWeight: 700, fontSize: 24, color: C.teal, letterSpacing: 4,
          opacity: interpolate(frame % 30, [0, 15, 30], [1, 0.4, 1], clamp) * ease(frame, 10, 20),
        }}
      >
        {s.hud ?? '● SCANNING VEHICLE…'}
      </div>
    </AbsoluteFill>
  );
};
