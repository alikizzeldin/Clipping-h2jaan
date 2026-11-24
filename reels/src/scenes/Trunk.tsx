import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {noise2D} from '@remotion/noise';
import {Background} from '../ui/Background';
import {clamp, ease, pop, sec} from '../ui/motion';
import {Arabic, Particles, SceneIn, Stamp, StepLabel} from '../ui/Pieces';
import {C, F} from '../theme';
import {look} from '../looks/state';
import {TrunkScene} from '../types';

// A car seen from behind: the trunk lid swings open, what is inside rises out as cards
// (one can be the hero, with a glow), and optionally the whole car goes up in flames and the
// cards are stamped as lost. Drawn entirely in code.

const CAR_X = 110;
const CAR_Y = 880;
const W = 860;
const H = 520;

const GasCan: React.FC<{size: number}> = ({size}) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <defs>
      <linearGradient id="gc" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ff5a4e" />
        <stop offset="1" stopColor="#a3121a" />
      </linearGradient>
    </defs>
    <path d="M22 28 L64 28 L80 44 L80 90 L22 90 Z" fill="url(#gc)" stroke="#2a0507" strokeWidth={4} strokeLinejoin="round" />
    <path d="M30 18 L54 18 L54 28 L30 28 Z" fill="none" stroke="#2a0507" strokeWidth={5} strokeLinejoin="round" />
    <path d="M66 30 L80 12 L88 18 L76 36" fill="#d9d9d9" stroke="#2a0507" strokeWidth={4} strokeLinejoin="round" />
    <path d="M32 44 L70 80 M70 44 L32 80" stroke="rgba(0,0,0,0.25)" strokeWidth={5} />
  </svg>
);

const Revolver: React.FC<{size: number}> = ({size}) => (
  <svg width={size} height={size * 0.7} viewBox="0 0 140 98">
    <defs>
      <linearGradient id="rv" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f4f6fb" />
        <stop offset="0.5" stopColor="#9aa3b5" />
        <stop offset="1" stopColor="#4a5163" />
      </linearGradient>
    </defs>
    <path d="M6 22 L86 22 L90 16 L98 16 L100 22 L104 22 L104 40 L66 40 L60 46 L50 46 Z" fill="url(#rv)" stroke="#15171d" strokeWidth={3} strokeLinejoin="round" />
    <rect x="58" y="24" width="30" height="24" rx="8" fill="url(#rv)" stroke="#15171d" strokeWidth={3} />
    <path d="M100 40 Q116 44 122 66 L130 90 L104 92 L98 70 Q94 56 88 50" fill="#6b3a1e" stroke="#15171d" strokeWidth={3} strokeLinejoin="round" />
    <path d="M70 48 Q74 62 88 60" fill="none" stroke="#15171d" strokeWidth={4} />
  </svg>
);

const Cash: React.FC<{size: number}> = ({size}) => (
  <svg width={size} height={size * 0.6} viewBox="0 0 100 60">
    <rect x="4" y="8" width="92" height="44" rx="6" fill="#4caf50" stroke="#123d14" strokeWidth={4} />
    <circle cx="50" cy="30" r="12" fill="none" stroke="#123d14" strokeWidth={4} />
  </svg>
);

const ICONS = {gascan: GasCan, revolver: Revolver, cash: Cash};

const Flames: React.FC<{frame: number; heat: number}> = ({frame, heat}) => {
  if (heat <= 0) return null;
  // two layers of tongues: tall uneven ones at the back, short quick ones in front
  const tongues = Array.from({length: 18}).map((_, i) => {
    const back = i < 10;
    const k = back ? i : i - 10;
    const x = CAR_X + 30 + (back ? k / 9 : (k + 0.5) / 8) * (W - 60);
    const n = noise2D(`f${i}`, frame / (back ? 8 : 5), i);
    const tall = back ? 260 + 260 * Math.abs(Math.sin(i * 2.3)) : 120 + 120 * Math.abs(Math.cos(i * 1.3));
    const h = Math.max(20, (tall + (back ? 110 : 70) * n) * heat);
    const w = (back ? 130 : 90) + 50 * Math.abs(Math.cos(i * 2.1));
    return {x, h, w, sway: noise2D(`s${i}`, frame / 9, 0) * (back ? 34 : 18)};
  });
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, mixBlendMode: 'screen'}}>
      <defs>
        <linearGradient id="fl" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#fff6c8" stopOpacity={0.95} />
          <stop offset="0.25" stopColor="#ffb000" stopOpacity={0.9} />
          <stop offset="0.65" stopColor="#ff3c00" stopOpacity={0.75} />
          <stop offset="1" stopColor="#ff1e00" stopOpacity={0} />
        </linearGradient>
      </defs>
      <ellipse cx={CAR_X + W / 2} cy={CAR_Y + 220} rx={520 * heat} ry={300 * heat} fill="#ff6a00" opacity={0.28 * heat} style={{filter: 'blur(40px)'}} />
      {tongues.map((t, i) => {
        const base = CAR_Y + (i < 10 ? 300 : 340);
        return (
          <path
            key={i}
            d={`M${t.x - t.w / 2} ${base} Q${t.x - t.w / 2} ${base - t.h * 0.5} ${t.x + t.sway} ${base - t.h} Q${t.x + t.w / 2} ${base - t.h * 0.5} ${t.x + t.w / 2} ${base} Z`}
            fill="url(#fl)"
          />
        );
      })}
    </svg>
  );
};

export const Trunk: React.FC<{s: TrunkScene}> = ({s}) => {
  const frame = useCurrentFrame();
  const openAt = sec(s.openAt);
  const open = s.openAt <= 0 ? 1 : interpolate(frame, [openAt, openAt + 14], [0, 1], {...clamp, easing: (t) => 1 - Math.pow(1 - t, 3)});
  const lidDown = interpolate(open, [0, 0.5], [1, 0], clamp);
  const lidUp = interpolate(open, [0.5, 1], [0, 1], clamp);
  const heat = s.burnAt !== undefined ? interpolate(frame, [sec(s.burnAt), sec(s.burnAt) + 24], [0, 1], clamp) : 0;
  const carColor = C[(s.color ?? 'red') as keyof typeof C] ?? C.red;
  const title = s.title ? pop(frame, sec(s.titleAt ?? 0) - 2, 12, 0.5, 200) : 0;
  const glowLight = open * (1 - heat);
  return (
    <AbsoluteFill>
      <SceneIn>
        <Background broll={s.broll} />
      </SceneIn>
      <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 62%, rgba(255,150,60,${0.18 * glowLight + 0.25 * heat}) 0%, rgba(0,0,0,0.72) 70%)`}} />
      <StepLabel step={s.step} label={s.label} />
      {s.title ? (
        <div style={{position: 'absolute', top: 400, left: 60, right: 60, textAlign: 'center', fontFamily: F.display, fontSize: 104, lineHeight: 1,
          textTransform: 'uppercase', color: '#fff', WebkitTextStroke: '8px #000', paintOrder: 'stroke fill', opacity: Math.min(1, title * 1.5),
          transform: `scale(${0.8 + 0.2 * title})`}}>
          {s.title}
        </div>
      ) : null}
      {/* the car */}
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', left: CAR_X, top: CAR_Y, overflow: 'visible',
        filter: `brightness(${1 - 0.55 * heat}) drop-shadow(0 30px 40px rgba(0,0,0,0.7))`}}>
        <defs>
          <linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={carColor} />
            <stop offset="0.6" stopColor={carColor} />
            <stop offset="1" stopColor="#2a0508" />
          </linearGradient>
          <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#2b3850" />
            <stop offset="1" stopColor="#05070c" />
          </linearGradient>
          <radialGradient id="cavity" cx="0.5" cy="0.2" r="0.8">
            <stop offset="0" stopColor="#ffb257" stopOpacity={0.9 * glowLight} />
            <stop offset="1" stopColor="#0a0605" stopOpacity={1} />
          </radialGradient>
        </defs>
        <ellipse cx={W / 2} cy={H - 14} rx={410} ry={22} fill="rgba(0,0,0,0.55)" />
        <rect x={86} y={430} width={120} height={78} rx={14} fill="#0b0b0e" />
        <rect x={654} y={430} width={120} height={78} rx={14} fill="#0b0b0e" />
        <path d="M60 460 L40 300 Q40 250 90 240 L180 230 Q230 110 300 95 L560 95 Q630 110 680 230 L770 240 Q820 250 820 300 L800 460 Z" fill="url(#body)" stroke="#1a0305" strokeWidth={4} />
        <path d="M215 222 Q255 128 305 116 L555 116 Q605 128 645 222 Z" fill="url(#glass)" />
        <path d="M250 200 Q280 140 320 130 L380 130 L300 200 Z" fill="rgba(255,255,255,0.12)" />
        {/* the trunk cavity, lit from inside */}
        <path d="M120 232 L740 232 L760 336 L100 336 Z" fill="url(#cavity)" opacity={open > 0 ? 1 : 0} />
        {/* closed lid folds up out of view, the open lid's underside rises above the car */}
        <g transform={`translate(0 232) scale(1 ${lidDown}) translate(0 -232)`}>
          <path d="M120 232 L740 232 L760 336 L100 336 Z" fill={carColor} stroke="#1a0305" strokeWidth={4} />
          <path d="M130 250 L730 250" stroke="rgba(255,255,255,0.25)" strokeWidth={4} />
        </g>
        <g transform={`translate(0 232) scale(1 ${lidUp}) translate(0 -232)`}>
          <path d="M110 232 L750 232 L705 40 L155 40 Z" fill="#3a0a0e" stroke="#1a0305" strokeWidth={4} />
          <path d="M170 60 L690 60 L720 212 L140 212 Z" fill="#24070a" />
        </g>
        <rect x={52} y={256} width={110} height={52} rx={14} fill="#ff2236" style={{filter: 'drop-shadow(0 0 14px #ff2236)'}} />
        <rect x={698} y={256} width={110} height={52} rx={14} fill="#ff2236" style={{filter: 'drop-shadow(0 0 14px #ff2236)'}} />
        <rect x={50} y={372} width={760} height={64} rx={20} fill="#1b1b22" />
        <rect x={360} y={340} width={140} height={44} rx={6} fill="#f3f3f3" stroke="#222" strokeWidth={3} />
        <text x={430} y={371} textAnchor="middle" fontFamily="monospace" fontWeight={800} fontSize={24} fill="#1d2a6b">LNDA 6</text>
      </svg>
      <Flames frame={frame} heat={heat} />
      {heat > 0 ? <Particles x={CAR_X + 60} y={CAR_Y - 260} w={W - 120} h={560} count={40} seed="embers" speed={2.6} color="#ffb000" /> : null}
      {/* what was inside */}
      <div style={{position: 'absolute', top: 560, left: 50, right: 50, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 30}}>
        {s.items.map((item, i) => {
          const at = sec(item.at);
          const p = pop(frame, at - 2, 13, 0.6, 170);
          if (frame < at - 2) return <div key={i} style={{width: item.hero ? 470 : 360}} />;
          const Icon = ICONS[item.icon];
          const rise = interpolate(p, [0, 1], [520, 0]);
          const hero = item.hero && heat === 0;
          return (
            <div
              key={i}
              style={{
                position: 'relative', width: item.hero ? 470 : 360, padding: '22px 24px 26px', borderRadius: 26, textAlign: 'center',
                background: 'rgba(10,8,14,0.88)', border: `3px solid ${item.hero ? C.gold : 'rgba(255,255,255,0.2)'}`,
                boxShadow: hero ? `0 0 ${50 + 20 * Math.sin(frame / 6)}px ${C.gold}99, 0 20px 50px rgba(0,0,0,0.6)` : '0 20px 50px rgba(0,0,0,0.6)',
                transform: `translateY(${rise}px) scale(${0.35 + 0.65 * p})`, opacity: Math.min(1, p * 1.5),
                filter: heat > 0 ? `grayscale(${heat}) brightness(${1 - 0.4 * heat})` : 'none',
              }}
            >
              <div style={{display: 'flex', justifyContent: 'center', height: item.hero ? 150 : 130, alignItems: 'center'}}>
                <Icon size={item.hero ? 210 : 130} />
              </div>
              <div style={{fontFamily: F.display, fontSize: item.hero ? 68 : 52, lineHeight: 1, color: item.hero ? C.gold : '#fff', textTransform: 'uppercase', marginTop: 10}}>
                {item.name}
              </div>
              {item.sub ? <div style={{fontFamily: F.mono, fontSize: 24, letterSpacing: 3, color: 'rgba(255,255,255,0.7)', marginTop: 8}}>{item.sub}</div> : null}
            </div>
          );
        })}
      </div>
      {s.heroChip && frame >= sec(s.heroChip.at) ? (
        <div style={{position: 'absolute', top: 520, right: 70, transform: `rotate(6deg) scale(${pop(frame, sec(s.heroChip.at), 10, 0.5, 240)})`,
          fontFamily: F.mono, fontWeight: 800, fontSize: 34, letterSpacing: 4, color: look().ink, background: C.gold, padding: '8px 18px', borderRadius: 10,
          boxShadow: `0 0 30px ${C.gold}aa`, opacity: 1 - heat}}>
          {s.heroChip.text}
        </div>
      ) : null}
      {s.gone ? <Stamp text={s.gone.text} delay={sec(s.gone.at)} top={640} color={C.red} rotate={-8} /> : null}
      {s.note && frame >= sec(s.note.at) ? (
        <div style={{position: 'absolute', top: 1500, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: ease(frame, sec(s.note.at), sec(s.note.at) + 8)}}>
          <div style={{fontFamily: F.mono, fontWeight: 800, fontSize: 34, letterSpacing: 4, color: '#fff', background: 'rgba(0,0,0,0.75)', border: `2px solid ${C.red}`,
            padding: '10px 22px', borderRadius: 10}}>{s.note.text}</div>
        </div>
      ) : null}
      <Arabic text={s.ar} delay={16} top={1410} size={52} />
    </AbsoluteFill>
  );
};
