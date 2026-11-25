import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame} from 'remotion';
import {C} from '../../theme';
import {clamp} from '../../ui/motion';
import {CutStyle} from '../types';

// Transitions drawn OVER the cut between two scenes. Reel.tsx starts each one LEAD frames
// before the cut, so `f` below is 0 at the cut, negative before it, positive after.
export const LEAD = 6;
export const CUT_LENGTH = 16;

const Shutter: React.FC<{f: number}> = ({f}) => {
  const close = f < 0 ? interpolate(f, [-LEAD, 0], [0, 1], clamp) : interpolate(f, [1, 8], [1, 0], clamp);
  const h = 980 * close;
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', top: 0, left: 0, right: 0, height: h, background: '#050507', borderBottom: `6px solid ${C.green}`}} />
      <div style={{position: 'absolute', bottom: 0, left: 0, right: 0, height: h, background: '#050507', borderTop: `6px solid ${C.green}`}} />
    </AbsoluteFill>
  );
};

const Whip: React.FC<{f: number}> = ({f}) => {
  const p = interpolate(f, [-LEAD, 6], [0, 1], clamp);
  const x = interpolate(p, [0, 1], [-1400, 1400]);
  const o = interpolate(f, [-LEAD, 0, 6], [0, 0.95, 0], clamp);
  return (
    <AbsoluteFill style={{opacity: o, mixBlendMode: 'screen'}}>
      <div style={{position: 'absolute', top: -200, bottom: -200, left: x, width: 900, transform: 'skewX(-18deg)', filter: 'blur(40px)',
        background: `linear-gradient(90deg, transparent, ${C.orange}, #fff, ${C.pink}, transparent)`}} />
    </AbsoluteFill>
  );
};

const Glitch: React.FC<{f: number}> = ({f}) => {
  const o = interpolate(f, [-3, 0, 5], [0, 1, 0], clamp);
  if (o <= 0) return null;
  const slices = Array.from({length: 9}).map((_, i) => ({
    y: random(`gs${f}-${i}`) * 1920,
    h: 20 + random(`gh${f}-${i}`) * 120,
    dx: (random(`gx${f}-${i}`) - 0.5) * 160,
    c: [C.pink, C.teal, '#fff', C.green][i % 4],
  }));
  return (
    <AbsoluteFill style={{opacity: o}}>
      {slices.map((s, i) => (
        <div key={i} style={{position: 'absolute', left: s.dx, right: -s.dx, top: s.y, height: s.h, background: s.c, opacity: 0.35, mixBlendMode: 'screen'}} />
      ))}
      <AbsoluteFill style={{background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.5) 0 3px, transparent 3px 7px)'}} />
    </AbsoluteFill>
  );
};

const Iris: React.FC<{f: number}> = ({f}) => {
  if (f < 0) {
    const r = interpolate(f, [-LEAD, 0], [1300, 0], clamp);
    return <AbsoluteFill style={{background: `radial-gradient(circle at 50% 50%, transparent ${r}px, #050507 ${r + 2}px)`}} />;
  }
  const r = interpolate(f, [0, 9], [0, 1300], clamp);
  return r < 1300 ? <AbsoluteFill style={{background: `radial-gradient(circle at 50% 50%, transparent ${r}px, #050507 ${r + 2}px)`}} /> : null;
};

// A diagonal slab of colour wiping across.
const Ink: React.FC<{f: number}> = ({f}) => {
  const p = interpolate(f, [-4, 5], [0, 1], clamp);
  const x = interpolate(p, [0, 1], [-1700, 1500]);
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <div style={{position: 'absolute', top: -400, bottom: -400, left: x, width: 1300, transform: 'skewX(-14deg)', background: C.red,
        boxShadow: `40px 0 0 #0b0b0b, -40px 0 0 ${C.gold}`}} />
    </AbsoluteFill>
  );
};

const Flash: React.FC<{f: number}> = ({f}) => {
  const o = interpolate(f, [-1, 0, 4], [0, 0.85, 0], clamp);
  return o > 0 ? <AbsoluteFill style={{background: '#fff', opacity: o}} /> : null;
};

// A VHS tape losing tracking at the cut: a band of static rolls up the screen, the picture
// above it smears into colour streaks, and a black head-switch bar chases it.
const Tracking: React.FC<{f: number}> = ({f}) => {
  const p = interpolate(f, [-LEAD, 7], [0, 1], clamp);
  if (p <= 0 || p >= 1) return null;
  const y = interpolate(p, [0, 1], [1980, -260]);
  const band = 200;
  const lines = Array.from({length: 14}).map((_, i) => ({
    top: y + random(`tr${f}-${i}`) * band,
    h: 2 + random(`th${f}-${i}`) * 7,
    x: (random(`tx${f}-${i}`) - 0.5) * 180,
    o: 0.25 + random(`to${f}-${i}`) * 0.6,
  }));
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: y - 140, height: 140, background: `linear-gradient(180deg, transparent, ${C.pink}22 40%, ${C.teal}33)`, mixBlendMode: 'screen'}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: y, height: band, background: 'rgba(200,200,210,0.18)', mixBlendMode: 'screen'}} />
      {lines.map((l, i) => (
        <div key={i} style={{position: 'absolute', left: l.x, right: -l.x, top: l.top, height: l.h, background: '#fff', opacity: l.o, mixBlendMode: 'screen'}} />
      ))}
      <div style={{position: 'absolute', left: 0, right: 0, top: y + band, height: 34, background: '#000', opacity: 0.85}} />
    </AbsoluteFill>
  );
};

const CUTS: Record<Exclude<CutStyle, 'none'>, React.FC<{f: number}>> = {shutter: Shutter, whip: Whip, glitch: Glitch, iris: Iris, ink: Ink, flash: Flash, tracking: Tracking};

export const CutFx: React.FC<{kind: CutStyle}> = ({kind}) => {
  const frame = useCurrentFrame();
  if (kind === 'none') return null;
  const Part = CUTS[kind];
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <Part f={frame - LEAD} />
    </AbsoluteFill>
  );
};
