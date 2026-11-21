import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {Background} from '../ui/Background';
import {ease, pop, sec} from '../ui/motion';
import {Arabic, Flash, SceneIn, StepLabel} from '../ui/Pieces';
import {C, F} from '../theme';
import {ProofScene} from '../types';

// In-game proof: a still from real gameplay with the key detail ringed, then the headline it proves.
export const Proof: React.FC<{s: ProofScene}> = ({s}) => {
  const frame = useCurrentFrame();
  const {proof} = s;
  const at = sec(proof.at);
  const card = pop(frame, at, 13, 0.7, 140);
  const titleAt = sec(s.titleAt);
  const title = pop(frame, titleAt, 10, 0.5, 220);
  return (
    <AbsoluteFill>
      <SceneIn>
        <Background broll={s.broll} />
      </SceneIn>
      <StepLabel step={s.step} label={s.label} />
      <div style={{position: 'absolute', top: 410, left: 60, width: 960, opacity: Math.min(1, card * 1.5),
        transform: `perspective(1600px) rotateX(${(1 - card) * 30}deg) scale(${0.85 + 0.15 * card})`}}>
        <div style={{fontFamily: F.mono, fontWeight: 800, fontSize: 26, letterSpacing: 4, color: C.teal, marginBottom: 14}}>{proof.caption}</div>
        <div style={{position: 'relative', borderRadius: 24, overflow: 'hidden', border: `3px solid ${C.teal}88`,
          boxShadow: `0 30px 80px rgba(0,0,0,0.7), 0 0 50px ${C.teal}33`}}>
          <Img src={staticFile(proof.src)} style={{width: '100%', display: 'block'}} />
          {proof.highlights.map((hl, i) => {
            const t = at + 10 + i * 12;
            const a = ease(frame, t, t + 10);
            const tone = hl.color === 'gold' ? C.gold : hl.color === 'pink' ? C.pink : C.green;
            return (
              <div key={i} style={{position: 'absolute', left: `${hl.x ?? 1}%`, width: `${hl.w ?? 98}%`, top: `${hl.y}%`, height: `${hl.h}%`,
                borderRadius: 12, border: `5px solid ${tone}`, boxShadow: `0 0 24px ${tone}, inset 0 0 20px ${tone}55`, opacity: a,
                transform: `scale(${1.3 - 0.3 * a})`}} />
            );
          })}
        </div>
      </div>
      {frame >= titleAt ? (
        <>
          <Flash at={titleAt} length={8} color={C.gold} strength={0.4} />
          <div style={{position: 'absolute', top: 1040, left: 50, right: 50, textAlign: 'center', fontFamily: F.display, fontSize: 112, lineHeight: 1,
            color: C.gold, textTransform: 'uppercase', transform: `scale(${interpolate(title, [0, 1], [1.8, 1])})`, opacity: Math.min(1, title * 2),
            WebkitTextStroke: '9px #000', paintOrder: 'stroke fill', textShadow: `0 0 30px ${C.gold}66`}}>
            {s.title}
          </div>
          {s.sub ? (
            <div style={{position: 'absolute', top: 1170, left: 60, right: 60, textAlign: 'center', fontFamily: F.brand, fontWeight: 800, fontSize: 40,
              color: '#fff', opacity: ease(frame, titleAt + 6, titleAt + 16), textShadow: '0 4px 16px #000'}}>{s.sub}</div>
          ) : null}
        </>
      ) : null}
      <Arabic text={s.ar} delay={titleAt + 10} top={1250} size={54} />
    </AbsoluteFill>
  );
};
