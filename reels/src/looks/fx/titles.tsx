import React from 'react';
import {random, useCurrentFrame} from 'remotion';
import {C, F} from '../../theme';
import {look} from '../state';

// How big words are drawn (hook titles, twist and reveal slams). `glitch` (0→1) is high just
// after a word lands; each style turns it into its own kind of shake.
export type TitleProps = {text: string; size: number; color: string; glitch: number; style?: React.CSSProperties};

const base = (size: number): React.CSSProperties => ({
  fontFamily: F.display, fontSize: size, lineHeight: 0.92, textTransform: 'uppercase', whiteSpace: 'nowrap',
});

// Polished metal: a banded gradient fill, a dark rim and a hard drop.
export const ChromeTitle: React.FC<TitleProps> = ({text, size, color, glitch, style}) => {
  const skew = glitch * 8;
  const fill = `linear-gradient(180deg, #ffffff 0%, ${color} 38%, #2a1030 52%, ${color} 64%, #ffffff 100%)`;
  return (
    <div style={{position: 'relative', transform: `skewX(${-skew}deg) scale(${1 + glitch * 0.06})`, ...style}}>
      <div style={{...base(size), position: 'absolute', inset: 0, color: 'transparent', WebkitTextStroke: `${Math.max(6, size / 18)}px #12061a`,
        filter: `drop-shadow(0 ${size / 16}px 0 #000)`}}>{text}</div>
      <div style={{...base(size), position: 'relative', background: fill, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent'}}>{text}</div>
    </div>
  );
};

// Hollow letters with a solid copy knocked out behind them.
export const OutlineTitle: React.FC<TitleProps> = ({text, size, color, glitch, style}) => {
  const off = size / 14 + glitch * 18;
  return (
    <div style={{position: 'relative', ...style}}>
      <div style={{...base(size), position: 'absolute', inset: 0, color, transform: `translate(${off}px, ${off}px)`, opacity: 0.95}}>{text}</div>
      <div style={{...base(size), position: 'relative', color: '#08080c', WebkitTextStroke: `${Math.max(4, size / 26)}px #fff`, paintOrder: 'stroke fill'}}>{text}</div>
    </div>
  );
};

// A neon tube: white-hot core, coloured glow, a flicker while it settles.
export const NeonTitle: React.FC<TitleProps> = ({text, size, color, glitch, style}) => {
  const frame = useCurrentFrame();
  const flicker = glitch > 0.05 && random(`nf${frame}`) < 0.35 ? 0.35 : 1;
  return (
    <div style={{position: 'relative', opacity: flicker, ...style}}>
      <div style={{...base(size), position: 'relative', color: '#fff7ff', WebkitTextStroke: `${Math.max(3, size / 40)}px ${color}`,
        textShadow: `0 0 ${size / 12}px ${color}, 0 0 ${size / 5}px ${color}, 0 0 ${size / 2.5}px ${color}99`}}>{text}</div>
    </div>
  );
};

// Print: a flat ink colour with a mis-registered second colour, like a cheap tabloid press.
export const PrintTitle: React.FC<TitleProps> = ({text, size, color, glitch, style}) => {
  const frame = useCurrentFrame();
  const jx = (random(`px${frame}`) - 0.5) * 16 * glitch;
  const shadow = color === '#fff' || color === '#ffffff' ? C.red : '#0b0b0b';
  return (
    <div style={{position: 'relative', ...style}}>
      <div style={{...base(size), position: 'absolute', inset: 0, color: shadow, transform: `translate(${size / 22 + jx}px, ${size / 22}px)`}}>{text}</div>
      <div style={{...base(size), position: 'relative', color, WebkitTextStroke: `${Math.max(3, size / 45)}px #0b0b0b`, paintOrder: 'stroke fill'}}>{text}</div>
    </div>
  );
};

export const TITLES: Record<string, React.FC<TitleProps>> = {chrome: ChromeTitle, outline: OutlineTitle, neon: NeonTitle, print: PrintTitle};
export const lookTitle = () => TITLES[look().title];
