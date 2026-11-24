import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Background} from '../ui/Background';
import {clamp, ease, pop, sec} from '../ui/motion';
import {Arabic, SceneIn, StepLabel} from '../ui/Pieces';
import {C, F} from '../theme';
import {look} from '../looks/state';
import {LoopScene} from '../types';

// A cycle: steps placed around a ring light up in turn as the narrator names them, the ring
// fills between them, and the centre word (e.g. REPEAT) lands with a spinning arrow.

const CX = 540;
const CY = 860;
const R = 300;

const Arrow: React.FC<{size: number; spin: number}> = ({size, spin}) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={{transform: `rotate(${spin}deg)`}}>
    <path d="M80 50 A30 30 0 1 1 65 24" fill="none" stroke={C.green} strokeWidth={9} strokeLinecap="round" />
    <path d="M58 12 L72 24 L56 34" fill="none" stroke={C.green} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Loop: React.FC<{s: LoopScene}> = ({s}) => {
  const frame = useCurrentFrame();
  const n = s.nodes.length;
  const ring = ease(frame, 2, 16);
  // how far round the ring is filled: each node's share fills over the 8 frames after it lights
  const filled = s.nodes.reduce((acc, node) => acc + interpolate(frame, [sec(node.at), sec(node.at) + 8], [0, 1], clamp), 0) / n;
  const circ = 2 * Math.PI * R;
  const centerAt = sec(s.centerAt);
  const center = pop(frame, centerAt - 2, 11, 0.5, 220);
  const spin = frame >= centerAt ? (frame - centerAt) * 9 : 0;
  return (
    <AbsoluteFill>
      <SceneIn>
        <Background broll={s.broll} />
      </SceneIn>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0.35) 10%, rgba(0,0,0,0.78) 100%)'}} />
      <StepLabel step={s.step} label={s.label} />
      <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, opacity: ring}}>
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth={12} />
        <circle cx={CX} cy={CY} r={R} fill="none" stroke={C.green} strokeWidth={12} strokeLinecap="round"
          strokeDasharray={`${circ * filled} ${circ}`} transform={`rotate(-90 ${CX} ${CY})`}
          style={{filter: `drop-shadow(0 0 14px ${C.green})`}} />
      </svg>
      {s.nodes.map((node, i) => {
        const angle = (-90 + (i * 360) / n) * (Math.PI / 180);
        const x = CX + R * Math.cos(angle);
        const y = CY + R * Math.sin(angle);
        const at = sec(node.at);
        const on = frame >= at;
        const p = pop(frame, at - 1, 10, 0.5, 240);
        const show = ease(frame, 4 + i * 3, 14 + i * 3);
        return (
          <div
            key={i}
            style={{
              position: 'absolute', left: x, top: y, transform: `translate(-50%, -50%) scale(${on ? 0.9 + 0.18 * p : 0.9})`, opacity: show,
              padding: '10px 26px 6px', borderRadius: 18, whiteSpace: 'nowrap', fontFamily: F.display, fontSize: 56, lineHeight: 1.05,
              textTransform: 'uppercase', color: on ? look().ink : 'rgba(255,255,255,0.55)', background: on ? C.green : 'rgba(10,10,20,0.88)',
              border: `3px solid ${on ? C.green : 'rgba(255,255,255,0.2)'}`, boxShadow: on ? `0 0 ${30 * p}px ${C.green}aa, 0 14px 30px rgba(0,0,0,0.6)` : '0 14px 30px rgba(0,0,0,0.6)',
            }}
          >
            {node.text}
          </div>
        );
      })}
      <div style={{position: 'absolute', left: CX, top: CY, transform: `translate(-50%, -50%) scale(${0.6 + 0.4 * center})`, opacity: Math.min(1, center * 1.5),
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6}}>
        <Arrow size={120} spin={spin} />
        <div style={{fontFamily: F.display, fontSize: 96, lineHeight: 1, color: '#fff', textTransform: 'uppercase', WebkitTextStroke: '6px #000', paintOrder: 'stroke fill'}}>
          {s.center}
        </div>
      </div>
      <Arabic text={s.ar} delay={14} top={1240} size={54} />
    </AbsoluteFill>
  );
};
