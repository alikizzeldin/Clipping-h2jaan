import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {Background} from '../ui/Background';
import {clamp, ease, pop, sec} from '../ui/motion';
import {Arabic} from '../ui/Pieces';
import {C, F} from '../theme';
import {Era as EraT, EraScene} from '../types';

// Each era's screen and colours: an old CRT for the PS2 games, a flat panel for GTA 4,
// a crisp HD screen for GTA 5. The look is our own; no game logos are used.
const LOOK = {
  vc: {w: 900, h: 675, radius: 70, bezel: 34, bg: 'linear-gradient(160deg, #ff3cac 0%, #784ba0 55%, #2b86c5 100%)',
    ink: '#fff', accent: '#3ff2ff', font: F.brand, italic: true, scan: 0.22, wobble: 1, sat: 1.15},
  sa: {w: 900, h: 675, radius: 70, bezel: 34, bg: 'linear-gradient(160deg, #f6b042 0%, #b8692b 50%, #2c4a2e 100%)',
    ink: '#fff6dc', accent: '#9cff6e', font: F.display, italic: false, scan: 0.2, wobble: 0.8, sat: 1.05},
  iv: {w: 960, h: 540, radius: 18, bezel: 16, bg: 'linear-gradient(160deg, #6f7f8f 0%, #2c3640 60%, #12171d 100%)',
    ink: '#e9eef3', accent: '#ffd86b', font: F.body, italic: false, scan: 0.08, wobble: 0.3, sat: 0.6},
  v: {w: 960, h: 540, radius: 10, bezel: 8, bg: 'linear-gradient(160deg, #1b5e3b 0%, #0d2a1c 60%, #050d09 100%)',
    ink: '#ffffff', accent: '#8cff5a', font: F.brand, italic: false, scan: 0.03, wobble: 0, sat: 1},
} as const;

const Chip: React.FC<{text: string; show: number; accent: string}> = ({text, show, accent}) => (
  <div style={{
    minWidth: 92, height: 92, padding: '0 14px', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.45)', border: `4px solid ${accent}`, color: '#fff', fontFamily: F.display, fontSize: 54,
    boxShadow: `0 0 ${20 * show}px ${accent}`, transform: `scale(${0.4 + 0.6 * show})`, opacity: show,
  }}>{text}</div>
);

const EraCard: React.FC<{era: EraT; start: number; end: number; beats?: number[]}> = ({era, start, end}) => {
  const frame = useCurrentFrame();
  const look = LOOK[era.look];
  const t = frame - start;
  const on = pop(frame, start, 12, 0.6, 170);
  const jitter = (random(`j${frame}`) - 0.5) * 6 * look.wobble;
  const roll = interpolate(t, [0, 6], [60, 0], clamp); // the picture rolls into place like a channel switch
  const noise = interpolate(t, [0, 3, 7], [1, 0.8, 0], clamp);
  const fadeOut = interpolate(frame, [end - 5, end], [1, 0], clamp);
  const items = era.cheat.split(' ');
  const typedChars = Math.floor(interpolate(t, [10, 10 + era.cheat.length * 3], [0, era.cheat.length], clamp));
  const done = t > 10 + era.cheat.length * 3 + 6;
  // Spoken buttons appear on the narrator's word; the rest follow quickly.
  const beats = (era.beats ?? []).map((b) => sec(b) - start);
  const chipAt = (i: number) => (i < beats.length ? beats[i] : (beats.length ? beats[beats.length - 1] + 6 + (i - beats.length) * 4 : 12 + i * 4));
  return (
    <div style={{position: 'absolute', left: (1080 - look.w) / 2, top: 360 + (675 - look.h) / 2, width: look.w, height: look.h,
      opacity: Math.min(1, on * 1.5) * fadeOut, transform: `scale(${0.9 + 0.1 * on}) translateX(${jitter}px)`}}>
      {/* the set around the picture */}
      <div style={{position: 'absolute', inset: -look.bezel, borderRadius: look.radius + look.bezel,
        background: era.look === 'v' ? '#0a0a0a' : 'linear-gradient(180deg, #3a3a3a, #161616)',
        boxShadow: `0 40px 90px rgba(0,0,0,0.7), 0 0 80px ${look.accent}33`}} />
      <div style={{position: 'absolute', inset: 0, borderRadius: look.radius, overflow: 'hidden', background: look.bg,
        filter: `saturate(${look.sat})`, transform: `translateY(${roll}px)`}}>
        <div style={{position: 'absolute', top: 30, left: 40, fontFamily: F.mono, fontWeight: 800, fontSize: 34, color: look.ink, opacity: 0.85, letterSpacing: 6}}>
          {era.year}
        </div>
        <div style={{position: 'absolute', top: 76, left: 0, right: 0, textAlign: 'center', fontFamily: look.font, fontWeight: 900,
          fontStyle: look.italic ? 'italic' : 'normal', fontSize: era.look === 'iv' ? 84 : 104, color: look.ink, letterSpacing: era.look === 'iv' ? 14 : 2,
          textShadow: era.look === 'vc' ? `0 0 30px ${C.pink}, 4px 4px 0 #2b0a3d` : '0 6px 0 rgba(0,0,0,0.45)', textTransform: 'uppercase'}}>
          {era.game}
        </div>
        <div style={{position: 'absolute', top: look.h * 0.45, left: 30, right: 30, display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap'}}>
          {era.kind === 'buttons' ? items.map((it, i) => (
            <Chip key={i} text={it} accent={look.accent} show={interpolate(t, [chipAt(i), chipAt(i) + 5], [0, 1], clamp)} />
          )) : null}
          {era.kind !== 'buttons' ? (
            <div style={{fontFamily: era.kind === 'dial' ? F.mono : F.display, fontWeight: 800, fontSize: era.kind === 'dial' ? 70 : 140,
              color: look.ink, letterSpacing: era.kind === 'dial' ? 2 : 10, padding: '6px 26px', borderRadius: 16,
              background: era.kind === 'dial' ? 'rgba(0,0,0,0.5)' : 'transparent', border: era.kind === 'dial' ? `3px solid ${look.accent}` : 'none',
              textShadow: `0 0 24px ${look.accent}`}}>
              {era.cheat.slice(0, typedChars)}
              <span style={{opacity: Math.floor(frame / 8) % 2 ? 0 : 1, color: look.accent}}>▌</span>
            </div>
          ) : null}
        </div>
        {era.note ? (
          <div style={{position: 'absolute', bottom: 40, left: 0, right: 0, textAlign: 'center', fontFamily: F.mono, fontWeight: 800, fontSize: 30,
            letterSpacing: 6, color: look.accent, opacity: done || era.kind === 'buttons' ? ease(t, 50, 62) : 0}}>{era.note}</div>
        ) : null}
        {era.kind === 'typed' && done ? (
          <div style={{position: 'absolute', top: 30, right: 40, fontFamily: F.body, fontWeight: 800, fontSize: 30, color: '#fff',
            background: 'rgba(0,0,0,0.55)', padding: '6px 14px', borderRadius: 6}}>Cheat activated</div>
        ) : null}
        {era.look === 'v' && t > 70 ? (
          <svg width={260} height={110} viewBox="0 0 260 110" style={{position: 'absolute', top: 40, left: interpolate(t, [70, 130], [-260, look.w + 40], clamp)}}>
            <rect x={60} y={44} width={140} height={34} rx={17} fill="#111" />
            <rect x={196} y={54} width={60} height={8} fill="#111" />
            <rect x={20} y={36} width={220} height={5} fill="#111" transform={`rotate(${(frame * 25) % 12 - 6} 130 38)`} />
            <rect x={126} y={36} width={8} height={12} fill="#111" />
            <rect x={80} y={84} width={100} height={5} fill="#111" />
          </svg>
        ) : null}
        <AbsoluteFill style={{background: `repeating-linear-gradient(0deg, rgba(0,0,0,${look.scan}) 0px, rgba(0,0,0,${look.scan}) 2px, transparent 2px, transparent 5px)`}} />
        {noise > 0 ? (
          <svg width={look.w} height={look.h} style={{position: 'absolute', inset: 0, opacity: noise}}>
            <filter id={`n${start}`}><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed={frame} /><feColorMatrix type="saturate" values="0" /></filter>
            <rect width={look.w} height={look.h} filter={`url(#n${start})`} />
          </svg>
        ) : null}
        <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)'}} />
      </div>
    </div>
  );
};

export const Era: React.FC<{s: EraScene}> = ({s}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const starts = s.eras.map((e) => sec(e.at));
  const breakout = interpolate(frame, [durationInFrames - 12, durationInFrames], [0, 1], clamp);
  const glow = s.eras.length ? LOOK[s.eras[Math.max(0, starts.filter((st) => frame >= st).length - 1)].look].accent : C.pink;
  if (s.recap) {
    const tiles = ['VICE CITY', 'SAN ANDREAS', 'GTA IV', 'GTA V', 'GTA 6'];
    const at = sec(s.recap.at);
    return (
      <AbsoluteFill>
        <Background broll={s.broll} />
        <div style={{position: 'absolute', top: 360, left: 40, right: 40, display: 'flex', justifyContent: 'center', gap: 14}}>
          {tiles.map((name, i) => {
            const p = pop(frame, at + i * 6, 12, 0.5, 200);
            const last = i === tiles.length - 1;
            return (
              <div key={name} style={{width: last ? 220 : 170, height: last ? 260 : 210, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                textAlign: 'center', padding: 10, fontFamily: last ? F.display : F.mono, fontWeight: 800, fontSize: last ? 54 : 24, color: '#fff',
                background: last ? `linear-gradient(160deg, ${C.pink}, ${C.orange})` : 'rgba(255,255,255,0.08)', border: `2px solid ${last ? '#fff' : 'rgba(255,255,255,0.25)'}`,
                transform: `translateY(${(1 - p) * 60}px) scale(${0.8 + 0.2 * p})`, opacity: p, alignSelf: 'flex-end',
                boxShadow: last ? `0 0 50px ${C.pink}99` : 'none', filter: last ? 'none' : 'grayscale(0.6)'}}>{name}</div>
            );
          })}
        </div>
        <div style={{position: 'absolute', top: 720, left: 60, right: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10}}>
          {s.recap.lines.map((line, i) => {
            const a = ease(frame, sec(line.at), sec(line.at) + 12);
            return (
              <div key={i} style={{fontFamily: F.display, fontSize: 104, lineHeight: 1, textAlign: 'center', textTransform: 'uppercase',
                color: line.color === 'pink' ? C.pink : '#fff', opacity: a, transform: `translateY(${(1 - a) * 30}px)`,
                WebkitTextStroke: '8px #000', paintOrder: 'stroke fill', textShadow: line.color === 'pink' ? `0 0 30px ${C.pink}88` : 'none'}}>{line.text}</div>
            );
          })}
        </div>
        <Arabic text={s.ar} delay={at + 30} top={1150} size={56} />
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{background: '#07060c'}}>
      <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 45%, ${glow}33 0%, transparent 60%)`}} />
      {s.eras.map((era, i) => (
        <EraCard key={i} era={era} start={starts[i]} end={i + 1 < starts.length ? starts[i + 1] : durationInFrames + 30} />
      ))}
      <div style={{position: 'absolute', top: 1150, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 18}}>
        {s.eras.map((era, i) => {
          const active = frame >= starts[i] && (i + 1 >= starts.length || frame < starts[i + 1]);
          return (
            <div key={i} style={{fontFamily: F.mono, fontWeight: 800, fontSize: 26, letterSpacing: 3, padding: '8px 14px', borderRadius: 30,
              color: active ? '#06060F' : 'rgba(255,255,255,0.5)', background: active ? LOOK[era.look].accent : 'rgba(255,255,255,0.06)',
              opacity: frame >= starts[i] ? 1 : 0.35}}>{era.year}</div>
          );
        })}
        <div style={{fontFamily: F.mono, fontWeight: 800, fontSize: 26, letterSpacing: 3, padding: '8px 14px', borderRadius: 30,
          color: 'rgba(255,255,255,0.5)', border: `2px dashed ${C.pink}`}}>2026</div>
      </div>
      <Arabic text={s.ar} delay={20} top={1260} size={54} />
      {breakout > 0 ? <AbsoluteFill style={{background: '#fff', opacity: breakout}} /> : null}
    </AbsoluteFill>
  );
};
