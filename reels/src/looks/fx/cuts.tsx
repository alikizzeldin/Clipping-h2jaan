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


// A newspaper page turns over the cut: a sheet of newsprint (columns, a headline, a photo box)
// sweeps in from the right with a curled, shadowed edge, covers the frame at the cut, and leaves left.
const Pageturn: React.FC<{f: number}> = ({f}) => {
  const p = interpolate(f, [-LEAD, 0, 9], [0, 0.5, 1], clamp);
  if (p <= 0 || p >= 1) return null;
  const x = interpolate(p, [0, 0.5, 1], [1120, -230, -1700]);
  const lines = Array.from({length: 26});
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <div style={{position: 'absolute', top: -60, bottom: -60, left: x, width: 1540, transform: 'rotate(-2deg)', background: '#ece4cf',
        boxShadow: '-40px 0 60px rgba(0,0,0,0.55)'}}>
        {/* the curl: a fold highlight and a shadow along the leading edge */}
        <div style={{position: 'absolute', top: 0, bottom: 0, left: 0, width: 120, background: 'linear-gradient(90deg, #fffaf0 0%, #d9cfb6 45%, rgba(0,0,0,0.25) 100%)'}} />
        <div style={{position: 'absolute', top: 300, left: 190, width: 1100, height: 120, background: '#141210', display: 'flex', alignItems: 'center',
          paddingLeft: 40, fontFamily: "'Playfair Display Black', serif", fontSize: 76, color: '#ece4cf', letterSpacing: 2}}>THE LEONIDA HERALD</div>
        <div style={{position: 'absolute', top: 442, left: 190, width: 760, height: 46, background: '#141210', opacity: 0.85}} />
        <div style={{position: 'absolute', top: 540, left: 190, width: 520, height: 420, background: '#8f8775'}} />
        {[0, 1].map((c) =>
          lines.map((_, i) => (
            <div key={`${c}-${i}`} style={{position: 'absolute', top: 540 + i * 46, left: 750 + c * 290, width: 250 - (i % 5 === 4 ? 90 : 0), height: 14,
              background: '#5f584a', opacity: 0.55}} />
          )),
        )}
        {lines.slice(0, 20).map((_, i) => (
          <div key={`b${i}`} style={{position: 'absolute', top: 1010 + i * 46, left: 190, width: 520 - (i % 4 === 3 ? 140 : 0), height: 14, background: '#5f584a', opacity: 0.55}} />
        ))}
        <div style={{position: 'absolute', top: 1960, left: 190, width: 1100, height: 10, background: C.red}} />
      </div>
    </AbsoluteFill>
  );
};

// A crime-scene photographer's cut: a flashbulb pops over the cut and a numbered yellow evidence
// marker (a little tent) slides up into the corner, then everything fades. `n` is the cut's number.
const Marker: React.FC<{f: number; n?: number}> = ({f, n = 1}) => {
  const flash = interpolate(f, [-2, 0, 5], [0, 0.7, 0], clamp);
  const rise = interpolate(f, [-LEAD, -1], [0, 1], {...clamp, easing: (t) => 1 - Math.pow(1 - t, 3)});
  const out = interpolate(f, [5, 9], [1, 0], clamp);
  if (rise <= 0 && flash <= 0) return null;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{background: '#fffaf0', opacity: flash}} />
      <div style={{position: 'absolute', left: 70, bottom: 380 - 220 * (1 - rise), width: 230, height: 190, opacity: out}}>
        <svg width={230} height={190} viewBox="0 0 230 190">
          <polygon points="20,180 115,14 210,180" fill="#f6c600" stroke="#1a1a1a" strokeWidth={6} strokeLinejoin="round" />
          <polygon points="115,14 210,180 230,170 132,6" fill="#b48f00" />
          <text x={115} y={150} textAnchor="middle" fontFamily="'Barlow Condensed ExtraBold', Anton, sans-serif" fontSize={92} fill="#111">{n}</text>
        </svg>
      </div>
    </AbsoluteFill>
  );
};

const CUTS: Record<Exclude<CutStyle, 'none'>, React.FC<{f: number; n?: number}>> = {shutter: Shutter, whip: Whip, glitch: Glitch, iris: Iris, ink: Ink, flash: Flash, tracking: Tracking, pageturn: Pageturn, marker: Marker};

export const CutFx: React.FC<{kind: CutStyle; n?: number}> = ({kind, n}) => {
  const frame = useCurrentFrame();
  if (kind === 'none') return null;
  const Part = CUTS[kind];
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <Part f={frame - LEAD} n={n} />
    </AbsoluteFill>
  );
};
