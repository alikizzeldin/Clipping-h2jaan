import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame} from 'remotion';
import {Background} from '../ui/Background';
import {clamp, ease, pop, sec} from '../ui/motion';
import {Arabic, Flash, SceneIn} from '../ui/Pieces';
import {C, F} from '../theme';
import {ControlScene} from '../types';

// One button of a game controller, drawn in SVG, pressed in time with the narrator.
const Button: React.FC<{kind: ControlScene['button']; pressed: number; size: number}> = ({kind, pressed, size}) => {
  const glow = 20 + 50 * pressed;
  const ring = (stroke: string) => (
    <circle cx={100} cy={100} r={86} fill="rgba(10,12,24,0.85)" stroke={stroke} strokeWidth={8}
      style={{filter: `drop-shadow(0 0 ${glow}px ${stroke})`}} />
  );
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" style={{transform: `scale(${1 - 0.12 * pressed})`}}>
      {kind === 'TRIANGLE' ? (
        <>
          {ring(C.green)}
          <path d="M100 52 L146 132 L54 132 Z" fill="none" stroke={C.green} strokeWidth={12} strokeLinejoin="round" />
        </>
      ) : null}
      {kind === 'R3' ? (
        <>
          {ring(C.teal)}
          <circle cx={100} cy={100} r={52} fill="rgba(30,242,224,0.12)" stroke={C.teal} strokeWidth={6} />
          <text x={100} y={116} textAnchor="middle" fill="#fff" fontFamily={F.display} fontSize={48}>R3</text>
        </>
      ) : null}
      {kind === 'L3R3' ? (
        <>
          {ring(C.pink)}
          {[[-38, 'L3'], [38, 'R3']].map(([dx, label]) => (
            <g key={label as string}>
              <circle cx={100 + (dx as number)} cy={100} r={34} fill="rgba(255,46,136,0.15)" stroke={C.pink} strokeWidth={6} />
              <text x={100 + (dx as number)} y={112} textAnchor="middle" fill="#fff" fontFamily={F.display} fontSize={32}>{label}</text>
            </g>
          ))}
        </>
      ) : null}
      {kind === 'DPAD_LEFT' ? (
        <>
          {ring(C.orange)}
          {[[0, -1], [0, 1], [1, 0], [-1, 0]].map(([dx, dy], i) => {
            const active = dx === -1;
            return (
              <rect key={i} x={100 + dx * 38 - 22} y={100 + dy * 38 - 22} width={44} height={44} rx={8}
                fill={active ? C.orange : 'rgba(255,255,255,0.18)'} style={active ? {filter: `drop-shadow(0 0 16px ${C.orange})`} : undefined} />
            );
          })}
          <rect x={78} y={78} width={44} height={44} fill="rgba(255,255,255,0.18)" />
          <path d="M70 100 l14 -10 v20 z" fill="#06060F" />
        </>
      ) : null}
    </svg>
  );
};

// A car seen from the side that rolls from its roof back onto its wheels.
const FlipCar: React.FC<{flip: number}> = ({flip}) => {
  const frame = useCurrentFrame();
  const angle = interpolate(flip, [0, 1], [180, 0]);
  const lift = Math.sin(flip * Math.PI) * -60;
  return (
    <div style={{position: 'relative', width: 620, height: 360}}>
      <svg width={620} height={360} viewBox="0 0 620 360" style={{position: 'absolute', inset: 0}}>
        <line x1={20} y1={318} x2={600} y2={318} stroke="rgba(255,255,255,0.35)" strokeWidth={4} />
        <g transform={`translate(310 ${230 + lift}) rotate(${angle})`}>
          <path d="M-210 20 L-190 -30 Q-170 -46 -130 -48 L-80 -92 Q-60 -104 -20 -104 L70 -104 Q110 -104 140 -70 L180 -40 Q210 -36 214 -10 L214 20 Z"
            fill={C.green} stroke="#d9ffc9" strokeWidth={5} style={{filter: `drop-shadow(0 0 20px ${C.green}88)`}} />
          <path d="M-62 -84 L-30 -96 L40 -96 L40 -50 L-92 -50 Z" fill="rgba(6,6,15,0.75)" />
          <path d="M56 -96 L96 -96 Q118 -92 134 -62 L56 -52 Z" fill="rgba(6,6,15,0.75)" />
          {[-130, 130].map((x) => (
            <g key={x} transform={`translate(${x} 22)`}>
              <circle r={42} fill="#15171f" stroke="#888" strokeWidth={6} />
              <circle r={16} fill="#bbb" />
            </g>
          ))}
        </g>
      </svg>
      {flip > 0.05 && flip < 1 ? Array.from({length: 14}).map((_, i) => {
        const t = (frame % 20) / 20;
        return (
          <div key={i} style={{
            position: 'absolute', left: 120 + random(`dx${i}`) * 380, top: 300 - t * 60 * random(`dy${i}`),
            width: 10, height: 10, borderRadius: 5, background: 'rgba(220,200,170,0.7)', opacity: 1 - t,
          }} />
        );
      }) : null}
      <div style={{position: 'absolute', left: -10, top: 150, fontFamily: F.display, fontSize: 90, color: C.orange,
        opacity: flip < 1 ? 0.9 : 0, transform: `translateX(${Math.sin(frame / 3) * 8}px)`}}>➜</div>
    </div>
  );
};

export const Control: React.FC<{s: ControlScene}> = ({s}) => {
  const frame = useCurrentFrame();
  const rank = pop(frame, 2, 9, 0.5, 240);
  const card = pop(frame, 6, 13, 0.6, 160);
  const press = sec(s.pressAt);
  // Each tap: a quick press and release; a double tap is two of them.
  const taps = s.taps === 2 ? [press, press + 7] : [press];
  const pressed = s.taps === 'hold'
    ? interpolate(frame, [press, press + 4], [0, 1], clamp)
    : Math.max(0, ...taps.map((t) => interpolate(frame, [t, t + 2, t + 6], [0, 1, 0], clamp)));
  const flip = s.flip ? interpolate(frame, [press, press + 26], [0, 1], {...clamp, easing: (t) => 1 - Math.pow(1 - t, 3)}) : 0;
  const ripple = (k: number) => ((frame - press + k * 9) % 28) / 28;
  const title = ease(frame, 10, 22);
  return (
    <AbsoluteFill>
      <SceneIn>
        <Background broll={s.broll} />
      </SceneIn>
      <Flash at={0} length={6} strength={0.35} />
      {s.rank ? (
      <div style={{position: 'absolute', top: 270, left: 60, display: 'flex', alignItems: 'flex-end', gap: 18,
        transform: `scale(${interpolate(rank, [0, 1], [1.8, 1])})`, transformOrigin: 'left bottom', opacity: Math.min(1, rank * 2)}}>
        <div style={{fontFamily: F.display, fontSize: 200, lineHeight: 0.85, background: `linear-gradient(180deg, #fff, ${C.pink})`,
          WebkitBackgroundClip: 'text', color: 'transparent', filter: `drop-shadow(0 6px 0 #000) drop-shadow(0 0 30px ${C.pink}88)`}}>
          #{s.rank}
        </div>
        <div style={{fontFamily: F.mono, fontWeight: 800, fontSize: 26, letterSpacing: 5, color: '#fff', marginBottom: 18,
          background: 'rgba(0,0,0,0.55)', padding: '6px 12px', borderRadius: 6}}>{s.label}</div>
      </div>
      ) : null}
      <div style={{position: 'absolute', top: 560, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center',
        opacity: Math.min(1, card * 1.5), transform: `scale(${0.7 + 0.3 * card})`}}>
        {s.flip ? <FlipCar flip={flip} /> : (
          <div style={{position: 'relative'}}>
            {frame >= press && s.taps !== 'hold' ? [0, 1].map((k) => (
              <div key={k} style={{position: 'absolute', left: '50%', top: '50%', width: 320, height: 320, marginLeft: -160, marginTop: -160,
                borderRadius: 200, border: `5px solid ${C.white}`, opacity: (1 - ripple(k)) * 0.6, transform: `scale(${0.8 + ripple(k) * 0.9})`}} />
            )) : null}
            <Button kind={s.button} pressed={pressed} size={320} />
          </div>
        )}
        {s.taps === 2 && frame >= press ? (
          <div style={{position: 'absolute', left: 735, top: 30, fontFamily: F.display, fontSize: 96, color: C.green,
            transform: `scale(${pop(frame, press, 9, 0.5, 260)})`, textShadow: `0 0 24px ${C.green}`}}>×2</div>
        ) : null}
        {s.chip ? (
          <div style={{position: 'absolute', left: 735, top: s.taps === 2 ? 150 : 60, fontFamily: F.mono, fontWeight: 800, fontSize: 26,
            color: '#06060F', background: C.gold, padding: '6px 14px', borderRadius: 8, opacity: ease(frame, press, press + 10)}}>{s.chip}</div>
        ) : null}
      </div>
      <div style={{position: 'absolute', top: 1000, left: 60, right: 60, textAlign: 'center', fontFamily: F.display, fontSize: 104,
        lineHeight: 1, color: '#fff', textTransform: 'uppercase', opacity: title, transform: `translateY(${(1 - title) * 30}px)`,
        WebkitTextStroke: '9px #000', paintOrder: 'stroke fill'}}>
        {s.title}
      </div>
      <Arabic text={s.ar} delay={16} top={s.title.length > 18 ? 1230 : 1130} size={54} />
    </AbsoluteFill>
  );
};
