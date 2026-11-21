import React from 'react';
import {AbsoluteFill, random, useCurrentFrame} from 'remotion';
import {C, F} from '../theme';
import {clamp, ease, pop} from './motion';
import {interpolate} from 'remotion';

// "STEP 02 / TIME" with a line that draws out.
export const StepLabel: React.FC<{step: string; label: string; delay?: number; top?: number}> = ({step, label, delay = 4, top = 300}) => {
  const frame = useCurrentFrame();
  const a = ease(frame, delay, delay + 14);
  const line = ease(frame, delay + 4, delay + 24);
  return (
    <div style={{position: 'absolute', top, left: 60, right: 60, opacity: a, transform: `translateX(${(1 - a) * -40}px)`}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 18}}>
        <div
          style={{
            fontFamily: F.mono, fontWeight: 800, fontSize: 26, color: '#06060F', background: C.green,
            padding: '6px 14px', borderRadius: 6, letterSpacing: 2,
          }}
        >
          STEP {step}
        </div>
        <div style={{fontFamily: F.mono, fontWeight: 700, fontSize: 28, color: '#fff', letterSpacing: 6}}>{label}</div>
      </div>
      <div style={{marginTop: 16, height: 3, width: `${line * 100}%`, background: `linear-gradient(90deg, ${C.green}, transparent)`}} />
    </div>
  );
};

// The Arabic line under a scene's headline.
export const Arabic: React.FC<{text?: string; delay?: number; top: number; size?: number}> = ({text, delay = 10, top, size = 58}) => {
  const frame = useCurrentFrame();
  if (!text) return null;
  const a = ease(frame, delay, delay + 16);
  return (
    <div
      dir="rtl"
      style={{
        position: 'absolute', top, left: 70, right: 70, textAlign: 'center', fontFamily: F.arabic, fontWeight: 800,
        fontSize: size, lineHeight: 1.35, color: '#fff', opacity: a, transform: `translateY(${(1 - a) * 24}px)`,
        textShadow: '0 4px 18px rgba(0,0,0,0.9), 0 2px 0 #000',
      }}
    >
      {text}
    </div>
  );
};

// Headline text with an RGB split that jitters while it glitches.
export const GlitchText: React.FC<{text: string; size: number; color: string; glitch: number; style?: React.CSSProperties}> = ({text, size, color, glitch, style}) => {
  const frame = useCurrentFrame();
  const jx = (random(`gx${frame}`) - 0.5) * 22 * glitch;
  const jy = (random(`gy${frame}`) - 0.5) * 8 * glitch;
  const base: React.CSSProperties = {fontFamily: F.display, fontSize: size, lineHeight: 0.92, textTransform: 'uppercase', whiteSpace: 'nowrap'};
  return (
    <div style={{position: 'relative', ...style}}>
      <div style={{...base, position: 'absolute', inset: 0, color: '#ff004c', transform: `translate(${-6 - jx}px, ${jy}px)`, mixBlendMode: 'screen', opacity: 0.85}}>{text}</div>
      <div style={{...base, position: 'absolute', inset: 0, color: '#00e5ff', transform: `translate(${6 + jx}px, ${-jy}px)`, mixBlendMode: 'screen', opacity: 0.85}}>{text}</div>
      <div style={{...base, position: 'relative', color, textShadow: `0 0 40px ${color}AA, 0 0 90px ${color}55`}}>{text}</div>
    </div>
  );
};

// A rubber stamp that slams onto the screen.
export const Stamp: React.FC<{text: string; delay: number; top: number; color?: string; rotate?: number}> = ({text, delay, top, color = C.red, rotate = -9}) => {
  const frame = useCurrentFrame();
  const s = pop(frame, delay, 9, 0.5, 260);
  if (frame < delay) return null;
  return (
    <div
      style={{
        position: 'absolute', top, left: 0, right: 0, display: 'flex', justifyContent: 'center',
        transform: `rotate(${rotate}deg) scale(${interpolate(s, [0, 1], [2.4, 1])})`, opacity: Math.min(1, s * 2),
      }}
    >
      <div
        style={{
          fontFamily: F.mono, fontWeight: 800, fontSize: 64, letterSpacing: 14, color, padding: '10px 28px',
          border: `7px solid ${color}`, borderRadius: 10, background: 'rgba(0,0,0,0.25)',
          boxShadow: `0 0 30px ${color}66, inset 0 0 20px ${color}44`,
        }}
      >
        {text}
      </div>
    </div>
  );
};

// White flash at a scene cut.
export const Flash: React.FC<{at?: number; length?: number; color?: string; strength?: number}> = ({at = 0, length = 8, color = '#fff', strength = 0.9}) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [at, at + 1, at + length], [0, strength, 0], clamp);
  return o > 0 ? <AbsoluteFill style={{background: color, opacity: o, mixBlendMode: 'screen'}} /> : null;
};

// Glowing dust that drifts upwards (inside a light beam, around a trophy…).
export const Particles: React.FC<{count?: number; x: number; y: number; w: number; h: number; color?: string; seed?: string; speed?: number}> = ({
  count = 40, x, y, w, h, color = C.green, seed = 'p', speed = 1,
}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {Array.from({length: count}).map((_, i) => {
        const px = x + random(`${seed}x${i}`) * w;
        const life = 60 + random(`${seed}l${i}`) * 60;
        const t = ((frame * speed + random(`${seed}o${i}`) * life) % life) / life;
        const py = y + h - t * h;
        const size = 3 + random(`${seed}s${i}`) * 6;
        return (
          <div
            key={i}
            style={{
              position: 'absolute', left: px, top: py, width: size, height: size, borderRadius: size,
              background: color, opacity: Math.sin(t * Math.PI) * 0.9, boxShadow: `0 0 ${size * 3}px ${color}`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// A scene's way in: a short zoom-blur from the cut.
export const SceneIn: React.FC<{children: React.ReactNode; length?: number}> = ({children, length = 9}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, 0, length);
  return (
    <AbsoluteFill style={{transform: `scale(${1.12 - 0.12 * p})`, filter: `blur(${(1 - p) * 14}px)`, opacity: Math.min(1, 0.3 + p)}}>
      {children}
    </AbsoluteFill>
  );
};
