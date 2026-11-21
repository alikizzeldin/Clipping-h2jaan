import React from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame} from 'remotion';
import {Background} from '../ui/Background';
import {ease, pop} from '../ui/motion';
import {Arabic, Flash, SceneIn} from '../ui/Pieces';
import {C, F} from '../theme';
import {CtaScene} from '../types';

export const Cta: React.FC<{s: CtaScene}> = ({s}) => {
  const frame = useCurrentFrame();
  const logo = pop(frame, 4, 11, 0.6, 160);
  const l1 = pop(frame, 14, 12, 0.5, 200);
  const l2 = pop(frame, 22, 12, 0.5, 200);
  const btn = pop(frame, 38, 10, 0.5, 200);
  const pulse = 1 + 0.04 * Math.sin(frame / 5);
  const sweep = ((frame * 18) % 1400) - 300;
  return (
    <AbsoluteFill>
      <SceneIn>
        <Background broll={s.broll} />
      </SceneIn>
      <Flash at={0} length={8} strength={0.6} />
      <div style={{position: 'absolute', top: 300, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
        <Img
          src={staticFile('brand/logo.png')}
          style={{
            width: 540, transform: `scale(${logo}) rotate(${(1 - logo) * -12}deg)`,
            filter: `drop-shadow(0 0 ${30 + 20 * Math.sin(frame / 8)}px ${C.pink}AA)`,
          }}
        />
      </div>
      <div style={{position: 'absolute', top: 820, left: 0, right: 0, textAlign: 'center'}}>
        <div style={{fontFamily: F.display, fontSize: 112, color: '#fff', textTransform: 'uppercase', transform: `scale(${l1})`, opacity: l1, WebkitTextStroke: '8px #000', paintOrder: 'stroke fill'}}>
          {s.line1}
        </div>
        <div
          style={{
            fontFamily: F.display, fontSize: 168, lineHeight: 1, textTransform: 'uppercase', transform: `scale(${l2})`, opacity: l2,
            background: `linear-gradient(90deg, ${C.pink}, ${C.orange}, ${C.pink})`, WebkitBackgroundClip: 'text', color: 'transparent',
            filter: `drop-shadow(0 0 24px ${C.pink}88) drop-shadow(0 6px 0 #000)`,
          }}
        >
          {s.line2}
        </div>
      </div>
      <Arabic text={s.ar} delay={30} top={1175} size={58} />
      <div style={{position: 'absolute', top: 1300, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
        <div
          style={{
            position: 'relative', overflow: 'hidden', fontFamily: F.brand, fontWeight: 900, fontSize: 46, color: '#fff', padding: '26px 56px',
            borderRadius: 80, background: `linear-gradient(90deg, ${C.pink}, ${C.orange})`, boxShadow: `0 0 50px ${C.pink}99, 0 12px 30px rgba(0,0,0,0.5)`,
            transform: `scale(${btn * pulse})`, opacity: btn,
          }}
        >
          {s.button}
          <div style={{position: 'absolute', top: 0, bottom: 0, left: sweep, width: 120, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)', transform: 'skewX(-20deg)'}} />
        </div>
      </div>
      {s.next ? (
        <div style={{position: 'absolute', top: 1475, left: 0, right: 0, textAlign: 'center', fontFamily: F.mono, fontWeight: 700, fontSize: 30, letterSpacing: 6, color: 'rgba(255,255,255,0.85)', opacity: ease(frame, 60, 76)}}>
          {s.next}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
