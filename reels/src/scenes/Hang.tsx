import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Background} from '../ui/Background';
import {clamp, pop, sec} from '../ui/motion';
import {Arabic, Flash, SceneIn, StepLabel} from '../ui/Pieces';
import {C, F} from '../theme';
import {HangScene} from '../types';

// A couch strung up in a tree outside a trailer at dusk. A crosshair moves to each rope and fires:
// the first shot tips the couch, the second drops it with a puff of dust. A SIT prompt pulses, then
// the reward card pops (e.g. a unique revolver).

const GROUND = 1170;
const BRANCH_Y = 520;
const ROPES = [400, 660];
const COUCH = {w: 380, h: 170, top: 760};

const Couch: React.FC = () => (
  <svg width={COUCH.w} height={COUCH.h} viewBox="0 0 380 170">
    <rect x={30} y={10} width={320} height={90} rx={22} fill="#7a3b2e" stroke="#2a120c" strokeWidth={5} />
    {[0, 1, 2].map((i) => (
      <rect key={i} x={46 + i * 100} y={22} width={88} height={64} rx={14} fill="#8f4a3a" stroke="#2a120c" strokeWidth={3} />
    ))}
    <rect x={20} y={90} width={340} height={46} rx={14} fill="#6a3025" stroke="#2a120c" strokeWidth={5} />
    <rect x={0} y={50} width={52} height={96} rx={20} fill="#7a3b2e" stroke="#2a120c" strokeWidth={5} />
    <rect x={328} y={50} width={52} height={96} rx={20} fill="#7a3b2e" stroke="#2a120c" strokeWidth={5} />
    <rect x={40} y={136} width={16} height={28} fill="#2a120c" />
    <rect x={324} y={136} width={16} height={28} fill="#2a120c" />
    {Array.from({length: 9}).map((_, i) => (
      <circle key={`d${i}`} cx={60 + i * 34} cy={112} r={4} fill="#4a1d16" opacity={0.7} />
    ))}
  </svg>
);

const Revolver: React.FC<{color: string}> = ({color}) => (
  <svg width={150} height={100} viewBox="0 0 150 100">
    <g fill={color} stroke="#0b0b0b" strokeWidth={3} strokeLinejoin="round">
      <rect x={8} y={22} width={84} height={16} rx={4} />
      <rect x={70} y={16} width={44} height={36} rx={10} />
      <circle cx={92} cy={34} r={14} fill="#2a2a2a" />
      <path d="M108 30 L128 30 L142 88 L118 92 L108 56 Z" />
      <path d="M92 52 Q96 70 108 66" fill="none" />
    </g>
  </svg>
);

export const Hang: React.FC<{s: HangScene}> = ({s}) => {
  const frame = useCurrentFrame();
  const [s1, s2] = s.shots.map((x) => sec(x.at));
  const cut1 = frame >= s1;
  const cut2 = frame >= s2;
  const sway = Math.sin(frame / 14) * (cut1 ? 0 : 3);
  // after the first rope snaps the couch swings down on the other rope
  const tip = cut1 ? interpolate(frame, [s1, s1 + 10], [0, 22], {...clamp, easing: (t) => 1 - Math.pow(1 - t, 2)}) + Math.sin((frame - s1) / 3) * 2 * Math.max(0, 1 - (frame - s1) / 20) : 0;
  const fall = cut2 ? Math.min(1, ((frame - s2) / 14) ** 2) : 0;
  const landed = cut2 && frame - s2 >= 14;
  const couchY = COUCH.top + fall * (GROUND - COUCH.h - COUCH.top);
  const couchRot = cut2 ? tip * (1 - fall) : tip;
  // the crosshair travels to rope 1, then rope 2
  const aimX = frame < s1 ? interpolate(frame, [0, s1 - 4], [540, ROPES[0]], clamp) : interpolate(frame, [s1 + 2, s2 - 4], [ROPES[0], ROPES[1]], clamp);
  const aimY = BRANCH_Y + 130;
  const showAim = frame < s2 + 6;
  const muzzle = (at: number) => interpolate(frame, [at, at + 1, at + 5], [0, 1, 0], clamp);
  const flash = Math.max(muzzle(s1), muzzle(s2));
  const sitAt = sec(s.sitAt);
  const sit = pop(frame, sitAt, 10, 0.5, 220);
  const pulse = 1 + 0.06 * Math.sin(frame / 4);
  const itemAt = sec(s.item.at);
  const item = pop(frame, itemAt, 10, 0.5, 200);
  const card = pop(frame, 2, 13, 0.6, 150);
  const dust = landed ? Math.min(1, (frame - s2 - 14) / 20) : 0;
  return (
    <AbsoluteFill>
      <SceneIn>
        <Background broll={s.broll} />
      </SceneIn>
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(20,16,40,0.75) 0%, rgba(60,30,30,0.6) 45%, rgba(10,8,6,0.92) 75%)'}} />
      <div style={{position: 'absolute', inset: 0, opacity: Math.min(1, card * 1.4)}}>
        <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
          {/* the trailer */}
          <rect x={40} y={GROUND - 230} width={300} height={200} rx={14} fill="#2a2a30" stroke="#4a4a55" strokeWidth={4} />
          <rect x={70} y={GROUND - 190} width={70} height={60} fill="#e8c27a" opacity={0.75} />
          <rect x={200} y={GROUND - 200} width={60} height={170} fill="#1a1a1f" />
          {/* the tree */}
          <path d={`M860 ${GROUND} L850 ${BRANCH_Y + 40} L900 ${BRANCH_Y - 120} L940 ${BRANCH_Y + 40} L930 ${GROUND} Z`} fill="#3b2a1c" stroke="#1d140c" strokeWidth={4} />
          <path d={`M880 ${BRANCH_Y + 20} Q620 ${BRANCH_Y - 20} 300 ${BRANCH_Y + 10} L300 ${BRANCH_Y + 34} Q620 ${BRANCH_Y + 10} 880 ${BRANCH_Y + 56} Z`} fill="#3b2a1c" stroke="#1d140c" strokeWidth={4} />
          {[[880, 360, 150], [720, 400, 130], [560, 420, 120], [980, 470, 110], [420, 440, 100], [800, 300, 110]].map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} fill={i % 2 ? '#1f3a24' : '#27462b'} opacity={0.95} />
          ))}
          <rect x={0} y={GROUND} width={1080} height={120} fill="#1c1812" />
          {/* ropes: each one snaps on its shot */}
          {ROPES.map((x, i) => {
            const cut = i === 0 ? cut1 : cut2;
            const bottomX = COUCH.w * (i === 0 ? 0.12 : 0.88) + (1080 - COUCH.w) / 2 + (x - 540) * 0;
            return cut ? (
              <line key={i} x1={x} y1={BRANCH_Y + 26} x2={x + 6} y2={BRANCH_Y + 110} stroke="#c9b48a" strokeWidth={6} />
            ) : (
              <line key={i} x1={x} y1={BRANCH_Y + 26} x2={bottomX} y2={couchY + 20} stroke="#c9b48a" strokeWidth={6} />
            );
          })}
        </svg>
        <div style={{position: 'absolute', left: (1080 - COUCH.w) / 2, top: couchY, width: COUCH.w, height: COUCH.h, transformOrigin: '88% 10%',
          transform: `rotate(${couchRot + sway}deg)`}}>
          <Couch />
        </div>
        {/* dust when it lands */}
        {landed && dust < 1
          ? [0, 1, 2, 3, 4].map((i) => (
              <div key={i} style={{position: 'absolute', left: 300 + i * 110 - 60 * dust, top: GROUND - 80 - 40 * dust, width: 160 + 120 * dust, height: 100 + 60 * dust,
                borderRadius: '50%', background: 'radial-gradient(circle, rgba(200,180,150,0.5) 0%, rgba(200,180,150,0) 70%)', opacity: 1 - dust}} />
            ))
          : null}
        {/* crosshair */}
        {showAim ? (
          <svg width={160} height={160} viewBox="0 0 160 160" style={{position: 'absolute', left: aimX - 80, top: aimY - 80}}>
            <g stroke={C.red} strokeWidth={5} fill="none">
              <circle cx={80} cy={80} r={44} />
              <line x1={80} y1={10} x2={80} y2={56} /><line x1={80} y1={104} x2={80} y2={150} />
              <line x1={10} y1={80} x2={56} y2={80} /><line x1={104} y1={80} x2={150} y2={80} />
            </g>
          </svg>
        ) : null}
        {/* the sit prompt on the landed couch */}
        {frame >= sitAt ? (
          <div style={{position: 'absolute', left: 0, right: 0, top: GROUND - COUCH.h - 110, display: 'flex', justifyContent: 'center', transform: `scale(${sit * pulse})`}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 14, fontFamily: F.brand, fontSize: 40, letterSpacing: 4, color: '#0b0b0b', background: '#fff',
              padding: '10px 26px', borderRadius: 40, boxShadow: '0 10px 30px rgba(0,0,0,0.6)'}}>
              <span style={{width: 34, height: 34, borderRadius: 17, border: '5px solid #0b0b0b', display: 'inline-block'}} />{s.prompt ?? 'SIT'}
            </div>
          </div>
        ) : null}
      </div>
      {/* the reward card */}
      {frame >= itemAt ? (
        <div style={{position: 'absolute', left: 90, right: 90, top: 1196, display: 'flex', alignItems: 'center', gap: 22, padding: '16px 26px', borderRadius: 18,
          background: 'rgba(8,8,10,0.9)', border: `4px solid ${C.gold}`, boxShadow: `0 0 40px ${C.gold}66`, transform: `scale(${item})`}}>
          <Revolver color={C.gold} />
          <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
            <div style={{fontFamily: F.display, fontSize: 64, lineHeight: 1, color: '#fff'}}>{s.item.name}</div>
            {s.item.sub ? <div style={{fontFamily: F.mono, fontSize: 26, letterSpacing: 4, color: C.gold}}>{s.item.sub}</div> : null}
          </div>
        </div>
      ) : null}
      <AbsoluteFill style={{background: '#fff4d6', opacity: flash * 0.35}} />
      <Flash at={s2 + 14} length={6} color="#c8b496" strength={0.3} />
      <StepLabel step={s.step} label={s.label} />
      <Arabic text={s.ar} delay={16} top={1400} size={50} />
    </AbsoluteFill>
  );
};
