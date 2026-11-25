import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Background} from '../ui/Background';
import {clamp, ease, pop, sec} from '../ui/motion';
import {Arabic, Flash, SceneIn, StepLabel} from '../ui/Pieces';
import {C, F, accent} from '../theme';
import {ElevatorScene, RedactedScene} from '../types';

const INK = '#16121a';

// ------------------------------------------------------------------ redacted
// A typed dossier: values hide under black bars that peel off on their cue; one can stay redacted.
export const Redacted: React.FC<{s: RedactedScene}> = ({s}) => {
  const frame = useCurrentFrame();
  const sheet = pop(frame, 2, 12, 0.6, 150);
  const ROW = 112;
  const TOP = 380;
  const H = 130 + s.lines.length * ROW + 30;
  const stampAt = s.stamp ? sec(s.stamp.at) : 0;
  const stamp = s.stamp ? pop(frame, stampAt, 9, 0.45, 260) : 0;
  const tone = accent(s.stamp?.color ?? 'red');
  return (
    <AbsoluteFill>
      <SceneIn><Background broll={s.broll} /></SceneIn>
      <AbsoluteFill style={{background: 'rgba(4,4,10,0.66)'}} />
      <StepLabel step={s.step} label={s.label} />
      <div style={{position: 'absolute', top: TOP, left: 70, width: 940, height: H, borderRadius: 6, overflow: 'hidden',
        background: 'linear-gradient(180deg, #f3efe2, #e7e0cb)', boxShadow: '0 30px 70px rgba(0,0,0,0.6)',
        transform: `translateY(${(1 - sheet) * 60}px) rotate(${(1 - sheet) * -2}deg)`, opacity: Math.min(1, sheet * 1.5)}}>
        <div style={{position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.035) 0 2px, transparent 2px 6px)'}} />
        <div style={{position: 'relative', height: 110, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px',
          borderBottom: `5px double ${INK}`}}>
          <div style={{fontFamily: F.mono, fontWeight: 800, fontSize: 34, color: INK, letterSpacing: 4}}>{s.docTitle}</div>
          <div style={{fontFamily: F.mono, fontWeight: 800, fontSize: 20, color: '#fff', background: INK, padding: '4px 10px', letterSpacing: 3}}>CONFIDENTIAL</div>
        </div>
        {s.lines.map((l, i) => {
          const at = l.at !== undefined ? sec(l.at) : 0;
          const appear = ease(frame, 6 + i * 4, 16 + i * 4);
          const peel = l.keep || l.at === undefined ? 0 : ease(frame, at, at + 10);
          const hi = l.hi ? ease(frame, at + 8, at + 18) : 0;
          const barW = l.keep ? 300 : 560;
          return (
            <div key={i} style={{position: 'relative', height: ROW, display: 'flex', alignItems: 'center', padding: '0 40px',
              borderBottom: '2px dashed rgba(0,0,0,0.15)', opacity: appear}}>
              <div style={{width: 250, fontFamily: F.mono, fontWeight: 700, fontSize: 24, color: '#6a6470', letterSpacing: 3}}>{l.label}</div>
              <div style={{position: 'relative', flex: 1, height: 64, display: 'flex', alignItems: 'center'}}>
                {hi > 0 ? (
                  <div style={{position: 'absolute', left: -10, top: 6, height: 52, width: 20 + hi * 430, background: 'rgba(255,214,0,0.6)', transform: 'skewX(-8deg)'}} />
                ) : null}
                <span style={{position: 'relative', fontFamily: F.mono, fontWeight: 800, fontSize: 44, color: INK, whiteSpace: 'nowrap'}}>{l.keep ? '' : l.value}</span>
                <div style={{position: 'absolute', left: -8, top: 0, height: 64, width: barW, background: '#0c0c10', borderRadius: 3,
                  transformOrigin: 'right center', transform: `scaleX(${1 - peel})`}} />
                {l.keep && l.note ? (
                  <div style={{position: 'absolute', left: 320, top: 14, fontFamily: F.mono, fontWeight: 800, fontSize: 22, color: C.red,
                    border: `3px solid ${C.red}`, padding: '2px 10px', whiteSpace: 'nowrap', letterSpacing: 2,
                    opacity: ease(frame, at, at + 8), transform: `scale(${interpolate(ease(frame, at, at + 8), [0, 1], [1.4, 1])})`}}>{l.note}</div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      {s.stamp && frame >= stampAt ? (
        <div style={{position: 'absolute', top: TOP + H - 46, left: 540, fontFamily: F.display, fontSize: 76, color: tone, background: 'rgba(10,6,8,0.55)',
          border: `8px solid ${tone}`, borderRadius: 14, padding: '4px 24px', letterSpacing: 2, opacity: Math.min(0.92, stamp * 1.4),
          transform: `rotate(-10deg) scale(${interpolate(stamp, [0, 1], [1.8, 1], clamp)})`}}>{s.stamp.text}</div>
      ) : null}
      {s.stamp && frame >= stampAt ? <Flash at={stampAt} length={6} color={tone} strength={0.25} /> : null}
      <Arabic text={s.ar} delay={16} top={TOP + H + (s.stamp ? 150 : 50)} size={52} />
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ elevator art
const Balloon: React.FC<{x: number; y: number; r: number; color: string; frame: number; k: number}> = ({x, y, r, color, frame, k}) => {
  const bob = Math.sin(frame / (14 + (k % 5)) + k) * 6;
  return (
    <div style={{position: 'absolute', left: x - r, top: y - r * 1.15 + bob, width: r * 2, height: r * 2.6}}>
      <svg width={r * 2} height={r * 2.6} viewBox="0 0 100 130" style={{overflow: 'visible'}}>
        <path d="M50 100 Q44 116 52 130" stroke="rgba(255,255,255,0.55)" strokeWidth={2} fill="none" />
        <ellipse cx="50" cy="50" rx="44" ry="50" fill={color} />
        <path d="M45 98 L55 98 L50 104 Z" fill={color} />
        <ellipse cx="34" cy="30" rx="10" ry="16" fill="rgba(255,255,255,0.45)" transform="rotate(-20 34 30)" />
      </svg>
    </div>
  );
};

const ClownFace: React.FC<{size: number; frame: number}> = ({size, frame}) => {
  const twitch = Math.sin(frame * 1.7) * 2;
  return (
    <svg width={size} height={size * 1.2} viewBox="0 0 200 240" style={{overflow: 'visible', transform: `rotate(${twitch}deg)`}}>
      <defs>
        <radialGradient id="eyeglow"><stop offset="0%" stopColor="#fff6a8" /><stop offset="60%" stopColor="#ffcc1a" /><stop offset="100%" stopColor="rgba(255,180,0,0)" /></radialGradient>
      </defs>
      {[[28, 78], [16, 108], [30, 50], [172, 78], [184, 108], [170, 50]].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={24} fill="#b4401c" />
      ))}
      <ellipse cx="100" cy="124" rx="70" ry="92" fill="#efeadf" />
      <path d="M64 58 Q74 100 66 140 M136 58 Q126 100 134 140" stroke="#c8102e" strokeWidth={5} fill="none" strokeLinecap="round" />
      <circle cx="72" cy="104" r="22" fill="url(#eyeglow)" />
      <circle cx="128" cy="104" r="22" fill="url(#eyeglow)" />
      <circle cx="74" cy="104" r="4" fill="#1a0a0e" />
      <circle cx="126" cy="104" r="4" fill="#1a0a0e" />
      <circle cx="100" cy="146" r="15" fill="#d0102a" />
      <path d="M50 170 Q100 226 150 170" stroke="#c8102e" strokeWidth={9} fill="none" strokeLinecap="round" />
      <path d="M50 170 L40 150 M150 170 L160 150" stroke="#c8102e" strokeWidth={7} strokeLinecap="round" />
      <path d="M78 188 L84 200 L90 190 L96 202 L102 191 L108 202 L114 190 L120 199" stroke="#f7f1e0" strokeWidth={4} fill="none" />
    </svg>
  );
};

// ------------------------------------------------------------------ elevator
// Two elevators in a hotel hallway: a broken one with a sign and a red balloon, the other opens full of
// balloons; the lights die and a clown face flashes in the dark, then it's gone.
export const Elevator: React.FC<{s: ElevatorScene}> = ({s}) => {
  const frame = useCurrentFrame();
  const enter = pop(frame, 2, 12, 0.6, 150);
  const signAt = sec(s.signAt);
  const callAt = sec(s.callAt);
  const openAt = sec(s.openAt);
  const darkAt = s.darkAt !== undefined ? sec(s.darkAt) : 99999;
  const clownAt = s.clownAt !== undefined ? sec(s.clownAt) : 99999;
  const goneAt = s.goneAt !== undefined ? sec(s.goneAt) : 99999;
  const sign = pop(frame, signAt, 10, 0.5, 220);
  const balloon = pop(frame, signAt + 8, 9, 0.6, 160);
  const lit = frame >= callAt;
  const open = ease(frame, openAt, openAt + 22);
  // lights: flicker for a few frames, then dark; a little light comes back after the clown is gone
  const flick = frame >= darkAt && frame < darkAt + 10 ? ((frame - darkAt) % 3 === 0 ? 0.2 : 0.85) : 0;
  const dark = frame >= darkAt + 10 ? (frame >= goneAt + 6 ? 0.72 : 0.9) : flick;
  const clownOn = frame >= clownAt && frame < goneAt;
  const clown = clownOn ? ease(frame, clownAt, clownAt + 10) : 0;
  const DOOR_TOP = 540;
  const DOOR_H = 660;
  const DOOR_W = 360;
  const LX = 130;
  const RX = 570;
  const floor = (x: number, txt: string, red: boolean) => (
    <div style={{position: 'absolute', top: DOOR_TOP - 96, left: x + DOOR_W / 2 - 90, width: 180, height: 62, borderRadius: 10,
      background: '#0a0a0e', border: '3px solid #555b64', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      fontFamily: F.mono, fontWeight: 800, fontSize: 34, color: red ? C.red : C.gold, textShadow: `0 0 12px ${red ? C.red : C.gold}`}}>{txt}</div>
  );
  // the two door halves slide into the frame's walls (clipped to the doorway)
  const doors = (x: number, gap: number) => (
    <div style={{position: 'absolute', top: DOOR_TOP, left: x, width: DOOR_W, height: DOOR_H, overflow: 'hidden'}}>
      <div style={{position: 'absolute', top: 0, left: 0, width: DOOR_W / 2, height: DOOR_H, transform: `translateX(${-gap}px)`,
        background: 'linear-gradient(90deg, #8f959d, #c9ced5 45%, #a2a8b0)', borderRight: '2px solid #5b6068'}} />
      <div style={{position: 'absolute', top: 0, left: DOOR_W / 2, width: DOOR_W / 2, height: DOOR_H, transform: `translateX(${gap}px)`,
        background: 'linear-gradient(90deg, #a2a8b0, #c9ced5 55%, #8f959d)', borderLeft: '2px solid #5b6068'}} />
    </div>
  );
  const balloons = [
    [80, 120, 46, '#d81f35'], [190, 90, 50, '#e8e4da'], [290, 150, 44, '#d81f35'], [130, 250, 52, '#d81f35'], [250, 280, 46, '#c9b8f0'],
    [70, 380, 44, '#e8e4da'], [200, 420, 50, '#d81f35'], [300, 400, 42, '#d81f35'], [120, 540, 46, '#d81f35'], [260, 560, 48, '#e8e4da'],
  ] as const;
  return (
    <AbsoluteFill>
      <SceneIn><Background broll={s.broll} /></SceneIn>
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(20,14,10,0.82), rgba(8,6,6,0.9))'}} />
      <StepLabel step={s.step} label={s.label} />
      <div style={{position: 'absolute', inset: 0, opacity: Math.min(1, enter * 1.5), transform: `scale(${0.94 + 0.06 * enter})`}}>
        {/* frames */}
        {[LX, RX].map((x, i) => (
          <div key={i} style={{position: 'absolute', top: DOOR_TOP - 16, left: x - 16, width: DOOR_W + 32, height: DOOR_H + 16, borderRadius: '10px 10px 0 0',
            background: 'linear-gradient(180deg, #6d727a, #3c4047)', boxShadow: '0 20px 60px rgba(0,0,0,0.6)'}} />
        ))}
        {floor(LX, '— —', true)}
        {floor(RX, lit ? '▼ 1' : '▲ 9', false)}
        {/* left: broken */}
        {doors(LX, 0)}
        {/* right: the car behind the doors */}
        <div style={{position: 'absolute', top: DOOR_TOP, left: RX, width: DOOR_W, height: DOOR_H, overflow: 'hidden',
          background: 'radial-gradient(circle at 50% 20%, #8a6a3a, #3a2616 70%)'}}>
          {open > 0.05 ? balloons.map(([bx, by, r, col], k) => (
            <Balloon key={k} x={bx} y={by} r={r} color={col} frame={frame} k={k} />
          )) : null}
        </div>
        {doors(RX, open * (DOOR_W / 2))}
        {/* call panel between the doors */}
        <div style={{position: 'absolute', top: DOOR_TOP + 300, left: LX + DOOR_W + 16 + 4, width: 36, height: 90, borderRadius: 8,
          background: '#2a2d33', border: '2px solid #7a8088', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <div style={{width: 22, height: 22, borderRadius: 11, background: lit ? C.gold : '#55585e', boxShadow: lit ? `0 0 18px ${C.gold}` : 'none'}} />
        </div>
        {/* the sign and the red balloon on the broken door */}
        <div style={{position: 'absolute', top: DOOR_TOP + 200, left: LX + 40, width: DOOR_W - 80, padding: '22px 12px', background: '#f4f1ea',
          boxShadow: '0 10px 20px rgba(0,0,0,0.5)', textAlign: 'center', fontFamily: F.hand, fontSize: 46, color: '#1a1a1a', lineHeight: 1.05,
          transform: `rotate(-4deg) scale(${sign})`, opacity: Math.min(1, sign * 1.5)}}>
          <div style={{position: 'absolute', top: -14, left: '38%', width: 70, height: 26, background: 'rgba(230,220,180,0.8)', transform: 'rotate(3deg)'}} />
          {s.sign}
        </div>
        {frame >= signAt + 8 ? (
          <div style={{position: 'absolute', left: LX + DOOR_W - 30, top: DOOR_TOP + 40 + (1 - balloon) * 200, opacity: Math.min(1, balloon * 1.5)}}>
            <Balloon x={0} y={0} r={46} color="#d81f35" frame={frame} k={3} />
          </div>
        ) : null}
      </div>
      {/* the lights */}
      {dark > 0 ? <AbsoluteFill style={{background: '#000', opacity: dark}} /> : null}
      {clownOn ? (
        <div style={{position: 'absolute', top: DOOR_TOP + 150, left: RX + DOOR_W / 2 - 130, opacity: clown,
          transform: `scale(${0.85 + 0.25 * clown})`, filter: 'drop-shadow(0 0 30px rgba(255,200,0,0.35))'}}>
          <ClownFace size={260} frame={frame} />
        </div>
      ) : null}
      {frame >= clownAt && frame < clownAt + 8 ? <Flash at={clownAt} length={8} color={C.red} strength={0.35} /> : null}
      {frame >= goneAt && frame < goneAt + 6 ? <Flash at={goneAt} length={6} color="#fff" strength={0.3} /> : null}
      <Arabic text={s.ar} delay={16} top={DOOR_TOP + DOOR_H + 80} size={52} />
    </AbsoluteFill>
  );
};
