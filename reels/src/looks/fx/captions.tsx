import React from 'react';
import {interpolate} from 'remotion';
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
        const fill = `linear-gradient(90deg, ${accent} 0%, ${C.pink} ${p}%, rgba(255,255,255,0.95) ${p}%, rgba(255,255,255,0.95) 100%)`;
        return (
          <span key={i} style={{position: 'relative', display: 'inline-block', fontFamily: fontOf(), fontSize: size, lineHeight: 1.05, textTransform: 'uppercase'}}>
            <span style={{position: 'absolute', inset: 0, color: 'transparent', WebkitTextStroke: '12px #000', filter: 'drop-shadow(0 6px 0 #000)'}}>{clean(w)}</span>
            <span style={{position: 'relative', background: fill, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent'}}>{clean(w)}</span>
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
