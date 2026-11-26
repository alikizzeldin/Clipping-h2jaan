import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Background} from '../ui/Background';
import {clamp, ease, pop, sec} from '../ui/motion';
import {Arabic, Flash, SceneIn, StepLabel} from '../ui/Pieces';
import {C, F} from '../theme';
import {GarageScene} from '../types';

// A storage garage at night: a code is punched into the keypad by the roll-up door, the light
// turns green, the door rolls up on a lit bay and a supercar's silhouette gleams inside; then a
// name chip pops under it.

const DOOR = {x: 120, y: 560, w: 640, h: 620};
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

const Car: React.FC<{glow: number}> = ({glow}) => (
  <svg width={560} height={220} viewBox="0 0 560 220">
    <defs>
      <linearGradient id="carBody" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#1a1d29" />
        <stop offset="0.5" stopColor="#2c2f42" />
        <stop offset="1" stopColor="#14161f" />
      </linearGradient>
    </defs>
    <ellipse cx={280} cy={196} rx={260} ry={16} fill="rgba(0,0,0,0.6)" />
    <path d="M14 160 L30 132 L190 112 L280 78 L372 76 L470 110 L540 122 L548 160 Z" fill="url(#carBody)" stroke={C.gold} strokeWidth={3 + 3 * glow} strokeLinejoin="round" />
    <path d="M292 86 L366 84 L430 110 L250 112 Z" fill="#0b2a3a" stroke="#4f6a7a" strokeWidth={2} />
    <path d="M40 146 L520 140" stroke={C.pink} strokeWidth={5} opacity={0.9} />
    <text x={330} y={140} fontFamily="Anton, Impact, sans-serif" fontSize={26} fill={C.gold} opacity={0.9}>1010</text>
    {[124, 446].map((cx) => (
      <g key={cx}>
        <circle cx={cx} cy={162} r={34} fill="#07080c" stroke="#3a3d4c" strokeWidth={5} />
        <circle cx={cx} cy={162} r={14} fill="#9aa0ae" />
      </g>
    ))}
    <rect x={530} y={128} width={14} height={8} rx={3} fill="#fff6c2" opacity={0.6 + 0.4 * glow} />
  </svg>
);

export const Garage: React.FC<{s: GarageScene}> = ({s}) => {
  const frame = useCurrentFrame();
  const chars = s.code.split('');
  const t0 = sec(s.typeAt);
  const t1 = sec(s.typeEnd);
  const at = (i: number) => (chars.length > 1 ? Math.round(t0 + ((t1 - t0) * i) / (chars.length - 1)) : t0);
  const typed = chars.filter((_, i) => frame >= at(i)).length;
  const openAt = sec(s.openAt);
  const ok = frame >= openAt - 6;
  const roll = interpolate(frame, [openAt, openAt + 26], [0, 1], {...clamp, easing: (t) => t * t * (3 - 2 * t)});
  const light = ease(frame, openAt + 6, openAt + 22);
  const carAt = sec(s.carAt);
  const chip = pop(frame, carAt, 10, 0.5, 220);
  const card = pop(frame, 3, 13, 0.6, 150);
  const lastKey = typed > 0 ? chars[typed - 1] : '';
  const keyGlow = typed > 0 ? interpolate(frame, [at(typed - 1), at(typed - 1) + 6], [1, 0], clamp) : 0;
  const tone = ok ? C.green : C.teal;
  const slats = 12;
  return (
    <AbsoluteFill>
      <SceneIn>
        <Background broll={s.broll} />
      </SceneIn>
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(4,5,10,0.6), rgba(4,5,10,0.9))'}} />
      <div style={{position: 'absolute', inset: 0, opacity: Math.min(1, card * 1.4), transform: `scale(${0.92 + 0.08 * card})`}}>
        {/* the building */}
        <div style={{position: 'absolute', left: 60, right: 60, top: 430, height: 790, background: 'linear-gradient(180deg, #3a3842, #24232b)', borderRadius: 10,
          boxShadow: '0 30px 80px rgba(0,0,0,0.6)'}} />
        <div style={{position: 'absolute', left: DOOR.x, top: 460, width: DOOR.w, height: 70, background: '#141318', border: `3px solid ${C.teal}`, borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.display, fontSize: 52, letterSpacing: 10, color: C.teal,
          textShadow: `0 0 16px ${C.teal}`}}>{s.sign ?? 'STORAGE'}</div>
        {/* the bay behind the door */}
        <div style={{position: 'absolute', left: DOOR.x, top: DOOR.y, width: DOOR.w, height: DOOR.h, overflow: 'hidden',
          background: `radial-gradient(ellipse at 50% 20%, rgba(255,214,140,${0.55 * light}) 0%, #0b0a0d 70%)`}}>
          <div style={{position: 'absolute', left: 40, bottom: 40, opacity: 0.25 + 0.75 * light, transform: `scale(${1.02})`}}>
            <Car glow={light} />
          </div>
          {/* the roll-up door */}
          <div style={{position: 'absolute', left: 0, top: -roll * DOOR.h, width: DOOR.w, height: DOOR.h,
            background: `repeating-linear-gradient(180deg, #8d919c 0 ${DOOR.h / slats - 6}px, #5d606b ${DOOR.h / slats - 6}px ${DOOR.h / slats}px)`,
            borderBottom: '10px solid #3d3f48'}} />
        </div>
        <div style={{position: 'absolute', left: DOOR.x - 12, top: DOOR.y - 8, width: DOOR.w + 24, height: 16, background: '#1a1a20'}} />
        {/* the keypad */}
        <div style={{position: 'absolute', left: 800, top: 700, width: 200, padding: 14, borderRadius: 16, background: '#16171d', border: '3px solid #4a4b5c'}}>
          <div style={{height: 58, borderRadius: 8, background: '#05150c', border: `3px solid ${tone}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: F.mono, fontWeight: 800, fontSize: 34, letterSpacing: 6, color: ok ? C.green : '#d6ffe9', textShadow: `0 0 10px ${tone}`}}>
            {ok ? 'OPEN' : chars.slice(0, typed).join('') || '····'}
          </div>
          <div style={{marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6}}>
            {KEYS.map((k) => {
              const lit = k === lastKey && !ok ? keyGlow : 0;
              return (
                <div key={k} style={{height: 36, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.display, fontSize: 24,
                  color: lit > 0.2 ? '#06060F' : '#e9ebf2', background: lit > 0.2 ? C.teal : 'rgba(255,255,255,0.08)'}}>{k}</div>
              );
            })}
          </div>
          <div style={{marginTop: 10, height: 10, borderRadius: 5, background: ok ? C.green : C.red, boxShadow: `0 0 14px ${ok ? C.green : C.red}`}} />
        </div>
      </div>
      {/* the name chip */}
      {frame >= carAt ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: 1196, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, transform: `scale(${chip})`}}>
          <div style={{fontFamily: F.display, fontSize: 74, letterSpacing: 3, color: '#0b0b0b', background: C.gold, padding: '8px 30px', borderRadius: 14,
            boxShadow: '0 12px 0 rgba(0,0,0,0.55)'}}>{s.car}</div>
          {s.carSub ? <div style={{fontFamily: F.mono, fontSize: 28, letterSpacing: 5, color: '#fff', textShadow: '0 3px 10px #000'}}>{s.carSub}</div> : null}
        </div>
      ) : null}
      <Flash at={openAt} length={8} color={C.green} strength={0.3} />
      <StepLabel step={s.step} label={s.label} />
      <Arabic text={s.ar} delay={16} top={1400} size={50} />
    </AbsoluteFill>
  );
};
