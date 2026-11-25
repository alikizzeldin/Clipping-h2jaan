import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Background} from '../ui/Background';
import {clamp, ease, pop, sec} from '../ui/motion';
import {Arabic, Flash, SceneIn, StepLabel} from '../ui/Pieces';
import {C, F} from '../theme';
import {VaultScene} from '../types';

// A bank vault seen through a security camera: a round steel door stays shut until a guard walks
// in with the cash delivery; then the bolts slide back, the wheel spins and the door swings open
// on a lit room of cash, and a "window" bar starts draining.

const CX = 540; // door centre on the frame
const CY = 790;
const R = 300; // door radius
const RING = 352; // frame ring radius
const BOLTS = 12;

const Interior: React.FC<{glow: number}> = ({glow}) => {
  // stacks of banded bills and a few gold bars, in a pyramid
  const rows = [6, 5, 4];
  return (
    <g>
      <circle cx={CX} cy={CY} r={R} fill="#0c0a06" />
      <circle cx={CX} cy={CY} r={R} fill="url(#vaultGlow)" opacity={glow} />
      {rows.map((n, ri) =>
        Array.from({length: n}).map((_, i) => {
          const w = 74;
          const h = 46;
          const x = CX - (n * w) / 2 + i * w + 2;
          const y = CY + 150 - ri * (h + 4);
          return (
            <g key={`b${ri}-${i}`}>
              <rect x={x} y={y} width={w - 6} height={h} rx={5} fill="#3f8a4a" stroke="#1d3d22" strokeWidth={2} />
              <rect x={x + (w - 6) / 2 - 9} y={y} width={18} height={h} fill="#e8dcb0" />
            </g>
          );
        }),
      )}
      {[0, 1, 2].map((i) => (
        <polygon key={`g${i}`} points={`${CX - 150 + i * 100},${CY + 20} ${CX - 80 + i * 100},${CY + 20} ${CX - 92 + i * 100},${CY - 12} ${CX - 138 + i * 100},${CY - 12}`}
          fill={C.gold} stroke="#a87a1c" strokeWidth={3} />
      ))}
      <rect x={CX - 210} y={CY + 200} width={420} height={14} rx={7} fill="#2a241a" />
    </g>
  );
};

const Door: React.FC<{spin: number; bolt: number; tone: string}> = ({spin, bolt, tone}) => (
  <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
    <defs>
      <radialGradient id="doorFace" cx="0.42" cy="0.36" r="0.75">
        <stop offset="0" stopColor="#9aa0ae" />
        <stop offset="0.55" stopColor="#5c6170" />
        <stop offset="1" stopColor="#2c2f39" />
      </radialGradient>
    </defs>
    {/* locking bolts poke out of the rim into the frame; they slide back when it unlocks */}
    {Array.from({length: BOLTS}).map((_, i) => {
      const a = (i / BOLTS) * 360;
      return (
        <rect key={i} x={CX - 14} y={CY - R - 34 + bolt * 30} width={28} height={52} rx={8} fill="#b7bcc8" stroke="#3a3d47" strokeWidth={3}
          transform={`rotate(${a} ${CX} ${CY})`} />
      );
    })}
    <circle cx={CX} cy={CY} r={R} fill="url(#doorFace)" stroke="#2a2c35" strokeWidth={8} />
    <circle cx={CX} cy={CY} r={R - 34} fill="none" stroke="#7d8391" strokeWidth={6} />
    <circle cx={CX} cy={CY} r={R - 96} fill="none" stroke="#454955" strokeWidth={14} />
    {/* rivets */}
    {Array.from({length: 24}).map((_, i) => {
      const a = (i / 24) * Math.PI * 2;
      return <circle key={`r${i}`} cx={CX + Math.cos(a) * (R - 17)} cy={CY + Math.sin(a) * (R - 17)} r={5} fill="#c9ccd6" />;
    })}
    {/* the spoked wheel */}
    <g transform={`rotate(${spin} ${CX} ${CY})`}>
      <circle cx={CX} cy={CY} r={118} fill="none" stroke="#d7dae2" strokeWidth={14} />
      {[0, 60, 120].map((a) => (
        <g key={a} transform={`rotate(${a} ${CX} ${CY})`}>
          <rect x={CX - 9} y={CY - 168} width={18} height={336} rx={9} fill="#d7dae2" />
          <circle cx={CX} cy={CY - 172} r={18} fill="#eef0f5" stroke="#6a6f7d" strokeWidth={3} />
          <circle cx={CX} cy={CY + 172} r={18} fill="#eef0f5" stroke="#6a6f7d" strokeWidth={3} />
        </g>
      ))}
      <circle cx={CX} cy={CY} r={46} fill="#2c2f39" stroke="#d7dae2" strokeWidth={8} />
    </g>
    {/* the lock light */}
    <circle cx={CX} cy={CY} r={16} fill={tone} />
    <circle cx={CX} cy={CY} r={30} fill="none" stroke={tone} strokeWidth={4} opacity={0.6} />
  </svg>
);

// A guard in silhouette with a cash bag, drawn with a teal rim.
const Guard: React.FC<{x: number; y: number; step: number; scale: number; opacity: number}> = ({x, y, step, scale, opacity}) => {
  const swing = Math.sin(step) * 12;
  return (
    <svg width={260} height={420} viewBox="0 0 260 420" style={{position: 'absolute', left: x - 130, top: y - 420, opacity,
      transform: `scale(${scale})`, transformOrigin: 'bottom center'}}>
      <g fill="#0b0d16" stroke={C.teal} strokeWidth={3} strokeLinejoin="round">
        {/* legs */}
        <rect x={100} y={262} width={28} height={140} rx={12} transform={`rotate(${swing} 114 262)`} />
        <rect x={132} y={262} width={28} height={140} rx={12} transform={`rotate(${-swing} 146 262)`} />
        {/* body */}
        <rect x={88} y={120} width={86} height={156} rx={26} />
        {/* head and cap */}
        <circle cx={131} cy={88} r={32} />
        <path d="M95 74 Q131 40 167 74 L182 80 L95 80 Z" />
        {/* arm down to the bag */}
        <rect x={164} y={132} width={22} height={112} rx={11} transform={`rotate(${-8 - swing * 0.3} 175 132)`} />
      </g>
      {/* the bag */}
      <g transform={`rotate(${swing * 0.4} 200 250)`}>
        <rect x={170} y={238} width={78} height={70} rx={14} fill="#2f3b2a" stroke={C.gold} strokeWidth={4} />
        <text x={209} y={287} textAnchor="middle" fontFamily="Anton, Impact, sans-serif" fontSize={44} fill={C.gold}>$</text>
      </g>
    </svg>
  );
};

export const Vault: React.FC<{s: VaultScene}> = ({s}) => {
  const frame = useCurrentFrame();
  const guardAt = sec(s.guardAt);
  const openAt = sec(s.openAt);
  const windowAt = s.windowAt !== undefined ? sec(s.windowAt) : openAt + 20;
  const card = pop(frame, 3, 13, 0.6, 150);
  // the unlock: bolts slide back and the wheel spins over the 12 frames before the door moves
  const bolt = interpolate(frame, [openAt - 12, openAt - 4], [0, 1], clamp);
  const spin = interpolate(frame, [openAt - 12, openAt], [0, 200], {...clamp, easing: (t) => t * t * (3 - 2 * t)});
  const swing = interpolate(frame, [openAt, openAt + 18], [0, 1], {...clamp, easing: (t) => 1 - Math.pow(1 - t, 3)});
  const open = frame >= openAt;
  const delivery = frame >= guardAt && !open;
  const tone = open ? C.green : delivery ? C.gold : C.red;
  // the guard walks in from the left, stops by the door, then steps inside once it opens
  const walk = interpolate(frame, [guardAt, guardAt + 22], [0, 1], {...clamp, easing: (t) => 1 - Math.pow(1 - t, 2)});
  const inside = interpolate(frame, [openAt + 10, openAt + 30], [0, 1], clamp);
  const gx = interpolate(walk, [0, 1], [-160, 250]) + inside * 190;
  const walking = (frame > guardAt && frame < guardAt + 22) || (inside > 0 && inside < 1);
  const statusText = open ? s.openText ?? 'VAULT OPEN' : delivery ? s.deliveryText ?? 'DELIVERY IN PROGRESS' : s.lockedText ?? 'LOCKED';
  const statusPop = pop(frame, open ? openAt : delivery ? guardAt : 6, 10, 0.5, 220);
  const win = ease(frame, windowAt, windowAt + 8);
  const drain = interpolate(frame, [windowAt, windowAt + sec(4)], [1, 0.45], clamp);
  const rec = Math.floor(frame / 15) % 2 === 0;
  const stamp = `CAM 04 · VAULT`;
  return (
    <AbsoluteFill>
      <SceneIn>
        <Background broll={s.broll} />
      </SceneIn>
      {/* the vault room: dark steel walls under the security camera */}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 40%, rgba(40,48,64,0.55) 0%, rgba(5,6,12,0.92) 70%)'}} />
      <div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, opacity: Math.min(1, card * 1.4),
        transform: `scale(${0.9 + 0.1 * card})`, transformOrigin: `${CX}px ${CY}px`}}>
        <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
          <defs>
            <radialGradient id="vaultGlow" cx="0.5" cy="0.6" r="0.6">
              <stop offset="0" stopColor="#ffd27a" stopOpacity={0.9} />
              <stop offset="0.6" stopColor="#ff9a3c" stopOpacity={0.35} />
              <stop offset="1" stopColor="#000" stopOpacity={0} />
            </radialGradient>
            <linearGradient id="ringFace" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#7c8292" />
              <stop offset="1" stopColor="#2a2d36" />
            </linearGradient>
          </defs>
          {/* the frame ring set into the wall */}
          <circle cx={CX} cy={CY} r={RING + 30} fill="#14161d" />
          <circle cx={CX} cy={CY} r={RING} fill="url(#ringFace)" stroke="#9aa0ae" strokeWidth={4} />
          <Interior glow={swing} />
        </svg>
        {/* the door, hinged on the right, swings towards us */}
        <div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, transformOrigin: `${CX + R}px ${CY}px`,
          transform: `perspective(2200px) rotateY(${100 * swing}deg)`, backfaceVisibility: 'hidden'}}>
          <Door spin={spin} bolt={bolt} tone={tone} />
        </div>
        {/* the hinge */}
        <div style={{position: 'absolute', left: CX + R - 8, top: CY - 120, width: 34, height: 240, borderRadius: 12,
          background: 'linear-gradient(90deg, #4a4e5a, #a9aebb, #4a4e5a)', border: '3px solid #22242c'}} />
      </div>
      {frame >= guardAt ? <Guard x={gx} y={1190} step={walking ? frame / 3 : 0} scale={1 - inside * 0.25} opacity={1 - inside * 0.9} /> : null}
      {/* security camera frame */}
      <div style={{position: 'absolute', top: 380, left: 70, right: 70, display: 'flex', justifyContent: 'space-between', fontFamily: F.mono,
        fontWeight: 800, fontSize: 28, letterSpacing: 4, color: 'rgba(255,255,255,0.85)', opacity: ease(frame, 6, 16)}}>
        <span>{stamp}</span>
        <span style={{color: C.red, opacity: rec ? 1 : 0.25}}>● REC</span>
      </div>
      {[[60, 360], [1020, 360], [60, 1280], [1020, 1280]].map(([x, y], i) => (
        <div key={i} style={{position: 'absolute', left: x - (i % 2 ? 50 : 0), top: y - (i > 1 ? 50 : 0), width: 50, height: 50,
          borderColor: 'rgba(255,255,255,0.7)', borderStyle: 'solid', borderWidth: 0,
          borderTopWidth: i < 2 ? 4 : 0, borderBottomWidth: i > 1 ? 4 : 0, borderLeftWidth: i % 2 ? 0 : 4, borderRightWidth: i % 2 ? 4 : 0,
          opacity: ease(frame, 4, 14)}} />
      ))}
      {/* status pill */}
      <div style={{position: 'absolute', top: 1196, left: 0, right: 0, display: 'flex', justifyContent: 'center', transform: `scale(${0.85 + 0.15 * statusPop})`}}>
        <div style={{fontFamily: F.brand, fontWeight: 900, fontSize: 40, letterSpacing: 4, color: '#06060F', background: tone, padding: '12px 34px',
          borderRadius: 14, boxShadow: `0 0 36px ${tone}aa`}}>{statusText}</div>
      </div>
      {/* the window bar */}
      {frame >= windowAt ? (
        <div style={{position: 'absolute', top: 1296, left: 140, right: 140, opacity: win}}>
          <div style={{fontFamily: F.mono, fontWeight: 800, fontSize: 30, letterSpacing: 6, color: '#fff', textAlign: 'center', marginBottom: 10}}>
            {s.windowText ?? "THAT'S YOUR WINDOW"}
          </div>
          <div style={{height: 22, borderRadius: 11, background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.4)', overflow: 'hidden'}}>
            <div style={{width: `${drain * 100}%`, height: '100%', background: `linear-gradient(90deg, ${C.green}, ${C.gold})`, boxShadow: `0 0 20px ${C.green}`}} />
          </div>
        </div>
      ) : null}
      <StepLabel step={s.step} label={s.label} />
      <Flash at={openAt} length={10} color="#ffd27a" strength={0.45} />
      <Arabic text={s.ar} delay={16} top={1420} size={52} />
    </AbsoluteFill>
  );
};
