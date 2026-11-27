import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Background} from '../ui/Background';
import {clamp, ease, pop, sec} from '../ui/motion';
import {Arabic, Flash, SceneIn, StepLabel} from '../ui/Pieces';
import {C, F} from '../theme';
import {QualityScene} from '../types';

// A quality gauge: an arc in three tiers with only the top one named (e.g. PRISTINE). The needle
// wobbles low, sweeps up to the top tier on its cue and settles; a buyer chip pops (e.g. BRET PAYS),
// then a price counter rolls up to the top figure and lands with a flash. Only the top figure is
// shown, never invented tier prices.

const GX = 540;
const GY = 960;
const GR = 330;

const arc = (a0: number, a1: number, r: number) => {
  const p = (a: number) => [GX + Math.cos(a) * r, GY + Math.sin(a) * r];
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  return `M${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`;
};

export const Quality: React.FC<{s: QualityScene}> = ({s}) => {
  const frame = useCurrentFrame();
  const needleAt = sec(s.needleAt);
  const priceAt = sec(s.priceAt);
  const card = pop(frame, 3, 13, 0.6, 150);
  // the needle wobbles low, then sweeps to the top tier and settles
  const sweep = interpolate(frame, [needleAt, needleAt + 18], [0, 1], {...clamp, easing: (t) => 1 - Math.pow(1 - t, 3)});
  const settle = frame > needleAt + 18 ? Math.sin((frame - needleAt) / 3) * 2 * Math.max(0, 1 - (frame - needleAt - 18) / 20) : 0;
  const base = 0.12 + Math.sin(frame / 7) * 0.03;
  const v = base + (0.92 - base) * sweep; // 0..1 along the arc
  const a = Math.PI + v * Math.PI; // from left (π) to right (2π)
  const deg = (a * 180) / Math.PI + settle;
  const top = frame >= needleAt + 12;
  const countFor = Math.max(6, sec(s.countFor ?? 0.8));
  const count = interpolate(frame, [priceAt, priceAt + countFor], [0, s.price], {...clamp, easing: (t) => 1 - Math.pow(1 - t, 2)});
  const buyerAt = s.buyer ? sec(s.buyer.at) : 99999;
  const buyer = pop(frame, buyerAt, 10, 0.5, 220);
  const pricePop = pop(frame, priceAt, 10, 0.5, 200);
  const tiers = [
    {from: Math.PI, to: Math.PI * 1.33, color: '#6b6f7d'},
    {from: Math.PI * 1.34, to: Math.PI * 1.66, color: '#b8a05a'},
    {from: Math.PI * 1.67, to: Math.PI * 2, color: C.gold},
  ];
  return (
    <AbsoluteFill>
      <SceneIn>
        <Background broll={s.broll} />
      </SceneIn>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.85) 75%)'}} />
      <StepLabel step={s.step} label={s.label} />
      <div style={{position: 'absolute', top: 400, left: 0, right: 0, textAlign: 'center', fontFamily: F.brand, fontSize: 46, letterSpacing: 6, color: '#fff',
        opacity: ease(frame, 4, 14)}}>{s.title}</div>
      <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, opacity: Math.min(1, card * 1.4)}}>
        {tiers.map((t, i) => (
          <g key={i}>
            <path d={arc(t.from, t.to, GR)} fill="none" stroke={t.color} strokeWidth={60} opacity={i === 2 && top ? 1 : 0.75} />
            {Array.from({length: 7}).map((_, k) => {
              const am = t.from + ((t.to - t.from) * (k + 0.5)) / 7;
              return <line key={k} x1={GX + Math.cos(am) * (GR - 44)} y1={GY + Math.sin(am) * (GR - 44)} x2={GX + Math.cos(am) * (GR - 62)} y2={GY + Math.sin(am) * (GR - 62)}
                stroke="rgba(255,255,255,0.55)" strokeWidth={4} />;
            })}
          </g>
        ))}
        <text x={GX + Math.cos(Math.PI * 1.8) * (GR + 90)} y={GY + Math.sin(Math.PI * 1.8) * (GR + 90)} textAnchor="middle"
          fontFamily="'Black Ops One', Anton, sans-serif" fontSize={46} fill={top ? C.gold : 'rgba(255,255,255,0.6)'}>{s.topLabel}</text>
        {/* the needle */}
        <g transform={`rotate(${deg} ${GX} ${GY})`}>
          <path d={`M${GX} ${GY - 14} L${GX + GR - 40} ${GY} L${GX} ${GY + 14} Z`} fill="#f4f4f0" stroke="#0b0b0b" strokeWidth={4} />
        </g>
        <circle cx={GX} cy={GY} r={34} fill="#1a1a1f" stroke="#f4f4f0" strokeWidth={6} />
      </svg>
      {frame >= buyerAt && s.buyer ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: 1020, display: 'flex', justifyContent: 'center', transform: `scale(${buyer})`}}>
          <div style={{fontFamily: F.brand, fontSize: 44, letterSpacing: 4, color: '#0b0b0b', background: '#f4f4f0', padding: '8px 28px', borderRadius: 12,
            boxShadow: '0 10px 0 rgba(0,0,0,0.5)'}}>{s.buyer.text}</div>
        </div>
      ) : null}
      {frame >= priceAt ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: s.buyer ? 1110 : 1030, display: 'flex', flexDirection: 'column', alignItems: 'center', transform: `scale(${pricePop})`}}>
          {s.priceLabel ? <div style={{fontFamily: F.mono, fontSize: 30, letterSpacing: 6, color: '#fff', marginBottom: 6}}>{s.priceLabel}</div> : null}
          <div style={{fontFamily: F.display, fontSize: 170, lineHeight: 1, color: C.gold, textShadow: '0 8px 0 #000, 0 0 40px rgba(255,210,31,0.5)'}}>
            ${Math.round(count).toLocaleString('en-US')}
          </div>
        </div>
      ) : null}
      <Flash at={priceAt + countFor} length={8} color={C.gold} strength={0.4} />
      <Arabic text={s.ar} delay={16} top={1400} size={52} />
    </AbsoluteFill>
  );
};
