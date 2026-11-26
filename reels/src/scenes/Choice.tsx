import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Background} from '../ui/Background';
import {clamp, ease, pop, sec} from '../ui/motion';
import {Arabic, SceneIn, StepLabel} from '../ui/Pieces';
import {C, F} from '../theme';
import {ChoiceScene} from '../types';

// A choice the game makes you take: two option cards stacked with an OR badge between them.
// Each card lights up on its line (the other dims) and its reward flips from ??? to the prize.

const Icon: React.FC<{kind: ChoiceScene['options'][number]['icon']; color: string}> = ({kind, color}) => (
  <svg width={150} height={150} viewBox="0 0 100 100">
    {kind === 'crosshair' ? (
      <g fill="none" stroke={color} strokeWidth={6} strokeLinecap="round">
        <circle cx={50} cy={50} r={32} />
        <circle cx={50} cy={50} r={6} fill={color} />
        <line x1={50} y1={6} x2={50} y2={30} /><line x1={50} y1={70} x2={50} y2={94} />
        <line x1={6} y1={50} x2={30} y2={50} /><line x1={70} y1={50} x2={94} y2={50} />
      </g>
    ) : kind === 'car' ? (
      <g fill={color}>
        <path d="M8 62 L8 50 Q10 44 18 43 L30 42 L40 30 L66 30 L78 42 L90 45 Q94 47 94 53 L94 62 Z" />
        <circle cx={28} cy={64} r={10} fill="#0b0b0b" stroke={color} strokeWidth={4} />
        <circle cx={74} cy={64} r={10} fill="#0b0b0b" stroke={color} strokeWidth={4} />
        <path d="M44 34 L64 34 L72 42 L44 42 Z" fill="#0b0b0b" opacity={0.6} />
      </g>
    ) : kind === 'cash' ? (
      <g>
        <rect x={10} y={28} width={80} height={44} rx={6} fill={color} />
        <circle cx={50} cy={50} r={12} fill="none" stroke="#0b0b0b" strokeWidth={4} />
        <text x={50} y={57} textAnchor="middle" fontFamily="Anton, Impact, sans-serif" fontSize={20} fill="#0b0b0b">$</text>
      </g>
    ) : (
      <g fill="none" stroke={color} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 58 L30 44 L46 50 L62 38 L86 52" />
        <path d="M30 44 L44 62 Q50 68 56 62 L70 50" />
        <path d="M14 58 L26 70 M86 52 L74 66" />
      </g>
    )}
  </svg>
);

export const Choice: React.FC<{s: ChoiceScene}> = ({s}) => {
  const frame = useCurrentFrame();
  const [a, b] = s.options;
  const atA = sec(a.at);
  const atB = sec(b.at);
  const active = frame >= atB ? 1 : frame >= atA ? 0 : -1;
  const q = pop(frame, 2, 12, 0.5, 200);
  const cards = [a, b].map((o, i) => {
    const at = sec(o.at);
    const shown = frame >= at;
    const flip = ease(frame, at, at + 8);
    const isOn = active === i;
    const dim = active === -1 ? 0.85 : isOn ? 1 : 0.5;
    const tone = C[o.color ?? (i === 0 ? 'red' : 'green')];
    const inn = pop(frame, 4 + i * 5, 12, 0.6, 160);
    return (
      <div key={i} style={{position: 'absolute', left: 80, right: 80, top: i === 0 ? 440 : 830, height: 320, borderRadius: 26,
        background: 'rgba(10,10,12,0.88)', border: `5px solid ${isOn ? tone : 'rgba(255,255,255,0.18)'}`, opacity: dim * Math.min(1, inn * 1.4),
        transform: `translateX(${(1 - inn) * (i === 0 ? -160 : 160)}px) scale(${isOn ? 1.04 : 1})`,
        boxShadow: isOn ? `0 0 60px ${tone}88, 0 24px 60px rgba(0,0,0,0.6)` : '0 24px 60px rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', gap: 26, padding: '0 40px'}}>
        <Icon kind={o.icon} color={tone} />
        <div style={{display: 'flex', flexDirection: 'column', gap: 14, flex: 1}}>
          <div style={{fontFamily: F.display, fontSize: 92, lineHeight: 0.95, color: '#fff', textTransform: 'uppercase'}}>{o.title}</div>
          <div style={{alignSelf: 'flex-start', fontFamily: F.brand, fontWeight: 900, fontSize: 44, letterSpacing: 2, padding: '8px 20px', borderRadius: 12,
            color: shown ? '#0b0b0b' : 'rgba(255,255,255,0.6)', background: shown ? tone : 'rgba(255,255,255,0.1)',
            transform: `perspective(600px) rotateX(${shown ? (1 - flip) * 90 : 0}deg)`}}>{shown ? o.reward : '? ? ?'}</div>
          {o.sub && shown ? (
            <div style={{fontFamily: F.mono, fontSize: 26, letterSpacing: 4, color: 'rgba(255,255,255,0.8)', opacity: flip}}>{o.sub}</div>
          ) : null}
        </div>
      </div>
    );
  });
  return (
    <AbsoluteFill>
      <SceneIn>
        <Background broll={s.broll} />
      </SceneIn>
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0.7))'}} />
      <StepLabel step={s.step} label={s.label} />
      <div style={{position: 'absolute', top: 360, left: 0, right: 0, textAlign: 'center', fontFamily: F.brand, fontWeight: 900, fontSize: 48, letterSpacing: 6,
        color: '#fff', transform: `scale(${q})`, textShadow: '0 4px 16px #000'}}>{s.question}</div>
      {cards}
      {/* the OR badge between the cards */}
      <div style={{position: 'absolute', top: 765, left: 0, right: 0, display: 'flex', justifyContent: 'center',
        transform: `scale(${pop(frame, 12, 10, 0.5, 220)}) rotate(${interpolate(frame, [12, 30], [-90, 0], clamp)}deg)`}}>
        <div style={{width: 110, height: 110, borderRadius: 55, background: C.gold, color: '#0b0b0b', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: F.display, fontSize: 52, border: '6px solid #0b0b0b', boxShadow: '0 10px 30px rgba(0,0,0,0.6)'}}>{s.or ?? 'OR'}</div>
      </div>
      <Arabic text={s.ar} delay={16} top={1210} size={52} />
    </AbsoluteFill>
  );
};
