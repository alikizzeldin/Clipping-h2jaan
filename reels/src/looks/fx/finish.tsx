import React from 'react';
import {AbsoluteFill, Img, random, staticFile, useCurrentFrame} from 'remotion';
import {noise2D} from '@remotion/noise';
import {C} from '../../theme';
import {FinishFx} from '../types';

// Full-frame finishes laid over the whole reel. Keep each one cheap: it runs on every frame.

export const Vignette: React.FC<{strength?: number}> = ({strength = 0.7}) => (
  <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 50%, rgba(0,0,0,${strength}) 100%)`}} />
);

export const Scanlines: React.FC = () => (
  <AbsoluteFill
    style={{
      background: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.035) 0px, rgba(255,255,255,0.035) 1px, transparent 1px, transparent 4px)',
      mixBlendMode: 'overlay',
    }}
  />
);

export const Grain: React.FC<{opacity?: number}> = ({opacity = 0.11}) => {
  const frame = useCurrentFrame();
  return (
    <svg width="1080" height="1920" style={{position: 'absolute', opacity, mixBlendMode: 'overlay'}}>
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={frame % 12} />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="1080" height="1920" filter="url(#grain)" />
    </svg>
  );
};

// A worn VHS tape: a tracking band rolling down, jittery lines, colour fringes at the edges
// and head-switching noise along the bottom.
export const Vhs: React.FC = () => {
  const frame = useCurrentFrame();
  const bandY = ((frame * 9) % 2400) - 240;
  const lines = Array.from({length: 4}).map((_, i) => ({
    y: random(`vy${frame}-${i}`) * 1920,
    x: random(`vx${frame}-${i}`) * 400,
    w: 200 + random(`vw${frame}-${i}`) * 880,
    h: 1 + Math.round(random(`vh${frame}-${i}`) * 3),
    o: random(`vo${frame}-${i}`) * 0.35,
  }));
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute', left: 0, right: 0, top: bandY, height: 120, mixBlendMode: 'screen',
          background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.07) 30%, rgba(255,255,255,0.16) 52%, rgba(255,255,255,0.05) 75%, transparent)',
        }}
      />
      {lines.map((l, i) => (
        <div key={i} style={{position: 'absolute', left: l.x, top: l.y, width: l.w, height: l.h, background: '#fff', opacity: l.o, mixBlendMode: 'screen'}} />
      ))}
      <AbsoluteFill style={{background: `linear-gradient(90deg, ${C.pink}40 0px, transparent 46px, transparent calc(100% - 46px), ${C.teal}40 100%)`, mixBlendMode: 'screen'}} />
      <div
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, height: 26, opacity: 0.55,
          background: `repeating-linear-gradient(90deg, rgba(255,255,255,0.5) 0 ${2 + (frame % 5)}px, transparent ${2 + (frame % 5)}px ${9 + (frame % 7)}px)`,
          transform: `translateX(${(random(`vb${frame}`) - 0.5) * 60}px)`,
        }}
      />
    </AbsoluteFill>
  );
};

// Newspaper print: a fine dot screen.
export const Halftone: React.FC = () => (
  <AbsoluteFill
    style={{
      background: 'radial-gradient(circle at center, rgba(0,0,0,0.9) 0 1.7px, transparent 2.3px) 0 0 / 8px 8px',
      mixBlendMode: 'multiply', opacity: 0.32,
    }}
  />
);

// Paper fibres and a warm tone (a texture made once by reels/tools/textures.py).
export const Paper: React.FC = () => (
  <AbsoluteFill style={{mixBlendMode: 'multiply', opacity: 0.55}}>
    <Img src={staticFile('textures/paper.jpg')} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
  </AbsoluteFill>
);

// Warm light leaking into the lens, drifting slowly.
export const LightLeak: React.FC = () => {
  const frame = useCurrentFrame();
  const blobs = [
    {c: C.orange, x: 0.1, y: 0.15, r: 900},
    {c: C.pink, x: 0.95, y: 0.4, r: 800},
    {c: C.gold, x: 0.3, y: 0.95, r: 700},
  ];
  return (
    <AbsoluteFill style={{mixBlendMode: 'screen'}}>
      {blobs.map((b, i) => {
        const x = (b.x + noise2D(`lx${i}`, frame / 160, 0) * 0.18) * 1080;
        const y = (b.y + noise2D(`ly${i}`, frame / 160, 1) * 0.12) * 1920;
        const o = 0.2 + 0.14 * (0.5 + 0.5 * noise2D(`lo${i}`, frame / 90, 2));
        return (
          <div
            key={i}
            style={{
              position: 'absolute', left: x - b.r / 2, top: y - b.r / 2, width: b.r, height: b.r, borderRadius: '50%', opacity: o,
              background: `radial-gradient(circle, ${b.c} 0%, ${b.c}88 30%, transparent 70%)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// Old film: dust specks every frame and the odd scratch.
export const Dust: React.FC = () => {
  const frame = useCurrentFrame();
  const specks = Array.from({length: 16}).map((_, i) => ({
    x: random(`dx${frame}-${i}`) * 1080,
    y: random(`dy${frame}-${i}`) * 1920,
    s: 2 + random(`ds${frame}-${i}`) * 6,
    dark: random(`dd${frame}-${i}`) > 0.4,
  }));
  const scratch = random(`sc${Math.floor(frame / 3)}`) > 0.6;
  const sx = random(`sx${Math.floor(frame / 3)}`) * 1080;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {specks.map((p, i) => (
        <div key={i} style={{position: 'absolute', left: p.x, top: p.y, width: p.s, height: p.s * (0.6 + (i % 3) * 0.4), borderRadius: p.s,
          background: p.dark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,240,0.45)'}} />
      ))}
      {scratch ? <div style={{position: 'absolute', left: sx, top: 0, bottom: 0, width: 1.5, background: 'rgba(255,255,240,0.22)'}} /> : null}
    </AbsoluteFill>
  );
};

// A curved tube TV: dark rounded corners, RGB stripes and a faint flicker.
export const Crt: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <AbsoluteFill
        style={{
          background: 'repeating-linear-gradient(90deg, rgba(255,0,60,0.05) 0 1px, rgba(0,255,120,0.05) 1px 2px, rgba(0,120,255,0.05) 2px 3px)',
          mixBlendMode: 'screen',
        }}
      />
      <AbsoluteFill style={{background: `rgba(255,255,255,${0.012 + 0.018 * random(`cf${frame}`)})`, mixBlendMode: 'screen'}} />
      <AbsoluteFill style={{boxShadow: 'inset 0 0 160px 40px rgba(0,0,0,0.85)', borderRadius: 60}} />
    </AbsoluteFill>
  );
};

// A soft haze from the top, as if the highlights were blooming.
export const Bloom: React.FC = () => (
  <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.12), transparent 60%)', mixBlendMode: 'screen'}} />
);

const PARTS: Record<FinishFx, React.FC> = {
  vignette: () => <Vignette />,
  scanlines: Scanlines,
  grain: () => <Grain />,
  vhs: Vhs,
  halftone: Halftone,
  paper: Paper,
  lightleak: LightLeak,
  dust: Dust,
  crt: Crt,
  bloom: Bloom,
};

export const FinishStack: React.FC<{fx: FinishFx[]}> = ({fx}) => (
  <AbsoluteFill style={{pointerEvents: 'none'}}>
    {fx.map((name, i) => {
      const Part = PARTS[name];
      return <Part key={`${name}${i}`} />;
    })}
  </AbsoluteFill>
);
