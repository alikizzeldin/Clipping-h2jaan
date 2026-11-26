import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Background} from '../ui/Background';
import {clamp, ease, pop, sec} from '../ui/motion';
import {Arabic, Flash, SceneIn, StepLabel} from '../ui/Pieces';
import {C, F, accent} from '../theme';
import {ElevatorScene, HallwayScene, MedalsScene, RedactedScene, SleepScene} from '../types';

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

// ------------------------------------------------------------------ sleep
const TimeIcon: React.FC<{icon: SleepScene['options'][number]['icon']; size: number}> = ({icon, size}) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={{overflow: 'visible'}}>
    {icon === 'moon' ? (
      <path d="M62 14 A38 38 0 1 0 86 70 A30 30 0 1 1 62 14 Z" fill="#e9e6ff" />
    ) : (
      <>
        {icon !== 'sun' ? <line x1="6" y1="70" x2="94" y2="70" stroke="#ffd27a" strokeWidth={6} strokeLinecap="round" /> : null}
        {Array.from({length: 8}).map((_, i) => {
          const a = (i / 8) * Math.PI * 2;
          const cy = icon === 'sun' ? 50 : 70;
          if (icon !== 'sun' && Math.sin(a) > 0.1) return null;
          return <line key={i} x1={50 + Math.cos(a) * 30} y1={cy + Math.sin(a) * 30} x2={50 + Math.cos(a) * 42} y2={cy + Math.sin(a) * 42}
            stroke={icon === 'sunset' ? '#ff8a3d' : '#ffd23a'} strokeWidth={6} strokeLinecap="round" />;
        })}
        {icon === 'sun' ? <circle cx="50" cy="50" r="20" fill="#ffd23a" /> : <path d="M28 70 A22 22 0 0 1 72 70 Z" fill={icon === 'sunset' ? '#ff8a3d' : '#ffd23a'} />}
      </>
    )}
  </svg>
);

// A bedroom window over the day sky, a sleep menu whose cursor lands on one wake-up time, a blink,
// and the window opens on that time (night: moon and stars).
export const Sleep: React.FC<{s: SleepScene}> = ({s}) => {
  const frame = useCurrentFrame();
  const enter = pop(frame, 2, 12, 0.6, 150);
  const menuAt = sec(s.menuAt);
  const pickAt = sec(s.pickAt);
  const wakeAt = sec(s.wakeAt);
  const menu = pop(frame, menuAt, 12, 0.55, 170);
  // the cursor steps down one row at a time between the menu opening and the pick
  const steps = Math.max(1, s.pick);
  const cursor = frame < menuAt + 6 ? 0 : Math.min(s.pick, Math.floor(((frame - menuAt - 6) / Math.max(1, pickAt - menuAt - 6)) * steps + 0.0001));
  const picked = frame >= pickAt;
  const pickPop = picked ? pop(frame, pickAt, 9, 0.45, 260) : 0;
  const night = frame >= wakeAt;
  const close = interpolate(frame, [wakeAt - 12, wakeAt], [0, 1], clamp);
  const reopen = interpolate(frame, [wakeAt + 4, wakeAt + 18], [1, 0], clamp);
  const lid = frame < wakeAt ? close : reopen;
  const chosen = s.options[s.pick];
  const nightSky = chosen?.icon === 'moon';
  const WIN_TOP = 380;
  const WIN_H = 420;
  const ROW = 84;
  const MENU_TOP = 850;
  const twinkle = (k: number) => 0.4 + 0.6 * Math.abs(Math.sin(frame / (9 + (k % 4)) + k));
  return (
    <AbsoluteFill>
      <SceneIn><Background broll={s.broll} /></SceneIn>
      <AbsoluteFill style={{background: 'rgba(6,6,14,0.7)'}} />
      <StepLabel step={s.step} label={s.label} />
      {/* the window */}
      <div style={{position: 'absolute', top: WIN_TOP, left: 90, width: 900, height: WIN_H, borderRadius: 20, overflow: 'hidden',
        border: '14px solid #3a2c22', boxShadow: '0 30px 70px rgba(0,0,0,0.6), inset 0 0 40px rgba(0,0,0,0.4)',
        opacity: Math.min(1, enter * 1.5), transform: `scale(${0.94 + 0.06 * enter})`}}>
        {!night || !nightSky ? (
          <AbsoluteFill style={{background: 'linear-gradient(180deg, #6ec3ff, #bfe6ff 60%, #ffe2a8)'}}>
            <div style={{position: 'absolute', right: 140, top: 70, width: 120, height: 120, borderRadius: 60, background: '#ffd23a',
              boxShadow: '0 0 60px #ffd23a'}} />
            {[[120, 120, 160], [420, 70, 120], [600, 200, 180]].map(([x, y, w], i) => (
              <div key={i} style={{position: 'absolute', left: x + Math.sin(frame / 60 + i) * 10, top: y, width: w, height: w * 0.36, borderRadius: 40,
                background: 'rgba(255,255,255,0.85)'}} />
            ))}
          </AbsoluteFill>
        ) : (
          <AbsoluteFill style={{background: 'linear-gradient(180deg, #070b26, #1b1145 60%, #3a1a5a)'}}>
            {Array.from({length: 26}).map((_, k) => (
              <div key={k} style={{position: 'absolute', left: (k * 137) % 860, top: (k * 71) % 300, width: 5, height: 5, borderRadius: 3,
                background: '#fff', opacity: twinkle(k)}} />
            ))}
            <div style={{position: 'absolute', right: 130, top: 60 + (1 - ease(frame, wakeAt + 6, wakeAt + 30)) * 120}}>
              <TimeIcon icon="moon" size={150} />
            </div>
          </AbsoluteFill>
        )}
        {/* window bars */}
        <div style={{position: 'absolute', left: '50%', top: 0, bottom: 0, width: 14, marginLeft: -7, background: '#3a2c22'}} />
        <div style={{position: 'absolute', top: '50%', left: 0, right: 0, height: 14, marginTop: -7, background: '#3a2c22'}} />
        {night && s.wakeText ? (
          <div style={{position: 'absolute', left: 30, bottom: 26, fontFamily: F.mono, fontWeight: 800, fontSize: 30, color: '#06060F',
            background: C.gold, padding: '6px 16px', borderRadius: 10, letterSpacing: 2, opacity: ease(frame, wakeAt + 14, wakeAt + 24)}}>{s.wakeText}</div>
        ) : null}
      </div>
      {/* the sleep menu */}
      {frame >= menuAt - 2 ? (
        <div style={{position: 'absolute', top: MENU_TOP, left: 160, width: 760, borderRadius: 22, overflow: 'hidden',
          background: 'linear-gradient(180deg, rgba(20,20,34,0.96), rgba(10,10,18,0.96))', border: '3px solid rgba(255,255,255,0.18)',
          boxShadow: '0 30px 60px rgba(0,0,0,0.6)', opacity: Math.min(1, menu * 1.5), transform: `translateY(${(1 - menu) * 60}px)`}}>
          <div style={{height: 70, display: 'flex', alignItems: 'center', padding: '0 30px', fontFamily: F.mono, fontWeight: 800, fontSize: 30,
            color: 'rgba(255,255,255,0.7)', letterSpacing: 4, borderBottom: '2px solid rgba(255,255,255,0.12)'}}>{s.title}</div>
          {s.options.map((o, i) => {
            const on = i === cursor;
            const isPick = picked && i === s.pick;
            return (
              <div key={i} style={{position: 'relative', height: ROW, display: 'flex', alignItems: 'center', gap: 24, padding: '0 30px',
                background: on ? (isPick ? 'rgba(255,200,87,0.22)' : 'rgba(255,255,255,0.08)') : 'transparent',
                transform: isPick ? `scale(${1 + 0.04 * pickPop})` : 'none'}}>
                {on ? <div style={{position: 'absolute', left: 0, top: 10, bottom: 10, width: 8, borderRadius: 4, background: isPick ? C.gold : '#fff'}} /> : null}
                <TimeIcon icon={o.icon} size={52} />
                <div style={{fontFamily: F.display, fontSize: 52, color: isPick ? C.gold : on ? '#fff' : 'rgba(255,255,255,0.6)'}}>{o.text}</div>
                {isPick ? <div style={{marginLeft: 'auto', fontFamily: F.mono, fontWeight: 800, fontSize: 26, color: '#06060F', background: C.gold,
                  padding: '4px 12px', borderRadius: 8}}>✓</div> : null}
              </div>
            );
          })}
        </div>
      ) : null}
      {/* the blink */}
      {lid > 0 ? (
        <>
          <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 960 * lid, background: '#000'}} />
          <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 960 * lid, background: '#000'}} />
        </>
      ) : null}
      <Arabic text={s.ar} delay={16} top={MENU_TOP + 70 + s.options.length * ROW + 50} size={52} />
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ hallway
const Sigil: React.FC<{size: number; glow: number}> = ({size, glow}) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={{overflow: 'visible', filter: `drop-shadow(0 0 ${10 * glow}px #ff1a2e)`}}>
    <circle cx="50" cy="50" r="44" fill="none" stroke="#c8102e" strokeWidth={5} />
    <circle cx="50" cy="50" r="30" fill="none" stroke="#c8102e" strokeWidth={3} />
    <path d="M50 8 L86 72 L14 72 Z" fill="none" stroke="#c8102e" strokeWidth={4} />
    <path d="M50 20 V92 M18 40 H82" stroke="#c8102e" strokeWidth={3} />
    <circle cx="50" cy="50" r="6" fill="#c8102e" />
  </svg>
);

// A corridor in one-point perspective: lights flicker and die, red symbols glow, a whisper caption,
// then the far door swings open on white fog.
export const Hallway: React.FC<{s: HallwayScene}> = ({s}) => {
  const frame = useCurrentFrame();
  const enter = pop(frame, 2, 12, 0.6, 150);
  const darkAt = sec(s.darkAt);
  const symbolsAt = sec(s.symbolsAt);
  const whisperAt = s.whisperAt !== undefined ? sec(s.whisperAt) : 99999;
  const doorAt = sec(s.doorAt);
  const fogAt = s.fogAt !== undefined ? sec(s.fogAt) : doorAt + 20;
  // lights: steady, a flicker run, then off
  const flicker = frame >= darkAt - 14 && frame < darkAt ? ((frame * 7) % 5 < 2 ? 0.25 : 1) : 1;
  const lit = frame < darkAt ? flicker : 0;
  const dark = frame < darkAt ? (1 - lit) * 0.5 : 0.78;
  const sig = ease(frame, symbolsAt, symbolsAt + 16);
  const pulse = 0.7 + 0.3 * Math.sin(frame / 5);
  const open = ease(frame, doorAt, doorAt + 16);
  const fog = ease(frame, doorAt + 8, doorAt + 46);
  const fogTextIn = ease(frame, fogAt, fogAt + 14);
  const W = 940;
  const H = 860;
  const TOP = 380;
  const LEFT = 70;
  const far = {l: 360, t: 260, r: 580, b: 600};
  const door = {l: 420, t: 390, w: 100, h: 210};
  const lights = [0.18, 0.5, 0.78];
  return (
    <AbsoluteFill>
      <SceneIn><Background broll={s.broll} /></SceneIn>
      <AbsoluteFill style={{background: 'rgba(4,3,3,0.85)'}} />
      <StepLabel step={s.step} label={s.label} />
      <div style={{position: 'absolute', top: TOP, left: LEFT, width: W, height: H, overflow: 'hidden', borderRadius: 18,
        opacity: Math.min(1, enter * 1.5), transform: `scale(${0.95 + 0.05 * enter})`, boxShadow: '0 30px 80px rgba(0,0,0,0.7)'}}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
          <defs>
            <linearGradient id="hw-wall-l" x1="0" x2="1"><stop offset="0%" stopColor="#5b4d40" /><stop offset="100%" stopColor="#2e2620" /></linearGradient>
            <linearGradient id="hw-wall-r" x1="1" x2="0"><stop offset="0%" stopColor="#5b4d40" /><stop offset="100%" stopColor="#2e2620" /></linearGradient>
            <linearGradient id="hw-floor" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stopColor="#4a2f26" /><stop offset="100%" stopColor="#1e1410" /></linearGradient>
          </defs>
          <polygon points={`0,0 ${W},0 ${far.r},${far.t} ${far.l},${far.t}`} fill="#2a2420" />
          <polygon points={`0,${H} ${W},${H} ${far.r},${far.b} ${far.l},${far.b}`} fill="url(#hw-floor)" />
          {[0.2, 0.4, 0.6, 0.8].map((t, i) => (
            <line key={i} x1={far.l + (0 - far.l) * t} y1={far.b + (H - far.b) * t} x2={far.r + (W - far.r) * t} y2={far.b + (H - far.b) * t}
              stroke="rgba(0,0,0,0.35)" strokeWidth={3} />
          ))}
          <polygon points={`0,0 ${far.l},${far.t} ${far.l},${far.b} 0,${H}`} fill="url(#hw-wall-l)" />
          <polygon points={`${W},0 ${far.r},${far.t} ${far.r},${far.b} ${W},${H}`} fill="url(#hw-wall-r)" />
          {/* side doors */}
          {[0.25, 0.6].map((t, i) => {
            const x = far.l * t;
            const w = 70 * (1 - t) + 20;
            const top = far.t * t + 120 * (1 - t);
            const bot = far.b + (H - far.b) * (1 - t) - 10;
            return (
              <g key={i}>
                <rect x={x + 20} y={top + 60} width={w} height={bot - top - 60} fill="#3b2418" opacity={0.8} />
                <rect x={W - x - 20 - w} y={top + 60} width={w} height={bot - top - 60} fill="#3b2418" opacity={0.8} />
              </g>
            );
          })}
          <rect x={far.l} y={far.t} width={far.r - far.l} height={far.b - far.t} fill="#3a3028" />
          {/* light behind the far door */}
          <rect x={door.l} y={door.t} width={door.w} height={door.h} fill="#f4f2ee" />
          {/* the door, hinged on the left */}
          <rect x={door.l} y={door.t} width={door.w * (1 - 0.88 * open)} height={door.h} fill="#4a2b1c" stroke="#1a0e08" strokeWidth={3} />
          {/* ceiling lights */}
          {lights.map((t, i) => {
            const y = far.t * t;
            const w = 300 * (1 - t) + 60;
            return (
              <g key={i}>
                <rect x={W / 2 - w / 2} y={y + 8} width={w} height={12 * (1 - t) + 6} rx={4} fill={lit > 0.5 ? '#fff6d6' : '#3a3630'} />
                {lit > 0.5 ? <ellipse cx={W / 2} cy={y + 60} rx={w * 0.9} ry={90 * (1 - t) + 30} fill="rgba(255,240,200,0.12)" /> : null}
              </g>
            );
          })}
        </svg>
        <AbsoluteFill style={{background: '#000', opacity: dark}} />
        {/* symbols glow in the dark */}
        {frame >= symbolsAt ? (
          <>
            {[[60, 250, 150], [230, 380, 90], [W - 210, 250, 150], [W - 320, 380, 90], [W / 2 - 40, 170, 80]].map(([x, y, sz], i) => (
              <div key={i} style={{position: 'absolute', left: x, top: y, opacity: sig * pulse, transform: `scale(${0.8 + 0.2 * sig}) rotate(${i * 17}deg)`}}>
                <Sigil size={sz} glow={pulse} />
              </div>
            ))}
          </>
        ) : null}
        {s.floor ? (
          <div style={{position: 'absolute', left: far.r + 14, top: far.t + 40, fontFamily: F.mono, fontWeight: 800, fontSize: 22, color: '#d8cfc0',
            background: 'rgba(0,0,0,0.6)', padding: '4px 10px', letterSpacing: 3, opacity: frame < darkAt ? 1 : 0.4}}>{s.floor}</div>
        ) : null}
        {/* the fog spilling out of the door */}
        {fog > 0 ? (
          <AbsoluteFill style={{opacity: fog,
            background: `radial-gradient(circle at ${(door.l + door.w / 2) / W * 100}% ${(door.t + door.h / 2) / H * 100}%, rgba(245,245,240,0.98) ${10 + fog * 30}%, rgba(220,220,215,0.9) ${30 + fog * 40}%, rgba(200,200,195,${0.5 + fog * 0.4}) 100%)`}}>
            {[0, 1, 2, 3].map((k) => (
              <div key={k} style={{position: 'absolute', left: ((frame * (0.6 + k * 0.2) + k * 260) % (W + 400)) - 300, top: 120 + k * 170, width: 420, height: 160,
                borderRadius: 80, background: 'rgba(255,255,255,0.35)', filter: 'blur(18px)'}} />
            ))}
          </AbsoluteFill>
        ) : null}
        {s.fogText && frame >= fogAt ? (
          <div style={{position: 'absolute', left: 0, right: 0, top: H / 2 - 70, textAlign: 'center', fontFamily: F.display, fontSize: 120,
            color: 'rgba(60,58,56,0.85)', letterSpacing: 4, opacity: fogTextIn, transform: `scale(${0.9 + 0.1 * fogTextIn})`}}>{s.fogText}</div>
        ) : null}
      </div>
      {frame >= whisperAt && frame < doorAt ? (
        <div style={{position: 'absolute', top: TOP + H - 90, left: 0, right: 0, textAlign: 'center', fontFamily: F.body, fontStyle: 'italic',
          fontSize: 38, color: 'rgba(230,220,210,0.85)', letterSpacing: 3, opacity: ease(frame, whisperAt, whisperAt + 10) * (0.7 + 0.3 * Math.sin(frame / 3))}}>
          [ whispers ]
        </div>
      ) : null}
      {frame >= darkAt && frame < darkAt + 5 ? <Flash at={darkAt} length={4} color="#fff" strength={0.2} /> : null}
      <Arabic text={s.ar} delay={16} top={TOP + H + 40} size={52} />
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ medals
const Medal: React.FC<{size: number; on: number}> = ({size, on}) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={{overflow: 'visible'}}>
    {on > 0 ? (
      <g transform={`scale(${0.6 + 0.4 * on}) translate(${(1 - (0.6 + 0.4 * on)) * 50 / (0.6 + 0.4 * on)} ${(1 - (0.6 + 0.4 * on)) * 50 / (0.6 + 0.4 * on)})`}>
        <path d="M30 4 L44 40 L56 40 L70 4 Z" fill={C.red} />
        <circle cx="50" cy="62" r="32" fill="#ffc23a" stroke="#8a5a00" strokeWidth={5} />
        <circle cx="50" cy="62" r="22" fill="none" stroke="#fff2b0" strokeWidth={3} opacity={0.8} />
        <path d="M50 46 L55 57 L67 58 L58 66 L61 78 L50 71 L39 78 L42 66 L33 58 L45 57 Z" fill="#fff6cc" />
      </g>
    ) : (
      <circle cx="50" cy="62" r="30" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={5} strokeDasharray="6 6" />
    )}
  </svg>
);

// A board of empty medal slots fills with gold one by one; a counter climbs; a banner lands when it's full.
export const Medals: React.FC<{s: MedalsScene}> = ({s}) => {
  const frame = useCurrentFrame();
  const enter = pop(frame, 2, 12, 0.6, 150);
  const total = s.rows.length * s.cols.length;
  const from = sec(s.fillFrom);
  const to = sec(s.fillTo);
  const filled = frame < from ? 0 : Math.min(total, Math.floor(((frame - from) / Math.max(1, to - from)) * total) + 1);
  const rowsAt = sec(s.rowsAt ?? 0);
  const colsAt = sec(s.colsAt ?? 0);
  const bannerAt = s.banner ? sec(s.banner.at) : 99999;
  const banner = pop(frame, bannerAt, 9, 0.45, 240);
  const ROW = 92;
  const TOP = 380;
  const LABEL_W = 250;
  const CELL_W = (940 - 60 - LABEL_W) / s.cols.length;
  const HEAD = 118;
  return (
    <AbsoluteFill>
      <SceneIn><Background broll={s.broll} /></SceneIn>
      <AbsoluteFill style={{background: 'rgba(5,5,12,0.72)'}} />
      <StepLabel step={s.step} label={s.label} />
      <div style={{position: 'absolute', top: TOP, left: 70, width: 940, borderRadius: 24, padding: '20px 30px 26px', boxSizing: 'border-box',
        background: 'linear-gradient(180deg, rgba(24,22,34,0.96), rgba(12,11,20,0.96))', border: '3px solid rgba(255,200,87,0.35)',
        boxShadow: '0 30px 70px rgba(0,0,0,0.6)', opacity: Math.min(1, enter * 1.5), transform: `translateY(${(1 - enter) * 50}px)`}}>
        <div style={{display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 16, height: HEAD, lineHeight: 1.1, paddingTop: 6, boxSizing: 'border-box'}}>
          <div style={{fontFamily: F.display, fontSize: 92, color: filled >= total ? C.gold : '#fff', textShadow: filled >= total ? `0 0 30px ${C.gold}` : 'none'}}>
            {filled}/{total}</div>
          {s.counter ? <div style={{fontFamily: F.mono, fontWeight: 800, fontSize: 34, color: C.gold, letterSpacing: 4}}>{s.counter}</div> : null}
        </div>
        <div style={{display: 'flex', paddingLeft: LABEL_W, height: 44, opacity: ease(frame, colsAt, colsAt + 10)}}>
          {s.cols.map((c, j) => (
            <div key={j} style={{width: CELL_W, textAlign: 'center', fontFamily: F.mono, fontWeight: 800, fontSize: 22, color: 'rgba(255,255,255,0.6)', letterSpacing: 2}}>{c}</div>
          ))}
        </div>
        {s.rows.map((r, i) => (
          <div key={i} style={{display: 'flex', alignItems: 'center', height: ROW, borderTop: '2px solid rgba(255,255,255,0.07)',
            opacity: ease(frame, rowsAt + i * 3, rowsAt + i * 3 + 10)}}>
            <div style={{width: LABEL_W, fontFamily: F.mono, fontWeight: 800, fontSize: 28, color: '#fff', letterSpacing: 2}}>{r}</div>
            {s.cols.map((_, j) => {
              const k = i * s.cols.length + j;
              const at = from + ((to - from) * k) / total;
              const on = k < filled ? pop(frame, at, 10, 0.4, 260) : 0;
              return (
                <div key={j} style={{width: CELL_W, display: 'flex', justifyContent: 'center'}}>
                  <Medal size={70} on={Math.min(1, on)} />
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {s.banner && frame >= bannerAt ? (
        <div style={{position: 'absolute', top: TOP + HEAD + 44 + 20 + (s.rows.length * ROW) / 2 - 60, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
          <div style={{fontFamily: F.display, fontSize: 96, color: '#06060F', background: C.gold, padding: '8px 40px', borderRadius: 14,
            boxShadow: `0 0 60px ${C.gold}`, transform: `rotate(-4deg) scale(${interpolate(banner, [0, 1], [1.6, 1], clamp)})`, opacity: Math.min(1, banner * 1.5)}}>
            {s.banner.text}</div>
        </div>
      ) : null}
      {s.banner && frame >= bannerAt ? <Flash at={bannerAt} length={7} color={C.gold} strength={0.3} /> : null}
      <Arabic text={s.ar} delay={16} top={TOP + 20 + HEAD + 44 + s.rows.length * ROW + 26 + 40} size={52} />
    </AbsoluteFill>
  );
};
