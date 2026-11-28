import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame} from 'remotion';
import {Background} from '../ui/Background';
import {clamp, ease, pop, sec} from '../ui/motion';
import {Arabic, Flash, SceneIn, StepLabel} from '../ui/Pieces';
import {C, F} from '../theme';
import {SwitchwheelScene} from '../types';

// The character switch wheel, drawn (times in seconds into the scene).
//   lock:   a side-case card pops (`cardAt`), gets a COMPLETE stamp (`doneAt`) and a chapter chip
//           (`chapterAt`); the wheel opens (`wheelAt`) with two portraits; one greys out under a
//           padlock (`greyAt`); the selector tries it and bounces red (`tryAt`); a STORY bar stops
//           (`stopAt`).
//   unlock: the wheel starts with that portrait grey; a LOAD chip fills a bar (`loadAt`), then the
//           colour comes back, the padlock drops and a tick lands (`fixAt`).

const WX = 540;
const WY = 980;
const WR = 270;
const PR = 112;

const Portrait: React.FC<{x: number; name: string; color: string; grey: number; hot: number; shake: number; lock: number; drop: number}> = ({x, name, color, grey, hot, shake, lock, drop}) => (
  <div style={{position: 'absolute', left: x - PR + shake, top: WY - PR - 30, width: PR * 2, height: PR * 2 + 80}}>
    <div style={{width: PR * 2, height: PR * 2, borderRadius: PR, overflow: 'hidden', position: 'relative', border: `8px solid ${hot > 0 ? (hot > 1 ? C.red : '#fff') : 'rgba(255,255,255,0.35)'}`,
      boxShadow: hot > 0 ? `0 0 40px ${hot > 1 ? C.red : '#ffffff'}88` : 'none', filter: `grayscale(${grey}) brightness(${1 - 0.45 * grey})`}}>
      <div style={{position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 30%, ${color} 0%, ${color}aa 45%, #12121a 100%)`}} />
      {/* a head-and-shoulders silhouette */}
      <svg width={PR * 2} height={PR * 2} viewBox="0 0 200 200" style={{position: 'absolute', left: 0, top: 0}}>
        <circle cx={100} cy={82} r={38} fill="rgba(10,10,16,0.85)" />
        <path d="M30 200 Q36 128 100 124 Q164 128 170 200 Z" fill="rgba(10,10,16,0.85)" />
      </svg>
    </div>
    <div style={{marginTop: 14, textAlign: 'center', fontFamily: F.brand, fontSize: 40, letterSpacing: 3, color: grey > 0.5 ? 'rgba(255,255,255,0.45)' : '#fff'}}>{name}</div>
    {lock > 0 ? (
      <div style={{position: 'absolute', left: PR - 44, top: PR - 54 + drop * 160, transform: `scale(${lock}) rotate(${drop * 40}deg)`, opacity: 1 - drop}}>
        <svg width={88} height={100} viewBox="0 0 88 100">
          <path d="M22 44 V30 Q22 8 44 8 Q66 8 66 30 V44" fill="none" stroke="#f4f4f0" strokeWidth={10} />
          <rect x={8} y={42} width={72} height={52} rx={10} fill="#f4f4f0" stroke="#0b0b0b" strokeWidth={4} />
          <circle cx={44} cy={64} r={7} fill="#0b0b0b" />
          <rect x={41} y={66} width={6} height={14} fill="#0b0b0b" />
        </svg>
      </div>
    ) : null}
  </div>
);

const Ring: React.FC<{open: number}> = ({open}) => (
  <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, opacity: Math.min(1, open * 1.4)}}>
    <circle cx={WX} cy={WY - 30} r={WR * open} fill="rgba(8,8,14,0.78)" stroke="rgba(255,255,255,0.2)" strokeWidth={4} />
    <circle cx={WX} cy={WY - 30} r={WR * open - 26} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={30} />
    <line x1={WX} y1={WY - 30 - WR * open + 20} x2={WX} y2={WY - 30 + WR * open - 20} stroke="rgba(255,255,255,0.12)" strokeWidth={4} />
  </svg>
);

const Lock: React.FC<{s: SwitchwheelScene; frame: number}> = ({s, frame}) => {
  const cardAt = sec(s.cardAt ?? 0.4);
  const doneAt = sec(s.doneAt ?? 1.8);
  const chapterAt = sec(s.chapterAt ?? 2.6);
  const wheelAt = sec(s.wheelAt ?? 3.6);
  const greyAt = sec(s.greyAt ?? 4);
  const tryAt = sec(s.tryAt ?? 6.5);
  const stopAt = sec(s.stopAt ?? 7.5);
  const card = pop(frame, cardAt, 12, 0.6, 170);
  const stamp = pop(frame, doneAt, 8, 0.4, 260);
  const chip = pop(frame, chapterAt, 10, 0.5, 220);
  const open = pop(frame, wheelAt, 12, 0.6, 160);
  const grey = interpolate(frame, [greyAt, greyAt + 24], [0, 1], clamp);
  const lock = pop(frame, greyAt + 18, 9, 0.5, 240);
  const trying = frame >= tryAt;
  const fail = frame >= tryAt + 8;
  const shake = trying && frame < tryAt + 20 ? (random(`sw${frame}`) - 0.5) * 26 : 0;
  const no = pop(frame, tryAt + 8, 9, 0.5, 240);
  const bar = pop(frame, stopAt, 10, 0.5, 200);
  const fill = interpolate(frame, [stopAt, stopAt + 14], [0, 0.62], {...clamp, easing: (t) => 1 - Math.pow(1 - t, 3)});
  const subject = s.subject ?? 'JASON';
  const other = s.other ?? 'LUCIA';
  return (
    <>
      {/* the side-case card */}
      <div style={{position: 'absolute', left: 90, right: 90, top: 380, height: 190, borderRadius: 18, background: 'rgba(10,10,16,0.88)', border: '3px solid rgba(255,255,255,0.22)',
        padding: '22px 30px', transform: `scale(${card})`, opacity: Math.min(1, card * 1.4), boxShadow: '0 24px 60px rgba(0,0,0,0.5)'}}>
        <div style={{fontFamily: F.mono, fontSize: 26, letterSpacing: 5, color: C.gold}}>{s.caseLabel ?? 'SIDE CASE'}</div>
        <div style={{marginTop: 10, fontFamily: F.display, fontSize: 84, lineHeight: 1, color: '#fff', letterSpacing: 2}}>{s.caseTitle}</div>
        {frame >= chapterAt ? (
          <div style={{position: 'absolute', right: 24, top: 18, fontFamily: F.brand, fontSize: 32, letterSpacing: 2, color: '#0b0b0b', background: C.gold, padding: '6px 18px',
            borderRadius: 10, transform: `scale(${chip})`}}>{s.chapter ?? 'CHAPTER 3'}</div>
        ) : null}
        {frame >= doneAt ? (
          <div style={{position: 'absolute', right: 40, bottom: 18, fontFamily: F.display, fontSize: 58, letterSpacing: 3, color: C.green, border: `5px solid ${C.green}`, padding: '0 16px',
            borderRadius: 10, transform: `rotate(-8deg) scale(${2.2 - 1.2 * stamp})`, opacity: Math.min(1, stamp * 1.6)}}>{s.doneText ?? 'COMPLETE'}</div>
        ) : null}
      </div>
      {frame >= wheelAt ? (
        <>
          <Ring open={open} />
          <div style={{position: 'absolute', inset: 0, opacity: Math.min(1, open * 1.4)}}>
            <Portrait x={WX - 150} name={subject} color="#3b7bff" grey={grey} hot={fail ? 2 : trying ? 1 : 0} shake={shake} lock={lock} drop={0} />
            <Portrait x={WX + 150} name={other} color="#ff4fa0" grey={0} hot={!trying ? 1 : 0} shake={0} lock={0} drop={0} />
          </div>
        </>
      ) : null}
      {fail ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: WY + PR + 100, display: 'flex', justifyContent: 'center', transform: `scale(${no})`}}>
          <div style={{fontFamily: F.brand, fontSize: 42, letterSpacing: 3, color: '#fff', background: C.red, padding: '8px 26px', borderRadius: 12, boxShadow: '0 10px 0 rgba(0,0,0,0.5)'}}>
            ✕ {s.failText ?? "CAN'T SWITCH"}
          </div>
        </div>
      ) : null}
      {frame >= stopAt ? (
        <div style={{position: 'absolute', left: 120, right: 120, top: WY + PR + 190, display: 'flex', alignItems: 'center', gap: 16, transform: `scale(${bar})`}}>
          <div style={{fontFamily: F.mono, fontSize: 26, letterSpacing: 4, color: '#fff'}}>STORY</div>
          <div style={{flex: 1, height: 20, background: 'rgba(255,255,255,0.15)', borderRadius: 4, overflow: 'hidden', position: 'relative'}}>
            <div style={{width: `${fill * 100}%`, height: '100%', background: C.red}} />
          </div>
          <div style={{fontFamily: F.brand, fontSize: 30, letterSpacing: 2, color: C.red, opacity: Math.floor(frame / 8) % 2 ? 1 : 0.5}}>{s.stopText ?? 'STOPPED'}</div>
        </div>
      ) : null}
      <Flash at={tryAt + 8} length={6} color={C.red} strength={0.3} />
    </>
  );
};

const Unlock: React.FC<{s: SwitchwheelScene; frame: number}> = ({s, frame}) => {
  const loadAt = sec(s.loadAt ?? 0.6);
  const fixAt = sec(s.fixAt ?? 2);
  const open = pop(frame, 2, 12, 0.6, 160);
  const chip = pop(frame, loadAt, 10, 0.5, 220);
  const load = interpolate(frame, [loadAt, fixAt], [0, 1], clamp);
  const fixed = frame >= fixAt;
  const grey = interpolate(frame, [fixAt, fixAt + 12], [1, 0], clamp);
  const drop = interpolate(frame, [fixAt, fixAt + 14], [0, 1], {...clamp, easing: (t) => t * t});
  const tick = pop(frame, fixAt + 6, 9, 0.5, 240);
  const subject = s.subject ?? 'JASON';
  const other = s.other ?? 'LUCIA';
  return (
    <>
      {frame >= loadAt ? (
        <div style={{position: 'absolute', left: 110, right: 110, top: 390, transform: `scale(${chip})`, borderRadius: 16, background: 'rgba(10,10,16,0.88)',
          border: `3px solid ${C.teal}`, padding: '18px 26px', display: 'flex', flexDirection: 'column', gap: 12}}>
          <div style={{fontFamily: F.brand, fontSize: 40, letterSpacing: 3, color: '#fff'}}>{s.loadText ?? 'LOAD OLDER MANUAL SAVE'}</div>
          <div style={{height: 18, background: 'rgba(255,255,255,0.15)', borderRadius: 4, overflow: 'hidden'}}>
            <div style={{width: `${load * 100}%`, height: '100%', background: C.teal}} />
          </div>
        </div>
      ) : null}
      <Ring open={open} />
      <div style={{position: 'absolute', inset: 0, opacity: Math.min(1, open * 1.4)}}>
        <Portrait x={WX - 150} name={subject} color="#3b7bff" grey={grey} hot={fixed ? 1 : 0} shake={0} lock={1} drop={drop} />
        <Portrait x={WX + 150} name={other} color="#ff4fa0" grey={0} hot={0} shake={0} lock={0} drop={0} />
      </div>
      {fixed ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: WY + PR + 100, display: 'flex', justifyContent: 'center', transform: `scale(${tick})`}}>
          <div style={{fontFamily: F.brand, fontSize: 42, letterSpacing: 3, color: '#0b0b0b', background: C.green, padding: '8px 26px', borderRadius: 12, boxShadow: '0 10px 0 rgba(0,0,0,0.5)'}}>
            ✓ {s.fixText ?? 'SWITCH UNLOCKED'}
          </div>
        </div>
      ) : null}
      <Flash at={fixAt} length={7} color={C.green} strength={0.3} />
    </>
  );
};

export const Switchwheel: React.FC<{s: SwitchwheelScene}> = ({s}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <SceneIn>
        <Background broll={s.broll} />
      </SceneIn>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, rgba(6,6,12,0.55) 0%, rgba(6,6,12,0.86) 70%)', opacity: ease(frame, 0, 6)}} />
      {s.mode === 'lock' ? <Lock s={s} frame={frame} /> : <Unlock s={s} frame={frame} />}
      <StepLabel step={s.step} label={s.label} />
      <Arabic text={s.ar} delay={16} top={1420} size={50} />
    </AbsoluteFill>
  );
};
