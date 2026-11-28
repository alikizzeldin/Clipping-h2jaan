import React from 'react';
import {interpolate, random} from 'remotion';
import {C, F} from '../../theme';
import {Word} from '../../types';
import {clamp} from '../../ui/motion';
import {look, widthScale} from '../state';

// Caption styles. Each gets the words on screen now, the time and how far the chunk has
// popped in (0→1), and draws them; ui/Captions.tsx decides which chunk is showing.

export type CaptionProps = {words: Word[]; t: number; enter: number; y: number};

const clean = (w: Word) => w.text.replace(/[…]/g, '');
const isActive = (w: Word, t: number) => t >= w.start - 0.03 && t < w.end + 0.08;
const accentOf = () => {
  const slot = look().captions.active;
  return slot ? C[slot] : C.green;
};
const fontOf = () => look().captions.font ?? F.display;
const sizeOf = (base: number) => Math.round((look().captions.size ?? base) * widthScale());

const Row: React.FC<{y: number; enter: number; gap?: string; children: React.ReactNode}> = ({y, enter, gap = '14px 16px', children}) => (
  <div
    style={{
      position: 'absolute', top: y, left: 60, right: 60, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center',
      gap, transform: `scale(${0.85 + 0.15 * enter}) translateY(${(1 - enter) * 26}px)`, opacity: Math.min(1, enter * 1.4),
    }}
  >
    {children}
  </div>
);

// Each word on its own card; the word being said flips to the accent colour and tilts.
export const BoxCaptions: React.FC<CaptionProps> = ({words, t, enter, y}) => {
  const size = sizeOf(84);
  const accent = accentOf();
  return (
    <Row y={y} enter={enter}>
      {words.map((w, i) => {
        const on = isActive(w, t);
        return (
          <span
            key={i}
            style={{
              fontFamily: fontOf(), fontSize: size, lineHeight: 1.08, textTransform: 'uppercase', display: 'inline-block',
              padding: '4px 18px 2px', borderRadius: 10, color: on ? look().ink : '#0b0b12', background: on ? accent : '#fff',
              transform: `rotate(${on ? (i % 2 ? 2.2 : -2.2) : 0}deg) scale(${on ? 1.08 : 1})`,
              boxShadow: on ? `0 10px 0 rgba(0,0,0,0.55), 0 0 30px ${accent}66` : '0 8px 0 rgba(0,0,0,0.5)',
            }}
          >
            {clean(w)}
          </span>
        );
      })}
    </Row>
  );
};

// Outlined words that fill with the accent gradient as they are spoken.
export const KaraokeCaptions: React.FC<CaptionProps> = ({words, t, enter, y}) => {
  const size = sizeOf(96);
  const accent = accentOf();
  return (
    <Row y={y} enter={enter} gap="0 22px">
      {words.map((w, i) => {
        const p = interpolate(t, [w.start - 0.02, Math.max(w.start + 0.05, w.end)], [0, 100], clamp);
        const fill = `linear-gradient(90deg, ${accent}, ${C.pink})`;
        return (
          <span key={i} style={{position: 'relative', display: 'inline-block', fontFamily: fontOf(), fontSize: size, lineHeight: 1.05, textTransform: 'uppercase'}}>
            <span style={{position: 'absolute', inset: 0, display: 'block', color: 'transparent', WebkitTextStroke: '12px #000', filter: 'drop-shadow(0 6px 0 #000)'}}>{clean(w)}</span>
            <span style={{position: 'relative', display: 'block', color: 'rgba(255,255,255,0.95)'}}>{clean(w)}</span>
            {/* the spoken part: a gradient copy revealed left to right (clip-path, not a hard gradient stop, which breaks text clipping in video renders) */}
            <span style={{position: 'absolute', inset: 0, display: 'block', background: fill, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
              clipPath: `inset(-20% ${100 - p}% -20% 0)`}}>{clean(w)}</span>
          </span>
        );
      })}
    </Row>
  );
};

// Words on strips of tape (police tape, label maker): the word being said gets the accent strip.
export const TapeCaptions: React.FC<CaptionProps> = ({words, t, enter, y}) => {
  const size = sizeOf(80);
  const accent = accentOf();
  return (
    <Row y={y} enter={enter} gap="10px 10px">
      {words.map((w, i) => {
        const on = isActive(w, t);
        return (
          <span
            key={i}
            style={{
              fontFamily: fontOf(), fontSize: size, lineHeight: 1.1, textTransform: 'uppercase', display: 'inline-block',
              padding: '6px 22px 2px', color: on ? '#0b0b0b' : accent, background: on ? accent : '#101014',
              transform: `rotate(${[-2.5, 1.8, -1.2, 2.4][i % 4]}deg) translateY(${on ? -6 : 0}px)`,
              boxShadow: '0 8px 18px rgba(0,0,0,0.6)', clipPath: 'polygon(1.5% 0, 100% 3%, 98.5% 100%, 0 96%)',
            }}
          >
            {clean(w)}
          </span>
        );
      })}
    </Row>
  );
};

// 1980s closed captions: blocky mono letters, white on solid black bars, one bar per chunk;
// the word being said turns the accent colour and gets a blinking block cursor after it.
export const CcCaptions: React.FC<CaptionProps> = ({words, t, enter, y}) => {
  const size = look().captions.size ?? 84;
  const accent = accentOf();
  const font = look().captions.font ?? F.mono;
  const blink = Math.floor(t * 4) % 2 === 0;
  return (
    <div style={{position: 'absolute', top: y, left: 50, right: 50, display: 'flex', justifyContent: 'center', opacity: Math.min(1, enter * 2)}}>
      <div style={{background: '#000', padding: '8px 22px 4px', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0 0.45em',
        fontFamily: font, fontSize: size, lineHeight: 1.08, textTransform: 'uppercase', letterSpacing: 2, boxShadow: '0 0 0 4px #000'}}>
        {words.map((w, i) => {
          const on = isActive(w, t);
          return (
            <span key={i} style={{color: on ? accent : '#fff', textShadow: on ? `0 0 18px ${accent}aa` : 'none'}}>
              {clean(w)}
              {on && blink ? <span style={{display: 'inline-block', width: '0.5em', height: '0.85em', marginLeft: 6, background: accent, verticalAlign: '-0.08em'}} /> : null}
            </span>
          );
        })}
      </div>
    </div>
  );
};

// Words stacked one per line, the active one big and bright: a slow, punchy read.
export const StackCaptions: React.FC<CaptionProps> = ({words, t, enter, y}) => {
  const size = sizeOf(88);
  const accent = accentOf();
  return (
    <div
      style={{
        position: 'absolute', top: y - 40 * Math.max(0, words.length - 1) - 60, left: 60, right: 60, display: 'flex', flexDirection: 'column', alignItems: 'center',
        opacity: Math.min(1, enter * 1.4), transform: `translateY(${(1 - enter) * 26}px)`,
      }}
    >
      {words.map((w, i) => {
        const on = isActive(w, t);
        return (
          <span
            key={i}
            style={{
              fontFamily: fontOf(), fontSize: on ? size * 1.15 : size * 0.8, lineHeight: 1, textTransform: 'uppercase',
              color: on ? accent : 'rgba(255,255,255,0.8)', WebkitTextStroke: '9px #000', paintOrder: 'stroke fill',
              textShadow: on ? `0 0 30px ${accent}88` : 'none',
            }}
          >
            {clean(w)}
          </span>
        );
      })}
    </div>
  );
};

// Ransom-note captions: every letter is cut from a different page (its own font, paper and tilt),
// pasted in a row. The word being said is pasted on the accent paper and lifts off the page.
const RANSOM_FONTS = ["'Oswald Bold'", "'Playfair Display Black'", 'Anton', "'Archivo Black'", "'Bebas Neue'", "'Special Elite'", "'Black Ops One'", "'Big Shoulders Black'"];
const RANSOM_PAPERS: [string, string][] = [['#f4efe2', '#111'], ['#111', '#f4efe2'], ['#ffe14d', '#111'], ['#e9e2cf', '#b3001b'], ['#ffffff', '#111'], ['#d8d2c2', '#111']];

export const RansomCaptions: React.FC<CaptionProps> = ({words, t, enter, y}) => {
  const size = look().captions.size ?? 72;
  const accent = accentOf();
  return (
    <Row y={y} enter={enter} gap="18px 44px">
      {words.map((w, i) => {
        const on = isActive(w, t);
        const key = `${w.start.toFixed(2)}`;
        const letters = clean(w).toUpperCase().split('');
        return (
          <span key={i} style={{display: 'inline-flex', alignItems: 'center', gap: 3,
            transform: `translateY(${on ? -8 : 0}px) scale(${on ? 1.1 : 1})`, filter: on ? 'drop-shadow(0 12px 0 rgba(0,0,0,0.55))' : 'drop-shadow(0 6px 0 rgba(0,0,0,0.5))'}}>
            {letters.map((ch, j) => {
              const r = (n: string) => random(`rn${key}-${j}-${n}`);
              const [paper, ink] = on && j % 2 === 0 ? [accent, look().ink] : RANSOM_PAPERS[Math.floor(r('p') * RANSOM_PAPERS.length)];
              const font = RANSOM_FONTS[Math.floor(r('f') * RANSOM_FONTS.length)];
              return (
                <span key={j} style={{display: 'inline-block', fontFamily: font, fontSize: size * (0.86 + r('s') * 0.3), lineHeight: 1,
                  padding: '6px 6px 2px', background: paper, color: ink, transform: `rotate(${(r('r') - 0.5) * 14}deg) translateY(${(r('y') - 0.5) * 10}px)`,
                  clipPath: `polygon(${r('a') * 6}% 0, 100% ${r('b') * 8}%, ${100 - r('c') * 6}% 100%, 0 ${100 - r('d') * 8}%)`}}>
                  {ch === ' ' ? '\u00a0' : ch}
                </span>
              );
            })}
          </span>
        );
      })}
    </Row>
  );
};

// Label-maker captions: each word punched into its own strip of glossy plastic tape, raised white
// letters, notched ends. The word being said is on accent tape and lifts; the rest sit on black tape.
const DYMO_TAPES = ['#141414', '#1b2a4a', '#141414', '#3a1418'];

export const DymoCaptions: React.FC<CaptionProps> = ({words, t, enter, y}) => {
  const size = look().captions.size ?? 66;
  const accent = accentOf();
  const font = look().captions.font ?? "'Space Mono Bold', monospace";
  return (
    <Row y={y} enter={enter} gap="16px 14px">
      {words.map((w, i) => {
        const on = isActive(w, t);
        const tape = on ? accent : DYMO_TAPES[i % DYMO_TAPES.length];
        const ink = on ? look().ink : '#f4f4f0';
        return (
          <span key={i} style={{position: 'relative', display: 'inline-block', fontFamily: font, fontSize: size, lineHeight: 1, letterSpacing: '0.08em',
            textTransform: 'uppercase', padding: '14px 26px 10px', color: ink, background: tape,
            backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.05) 38%, rgba(0,0,0,0.12) 100%)',
            textShadow: on ? '0 1px 0 rgba(255,255,255,0.35), 0 -1px 0 rgba(0,0,0,0.35)' : '0 2px 0 rgba(0,0,0,0.65), 0 -1px 0 rgba(255,255,255,0.25)',
            clipPath: 'polygon(0 0, 100% 0, 97% 50%, 100% 100%, 0 100%, 3% 50%)',
            transform: `rotate(${[-1.6, 1.2, -0.8, 1.8][i % 4]}deg) translateY(${on ? -8 : 0}px) scale(${on ? 1.08 : 1})`,
            filter: on ? 'drop-shadow(0 12px 0 rgba(0,0,0,0.55))' : 'drop-shadow(0 6px 0 rgba(0,0,0,0.55))'}}>
            {clean(w)}
          </span>
        );
      })}
    </Row>
  );
};

// An 80s arcade marquee: each word in chunky white letters extruded with stacked pixel shadows
// (magenta then violet). The word being said turns the accent colour and pops up in two hard steps,
// as sprites do, and a small "+score" floats off it in a pixel font.
const ARCADE_EXTRUDE = (a: string, b: string) =>
  [1, 2, 3, 4, 5, 6].map((k) => `${k}px ${k}px 0 ${k <= 3 ? a : b}`).join(', ') + ', 8px 10px 0 rgba(0,0,0,0.6)';

export const ArcadeCaptions: React.FC<CaptionProps> = ({words, t, enter, y}) => {
  const size = sizeOf(96);
  const accent = accentOf();
  return (
    <Row y={y} enter={enter} gap="12px 34px">
      {words.map((w, i) => {
        const on = isActive(w, t);
        const age = t - (w.start - 0.03);
        // two hard steps instead of a smooth ease: 1 → 1.06 → 1.1
        const step = !on ? 1 : age < 0.034 ? 1.06 : 1.1;
        const lift = on ? Math.min(1, age / 0.5) : 0;
        return (
          <span key={i} style={{position: 'relative', display: 'inline-block'}}>
            <span style={{display: 'inline-block', fontFamily: fontOf(), fontSize: size, lineHeight: 1.05, textTransform: 'uppercase', letterSpacing: '0.02em',
              color: on ? accent : '#ffffff', textShadow: ARCADE_EXTRUDE(on ? C.pink : C.magenta, on ? '#2a0a3a' : C.teal),
              transform: `scale(${step}) translateY(${on ? -4 : 0}px)`}}>
              {clean(w)}
            </span>
            {on ? (
              <span style={{position: 'absolute', left: '50%', top: -16 - 16 * lift, transform: 'translateX(-50%)', fontFamily: "'Press Start 2P', monospace", fontSize: 28,
                color: C.teal, textShadow: '3px 3px 0 #000', opacity: 1 - lift * 0.7, whiteSpace: 'nowrap'}}>
                +{(clean(w).replace(/[^\w]/g, '').length || 1) * 10}
              </span>
            ) : null}
          </span>
        );
      })}
    </Row>
  );
};
