import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Background} from '../ui/Background';
import {clamp, ease, pop, sec} from '../ui/motion';
import {Arabic, Flash, SceneIn} from '../ui/Pieces';
import {C, F} from '../theme';
import {SettingScene} from '../types';

const Gear: React.FC<{spin: number}> = ({spin}) => (
  <svg width={46} height={46} viewBox="0 0 100 100" style={{transform: `rotate(${spin}deg)`}}>
    {Array.from({length: 8}).map((_, i) => (
      <rect key={i} x={43} y={4} width={14} height={22} rx={4} fill="#fff" transform={`rotate(${i * 45} 50 50)`} />
    ))}
    <circle cx={50} cy={50} r={30} fill="#fff" />
    <circle cx={50} cy={50} r={13} fill="#0b0b1c" />
  </svg>
);

const num = (v: string) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

// A row of the game's settings menu that changes on the narrator's word: a toggle, a slider or an option.
export const Setting: React.FC<{s: SettingScene}> = ({s}) => {
  const frame = useCurrentFrame();
  const rank = pop(frame, 2, 9, 0.5, 240);
  const panel = pop(frame, 6, 13, 0.6, 150);
  const change = sec(s.changeAt);
  const p = interpolate(frame, [change, change + 12], [0, 1], {...clamp, easing: (t) => 1 - Math.pow(1 - t, 3)});
  const done = frame >= change + 12;
  const tick = pop(frame, change + 10, 9, 0.5, 240);
  const title = ease(frame, 10, 22);
  const glow = done ? 0.6 + 0.4 * Math.sin(frame / 5) : 0.25;
  const ripple = (k: number) => ((frame - change + k * 10) % 30) / 30;

  let control: React.ReactNode = null;
  if (s.kind === 'toggle') {
    const on = s.toValue.toUpperCase() === 'ON';
    const knob = on ? p : 1 - p; // 1 = right (on)
    const track = knob > 0.5 ? C.green : 'rgba(255,255,255,0.22)';
    control = (
      <div style={{display: 'flex', alignItems: 'center', gap: 44}}>
        <div style={{position: 'relative', width: 230, height: 116, borderRadius: 58, background: track, transition: 'none',
          boxShadow: `inset 0 0 0 4px rgba(255,255,255,0.35), 0 0 ${30 * glow}px ${done ? C.pink : 'transparent'}`}}>
          <div style={{position: 'absolute', top: 10, left: 10 + knob * 114, width: 96, height: 96, borderRadius: 48, background: '#fff',
            boxShadow: '0 6px 16px rgba(0,0,0,0.5)'}} />
        </div>
        <div style={{position: 'relative', width: 300, height: 110, overflow: 'hidden', fontFamily: F.display, fontSize: 104, lineHeight: '110px'}}>
          <div style={{position: 'absolute', transform: `translateY(${-p * 110}px)`, color: 'rgba(255,255,255,0.75)'}}>{s.fromValue}</div>
          <div style={{position: 'absolute', transform: `translateY(${(1 - p) * 110}px)`, color: C.pink, textShadow: `0 0 24px ${C.pink}`}}>{s.toValue}</div>
        </div>
      </div>
    );
  } else if (s.kind === 'slider') {
    const max = s.max ?? 10;
    const a = num(s.fromValue);
    const b = num(s.toValue);
    const v = a + (b - a) * p;
    const shown = done ? s.toValue : String(Math.round(v));
    const pct = Math.max(0, Math.min(1, v / max));
    control = (
      <div style={{display: 'flex', alignItems: 'center', gap: 40}}>
        <div style={{position: 'relative', width: 560, height: 60}}>
          <div style={{position: 'absolute', top: 22, left: 0, right: 0, height: 16, borderRadius: 8, background: 'rgba(255,255,255,0.18)'}} />
          {Array.from({length: max + 1}).map((_, i) => (
            <div key={i} style={{position: 'absolute', top: 46, left: (i / max) * 560 - 2, width: 4, height: 14, background: 'rgba(255,255,255,0.3)'}} />
          ))}
          <div style={{position: 'absolute', top: 22, left: 0, width: pct * 560, height: 16, borderRadius: 8,
            background: `linear-gradient(90deg, ${C.pink}, ${C.orange})`, boxShadow: `0 0 18px ${C.pink}`}} />
          <div style={{position: 'absolute', top: 2, left: pct * 560 - 28, width: 56, height: 56, borderRadius: 28, background: '#fff',
            boxShadow: `0 0 ${20 + 30 * glow}px ${C.pink}`}} />
        </div>
        <div style={{minWidth: 200, padding: '0 20px', height: 120, borderRadius: 22, background: 'rgba(0,0,0,0.5)',
          border: `3px solid ${done ? C.pink : 'rgba(255,255,255,0.3)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: F.display, fontSize: 96, color: done ? C.pink : '#fff', textShadow: done ? `0 0 24px ${C.pink}` : undefined}}>
          {shown}
        </div>
      </div>
    );
  } else {
    control = (
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 26, width: 820}}>
        <div style={{fontFamily: F.display, fontSize: 90, color: 'rgba(255,255,255,0.6)'}}>‹</div>
        <div style={{position: 'relative', width: 640, height: 110, overflow: 'hidden', fontFamily: F.display, fontSize: 84, lineHeight: '110px', textAlign: 'center'}}>
          <div style={{position: 'absolute', left: 0, right: 0, transform: `translateX(${-p * 640}px)`, color: 'rgba(255,255,255,0.75)'}}>{s.fromValue}</div>
          <div style={{position: 'absolute', left: 0, right: 0, transform: `translateX(${(1 - p) * 640}px)`, color: C.pink, textShadow: `0 0 24px ${C.pink}`}}>{s.toValue}</div>
        </div>
        <div style={{fontFamily: F.display, fontSize: 90, color: C.pink, transform: `scale(${frame >= change && frame < change + 8 ? 1.4 : 1})`}}>›</div>
      </div>
    );
  }

  return (
    <AbsoluteFill>
      <SceneIn>
        <Background broll={s.broll} />
      </SceneIn>
      <Flash at={0} length={6} strength={0.35} />
      <Flash at={change} length={8} color={C.pink} strength={0.35} />
      <div style={{position: 'absolute', top: 270, left: 60, display: 'flex', alignItems: 'flex-end', gap: 18,
        transform: `scale(${interpolate(rank, [0, 1], [1.8, 1])})`, transformOrigin: 'left bottom', opacity: Math.min(1, rank * 2)}}>
        <div style={{fontFamily: F.display, fontSize: 200, lineHeight: 0.85, background: `linear-gradient(180deg, #fff, ${C.pink})`,
          WebkitBackgroundClip: 'text', color: 'transparent', filter: `drop-shadow(0 6px 0 #000) drop-shadow(0 0 30px ${C.pink}88)`}}>
          #{s.rank}
        </div>
        <div style={{fontFamily: F.mono, fontWeight: 800, fontSize: 26, letterSpacing: 5, color: '#fff', marginBottom: 18,
          background: 'rgba(0,0,0,0.55)', padding: '6px 12px', borderRadius: 6}}>{s.label}</div>
      </div>
      <div style={{position: 'absolute', top: 540, left: 60, width: 960, height: 420, borderRadius: 34, overflow: 'hidden',
        background: 'rgba(8,8,26,0.78)', backdropFilter: 'blur(18px)', border: `3px solid ${done ? C.pink : 'rgba(255,255,255,0.18)'}`,
        boxShadow: `0 30px 80px rgba(0,0,0,0.6), 0 0 ${60 * glow}px ${C.pink}${done ? '66' : '00'}`,
        opacity: Math.min(1, panel * 1.5), transform: `perspective(1400px) rotateX(${(1 - panel) * 20}deg) scale(${0.9 + 0.1 * panel})`}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 16, padding: '22px 30px', borderBottom: '2px solid rgba(255,255,255,0.1)'}}>
          <Gear spin={frame * 2} />
          <div style={{fontFamily: F.brand, fontWeight: 900, fontSize: 30, color: '#fff', letterSpacing: 3, marginRight: 10}}>SETTINGS</div>
          {s.tabs.map((t) => {
            const active = t === s.tab;
            return (
              <div key={t} style={{fontFamily: F.mono, fontWeight: 800, fontSize: 24, letterSpacing: 2, padding: '8px 16px', borderRadius: 10,
                color: active ? '#06060F' : 'rgba(255,255,255,0.55)', background: active ? '#fff' : 'transparent'}}>{t}</div>
            );
          })}
        </div>
        <div style={{position: 'relative', margin: '26px 30px 0', padding: '20px 26px', borderRadius: 22,
          background: `linear-gradient(90deg, ${C.pink}33, rgba(255,255,255,0.04))`, border: `2px solid ${C.pink}66`}}>
          {frame >= change ? [0, 1].map((k) => (
            <div key={k} style={{position: 'absolute', inset: 0, borderRadius: 22, border: `4px solid ${C.pink}`,
              opacity: (1 - ripple(k)) * 0.5 * (frame < change + 40 ? 1 : 0), transform: `scale(${1 + ripple(k) * 0.08})`}} />
          )) : null}
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
            <div style={{fontFamily: F.brand, fontWeight: 800, fontSize: 46, color: '#fff'}}>{s.name}</div>
            {s.chip ? (
              <div style={{fontFamily: F.mono, fontWeight: 800, fontSize: 24, color: '#06060F', background: C.gold, padding: '6px 14px', borderRadius: 8,
                opacity: ease(frame, 14, 24) * (done ? 0.45 : 1), textDecoration: done ? 'line-through' : 'none'}}>{s.chip}</div>
            ) : null}
          </div>
          <div style={{marginTop: 22, height: 130, display: 'flex', alignItems: 'center', justifyContent: s.kind === 'option' ? 'center' : 'flex-start'}}>
            {control}
          </div>
          {done ? (
            <div style={{position: 'absolute', right: 26, bottom: 26, width: 64, height: 64, borderRadius: 32, background: C.green,
              display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${tick})`, boxShadow: `0 0 24px ${C.green}`}}>
              <svg width={36} height={36} viewBox="0 0 30 30"><path d="M5 16 L12 23 L25 8" stroke="#06060F" strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
          ) : null}
        </div>
      </div>
      <div style={{position: 'absolute', top: 1010, left: 60, right: 60, textAlign: 'center', fontFamily: F.display, fontSize: 104,
        lineHeight: 1, color: '#fff', textTransform: 'uppercase', opacity: title, transform: `translateY(${(1 - title) * 30}px)`,
        WebkitTextStroke: '9px #000', paintOrder: 'stroke fill'}}>
        {s.title}
      </div>
      <Arabic text={s.ar} delay={16} top={s.title.length > 18 ? 1240 : 1140} size={54} />
    </AbsoluteFill>
  );
};
