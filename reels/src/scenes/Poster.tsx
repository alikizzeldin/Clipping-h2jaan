import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Background} from '../ui/Background';
import {clamp, ease, pop, sec} from '../ui/motion';
import {Arabic, SceneIn, StepLabel} from '../ui/Pieces';
import {C, F} from '../theme';
import {PosterScene} from '../types';

// A film poster from the game world, redrawn: explosion sky, a soldier silhouette, the title, and
// a billing block at the bottom where every line is an unreadable bar except the credit line.
// On cue the camera zooms into the billing block and each name lifts off its bar under a
// highlighter swipe. A small "REDRAWN" chip says it is our drawing, not the game's asset.

const PX = 230; // poster left
const PY = 400; // poster top
const PW = 620;
const PH = 920;
const BILL_Y = PY + PH - 150; // billing block top

const Soldier: React.FC = () => (
  <svg width={PW} height={520} viewBox="0 0 620 520" style={{position: 'absolute', left: 0, top: 130}}>
    <g fill="#07080a">
      {/* rifle across the body */}
      <rect x={130} y={300} width={380} height={26} rx={8} transform="rotate(-24 320 313)" />
      <rect x={430} y={190} width={90} height={18} rx={6} transform="rotate(-24 475 199)" />
      {/* helmet, head, shoulders */}
      <path d="M232 150 Q310 70 388 150 L396 176 L224 176 Z" />
      <rect x={262} y={170} width={96} height={86} rx={30} />
      <path d="M150 520 L170 330 Q190 270 260 252 L360 252 Q430 270 450 330 L470 520 Z" />
      <rect x={252} y={232} width={116} height={40} rx={14} />
    </g>
    {/* rim light */}
    <path d="M232 150 Q310 70 388 150" fill="none" stroke="#ff8a3d" strokeWidth={5} opacity={0.8} />
    <path d="M450 330 L470 520" fill="none" stroke="#ff8a3d" strokeWidth={5} opacity={0.6} />
  </svg>
);

export const Poster: React.FC<{s: PosterScene}> = ({s}) => {
  const frame = useCurrentFrame();
  const drop = pop(frame, 2, 12, 0.6, 150);
  const zoomAt = s.zoomAt !== undefined ? sec(s.zoomAt) : 99999;
  const z = interpolate(frame, [zoomAt, zoomAt + 22], [0, 1], {...clamp, easing: (t) => t * t * (3 - 2 * t)});
  const scale = 1 + ((s.zoomTo ?? 1.85) - 1) * z;
  const originY = BILL_Y + 70;
  const lift = interpolate(z, [0, 1], [0, 880 - originY]); // bring the billing block up to the middle of the frame
  return (
    <AbsoluteFill>
      <SceneIn>
        <Background broll={s.broll} />
      </SceneIn>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.8) 80%)'}} />
      <div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, transformOrigin: `540px ${originY}px`,
        transform: `translateY(${lift}px) scale(${scale})`}}>
        <div style={{position: 'absolute', left: PX, top: PY, width: PW, height: PH, overflow: 'hidden', borderRadius: 6,
          transform: `translateY(${(1 - drop) * -120}px) rotate(${(1 - drop) * -6 - 1.2}deg)`, opacity: Math.min(1, drop * 1.6),
          background: 'linear-gradient(180deg, #2b0d06 0%, #5c1a0a 22%, #1a1310 55%, #0b0a09 100%)',
          boxShadow: '0 40px 90px rgba(0,0,0,0.7)', border: '6px solid #e8e1cf'}}>
          {/* explosion sky */}
          <div style={{position: 'absolute', left: -100, right: -100, top: -120, height: 520,
            background: 'radial-gradient(ellipse at 50% 60%, #ffd27a 0%, #ff7a1a 25%, rgba(140,30,10,0.6) 55%, rgba(0,0,0,0) 75%)'}} />
          <Soldier />
          {/* the title */}
          <div style={{position: 'absolute', left: 0, right: 0, top: 500, textAlign: 'center', fontFamily: F.display, fontSize: 88, lineHeight: 0.95,
            color: '#f2ede2', letterSpacing: 2, textShadow: '0 6px 0 #000'}}>{s.title}</div>
          {s.subtitle ? (
            <div style={{position: 'absolute', left: 0, right: 0, top: 682, textAlign: 'center', fontFamily: F.display, fontSize: 56, lineHeight: 1, letterSpacing: 18,
              color: C.red, textShadow: '0 4px 0 #000'}}>{s.subtitle}</div>
          ) : null}
          {/* the billing block: condensed lines, only the credit line is readable */}
          <div style={{position: 'absolute', left: 50, right: 50, top: BILL_Y - PY, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9}}>
            {[0.92, 0.78].map((w, i) => (
              <div key={`a${i}`} style={{width: `${w * 100}%`, height: 11, background: 'rgba(242,237,226,0.45)'}} />
            ))}
            <div style={{fontFamily: F.display, fontSize: 20, letterSpacing: 6, color: '#f2ede2', opacity: 0.8, lineHeight: 1}}>{s.credit}</div>
            <div style={{display: 'flex', alignItems: 'center', gap: 22, fontFamily: F.display, fontSize: 29, letterSpacing: 1, color: '#f2ede2', lineHeight: 1}}>
              {s.names.map((n, i) => {
                const at = sec(n.at);
                const shown = frame >= at;
                const swipe = ease(frame, at, at + 7);
                return (
                  <span key={i} style={{position: 'relative', display: 'inline-block'}}>
                    <span style={{position: 'absolute', left: -4, top: -3, bottom: -3, width: `calc(${swipe * 100}% + 8px)`, background: C.gold, opacity: 0.9,
                      transform: 'skewX(-8deg)'}} />
                    <span style={{position: 'relative', color: shown ? '#0b0b0b' : 'transparent'}}>{n.text}</span>
                    {!shown ? <span style={{position: 'absolute', left: 0, right: 0, top: 6, height: 12, background: 'rgba(242,237,226,0.45)'}} /> : null}
                  </span>
                );
              })}
            </div>
            {[0.86, 0.64].map((w, i) => (
              <div key={`b${i}`} style={{width: `${w * 100}%`, height: 11, background: 'rgba(242,237,226,0.45)'}} />
            ))}
            <div style={{display: 'flex', gap: 14, marginTop: 6}}>
              {[70, 54, 80, 60].map((w, i) => (
                <div key={`l${i}`} style={{width: w, height: 22, borderRadius: 4, border: '2px solid rgba(242,237,226,0.45)'}} />
              ))}
            </div>
          </div>
          <div style={{position: 'absolute', right: 10, top: 10, fontFamily: F.mono, fontSize: 16, letterSpacing: 2, color: '#0b0b0b', background: '#e8e1cf',
            padding: '3px 8px', opacity: 0.85}}>{s.redraw ?? 'REDRAWN'}</div>
        </div>
        {/* tape on the corners */}
        {[[PX - 30, PY - 14, -32], [PX + PW - 90, PY - 14, 28]].map(([x, y, r], i) => (
          <div key={`t${i}`} style={{position: 'absolute', left: x, top: y, width: 130, height: 40, background: 'rgba(240,232,200,0.75)',
            transform: `rotate(${r}deg)`, opacity: Math.min(1, drop * 1.6)}} />
        ))}
      </div>
      {/* sticky notes pinned over the poster */}
      {(s.notes ?? []).map((n, i) => {
        const at = sec(n.at);
        if (frame < at) return null;
        const p = pop(frame, at, 10, 0.5, 220);
        const out = 1 - z;
        return (
          <div key={`n${i}`} style={{position: 'absolute', left: i % 2 ? 250 : 110, top: i % 2 ? 1240 : 520, whiteSpace: 'nowrap', opacity: out,
            transform: `rotate(${i % 2 ? 3 : -4}deg) scale(${p})`, fontFamily: F.brand, fontWeight: 900, fontSize: 40, lineHeight: 1.1, color: '#0b0b0b',
            background: i % 2 ? '#fff' : C.gold, padding: '14px 22px', boxShadow: '0 12px 0 rgba(0,0,0,0.5)'}}>{n.text}</div>
        );
      })}
      {/* on the zoom, darken everything above the credits so the eye lands on the names */}
      {z > 0 ? <AbsoluteFill style={{opacity: z, background: 'linear-gradient(180deg, rgba(5,5,6,0.96) 0%, rgba(5,5,6,0.9) 34%, rgba(5,5,6,0) 41%)'}} /> : null}
      <StepLabel step={s.step} label={s.label} />
      <Arabic text={s.ar} delay={16} top={1392} size={52} />
    </AbsoluteFill>
  );
};
