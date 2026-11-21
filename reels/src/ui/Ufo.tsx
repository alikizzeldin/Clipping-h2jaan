import React from 'react';
import {useCurrentFrame} from 'remotion';
import {C} from '../theme';

// A flying saucer drawn in SVG: metal hull, glass dome, chasing rim lights.
export const Ufo: React.FC<{width?: number}> = ({width = 420}) => {
  const frame = useCurrentFrame();
  const lights = 9;
  return (
    <svg width={width} height={width * 0.55} viewBox="0 0 400 220" style={{overflow: 'visible'}}>
      <defs>
        <linearGradient id="hull" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E6ECF5" />
          <stop offset="0.45" stopColor="#8A95A8" />
          <stop offset="1" stopColor="#1E2230" />
        </linearGradient>
        <radialGradient id="dome" cx="0.4" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#E9FFF0" stopOpacity="0.95" />
          <stop offset="0.5" stopColor={C.green} stopOpacity="0.55" />
          <stop offset="1" stopColor="#0B3D1A" stopOpacity="0.9" />
        </radialGradient>
        <radialGradient id="under" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#F4FFE9" />
          <stop offset="0.4" stopColor={C.green} />
          <stop offset="1" stopColor={C.green} stopOpacity="0" />
        </radialGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
      <ellipse cx="200" cy="150" rx="120" ry="34" fill="url(#under)" filter="url(#glow)" opacity="0.9" />
      <path d="M128 100 A72 64 0 0 1 272 100 Z" fill="url(#dome)" stroke="#CFFFD9" strokeOpacity="0.6" strokeWidth="2" />
      <path d="M150 72 Q170 52 196 48" stroke="#fff" strokeOpacity="0.8" strokeWidth="5" strokeLinecap="round" fill="none" />
      <ellipse cx="200" cy="114" rx="192" ry="40" fill="url(#hull)" />
      <ellipse cx="200" cy="104" rx="186" ry="16" fill="#F3F6FB" opacity="0.55" />
      <ellipse cx="200" cy="132" rx="96" ry="16" fill="#151925" />
      {Array.from({length: lights}).map((_, i) => {
        const x = 30 + (i * 340) / (lights - 1);
        const y = 118 + Math.sin((i / (lights - 1)) * Math.PI) * 14;
        const on = (Math.floor(frame / 3) + i) % lights < 3;
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={on ? 11 : 6} fill={on ? C.green : '#2E7A3C'} filter={on ? 'url(#glow)' : undefined} />
            <circle cx={x} cy={y} r={5} fill={on ? '#F2FFE6' : '#3E8A4C'} />
          </g>
        );
      })}
    </svg>
  );
};

// A cone of light shining down from (x, top).
export const Beam: React.FC<{x: number; top: number; bottom: number; topWidth?: number; bottomWidth?: number; opacity: number; color?: string}> = ({
  x, top, bottom, topWidth = 160, bottomWidth = 560, opacity, color = C.green,
}) => {
  const frame = useCurrentFrame();
  const flicker = 0.85 + Math.sin(frame * 0.9) * 0.08 + Math.sin(frame * 2.3) * 0.05;
  const h = bottom - top;
  return (
    <div
      style={{
        position: 'absolute', left: x - bottomWidth / 2, top, width: bottomWidth, height: h, opacity: opacity * flicker,
        clipPath: `polygon(${50 - (topWidth / bottomWidth) * 50}% 0, ${50 + (topWidth / bottomWidth) * 50}% 0, 100% 100%, 0 100%)`,
        background: `linear-gradient(180deg, ${color}EE 0%, ${color}66 55%, ${color}00 100%)`,
        filter: 'blur(4px)', mixBlendMode: 'screen',
      }}
    />
  );
};
