import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame} from 'remotion';
import {Background} from '../ui/Background';
import {clamp, ease, pop, sec} from '../ui/motion';
import {Arabic, Flash, SceneIn, StepLabel} from '../ui/Pieces';
import {C, F} from '../theme';
import {StormScene} from '../types';

// A bunker TV breaks into a hurricane alert: a satellite map with a spinning storm (spiral cloud
// arms around an eye) rolls up over the coast, a red banner flashes, a ticker scrolls, rain streaks
// across the whole frame, and on `unlockAt` lightning cracks and a stamp lands on the screen.

const TV = {x: 80, y: 420, w: 920, h: 720};
const SCR = {x: TV.x + 40, y: TV.y + 40, w: TV.w - 80, h: TV.h - 110};

// one spiral cloud arm as an SVG path (r grows with the angle)
const arm = (cx: number, cy: number, turn: number, r0: number, k: number) => {
  const pts: string[] = [];
  for (let i = 0; i <= 40; i++) {
    const th = (i / 40) * Math.PI * 2.4;
    const r = r0 + k * th;
    pts.push(`${(cx + Math.cos(th + turn) * r).toFixed(1)},${(cy + Math.sin(th + turn) * r * 0.86).toFixed(1)}`);
  }
  return `M${pts.join(' L')}`;
};

export const Storm: React.FC<{s: StormScene}> = ({s}) => {
  const frame = useCurrentFrame();
  const alertAt = sec(s.alertAt);
  const unlockAt = s.unlockAt !== undefined ? sec(s.unlockAt) : 99999;
  const card = pop(frame, 3, 13, 0.6, 150);
  const alert = frame >= alertAt;
  const grow = interpolate(frame, [alertAt, alertAt + 26], [0.25, 1], {...clamp, easing: (t) => 1 - Math.pow(1 - t, 3)});
  const stormO = ease(frame, alertAt, alertAt + 12);
  const blink = Math.floor(frame / 8) % 2 === 0;
  const spin = -frame * 2.2;
  const cx = SCR.w * 0.62;
  const cy = SCR.h * 0.46;
  const rain = ease(frame, alertAt - 6, alertAt + 10);
  const stamp = pop(frame, unlockAt, 9, 0.5, 260);
  const tickerX = -((frame * 6) % 1400);
  const ticker = s.ticker ?? 'HURRICANE ALERT · LEONIDA · SEEK SHELTER · STAY INDOORS · ';
  return (
    <AbsoluteFill>
      <SceneIn>
        <Background broll={s.broll} />
      </SceneIn>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 42%, rgba(10,14,24,0.55) 0%, rgba(3,4,8,0.9) 75%)'}} />
      {/* the TV set */}
      <div style={{position: 'absolute', left: TV.x, top: TV.y, width: TV.w, height: TV.h, borderRadius: 40, opacity: Math.min(1, card * 1.4),
        transform: `scale(${0.9 + 0.1 * card})`, background: 'linear-gradient(160deg, #3a3631 0%, #1d1b18 60%, #121110 100%)', border: '4px solid #4d4842',
        boxShadow: `0 40px 90px rgba(0,0,0,0.75), 0 0 ${alert ? 80 : 20}px ${alert ? C.red + '55' : 'rgba(0,0,0,0)'}`}}>
        <div style={{position: 'absolute', left: SCR.x - TV.x, top: SCR.y - TV.y, width: SCR.w, height: SCR.h, borderRadius: 26, overflow: 'hidden',
          background: '#0a2238', boxShadow: 'inset 0 0 60px rgba(0,0,0,0.8)'}}>
          <svg width={SCR.w} height={SCR.h} style={{position: 'absolute', left: 0, top: 0}}>
            {/* sea grid and a coastline */}
            {Array.from({length: 9}).map((_, i) => (
              <line key={`g${i}`} x1={0} y1={i * 70} x2={SCR.w} y2={i * 70} stroke="#1c3b57" strokeWidth={2} />
            ))}
            {Array.from({length: 12}).map((_, i) => (
              <line key={`v${i}`} x1={i * 76} y1={0} x2={i * 76} y2={SCR.h} stroke="#1c3b57" strokeWidth={2} />
            ))}
            <path d={`M120 0 L360 0 L380 120 L430 230 L470 330 L500 470 L470 ${SCR.h} L300 ${SCR.h} L320 470 L270 360 L200 300 L140 240 L60 200 L0 190 L0 60 Z`}
              fill="#2f5d3a" stroke="#7fb08a" strokeWidth={3} />
            <text x={250} y={250} fill="#cfe8d4" fontFamily="'IBM Plex Mono Bold', monospace" fontSize={30} letterSpacing={6} opacity={0.9}>{s.region ?? 'LEONIDA'}</text>
            {/* the storm */}
            <g opacity={stormO} transform={`translate(${cx} ${cy}) scale(${grow}) translate(${-cx} ${-cy})`}>
              <circle cx={cx} cy={cy} r={230} fill="rgba(235,240,248,0.12)" />
              <g transform={`rotate(${spin} ${cx} ${cy})`}>
                {[0, 1, 2, 3].map((k) => (
                  <g key={k}>
                    <path d={arm(cx, cy, (k * Math.PI) / 2, 28, 26)} fill="none" stroke="rgba(240,244,250,0.35)" strokeWidth={46} strokeLinecap="round" />
                    <path d={arm(cx, cy, (k * Math.PI) / 2, 28, 26)} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth={12} strokeLinecap="round" />
                  </g>
                ))}
              </g>
              <circle cx={cx} cy={cy} r={22} fill="#0a2238" stroke="#fff" strokeWidth={5} />
            </g>
          </svg>
          {/* the red alert banner */}
          {alert ? (
            <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 92, background: blink ? C.red : '#7a0710', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 18, fontFamily: F.display, fontSize: 64, letterSpacing: 4, color: '#fff'}}>
              <span style={{fontSize: 54}}>⚠</span>{s.alert ?? 'HURRICANE ALERT'}
            </div>
          ) : (
            <div style={{position: 'absolute', left: 24, top: 20, fontFamily: F.mono, fontSize: 26, letterSpacing: 4, color: '#cfe8d4', opacity: 0.85}}>
              {s.channel ?? 'CH 01 · WEATHER'}
            </div>
          )}
          {/* the ticker */}
          {alert ? (
            <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 60, background: '#f2ede2', overflow: 'hidden'}}>
              <div style={{position: 'absolute', left: tickerX, top: 10, whiteSpace: 'nowrap', fontFamily: F.mono, fontSize: 32, letterSpacing: 3, color: '#111'}}>
                {ticker.repeat(4)}
              </div>
            </div>
          ) : null}
          {/* scanlines on the glass */}
          <div style={{position: 'absolute', inset: 0, background: 'repeating-linear-gradient(180deg, rgba(0,0,0,0.18) 0 2px, rgba(0,0,0,0) 2px 5px)'}} />
        </div>
        {/* knobs */}
        {[0, 1].map((i) => (
          <div key={i} style={{position: 'absolute', right: 70 + i * 90, bottom: 18, width: 40, height: 40, borderRadius: 20, background: '#2a2724', border: '3px solid #5a544c'}} />
        ))}
      </div>
      {/* the stamp */}
      {frame >= unlockAt ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: TV.y + 250, display: 'flex', justifyContent: 'center',
          transform: `rotate(-7deg) scale(${interpolate(stamp, [0, 1], [2.3, 1])})`, opacity: Math.min(1, stamp * 2)}}>
          <div style={{fontFamily: F.display, fontSize: 104, lineHeight: 1, letterSpacing: 4, color: C.gold, padding: '12px 36px',
            border: `10px solid ${C.gold}`, borderRadius: 18, background: 'rgba(8,6,2,0.78)', textShadow: '0 5px 0 #000'}}>{s.stamp ?? 'HURRICANES UNLOCKED'}</div>
        </div>
      ) : null}
      {/* rain over everything */}
      {rain > 0 ? (
        <AbsoluteFill style={{opacity: rain * 0.8}}>
          {Array.from({length: 70}).map((_, i) => {
            const speed = 60 + random(`rs${i}`) * 40;
            const x = random(`rx${i}`) * 1300 - 100 - ((frame * speed * 0.35) % 400);
            const y = ((frame * speed + random(`ry${i}`) * 2200) % 2200) - 200;
            return <div key={i} style={{position: 'absolute', left: x, top: y, width: 3, height: 70 + random(`rl${i}`) * 60, background: 'rgba(210,225,255,0.55)',
              transform: 'rotate(18deg)'}} />;
          })}
        </AbsoluteFill>
      ) : null}
      <Flash at={unlockAt} length={8} color="#dfe8ff" strength={0.85} />
      <Flash at={alertAt} length={6} color={C.red} strength={0.35} />
      <StepLabel step={s.step} label={s.label} />
      <Arabic text={s.ar} delay={16} top={1210} size={52} />
    </AbsoluteFill>
  );
};
