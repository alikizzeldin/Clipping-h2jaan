import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame} from 'remotion';
import {Background} from '../ui/Background';
import {clamp, pop, sec} from '../ui/motion';
import {Arabic, SceneIn, StepLabel} from '../ui/Pieces';
import {C, F} from '../theme';
import {HelipadScene} from '../types';

// Top-down over the water: a pier runs out to a deck with a helipad and a helicopter parked on it.
// At `spinAt` the rotors spin up (blades blur into a disc); at `liftAt` it rises towards the camera,
// its shadow slides away and downwash rings ripple out; a name chip pops at `nameAt`.

const CX = 540;
const CY = 820;

const Heli: React.FC<{rot: number; blur: number}> = ({rot, blur}) => (
  <svg width={620} height={620} viewBox="-310 -310 620 620" style={{overflow: 'visible'}}>
    {/* tail boom and tail rotor */}
    <rect x={-12} y={40} width={24} height={210} rx={10} fill="#2b2f3a" stroke="#0e1016" strokeWidth={4} />
    <rect x={-46} y={236} width={92} height={14} rx={6} fill="#2b2f3a" />
    <g transform={`rotate(${rot * 2.2} 0 243)`}>
      <rect x={-6} y={213} width={12} height={60} rx={4} fill="#9aa0ae" opacity={1 - blur * 0.6} />
    </g>
    {/* body */}
    <ellipse cx={0} cy={-10} rx={64} ry={118} fill="#3c4150" stroke="#0e1016" strokeWidth={5} />
    <ellipse cx={0} cy={-70} rx={46} ry={50} fill="#0d2b3a" stroke="#5c7a8a" strokeWidth={3} />
    <rect x={-80} y={-40} width={14} height={140} rx={6} fill="#1b1e27" />
    <rect x={66} y={-40} width={14} height={140} rx={6} fill="#1b1e27" />
    <path d="M-30 40 L30 40" stroke={C.gold} strokeWidth={6} />
    {/* main rotor: four blades that blur into a disc as they speed up */}
    <circle cx={0} cy={0} r={290} fill="rgba(220,225,235,0.18)" opacity={blur} />
    <g transform={`rotate(${rot})`} opacity={1 - blur * 0.7}>
      {[0, 90, 180, 270].map((a) => (
        <rect key={a} x={-9} y={-290} width={18} height={280} rx={8} fill="#c9ccd6" stroke="#0e1016" strokeWidth={3} transform={`rotate(${a})`} />
      ))}
    </g>
    <circle cx={0} cy={0} r={16} fill="#9aa0ae" stroke="#0e1016" strokeWidth={4} />
  </svg>
);

export const Helipad: React.FC<{s: HelipadScene}> = ({s}) => {
  const frame = useCurrentFrame();
  const spinAt = sec(s.spinAt);
  const liftAt = sec(s.liftAt);
  const nameAt = sec(s.nameAt);
  // rotor angle: integrate a speed that ramps up from spinAt
  const t = Math.max(0, frame - spinAt);
  const rot = 6 * t + 0.9 * t * t;
  const blur = interpolate(frame, [spinAt + 8, spinAt + 30], [0, 1], clamp);
  const lift = interpolate(frame, [liftAt, liftAt + 40], [0, 1], {...clamp, easing: (x) => x * x * (3 - 2 * x)});
  const scale = 1.12 + 0.4 * lift;
  const card = pop(frame, 3, 13, 0.6, 150);
  const chip = pop(frame, nameAt, 10, 0.5, 220);
  const shake = frame >= spinAt && lift < 0.2 ? (random(`hp${frame}`) - 0.5) * 3 * blur : 0;
  return (
    <AbsoluteFill>
      <SceneIn>
        <Background broll={s.broll} />
      </SceneIn>
      {/* the water */}
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(6,40,70,0.88), rgba(4,26,48,0.94))'}} />
      <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, opacity: Math.min(1, card * 1.4)}}>
        {Array.from({length: 26}).map((_, i) => {
          const y = 300 + i * 60 + ((frame * 0.8) % 60);
          return <path key={i} d={`M${-40 + (i % 3) * 30} ${y} q 60 -12 120 0 t 120 0 t 120 0 t 120 0 t 120 0 t 120 0 t 120 0 t 120 0 t 120 0 t 120 0`}
            fill="none" stroke="rgba(140,200,255,0.12)" strokeWidth={3} />;
        })}
        {/* pier and deck */}
        <rect x={470} y={1080} width={140} height={700} fill="#6b5236" stroke="#3a2a18" strokeWidth={4} />
        {Array.from({length: 18}).map((_, i) => (
          <line key={`p${i}`} x1={470} y1={1100 + i * 38} x2={610} y2={1100 + i * 38} stroke="#3a2a18" strokeWidth={3} />
        ))}
        <rect x={250} y={540} width={580} height={560} rx={8} fill="#7a5e3e" stroke="#3a2a18" strokeWidth={5} />
        {Array.from({length: 14}).map((_, i) => (
          <line key={`d${i}`} x1={250 + i * 41.4} y1={540} x2={250 + i * 41.4} y2={1100} stroke="#5a4428" strokeWidth={3} />
        ))}
        {/* helipad */}
        <circle cx={CX} cy={CY} r={230} fill="#2a2c33" stroke={C.gold} strokeWidth={10} />
        <text x={CX} y={CY + 80} textAnchor="middle" fontFamily="Anton, Impact, sans-serif" fontSize={240} fill="rgba(255,255,255,0.85)">H</text>
        {/* downwash rings */}
        {lift > 0
          ? [0, 1, 2].map((k) => {
              const ph = ((frame - liftAt) / 26 + k / 3) % 1;
              return <circle key={k} cx={CX} cy={CY} r={260 + ph * 360} fill="none" stroke="rgba(220,240,255,0.5)" strokeWidth={6} opacity={(1 - ph) * lift} />;
            })
          : null}
        {/* the shadow slides away as it rises */}
        <ellipse cx={CX + 60 * lift} cy={CY + 90 * lift} rx={120 * (1 - 0.3 * lift)} ry={220 * (1 - 0.3 * lift)} fill="rgba(0,0,0,0.35)" />
      </svg>
      <div style={{position: 'absolute', left: CX - 310, top: CY - 310, width: 620, height: 620, opacity: Math.min(1, card * 1.4),
        transform: `translate(${shake}px, ${-30 * lift}px) scale(${scale})`}}>
        <Heli rot={rot} blur={blur} />
      </div>
      {frame >= spinAt && frame < nameAt ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: 1170, textAlign: 'center', fontFamily: F.mono, fontSize: 30, letterSpacing: 6, color: '#fff',
          opacity: Math.floor(frame / 8) % 2 ? 1 : 0.6}}>{lift > 0 ? s.liftText ?? 'LIFT OFF' : s.spinText ?? 'ROTORS SPINNING UP'}</div>
      ) : null}
      {frame >= nameAt ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: 1180, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, transform: `scale(${chip})`}}>
          <div style={{fontFamily: F.display, fontSize: 76, letterSpacing: 3, color: '#0b0b0b', background: C.gold, padding: '8px 30px', borderRadius: 14,
            boxShadow: '0 12px 0 rgba(0,0,0,0.55)'}}>{s.name}</div>
          {s.nameSub ? <div style={{fontFamily: F.mono, fontSize: 28, letterSpacing: 5, color: '#fff', textShadow: '0 3px 10px #000'}}>{s.nameSub}</div> : null}
        </div>
      ) : null}
      <StepLabel step={s.step} label={s.label} />
      <Arabic text={s.ar} delay={16} top={1400} size={50} />
    </AbsoluteFill>
  );
};
