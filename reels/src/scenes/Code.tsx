import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Background} from '../ui/Background';
import {clamp, ease, pop, sec} from '../ui/motion';
import {Arabic, Flash, SceneIn, StepLabel} from '../ui/Pieces';
import {C, F} from '../theme';
import {CodeScene} from '../types';

const Lock: React.FC<{open: number; color: string}> = ({open, color}) => (
  <svg width={90} height={100} viewBox="0 0 90 100">
    <path d={`M22 46 V30 a23 23 0 0 1 46 0 V${46 - open * 18}`} fill="none" stroke={color} strokeWidth={9} strokeLinecap="round"
      transform={`translate(0 ${-open * 10})`} />
    <rect x={10} y={44} width={70} height={52} rx={10} fill={color} />
    <circle cx={45} cy={66} r={7} fill="#0b0b1c" />
    <rect x={42} y={68} width={6} height={14} rx={2} fill="#0b0b1c" />
  </svg>
);

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

// A password or a keypad code typed on the narrator's words, then "access granted".
export const Code: React.FC<{s: CodeScene}> = ({s}) => {
  const frame = useCurrentFrame();
  const chars = s.code.split('');
  const t0 = sec(s.typeAt);
  const t1 = sec(s.typeEnd);
  const at = (i: number) => (chars.length > 1 ? Math.round(t0 + ((t1 - t0) * i) / (chars.length - 1)) : t0);
  const typed = chars.filter((_, i) => frame >= at(i)).length;
  const doneAt = s.doneAt !== undefined ? sec(s.doneAt) : t1 + 8;
  const done = frame >= doneAt;
  const ok = ease(frame, doneAt, doneAt + 8);
  const card = pop(frame, 4, 13, 0.6, 150);
  const tone = done ? C.green : C.teal;
  const cursor = !done && Math.floor(frame / 8) % 2 === 0;
  const banner = pop(frame, doneAt, 10, 0.5, 220);
  const lastKey = typed > 0 ? chars[typed - 1] : '';
  const keyGlow = typed > 0 ? interpolate(frame, [at(typed - 1), at(typed - 1) + 6], [1, 0], clamp) : 0;
  const shown = (
    <>
      {chars.slice(0, typed).join('')}
      <span style={{opacity: cursor ? 1 : 0, color: tone}}>▌</span>
    </>
  );
  return (
    <AbsoluteFill>
      <SceneIn>
        <Background broll={s.broll} />
      </SceneIn>
      <StepLabel step={s.step} label={s.label} />
      {s.device === 'laptop' ? (
        <div style={{position: 'absolute', top: 440, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center',
          opacity: Math.min(1, card * 1.5), transform: `perspective(1600px) rotateX(${(1 - card) * 25}deg) scale(${0.86 + 0.14 * card})`}}>
          <div style={{width: 900, height: 540, borderRadius: 30, padding: 18, background: '#16161f', border: '3px solid #3a3a4a',
            boxShadow: `0 40px 90px rgba(0,0,0,0.7), 0 0 ${done ? 70 : 30}px ${tone}55`}}>
            <div style={{position: 'relative', width: '100%', height: '100%', borderRadius: 16, overflow: 'hidden',
              background: 'radial-gradient(ellipse at 50% 30%, #1d2a4a 0%, #0a0d1c 70%)', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
              <div style={{marginTop: 34}}><Lock open={ok} color={tone} /></div>
              <div style={{marginTop: 14, fontFamily: F.mono, fontWeight: 800, fontSize: 30, letterSpacing: 8, color: 'rgba(255,255,255,0.8)'}}>{s.prompt}</div>
              <div style={{marginTop: 22, width: 760, height: 118, borderRadius: 18, background: 'rgba(0,0,0,0.55)', border: `4px solid ${tone}`,
                boxShadow: `0 0 30px ${tone}66`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: F.mono, fontWeight: 800, fontSize: 58, color: '#fff', letterSpacing: 2, whiteSpace: 'nowrap'}}>
                {shown}
              </div>
              {done ? (
                <div style={{position: 'absolute', left: 0, right: 0, bottom: 30, display: 'flex', justifyContent: 'center', transform: `scale(${banner})`}}>
                  <div style={{fontFamily: F.brand, fontWeight: 900, fontSize: 44, color: '#06060F', background: C.green, padding: '14px 36px',
                    borderRadius: 16, letterSpacing: 4, boxShadow: `0 0 40px ${C.green}`}}>{s.done}</div>
                </div>
              ) : null}
            </div>
          </div>
          <div style={{width: 1000, height: 34, marginTop: -2, background: 'linear-gradient(180deg, #4a4a5a, #22222c)',
            clipPath: 'polygon(4% 0, 96% 0, 100% 100%, 0 100%)', borderRadius: '0 0 18px 18px'}} />
        </div>
      ) : (
        <div style={{position: 'absolute', top: 420, left: 0, right: 0, display: 'flex', justifyContent: 'center',
          opacity: Math.min(1, card * 1.5), transform: `scale(${0.86 + 0.14 * card})`}}>
          <div style={{width: 600, padding: 30, borderRadius: 36, background: 'linear-gradient(180deg, #2a2b36, #15161d)', border: '3px solid #4a4b5c',
            boxShadow: `0 40px 90px rgba(0,0,0,0.7), 0 0 ${done ? 70 : 24}px ${tone}55`}}>
            <div style={{height: 130, borderRadius: 18, background: '#05150c', border: `4px solid ${tone}`, boxShadow: `inset 0 0 30px ${tone}44, 0 0 24px ${tone}55`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.mono, fontWeight: 800, fontSize: 92, letterSpacing: 18,
              color: done ? C.green : '#d6ffe9', textShadow: `0 0 18px ${tone}`}}>
              {done ? s.code : shown}
            </div>
            <div style={{marginTop: 26, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18}}>
              {KEYS.map((k) => {
                const lit = k === lastKey ? keyGlow : 0;
                return (
                  <div key={k} style={{height: 104, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: F.display, fontSize: 64, color: lit > 0.2 ? '#06060F' : '#fff',
                    background: lit > 0.2 ? C.teal : 'rgba(255,255,255,0.08)', border: '2px solid rgba(255,255,255,0.14)',
                    boxShadow: lit > 0 ? `0 0 ${40 * lit}px ${C.teal}` : 'none', transform: `scale(${1 - 0.08 * lit})`}}>{k}</div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {s.device === 'keypad' && done ? (
        <div style={{position: 'absolute', top: 1130, left: 0, right: 0, display: 'flex', justifyContent: 'center', transform: `scale(${banner})`}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 18, fontFamily: F.brand, fontWeight: 900, fontSize: 50, color: '#06060F', background: C.green,
            padding: '16px 40px', borderRadius: 18, letterSpacing: 4, boxShadow: `0 0 40px ${C.green}`}}>
            <Lock open={1} color="#06060F" />{s.done}
          </div>
        </div>
      ) : null}
      {s.note ? (
        <div style={{position: 'absolute', top: s.device === 'laptop' ? 1050 : 1290, left: 60, right: 60, textAlign: 'center', fontFamily: F.mono,
          fontWeight: 700, fontSize: 30, letterSpacing: 4, color: 'rgba(255,255,255,0.85)', opacity: ease(frame, 14, 26),
          textShadow: '0 3px 12px #000'}}>{s.note}</div>
      ) : null}
      <Flash at={doneAt} length={8} color={C.green} strength={0.45} />
      <Arabic text={s.ar} delay={16} top={s.device === 'laptop' ? 1120 : 1360} size={52} />
    </AbsoluteFill>
  );
};
