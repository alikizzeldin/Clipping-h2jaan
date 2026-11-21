import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Background} from '../ui/Background';
import {clamp, ease, pop, sec} from '../ui/motion';
import {Arabic, Flash, Particles, SceneIn, StepLabel} from '../ui/Pieces';
import {C, F} from '../theme';
import {AltScene, AppScene, BoostScene, ChainScene, ConsolesScene} from '../types';

const BLUE = '#3b8eea'; // the frame-gen app's accent

const Lock: React.FC<{size?: number; color?: string}> = ({size = 40, color = C.red}) => (
  <svg width={size} height={size} viewBox="0 0 40 40">
    <path d="M12 18 V13 a8 8 0 0 1 16 0 V18" stroke={color} strokeWidth={4.5} fill="none" strokeLinecap="round" />
    <rect x={7} y={18} width={26} height={19} rx={5} fill={color} />
    <circle cx={20} cy={27} r={3} fill="#0b0b14" />
  </svg>
);

// ---------- Every console: three cards, each stuck at 30 ----------
export const Consoles: React.FC<{s: ConsolesScene}> = ({s}) => {
  const frame = useCurrentFrame();
  const head = ease(frame, 2, 14);
  return (
    <AbsoluteFill>
      <SceneIn><Background broll={s.broll} /></SceneIn>
      <AbsoluteFill style={{background: 'rgba(5,4,12,0.55)'}} />
      <div style={{position: 'absolute', top: 300, left: 0, right: 0, textAlign: 'center', fontFamily: F.mono, fontWeight: 800, fontSize: 34,
        letterSpacing: 8, color: '#fff', opacity: head}}>{s.title}</div>
      <div style={{position: 'absolute', top: 380, left: 70, right: 70, display: 'flex', flexDirection: 'column', gap: 34}}>
        {s.items.map((it, i) => {
          const at = sec(it.at);
          const p = pop(frame, at - 2, 12, 0.55, 190);
          const shake = it.hot ? interpolate(frame, [at, at + 14], [14, 0], clamp) * Math.sin(frame * 2.2) : 0;
          return (
            <div key={i} style={{height: 210, borderRadius: 30, padding: '0 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: it.hot ? `linear-gradient(100deg, ${C.red}33, rgba(10,8,20,0.85))` : 'rgba(10,8,20,0.82)',
              border: `3px solid ${it.hot ? C.red : 'rgba(255,255,255,0.16)'}`, boxShadow: it.hot ? `0 0 50px ${C.red}55` : '0 20px 50px rgba(0,0,0,0.5)',
              opacity: Math.min(1, p * 1.5), transform: `translateX(${(1 - p) * (i % 2 ? 120 : -120) + shake}px)`}}>
              <div>
                <div style={{fontFamily: F.brand, fontWeight: 900, fontSize: 54, color: '#fff'}}>{it.name}</div>
                {it.hot ? <div style={{marginTop: 8, display: 'inline-block', fontFamily: F.mono, fontWeight: 800, fontSize: 24, letterSpacing: 4,
                  color: '#06060F', background: C.red, padding: '4px 12px', borderRadius: 6}}>EVEN THIS ONE</div> : null}
              </div>
              <div style={{display: 'flex', alignItems: 'center', gap: 18}}>
                <Lock size={52} />
                <div style={{fontFamily: F.display, fontSize: 140, lineHeight: 1, color: it.hot ? C.red : '#fff'}}>{s.value}</div>
                <div style={{fontFamily: F.mono, fontWeight: 800, fontSize: 30, color: 'rgba(255,255,255,0.7)', alignSelf: 'flex-end', marginBottom: 18}}>FPS</div>
              </div>
            </div>
          );
        })}
      </div>
      <Arabic text={s.ar} delay={14} top={1180} size={54} />
    </AbsoluteFill>
  );
};

// ---------- The cable chain: PS5 → capture card → PC ----------
const DeviceIcon: React.FC<{icon: 'console' | 'capture' | 'pc'; lit: number}> = ({icon, lit}) => {
  const glow = `drop-shadow(0 0 ${18 * lit}px ${C.teal})`;
  if (icon === 'console') {
    return (
      <svg width={150} height={170} viewBox="0 0 150 170" style={{filter: glow}}>
        <path d="M30 10 Q20 85 30 160 L52 160 Q44 85 52 10 Z" fill="#f2f2f5" />
        <rect x={52} y={14} width={46} height={142} rx={8} fill="#111" />
        <path d="M98 10 Q106 85 98 160 L120 160 Q130 85 120 10 Z" fill="#f2f2f5" />
        <rect x={70} y={40} width={10} height={4} rx={2} fill={lit > 0.5 ? C.teal : '#333'} />
      </svg>
    );
  }
  if (icon === 'capture') {
    return (
      <svg width={220} height={120} viewBox="0 0 220 120" style={{filter: glow}}>
        <rect x={10} y={20} width={200} height={80} rx={16} fill="#1a1a22" stroke="#444" strokeWidth={3} />
        <rect x={0} y={44} width={18} height={30} rx={3} fill="#777" />
        <rect x={202} y={48} width={18} height={22} rx={3} fill="#777" />
        <circle cx={180} cy={42} r={7} fill={lit > 0.5 ? '#ff3b3b' : '#442222'} />
        <text x={40} y={70} fill="#bbb" fontFamily="JetBrains Mono" fontWeight={800} fontSize={18}>HDMI IN</text>
      </svg>
    );
  }
  return (
    <svg width={260} height={190} viewBox="0 0 260 190" style={{filter: glow}}>
      <rect x={10} y={10} width={200} height={130} rx={10} fill="#111" stroke="#555" strokeWidth={4} />
      <rect x={20} y={20} width={180} height={110} rx={4} fill={lit > 0.5 ? '#1c3a52' : '#15151c'} />
      <rect x={95} y={140} width={30} height={26} fill="#333" />
      <rect x={70} y={166} width={80} height={10} rx={4} fill="#444" />
      <rect x={222} y={40} width={32} height={140} rx={6} fill="#1a1a22" stroke="#555" strokeWidth={3} />
      <circle cx={238} cy={60} r={5} fill={lit > 0.5 ? C.teal : '#333'} />
    </svg>
  );
};

export const Chain: React.FC<{s: ChainScene}> = ({s}) => {
  const frame = useCurrentFrame();
  const tops = [400, 720, 1010];
  const title = ease(frame, sec(s.devices[s.devices.length - 1].at) + 4, sec(s.devices[s.devices.length - 1].at) + 16);
  return (
    <AbsoluteFill>
      <SceneIn><Background broll={s.broll} /></SceneIn>
      <AbsoluteFill style={{background: 'rgba(5,4,12,0.7)'}} />
      <StepLabel step={s.step} label={s.label} />
      {s.links.map((label, i) => {
        const from = sec(s.devices[i].at);
        const to = sec(s.devices[i + 1].at);
        const grow = interpolate(frame, [from + 4, to], [0, 1], clamp);
        const y0 = tops[i] + 210;
        const y1 = tops[i + 1] - 6;
        const len = (y1 - y0) * grow;
        const pulse = ((frame - from) % 18) / 18;
        return (
          <div key={i}>
            <div style={{position: 'absolute', left: 536, top: y0, width: 8, height: len, borderRadius: 4, background: '#2a2a35', boxShadow: `0 0 12px ${C.teal}55`}} />
            {grow > 0.1 ? <div style={{position: 'absolute', left: 530, top: y0 + pulse * len - 10, width: 20, height: 20, borderRadius: 10, background: C.teal,
              boxShadow: `0 0 20px ${C.teal}`}} /> : null}
            <div style={{position: 'absolute', left: 570, top: y0 + (y1 - y0) / 2 - 20, fontFamily: F.mono, fontWeight: 800, fontSize: 26, letterSpacing: 4,
              color: C.teal, opacity: grow}}>{label}</div>
          </div>
        );
      })}
      {s.devices.map((d, i) => {
        const at = sec(d.at);
        const p = pop(frame, at - 2, 12, 0.55, 190);
        const lit = interpolate(frame, [at, at + 6], [0, 1], clamp);
        return (
          <div key={i} style={{position: 'absolute', top: tops[i], left: 140, right: 140, height: 210, borderRadius: 28, display: 'flex', alignItems: 'center',
            gap: 30, padding: '0 34px', background: 'rgba(10,10,22,0.85)', border: `3px solid ${lit > 0.5 ? C.teal : 'rgba(255,255,255,0.14)'}`,
            boxShadow: `0 0 ${40 * lit}px ${C.teal}44`, opacity: Math.min(1, p * 1.5), transform: `scale(${0.85 + 0.15 * p})`}}>
            <div style={{width: 260, display: 'flex', justifyContent: 'center'}}><DeviceIcon icon={d.icon} lit={lit} /></div>
            <div>
              <div style={{fontFamily: F.display, fontSize: 70, lineHeight: 1, color: '#fff', textTransform: 'uppercase'}}>{d.name}</div>
              {d.sub ? <div style={{marginTop: 8, fontFamily: F.mono, fontWeight: 800, fontSize: 24, letterSpacing: 3, color: 'rgba(255,255,255,0.6)'}}>{d.sub}</div> : null}
            </div>
          </div>
        );
      })}
      <div style={{position: 'absolute', top: 1270, left: 60, right: 60, textAlign: 'center', fontFamily: F.display, fontSize: 84, lineHeight: 1,
        color: '#fff', textTransform: 'uppercase', opacity: title, WebkitTextStroke: '7px #000', paintOrder: 'stroke fill'}}>{s.title}</div>
      <Arabic text={s.ar} delay={sec(s.devices[s.devices.length - 1].at) + 10} top={1380} size={52} />
    </AbsoluteFill>
  );
};

// ---------- The frame-gen app: the capture feed, then the real app window, then its settings ----------
export const FgApp: React.FC<{s: AppScene}> = ({s}) => {
  const frame = useCurrentFrame();
  const appAt = sec(s.app.at);
  const scale = sec(s.scaleAt);
  const screenIn = pop(frame, 0, 13, 0.6, 160);
  const appIn = pop(frame, appAt, 13, 0.6, 170);
  const price = pop(frame, sec(s.app.priceAt), 10, 0.5, 220);
  const panelIn = pop(frame, sec(s.rows[0].at) - 24, 13, 0.6, 160);
  const pressed = frame >= scale && frame < scale + 6;
  const scaled = frame >= scale + 4;
  const ripple = interpolate(frame, [scale, scale + 18], [0, 1], clamp);
  return (
    <AbsoluteFill style={{background: '#07070d'}}>
      <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 30%, ${BLUE}22 0%, transparent 60%)`}} />
      <StepLabel step={s.step} label={s.label} />
      {/* the PC monitor */}
      <div style={{position: 'absolute', top: 360, left: 60, width: 960, height: 560, borderRadius: 22, padding: 14, background: '#121218',
        boxShadow: `0 40px 90px rgba(0,0,0,0.7), 0 0 0 3px #2a2a33`, opacity: Math.min(1, screenIn * 1.4), transform: `scale(${0.92 + 0.08 * screenIn})`}}>
        <div style={{position: 'relative', width: '100%', height: '100%', borderRadius: 10, overflow: 'hidden', background: '#000'}}>
          {/* the capture viewer: the console picture at 30 FPS */}
          <div style={{position: 'absolute', inset: 0}}>
            <div style={{height: 40, background: '#1f1f26', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 10}}>
              {['#ff5f57', '#febc2e', '#28c840'].map((c) => <div key={c} style={{width: 14, height: 14, borderRadius: 7, background: c}} />)}
              <div style={{marginLeft: 12, fontFamily: F.mono, fontWeight: 700, fontSize: 20, color: 'rgba(255,255,255,0.75)'}}>{s.capture.title}</div>
            </div>
            <div style={{position: 'absolute', top: 40, left: 0, right: 0, bottom: 0, overflow: 'hidden'}}>
              <Background broll={s.broll} />
            </div>
            <div style={{position: 'absolute', top: 58, left: 16, fontFamily: F.mono, fontWeight: 800, fontSize: 30, color: scaled ? C.green : '#ffd84a',
              background: 'rgba(0,0,0,0.65)', padding: '4px 12px', borderRadius: 6, opacity: ease(frame, sec(s.capture.at), sec(s.capture.at) + 8)}}>
              {scaled ? `${s.capture.fps} → 60 FPS` : `${s.capture.fps} FPS`}
            </div>
          </div>
          {/* the real app window slides over it */}
          <div style={{position: 'absolute', inset: 0, transform: `translateY(${((1 - appIn) + ease(frame, scale + 6, scale + 18)) * 560}px)`, opacity: frame >= appAt ? 1 : 0,
            boxShadow: '0 -20px 60px rgba(0,0,0,0.6)'}}>
            <Img src={staticFile(s.app.src)} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top left'}} />
          </div>
          {scaled ? <AbsoluteFill style={{border: `4px solid ${C.green}`, borderRadius: 10, opacity: 1 - ripple * 0.6}} /> : null}
        </div>
        {/* price tag */}
        {frame >= sec(s.app.priceAt) - 1 ? (
          <div style={{position: 'absolute', right: -16, top: -36, padding: '10px 22px', borderRadius: 12, background: C.gold, color: '#06060F',
            fontFamily: F.display, fontSize: 64, lineHeight: 1, transform: `rotate(6deg) scale(${0.3 + 0.7 * price})`, boxShadow: '0 16px 40px rgba(0,0,0,0.6)'}}>
            {s.app.price}<span style={{fontFamily: F.mono, fontWeight: 800, fontSize: 22, marginLeft: 10, letterSpacing: 2}}>ON STEAM</span>
          </div>
        ) : null}
        <div style={{position: 'absolute', left: 30, bottom: -54, fontFamily: F.mono, fontWeight: 800, fontSize: 24, letterSpacing: 4, color: BLUE,
          opacity: ease(frame, appAt + 6, appAt + 16)}}>{s.app.name}</div>
      </div>
      {/* the settings that matter, big enough to read */}
      <div style={{position: 'absolute', top: 990, left: 90, right: 90, borderRadius: 22, padding: '22px 28px 26px', background: '#202024',
        border: '2px solid #33333b', boxShadow: '0 30px 70px rgba(0,0,0,0.6)', opacity: Math.min(1, panelIn * 1.4),
        transform: `translateY(${(1 - panelIn) * 120}px)`}}>
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14}}>
          <div style={{fontFamily: F.body, fontWeight: 800, fontSize: 36, color: '#fff'}}>Frame Generation</div>
          <div style={{position: 'relative', padding: '10px 34px', borderRadius: 10, background: BLUE, fontFamily: F.body, fontWeight: 800, fontSize: 30,
            color: '#fff', transform: `scale(${pressed ? 0.9 : 1})`, boxShadow: scaled ? `0 0 30px ${BLUE}` : 'none'}}>
            Scale
            {frame >= scale ? <div style={{position: 'absolute', inset: -10 - ripple * 30, borderRadius: 16 + ripple * 20, border: `3px solid ${BLUE}`, opacity: 1 - ripple}} /> : null}
          </div>
        </div>
        {s.rows.map((r, i) => {
          const at = sec(r.at);
          const p = interpolate(frame, [at, at + 8], [0, 1], clamp);
          const hit = frame >= at && frame < at + 26;
          return (
            <div key={i} style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', marginTop: 10, borderRadius: 12,
              background: hit ? `${BLUE}33` : '#2a2a30', border: `2px solid ${hit ? BLUE : 'transparent'}`}}>
              <div style={{fontFamily: F.body, fontWeight: 700, fontSize: 34, color: 'rgba(255,255,255,0.85)'}}>{r.label}</div>
              <div style={{position: 'relative', width: 330, height: 56, borderRadius: 10, background: '#18181c', border: '2px solid #3a3a42', overflow: 'hidden'}}>
                <div style={{position: 'absolute', left: 18, top: 0, lineHeight: '52px', fontFamily: F.body, fontWeight: 800, fontSize: 32, color: 'rgba(255,255,255,0.5)',
                  transform: `translateY(${-p * 56}px)`}}>{r.from}</div>
                <div style={{position: 'absolute', left: 18, top: 0, lineHeight: '52px', fontFamily: F.body, fontWeight: 800, fontSize: 32, color: '#fff',
                  transform: `translateY(${(1 - p) * 56}px)`}}>{r.value}</div>
                <div style={{position: 'absolute', right: 16, top: 12, fontFamily: F.body, fontSize: 24, color: 'rgba(255,255,255,0.5)'}}>⌄</div>
              </div>
            </div>
          );
        })}
      </div>
      <Flash at={scale} length={8} color={BLUE} strength={0.3} />
      <Arabic text={s.ar} delay={sec(s.rows[0].at)} top={1420} size={46} />
    </AbsoluteFill>
  );
};

// ---------- The payoff: 30 becomes 60, with every other frame generated ----------
export const Boost: React.FC<{s: BoostScene}> = ({s}) => {
  const frame = useCurrentFrame();
  const fromAt = sec(s.fromAt);
  const toAt = sec(s.toAt);
  const a = pop(frame, fromAt - 2, 12, 0.6, 180);
  const flip = interpolate(frame, [toAt, toAt + 8], [0, 1], clamp);
  const done = frame >= toAt;
  const slots = 10;
  return (
    <AbsoluteFill>
      <Background broll={s.broll} shake={done ? interpolate(frame, [toAt, toAt + 20], [18, 0], clamp) : 0} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 42%, rgba(0,0,0,0.25) 10%, rgba(0,0,0,0.8) 100%)'}} />
      {done ? <Particles x={140} y={420} w={800} h={700} count={50} seed="boost" speed={2.4} color={C.green} /> : null}
      <div style={{position: 'absolute', top: 380, left: 0, right: 0, height: 420, overflow: 'hidden', textAlign: 'center', opacity: Math.min(1, a * 1.5),
        transform: `scale(${0.7 + 0.3 * a})`}}>
        <div style={{position: 'absolute', left: 0, right: 0, top: 0, fontFamily: F.display, fontSize: 400, lineHeight: '420px', color: '#fff',
          transform: `translateY(${-flip * 420}px)`, textShadow: '0 10px 0 rgba(0,0,0,0.5)'}}>{s.fromValue}</div>
        <div style={{position: 'absolute', left: 0, right: 0, top: 0, fontFamily: F.display, fontSize: 400, lineHeight: '420px',
          background: `linear-gradient(180deg, #d7ffb0, ${C.green})`, WebkitBackgroundClip: 'text', color: 'transparent',
          filter: `drop-shadow(0 0 40px ${C.green}aa)`, transform: `translateY(${(1 - flip) * 420}px)`}}>{s.toValue}</div>
      </div>
      <div style={{position: 'absolute', top: 800, left: 0, right: 0, textAlign: 'center', fontFamily: F.mono, fontWeight: 800, fontSize: 44, letterSpacing: 12,
        color: done ? C.green : '#fff', opacity: ease(frame, fromAt, fromAt + 10)}}>FPS</div>
      {/* the frame strip: real frames, then generated ones slot in between */}
      <div style={{position: 'absolute', top: 920, left: 60, right: 60, display: 'flex', justifyContent: 'center', gap: 10, opacity: ease(frame, fromAt + 4, fromAt + 14)}}>
        {Array.from({length: slots}).map((_, i) => {
          const gen = i % 2 === 1;
          const show = gen ? interpolate(frame, [toAt + i * 2, toAt + i * 2 + 6], [0, 1], clamp) : 1;
          return (
            <div key={i} style={{width: gen ? 70 * show : 70, height: 110, borderRadius: 12, overflow: 'hidden',
              background: gen ? `linear-gradient(180deg, ${C.pink}, #7a1d63)` : 'linear-gradient(180deg, #fff, #c9cbd6)',
              boxShadow: gen ? `0 0 20px ${C.pink}88` : '0 8px 20px rgba(0,0,0,0.4)', opacity: gen ? show : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.mono, fontWeight: 800, fontSize: 22,
              color: gen ? '#fff' : '#111'}}>{gen ? 'GEN' : 'REAL'}</div>
          );
        })}
      </div>
      <div style={{position: 'absolute', top: 1070, left: 60, right: 60, textAlign: 'center', fontFamily: F.display, fontSize: 76, lineHeight: 1.05,
        textTransform: 'uppercase', color: '#fff', opacity: ease(frame, toAt + 10, toAt + 22), WebkitTextStroke: '7px #000', paintOrder: 'stroke fill'}}>
        {s.caption}
      </div>
      <Flash at={toAt} length={10} color={C.green} strength={0.6} />
      <Arabic text={s.ar} delay={toAt + 14} top={1250} size={54} />
    </AbsoluteFill>
  );
};

// ---------- The fallback: Remote Play ----------
export const Alt: React.FC<{s: AltScene}> = ({s}) => {
  const frame = useCurrentFrame();
  const q = ease(frame, 2, 12);
  const ans = pop(frame, sec(s.answerAt) - 2, 12, 0.55, 190);
  const tone = {good: C.green, warn: C.gold, bad: C.red};
  const bars = (frame / 3) % 4;
  return (
    <AbsoluteFill>
      <SceneIn><Background broll={s.broll} /></SceneIn>
      <AbsoluteFill style={{background: 'rgba(5,4,12,0.6)'}} />
      <div style={{position: 'absolute', top: 330, left: 0, right: 0, textAlign: 'center', fontFamily: F.mono, fontWeight: 800, fontSize: 40, letterSpacing: 6,
        color: '#fff', opacity: q}}>{s.question}</div>
      <div style={{position: 'absolute', top: 420, left: 60, right: 60, height: 560, borderRadius: 28, overflow: 'hidden', background: '#0d0d14',
        border: `3px solid ${BLUE}`, boxShadow: `0 0 60px ${BLUE}44`, opacity: Math.min(1, ans * 1.5), transform: `scale(${0.85 + 0.15 * ans})`}}>
        <div style={{height: 54, background: '#16161f', display: 'flex', alignItems: 'center', padding: '0 22px', gap: 14}}>
          <svg width={34} height={26} viewBox="0 0 34 26">
            {[0, 1, 2].map((i) => <path key={i} d={`M${17 - (i + 1) * 5} ${20 - i * 5} a${(i + 1) * 6} ${(i + 1) * 6} 0 0 1 ${(i + 1) * 10} 0`}
              stroke={i < bars ? BLUE : '#444'} strokeWidth={3.5} fill="none" />)}
            <circle cx={17} cy={22} r={3} fill={BLUE} />
          </svg>
          <div style={{fontFamily: F.mono, fontWeight: 700, fontSize: 22, color: 'rgba(255,255,255,0.8)'}}>
            {s.shot && frame < sec(s.shotUntil ?? 999) ? s.answer : 'STREAMING FROM YOUR PS5…'}</div>
        </div>
        <div style={{position: 'absolute', top: 54, left: 0, right: 0, bottom: 0}}>
          <div style={{position: 'absolute', inset: 0, filter: 'blur(1.5px) saturate(0.9)'}}><Background broll={s.broll} /></div>
          {s.shot && frame < sec(s.shotUntil ?? 999) ? (
            <div style={{position: 'absolute', inset: 0, overflow: 'hidden', background: '#000'}}>
              <Img src={staticFile(s.shot)} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'left top',
                transform: `scale(${interpolate(frame, [sec(s.answerAt), sec(s.shotUntil ?? 10)], [1.0, 1.12], clamp)})`, transformOrigin: '30% 30%'}} />
            </div>
          ) : null}
        </div>
        <div style={{position: 'absolute', bottom: 40, left: 0, right: 0, textAlign: 'center', fontFamily: F.display, fontSize: 130, lineHeight: 1, color: '#fff',
          WebkitTextStroke: '9px #000', paintOrder: 'stroke fill'}}>{s.answer}</div>
      </div>
      <div style={{position: 'absolute', top: 1030, left: 50, right: 50, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16}}>
        {s.chips.map((c, i) => {
          const p = pop(frame, sec(c.at) - 2, 10, 0.5, 230);
          return (
            <div key={i} style={{fontFamily: F.mono, fontWeight: 800, fontSize: 32, letterSpacing: 2, padding: '14px 22px', borderRadius: 14,
              color: '#06060F', background: tone[c.tone], boxShadow: `0 0 24px ${tone[c.tone]}88`, opacity: Math.min(1, p * 1.5),
              transform: `scale(${0.4 + 0.6 * p})`}}>{c.text}</div>
          );
        })}
      </div>
      <Arabic text={s.ar} delay={sec(s.answerAt) + 6} top={s.chips.length > 4 ? 1330 : 1170} size={50} />
    </AbsoluteFill>
  );
};
