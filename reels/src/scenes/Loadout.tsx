import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Background} from '../ui/Background';
import {clamp, ease, pop, sec} from '../ui/motion';
import {Arabic, Flash, SceneIn, StepLabel} from '../ui/Pieces';
import {C, F} from '../theme';
import {LoadoutScene} from '../types';

// An item wheel, drawn (not a screenshot), in two modes (times in seconds into the scene):
//   equip: a HOLD L1 chip and the wheel opens (`openAt`), R1 flips the tabs to ITEMS (`tabAt`), the
//          bottom-left slot (the vest) lights with an equip prompt (`pickAt`), then a health bar
//          gets its blue armor bar (`barAt`).
//   slot:  that one slot, close up: a vest card with a parachute card hidden behind it; `shareAt`
//          fans them out under a "1 SLOT" chip; `swapAt` presses R2 and the cards flip so the
//          parachute is on and the vest is off; `doneAt` stamps the done text.

const WX = 540;
const WY = 880;
const WR = 330;

const Vest: React.FC<{size: number; color: string}> = ({size, color}) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <path d="M30 10 L42 10 Q50 22 58 10 L70 10 L84 26 L80 90 Q50 98 20 90 L16 26 Z" fill={color} stroke="#0b0b0b" strokeWidth={4} strokeLinejoin="round" />
    <rect x={28} y={46} width={18} height={14} rx={2} fill="rgba(0,0,0,0.3)" />
    <rect x={54} y={46} width={18} height={14} rx={2} fill="rgba(0,0,0,0.3)" />
    <rect x={28} y={66} width={44} height={10} rx={2} fill="rgba(0,0,0,0.3)" />
  </svg>
);

const Chute: React.FC<{size: number; color: string}> = ({size, color}) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <path d="M8 44 Q50 -6 92 44 Q81 36 71 44 Q60 36 50 44 Q40 36 29 44 Q19 36 8 44 Z" fill={color} stroke="#0b0b0b" strokeWidth={4} strokeLinejoin="round" />
    <g stroke="#0b0b0b" strokeWidth={3}>
      <line x1={10} y1={44} x2={48} y2={78} /><line x1={30} y1={44} x2={49} y2={78} /><line x1={70} y1={44} x2={51} y2={78} /><line x1={90} y1={44} x2={52} y2={78} />
    </g>
    <rect x={42} y={76} width={16} height={18} rx={4} fill={color} stroke="#0b0b0b" strokeWidth={3} />
  </svg>
);

const Gun: React.FC<{size: number}> = ({size}) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <path d="M14 36 L84 36 L84 50 L46 50 L40 74 L26 74 L30 50 L14 50 Z" fill="rgba(255,255,255,0.85)" />
  </svg>
);

const Dot: React.FC<{size: number}> = ({size}) => (
  <svg width={size} height={size} viewBox="0 0 100 100"><circle cx={50} cy={50} r={22} fill="rgba(255,255,255,0.55)" /></svg>
);

// a controller shoulder / face button chip
const Btn: React.FC<{text: string; s: number; press?: number}> = ({text, s, press = 0}) => (
  <div style={{display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 96, height: 64, padding: '0 18px', borderRadius: '22px 22px 12px 12px',
    background: '#f4f4f0', color: '#0b0b0b', fontFamily: F.brand, fontSize: 38, letterSpacing: 1, boxShadow: `0 ${8 - 6 * press}px 0 #6b6b78`,
    transform: `translateY(${6 * press}px) scale(${s})`}}>{text}</div>
);

const Equip: React.FC<{s: LoadoutScene; frame: number}> = ({s, frame}) => {
  const openAt = sec(s.openAt ?? 0.3);
  const tabAt = sec(s.tabAt ?? 1.5);
  const pickAt = sec(s.pickAt ?? 3);
  const barAt = sec(s.barAt ?? 4);
  const open = pop(frame, openAt, 12, 0.6, 160);
  const items = frame >= tabAt;
  const picked = frame >= pickAt;
  const l1 = pop(frame, Math.max(0, openAt - 4), 9, 0.5, 220);
  const r1 = pop(frame, tabAt - 2, 9, 0.5, 220);
  const r1Press = interpolate(frame, [tabAt - 2, tabAt, tabAt + 4], [0, 1, 0], clamp);
  const armor = interpolate(frame, [barAt, barAt + 16], [0, 1], {...clamp, easing: (t) => 1 - Math.pow(1 - t, 3)});
  const bar = pop(frame, barAt - 2, 10, 0.5, 200);
  const glow = picked ? 0.6 + 0.4 * Math.sin((frame - pickAt) / 4) : 0;
  const segs = 8;
  // slot 5 (bottom-left) holds the vest on the ITEMS tab
  const VEST = 5;
  return (
    <>
      <div style={{position: 'absolute', top: 370, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 26, alignItems: 'center'}}>
        {frame >= openAt - 4 ? <Btn text="HOLD L1" s={l1} /> : null}
        {frame >= tabAt - 2 ? <Btn text="R1" s={r1} press={r1Press} /> : null}
      </div>
      <div style={{position: 'absolute', left: WX - WR - 20, top: WY - WR - 20, width: (WR + 20) * 2, height: (WR + 20) * 2, transform: `scale(${open})`, opacity: Math.min(1, open * 1.5)}}>
        <svg width={(WR + 20) * 2} height={(WR + 20) * 2} viewBox={`${-WR - 20} ${-WR - 20} ${(WR + 20) * 2} ${(WR + 20) * 2}`}>
          <circle r={WR} fill="rgba(10,10,16,0.82)" stroke="rgba(255,255,255,0.25)" strokeWidth={4} />
          {Array.from({length: segs}).map((_, i) => {
            const a0 = (i / segs) * Math.PI * 2 - Math.PI / 2 - Math.PI / segs;
            const a1 = a0 + (Math.PI * 2) / segs;
            const r0 = 120;
            const p = (a: number, r: number) => `${Math.cos(a) * r} ${Math.sin(a) * r}`;
            const hot = items && picked && i === VEST;
            return (
              <path key={i} d={`M${p(a0 + 0.02, r0)} L${p(a0 + 0.02, WR - 12)} A ${WR - 12} ${WR - 12} 0 0 1 ${p(a1 - 0.02, WR - 12)} L${p(a1 - 0.02, r0)} A ${r0} ${r0} 0 0 0 ${p(a0 + 0.02, r0)} Z`}
                fill={hot ? C.teal : 'rgba(255,255,255,0.07)'} opacity={hot ? 0.35 + 0.35 * glow : 1} stroke={hot ? C.teal : 'rgba(255,255,255,0.12)'} strokeWidth={hot ? 6 : 2} />
            );
          })}
          <circle r={112} fill="rgba(0,0,0,0.55)" stroke="rgba(255,255,255,0.18)" strokeWidth={3} />
        </svg>
        {/* icons in each segment */}
        {Array.from({length: segs}).map((_, i) => {
          const a = (i / segs) * Math.PI * 2 - Math.PI / 2;
          const x = WR + 20 + Math.cos(a) * 225;
          const y = WR + 20 + Math.sin(a) * 225;
          const size = 92;
          return (
            <div key={i} style={{position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size}}>
              {!items ? <Gun size={size} /> : i === VEST ? <Vest size={size} color={picked ? C.teal : '#9aa3b5'} /> : <Dot size={size} />}
            </div>
          );
        })}
        {/* centre label */}
        <div style={{position: 'absolute', left: 0, right: 0, top: WR + 20 - 40, textAlign: 'center', fontFamily: F.mono, fontSize: 28, letterSpacing: 3, color: '#fff'}}>
          {!items ? 'WEAPONS' : picked ? 'BODY ARMOR' : 'ITEMS'}
        </div>
        {picked ? (
          <div style={{position: 'absolute', left: 0, right: 0, top: WR + 20 + 6, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10,
            fontFamily: F.mono, fontSize: 24, letterSpacing: 2, color: C.teal}}>
            <span style={{width: 34, height: 34, borderRadius: 17, border: `3px solid ${C.teal}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 20}}>✕</span>
            EQUIP
          </div>
        ) : null}
      </div>
      {/* tabs over the wheel */}
      <div style={{position: 'absolute', top: WY - WR - 84, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 50, opacity: Math.min(1, open * 1.5),
        fontFamily: F.brand, fontSize: 34, letterSpacing: 3}}>
        <div style={{color: items ? 'rgba(255,255,255,0.45)' : '#fff', borderBottom: `6px solid ${items ? 'transparent' : C.green}`, paddingBottom: 6}}>WEAPONS</div>
        <div style={{color: items ? '#fff' : 'rgba(255,255,255,0.45)', borderBottom: `6px solid ${items ? C.green : 'transparent'}`, paddingBottom: 6}}>ITEMS</div>
      </div>
      {/* the health bar with the armor bar over it */}
      {frame >= barAt - 2 ? (
        <div style={{position: 'absolute', left: 170, right: 170, top: WY + WR + 50, display: 'flex', flexDirection: 'column', gap: 10, transform: `scale(${bar})`}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 14}}>
            <div style={{fontFamily: F.mono, fontSize: 24, letterSpacing: 3, color: '#7fb6ff', width: 110}}>ARMOR</div>
            <div style={{flex: 1, height: 22, background: 'rgba(255,255,255,0.15)', borderRadius: 4, overflow: 'hidden'}}>
              <div style={{width: `${armor * 100}%`, height: '100%', background: 'linear-gradient(90deg, #3b7bff, #7fb6ff)', boxShadow: '0 0 18px #3b7bff'}} />
            </div>
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: 14}}>
            <div style={{fontFamily: F.mono, fontSize: 24, letterSpacing: 3, color: '#7dff9a', width: 110}}>HEALTH</div>
            <div style={{flex: 1, height: 22, background: 'rgba(255,255,255,0.15)', borderRadius: 4, overflow: 'hidden'}}>
              <div style={{width: '82%', height: '100%', background: '#38d66b'}} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

const Slot: React.FC<{s: LoadoutScene; frame: number}> = ({s, frame}) => {
  const shareAt = sec(s.shareAt ?? 0.5);
  const swapAt = sec(s.swapAt ?? 3);
  const doneAt = sec(s.doneAt ?? 5);
  const inn = pop(frame, 2, 12, 0.6, 160);
  const fan = interpolate(frame, [shareAt, shareAt + 10], [0, 1], {...clamp, easing: (t) => 1 - Math.pow(1 - t, 3)});
  const flip = interpolate(frame, [swapAt, swapAt + 12], [0, 1], {...clamp, easing: (t) => t * t * (3 - 2 * t)});
  const swapped = flip >= 0.5;
  const chipAt = s.chipAt !== undefined ? sec(s.chipAt) : shareAt;
  const chip = pop(frame, chipAt, 10, 0.5, 220);
  const r2 = pop(frame, swapAt - 8, 9, 0.5, 220);
  const r2Press = interpolate(frame, [swapAt - 2, swapAt, swapAt + 5], [0, 1, 0], clamp);
  const done = pop(frame, doneAt, 10, 0.45, 220);
  const warnAt = s.warnAt !== undefined ? sec(s.warnAt) : 99999;
  const warn = pop(frame, warnAt, 10, 0.5, 220);
  const W = 380;
  const front = swapped ? 'chute' : 'vest';
  // the front card turns away (0 → 90°), then the other card turns in (90° → 0)
  const turn = flip < 0.5 ? flip * 2 * 90 : (1 - flip) * 2 * 90;
  const card = (kind: 'vest' | 'chute', on: boolean) => (
    <div style={{width: W, height: W, borderRadius: 28, background: on ? 'rgba(12,16,28,0.95)' : 'rgba(30,30,40,0.9)', border: `6px solid ${on ? C.teal : 'rgba(255,255,255,0.25)'}`,
      boxShadow: on ? `0 0 40px ${C.teal}88, 0 20px 0 rgba(0,0,0,0.5)` : '0 16px 0 rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10}}>
      {kind === 'vest' ? <Vest size={210} color={on ? C.teal : '#7b8294'} /> : <Chute size={210} color={on ? C.gold : '#7b8294'} />}
      <div style={{fontFamily: F.brand, fontSize: 40, letterSpacing: 3, color: on ? '#fff' : 'rgba(255,255,255,0.5)'}}>{kind === 'vest' ? 'BODY ARMOR' : 'PARACHUTE'}</div>
      <div style={{fontFamily: F.mono, fontSize: 26, letterSpacing: 4, color: on ? C.green : C.red}}>{on ? '● ON' : '○ OFF'}</div>
    </div>
  );
  return (
    <>
      <div style={{position: 'absolute', top: 380, left: 0, right: 0, textAlign: 'center', fontFamily: F.mono, fontSize: 28, letterSpacing: 5, color: 'rgba(255,255,255,0.8)',
        opacity: ease(frame, 4, 14)}}>{s.slotLabel ?? 'ITEMS · BOTTOM-LEFT SLOT'}</div>
      {/* the card behind */}
      <div style={{position: 'absolute', left: WX - W / 2 + 210 * fan, top: 470 - 20 * fan, transform: `scale(${inn * (0.86)}) rotate(${6 * fan}deg)`, opacity: fan}}>
        {card(front === 'vest' ? 'chute' : 'vest', false)}
      </div>
      {/* the card in front */}
      <div style={{position: 'absolute', left: WX - W / 2 - 130 * fan, top: 500, transform: `scale(${inn}) perspective(1200px) rotateY(${turn}deg)`}}>
        {card(front, true)}
      </div>
      {frame >= chipAt ? (
        <div style={{position: 'absolute', top: 930, left: 0, right: 0, display: 'flex', justifyContent: 'center', transform: `scale(${chip})`}}>
          <div style={{fontFamily: F.brand, fontSize: 44, letterSpacing: 3, color: '#0b0b0b', background: C.gold, padding: '10px 30px', borderRadius: 12, boxShadow: '0 10px 0 rgba(0,0,0,0.5)'}}>
            {s.shareText ?? '1 SLOT · ONLY ONE ON'}
          </div>
        </div>
      ) : null}
      {frame >= swapAt - 8 ? (
        <div style={{position: 'absolute', top: 1040, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 18}}>
          <Btn text="R2" s={r2} press={r2Press} />
          <div style={{fontFamily: F.mono, fontSize: 30, letterSpacing: 4, color: '#fff', opacity: r2}}>{s.swapText ?? 'SWAP'}</div>
        </div>
      ) : null}
      {frame >= warnAt && frame < doneAt ? (
        <div style={{position: 'absolute', top: 1160, left: 0, right: 0, display: 'flex', justifyContent: 'center', transform: `scale(${warn})`}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 16, fontFamily: F.brand, fontSize: 46, letterSpacing: 3, color: '#fff', background: C.red, padding: '10px 30px',
            borderRadius: 12, boxShadow: '0 10px 0 rgba(0,0,0,0.5)', opacity: 0.75 + 0.25 * Math.sin((frame - warnAt) / 3)}}>
            <span style={{fontSize: 44}}>⚠</span>{s.warnText ?? 'BEFORE YOU JUMP'}
          </div>
        </div>
      ) : null}
      {frame >= doneAt ? (
        <div style={{position: 'absolute', top: 1150, left: 0, right: 0, display: 'flex', justifyContent: 'center', transform: `scale(${done}) rotate(-3deg)`}}>
          <div style={{fontFamily: F.display, fontSize: 96, lineHeight: 1, color: C.green, border: `6px solid ${C.green}`, padding: '6px 30px', borderRadius: 14,
            background: 'rgba(8,8,12,0.75)', textShadow: '0 6px 0 #000'}}>{s.doneText ?? 'NOW JUMP'}</div>
        </div>
      ) : null}
      <Flash at={swapAt + 6} length={6} color={C.gold} strength={0.3} />
    </>
  );
};

export const Loadout: React.FC<{s: LoadoutScene}> = ({s}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <SceneIn>
        <Background broll={s.broll} />
      </SceneIn>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, rgba(6,6,12,0.55) 0%, rgba(6,6,12,0.88) 70%)'}} />
      {s.mode === 'equip' ? <Equip s={s} frame={frame} /> : <Slot s={s} frame={frame} />}
      <StepLabel step={s.step} label={s.label} />
      <Arabic text={s.ar} delay={16} top={1400} size={50} />
    </AbsoluteFill>
  );
};
