import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame} from 'remotion';
import {Background} from '../ui/Background';
import {clamp, ease, pop, sec} from '../ui/motion';
import {Arabic, Flash} from '../ui/Pieces';
import {C, F} from '../theme';
import {RewardScene} from '../types';

const Cup: React.FC = () => {
  const frame = useCurrentFrame();
  const shine = ((frame * 3) % 160) - 40;
  return (
    <svg width={150} height={150} viewBox="0 0 100 100">
      <defs>
        <linearGradient id="bronze" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFE1B0" />
          <stop offset="0.45" stopColor="#E08A3C" />
          <stop offset="1" stopColor="#7A3B12" />
        </linearGradient>
        <linearGradient id="shine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id="cupclip">
          <path d="M28 14 H72 V40 C72 56 62 64 50 66 C38 64 28 56 28 40 Z M44 66 H56 V78 H66 V88 H34 V78 H44 Z" />
        </clipPath>
      </defs>
      <path d="M28 20 H14 C14 36 22 44 32 46 M72 20 H86 C86 36 78 44 68 46" stroke="url(#bronze)" strokeWidth="6" fill="none" />
      <path d="M28 14 H72 V40 C72 56 62 64 50 66 C38 64 28 56 28 40 Z M44 66 H56 V78 H66 V88 H34 V78 H44 Z" fill="url(#bronze)" />
      <rect x={shine} y={0} width={24} height={100} fill="url(#shine)" clipPath="url(#cupclip)" transform="skewX(-15)" />
      <path d="M50 26 l4 8 9 1 -7 6 2 9 -8 -5 -8 5 2 -9 -7 -6 9 -1 z" fill="#FFF3D6" />
    </svg>
  );
};

export const Reward: React.FC<{s: RewardScene}> = ({s}) => {
  const frame = useCurrentFrame();
  const later = s.later ?? '';
  const typed = Math.floor(interpolate(frame, [8, 30], [0, later.length], clamp));
  const at = sec(s.rewardAt);
  const card = pop(frame, at, 13, 0.7, 150);
  const burst = frame - at;
  return (
    <AbsoluteFill>
      <Background broll={s.broll} />
      <Flash at={0} length={14} strength={1} />
      {later ? (
        <div style={{position: 'absolute', top: 420, left: 0, right: 0, textAlign: 'center'}}>
          <div style={{display: 'inline-block', fontFamily: F.mono, fontWeight: 800, fontSize: 88, color: '#fff', letterSpacing: 6, background: 'rgba(0,0,0,0.55)', padding: '12px 30px', borderRadius: 12}}>
            {later.slice(0, typed)}
            <span style={{opacity: Math.floor(frame / 8) % 2 ? 0 : 1, color: C.pink}}>▌</span>
          </div>
        </div>
      ) : null}
      <Arabic text={s.ar} delay={30} top={580} size={58} />
      {frame >= at ? (
        <>
          {Array.from({length: 26}).map((_, i) => {
            const ang = random(`a${i}`) * Math.PI * 2;
            const dist = ease(burst, 0, 26) * (180 + random(`d${i}`) * 320);
            const size = 6 + random(`s${i}`) * 10;
            return (
              <div
                key={i}
                style={{
                  position: 'absolute', left: 230 + Math.cos(ang) * dist, top: 1140 + Math.sin(ang) * dist * 0.7, width: size, height: size,
                  borderRadius: size, background: i % 2 ? C.gold : '#fff', opacity: interpolate(burst, [0, 8, 34], [0, 1, 0], clamp),
                  boxShadow: `0 0 ${size * 2}px ${C.gold}`,
                }}
              />
            );
          })}
          <div
            style={{
              position: 'absolute', top: 1040, left: 60, width: 960, height: 210, borderRadius: 28, display: 'flex', alignItems: 'center', gap: 26,
              padding: '0 34px', background: 'linear-gradient(135deg, rgba(20,20,36,0.92), rgba(40,22,10,0.92))',
              border: `2px solid ${C.gold}88`, boxShadow: `0 20px 60px rgba(0,0,0,0.6), 0 0 50px ${C.gold}44`,
              transform: `translateY(${(1 - card) * 300}px) scale(${0.9 + 0.1 * card})`, opacity: Math.min(1, card * 1.5),
            }}
          >
            <Cup />
            <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
              <div style={{fontFamily: F.mono, fontWeight: 800, fontSize: 26, letterSpacing: 6, color: C.gold}}>{s.label}</div>
              <div style={{fontFamily: F.brand, fontWeight: 800, fontSize: 48, color: '#fff', lineHeight: 1.1}}>{s.name}</div>
              <div style={{fontFamily: F.mono, fontWeight: 700, fontSize: 24, letterSpacing: 4, color: 'rgba(255,255,255,0.7)'}}>{s.tier}</div>
            </div>
          </div>
        </>
      ) : null}
    </AbsoluteFill>
  );
};
