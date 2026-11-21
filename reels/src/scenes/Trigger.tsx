import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Background} from '../ui/Background';
import {ease, pop} from '../ui/motion';
import {Arabic, Particles, SceneIn, StepLabel} from '../ui/Pieces';
import {Beam} from '../ui/Ufo';
import {C, F} from '../theme';
import {TriggerScene} from '../types';

const Corner: React.FC<{x: number; y: number; rot: number}> = ({x, y, rot}) => (
  <div style={{position: 'absolute', left: x - 40, top: y - 40, width: 80, height: 80, transform: `rotate(${rot}deg)`}}>
    <div style={{position: 'absolute', left: 0, top: 0, width: 70, height: 10, background: C.green, boxShadow: `0 0 16px ${C.green}`}} />
    <div style={{position: 'absolute', left: 0, top: 0, width: 10, height: 70, background: C.green, boxShadow: `0 0 16px ${C.green}`}} />
  </div>
);

export const Trigger: React.FC<{s: TriggerScene}> = ({s}) => {
  const frame = useCurrentFrame();
  const {x, y, w, h} = s.target;
  const lock = pop(frame, 10, 14, 0.6, 160);
  const grow = interpolate(lock, [0, 1], [1.6, 1]);
  const hw = (w / 2) * grow;
  const hh = (h / 2) * grow;
  const beam = ease(frame, 2, 22);
  const tag = ease(frame, 58, 72);
  return (
    <AbsoluteFill>
      <SceneIn>
        <Background broll={s.broll} />
      </SceneIn>
      <Beam x={x} top={-60} bottom={y + h / 2 + 60} topWidth={140} bottomWidth={w * 1.5} opacity={beam * 0.8} />
      <Particles x={x - w / 2} y={y - h / 2} w={w} h={h} count={36} seed="trig" />
      <div style={{opacity: Math.min(1, lock * 1.5)}}>
        <Corner x={x - hw} y={y - hh} rot={0} />
        <Corner x={x + hw} y={y - hh} rot={90} />
        <Corner x={x + hw} y={y + hh} rot={180} />
        <Corner x={x - hw} y={y + hh} rot={270} />
      </div>
      <div
        style={{
          position: 'absolute', left: x + hw - 20, top: y - hh + 40, fontFamily: F.mono, fontWeight: 800, fontSize: 26,
          color: '#06060F', background: C.green, padding: '6px 12px', borderRadius: 6, letterSpacing: 2, opacity: ease(frame, 22, 32),
        }}
      >
        {s.contact ?? 'CONTACT'}
      </div>
      {s.tagText ? (
        <div
          style={{
            position: 'absolute', left: 120, right: 120, top: y + hh + 50, display: 'flex', justifyContent: 'center', opacity: tag,
            transform: `translateY(${(1 - tag) * 30}px)`,
          }}
        >
          <div style={{fontFamily: F.brand, fontWeight: 800, fontSize: 36, color: '#fff', background: 'rgba(255,46,136,0.9)', padding: '14px 28px', borderRadius: 40, boxShadow: `0 0 30px ${C.pink}88`}}>
            {s.tagText}
          </div>
        </div>
      ) : null}
      <StepLabel step={s.step} label={s.label} />
      <Arabic text={s.ar} delay={16} top={380} size={54} />
    </AbsoluteFill>
  );
};
