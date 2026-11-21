import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame} from 'remotion';
import {Background} from '../ui/Background';
import {clamp, ease, pop, sec} from '../ui/motion';
import {Arabic, Flash, GlitchText, SceneIn, Stamp} from '../ui/Pieces';
import {C, F} from '../theme';
import {ComboScene, DialScene, MenuScene, StatScene} from '../types';

// ------------------------------------------------------------------ dial
// A phone dialing an old cheat number, then the call failing.
export const Dial: React.FC<{s: DialScene}> = ({s}) => {
  const frame = useCurrentFrame();
  const typeFrom = sec(s.typeFrom);
  const fail = sec(s.failAt);
  const typed = Math.floor(interpolate(frame, [typeFrom, fail - 6], [0, s.number.length], clamp));
  const failed = frame >= fail;
  const phone = pop(frame, 2, 13, 0.7, 140);
  const shake = failed ? interpolate(frame, [fail, fail + 14], [16, 0], clamp) * Math.sin(frame * 2.2) : 0;
  return (
    <AbsoluteFill>
      <Background broll={s.broll} />
      <Flash at={0} length={8} />
      <div style={{position: 'absolute', top: 290, left: 60, right: 60, textAlign: 'center', fontFamily: F.brand, fontWeight: 900, fontSize: 52,
        letterSpacing: 8, color: '#fff', opacity: ease(frame, 2, 10), textShadow: '0 4px 20px #000'}}>{s.kicker}</div>
      <div style={{position: 'absolute', top: 360, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        {s.title.map((line, i) => {
          const p = pop(frame, 6 + i * 8, 10, 0.5, 220);
          return (
            <div key={i} style={{transform: `scale(${interpolate(p, [0, 1], [1.7, 1])})`, opacity: Math.min(1, p * 2)}}>
              <GlitchText text={line} size={Math.min(170, Math.floor(960 / (line.length * 0.47)))} color={i === s.title.length - 1 ? C.red : '#fff'}
                glitch={interpolate(frame, [6 + i * 8, 16 + i * 8], [1, 0], clamp)} />
            </div>
          );
        })}
      </div>
      <div style={{position: 'absolute', top: 760, left: 540 - 230, width: 460, height: 720, borderRadius: 60, padding: 16,
        background: 'linear-gradient(160deg, #3a3d48, #111318)', boxShadow: '0 40px 100px rgba(0,0,0,0.7), inset 0 0 0 3px #555a66',
        transform: `translateX(${shake}px) translateY(${(1 - phone) * 300}px)`, opacity: Math.min(1, phone * 1.5)}}>
        <div style={{width: '100%', height: '100%', borderRadius: 46, overflow: 'hidden', position: 'relative',
          background: failed ? 'linear-gradient(180deg, #4a0b12, #1a0508)' : 'linear-gradient(180deg, #0f1b2b, #0a0c16)'}}>
          <div style={{marginTop: 80, textAlign: 'center', fontFamily: F.mono, fontWeight: 800, fontSize: 46, color: '#fff', letterSpacing: 2, minHeight: 60}}>
            {s.number.slice(0, typed)}
            {!failed ? <span style={{opacity: Math.floor(frame / 8) % 2 ? 0 : 1, color: C.green}}>▌</span> : null}
          </div>
          <div style={{margin: '40px 50px 0', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18}}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((k, i) => {
              const lit = !failed && typed > 0 && s.number[typed - 1] === k && frame % 6 < 4;
              return (
                <div key={k} style={{height: 76, borderRadius: 38, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: F.body, fontWeight: 700, fontSize: 36, color: '#fff', background: lit ? C.green : 'rgba(255,255,255,0.1)'}}>{k}</div>
              );
            })}
          </div>
          {failed ? (
            <div style={{position: 'absolute', bottom: 50, left: 30, right: 30, textAlign: 'center', fontFamily: F.brand, fontWeight: 900, fontSize: 34,
              color: '#fff', background: C.red, borderRadius: 30, padding: '16px 0', boxShadow: `0 0 30px ${C.red}`}}>CALL FAILED</div>
          ) : null}
        </div>
      </div>
      {failed ? <Stamp text={s.stamp} delay={fail + 2} top={1050} rotate={-12} /> : null}
      <Arabic text={s.ar} delay={fail + 10} top={1520} size={54} />
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ stat
// One big number counting up.
export const Stat: React.FC<{s: StatScene}> = ({s}) => {
  const frame = useCurrentFrame();
  const at = sec(s.countAt);
  const p = interpolate(frame, [at - 18, at], [0, 1], {...clamp, easing: (t) => 1 - Math.pow(1 - t, 3)});
  const value = Math.round(s.value * p);
  const land = pop(frame, at, 9, 0.45, 260);
  return (
    <AbsoluteFill>
      <SceneIn><Background broll={s.broll} /></SceneIn>
      <Flash at={0} length={10} strength={1} />
      {frame >= at ? <Flash at={at} length={8} color={C.green} strength={0.5} /> : null}
      <div style={{position: 'absolute', top: 360, left: 0, right: 0, textAlign: 'center', fontFamily: F.brand, fontWeight: 900, fontSize: 60,
        letterSpacing: 6, color: '#fff', opacity: ease(frame, 4, 14), textShadow: '0 4px 20px #000'}}>{s.kicker}</div>
      <div style={{position: 'absolute', top: 430, left: 0, right: 0, textAlign: 'center', fontFamily: F.display, fontSize: 480, lineHeight: 1,
        transform: `scale(${frame >= at ? interpolate(land, [0, 1], [1.25, 1]) : 1})`,
        background: `linear-gradient(180deg, #ffffff, ${C.green} 60%, #2f9e3c)`, WebkitBackgroundClip: 'text', color: 'transparent',
        filter: `drop-shadow(0 0 ${frame >= at ? 50 : 10}px ${C.green}aa) drop-shadow(0 12px 0 #000)`}}>{value}</div>
      <div style={{position: 'absolute', top: 920, left: 0, right: 0, textAlign: 'center', fontFamily: F.display, fontSize: 130, color: '#fff',
        textTransform: 'uppercase', opacity: ease(frame, at - 6, at + 6), WebkitTextStroke: '9px #000', paintOrder: 'stroke fill'}}>{s.label}</div>
      {s.sub ? (
        <div style={{position: 'absolute', top: 1080, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: ease(frame, at + 6, at + 16)}}>
          <div style={{fontFamily: F.mono, fontWeight: 800, fontSize: 30, letterSpacing: 6, color: '#06060F', background: C.gold, padding: '8px 18px', borderRadius: 8}}>{s.sub}</div>
        </div>
      ) : null}
      <Arabic text={s.ar} delay={at + 10} top={1190} size={56} />
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ combo
// Phone out, L1 + R1 held, a code tapped on the D-pad.
export const Combo: React.FC<{s: ComboScene}> = ({s}) => {
  const frame = useCurrentFrame();
  const phoneAt = sec(s.phoneAt);
  const holdAt = sec(s.holdAt);
  const typeAt = sec(s.typeAt);
  const phone = pop(frame, phoneAt, 11, 0.6, 180);
  const held = interpolate(frame, [holdAt, holdAt + 4], [0, 1], clamp);
  const step = Math.floor((frame - typeAt) / 6);
  const shoulder = (label: string, x: number) => (
    <div style={{position: 'absolute', left: x, top: 0, width: 230, height: 96, borderRadius: '40px 40px 18px 18px',
      background: held ? `linear-gradient(180deg, ${C.teal}, #0b6f68)` : 'rgba(255,255,255,0.14)', border: `4px solid ${held ? '#d8fffb' : 'rgba(255,255,255,0.3)'}`,
      boxShadow: held ? `0 0 ${30 + 10 * Math.sin(frame / 4)}px ${C.teal}` : 'none', transform: `translateY(${held * 10}px)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.display, fontSize: 60, color: held ? '#06060F' : '#fff'}}>{label}</div>
  );
  const dirs: Record<string, [number, number]> = {'↑': [0, -1], '↓': [0, 1], '←': [-1, 0], '→': [1, 0]};
  const current = frame >= typeAt && step < s.sequence.length * 2 && step % 2 === 0 ? s.sequence[Math.floor(step / 2)] : '';
  return (
    <AbsoluteFill>
      <SceneIn><Background broll={s.broll} /></SceneIn>
      <div style={{position: 'absolute', top: 290, left: 60, right: 60, display: 'flex', alignItems: 'center', gap: 16, opacity: ease(frame, 2, 12)}}>
        <div style={{fontFamily: F.mono, fontWeight: 800, fontSize: 26, color: '#06060F', background: C.green, padding: '6px 14px', borderRadius: 6, letterSpacing: 2}}>HOW TO</div>
        <div style={{fontFamily: F.mono, fontWeight: 700, fontSize: 28, color: '#fff', letterSpacing: 5}}>{s.label}</div>
      </div>
      {/* 1. the phone */}
      <div style={{position: 'absolute', top: 400, left: 90, width: 170, height: 300, borderRadius: 30, background: 'linear-gradient(160deg, #3a3d48, #111318)',
        border: `4px solid ${frame >= phoneAt ? C.green : 'rgba(255,255,255,0.2)'}`, transform: `scale(${0.6 + 0.4 * phone}) rotate(${(1 - phone) * -20}deg)`,
        opacity: Math.max(0.25, phone), boxShadow: frame >= phoneAt ? `0 0 30px ${C.green}88` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: F.display, fontSize: 40, color: '#fff'}}>1</div>
      <div style={{position: 'absolute', top: 712, left: 60, width: 230, textAlign: 'center', fontFamily: F.mono, fontWeight: 800, fontSize: 24, color: '#fff', letterSpacing: 3, opacity: ease(frame, phoneAt, phoneAt + 8)}}>PHONE OUT</div>
      {/* 2. shoulder buttons */}
      <div style={{position: 'absolute', top: 430, left: 330, width: 680, height: 120}}>
        {shoulder('L1', 0)}
        {shoulder('R1', 450)}
        <div style={{position: 'absolute', left: 250, top: 18, width: 180, textAlign: 'center', fontFamily: F.display, fontSize: 70, color: '#fff', opacity: held}}>+</div>
      </div>
      <div style={{position: 'absolute', top: 590, left: 330, width: 680, textAlign: 'center', fontFamily: F.mono, fontWeight: 800, fontSize: 26, letterSpacing: 4,
        color: C.teal, opacity: held}}>HOLD BOTH · XBOX: {s.xbox}</div>
      {/* 3. the D-pad */}
      <div style={{position: 'absolute', top: 700, left: 540 - 150, width: 300, height: 300, opacity: ease(frame, typeAt - 6, typeAt + 4)}}>
        {Object.entries(dirs).map(([arrow, [dx, dy]]) => {
          const lit = current === arrow;
          return (
            <div key={arrow} style={{position: 'absolute', left: 105 + dx * 100, top: 105 + dy * 100, width: 90, height: 90, borderRadius: 14,
              background: lit ? C.orange : 'rgba(255,255,255,0.16)', boxShadow: lit ? `0 0 30px ${C.orange}` : 'none', transform: `scale(${lit ? 0.9 : 1})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.display, fontSize: 56, color: lit ? '#06060F' : '#fff'}}>{arrow}</div>
          );
        })}
        <div style={{position: 'absolute', left: 105, top: 105, width: 90, height: 90, background: 'rgba(255,255,255,0.16)'}} />
      </div>
      <div style={{position: 'absolute', top: 1020, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 10}}>
        {s.sequence.map((a, i) => (
          <div key={i} style={{width: 64, height: 64, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: F.display, fontSize: 40, color: '#fff', background: 'rgba(0,0,0,0.5)', border: `2px solid ${C.orange}`,
            opacity: frame >= typeAt + i * 12 ? 1 : 0.15}}>{a}</div>
        ))}
      </div>
      <div style={{position: 'absolute', top: 1110, left: 40, right: 40, textAlign: 'center', fontFamily: F.display, fontSize: Math.min(92, Math.floor(960 / (s.title.length * 0.5))), color: '#fff', lineHeight: 1,
        whiteSpace: 'nowrap', textTransform: 'uppercase', opacity: ease(frame, typeAt, typeAt + 10), WebkitTextStroke: '8px #000', paintOrder: 'stroke fill'}}>{s.title}</div>
      <Arabic text={s.ar} delay={typeAt + 8} top={1230} size={52} />
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ menu
// A menu that scrolls to its far end, where a locked tab appears and opens.
export const Menu: React.FC<{s: MenuScene}> = ({s}) => {
  const frame = useCurrentFrame();
  const reveal = sec(s.revealAt);
  const unlock = sec(s.unlockAt);
  const scroll = interpolate(frame, [4, reveal], [0, 1], {...clamp, easing: (t) => t * t * (3 - 2 * t)});
  const tab = pop(frame, reveal, 11, 0.5, 220);
  const open = interpolate(frame, [unlock, unlock + 8], [0, 1], clamp);
  const panel = pop(frame, 2, 14, 0.7, 120);
  return (
    <AbsoluteFill>
      <SceneIn><Background broll={s.broll} /></SceneIn>
      <div style={{position: 'absolute', top: 360, left: 50, width: 980, height: 760, borderRadius: 30, overflow: 'hidden',
        background: 'rgba(8,8,22,0.86)', backdropFilter: 'blur(16px)', border: '2px solid rgba(255,255,255,0.16)',
        boxShadow: '0 30px 80px rgba(0,0,0,0.6)', opacity: Math.min(1, panel * 1.5), transform: `scale(${0.9 + 0.1 * panel})`}}>
        <div style={{padding: '34px 40px 0', fontFamily: F.mono, fontWeight: 800, fontSize: 40, letterSpacing: 10, color: '#fff'}}>{s.menu}</div>
        <div style={{margin: '26px 0 0', height: 4, background: 'rgba(255,255,255,0.12)'}} />
        <div style={{position: 'relative', height: 120, overflow: 'hidden'}}>
          <div style={{position: 'absolute', top: 26, left: 40 - scroll * 900, display: 'flex', gap: 22}}>
            {Array.from({length: 7}).map((_, i) => (
              <div key={i} style={{width: 190, height: 68, borderRadius: 12, background: 'rgba(255,255,255,0.08)', filter: 'blur(1.5px)'}} />
            ))}
          </div>
          {frame >= reveal ? (
            <div style={{position: 'absolute', top: 18, right: 40, width: 330, height: 84, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
              background: open ? `linear-gradient(90deg, ${C.green}, #2f9e3c)` : 'rgba(255,255,255,0.14)', border: `3px solid ${open ? '#e6ffd9' : C.gold}`,
              transform: `translateX(${(1 - tab) * 200}px) scale(${0.8 + 0.2 * tab})`, boxShadow: open ? `0 0 40px ${C.green}` : `0 0 20px ${C.gold}66`}}>
              <svg width={44} height={50} viewBox="0 0 44 50">
                <path d={`M10 22 V14 A12 12 0 0 1 34 14 V${22 - open * 10}`} fill="none" stroke={open ? '#06060F' : C.gold} strokeWidth={6}
                  transform={`translate(${open * 10} ${-open * 6})`} />
                <rect x={4} y={22} width={36} height={26} rx={6} fill={open ? '#06060F' : C.gold} />
              </svg>
              <span style={{fontFamily: F.display, fontSize: 56, color: open ? '#06060F' : '#fff'}}>{s.tab}</span>
            </div>
          ) : null}
        </div>
        <div style={{padding: '20px 40px', display: 'flex', flexDirection: 'column', gap: 18}}>
          {Array.from({length: 6}).map((_, i) => {
            const show = interpolate(frame, [unlock + 6 + i * 3, unlock + 12 + i * 3], [0, 1], clamp);
            return (
              <div key={i} style={{display: 'flex', alignItems: 'center', gap: 18, opacity: 0.25 + 0.75 * show}}>
                <div style={{width: 52, height: 52, borderRadius: 12, background: show > 0.5 ? `${C.green}55` : 'rgba(255,255,255,0.08)'}} />
                <div style={{flex: 1, height: 22, borderRadius: 11, background: `rgba(255,255,255,${0.08 + 0.1 * show})`, maxWidth: `${60 + random(`m${i}`) * 35}%`}} />
              </div>
            );
          })}
        </div>
        {s.note ? (
          <div style={{position: 'absolute', bottom: 28, left: 0, right: 0, textAlign: 'center', fontFamily: F.mono, fontWeight: 800, fontSize: 26,
            letterSpacing: 5, color: C.green, opacity: open}}>{s.note}</div>
        ) : null}
        {open > 0 && open < 1 ? Array.from({length: 18}).map((_, i) => {
          const ang = random(`sp${i}`) * Math.PI * 2;
          const d = open * (60 + random(`sd${i}`) * 140);
          return <div key={i} style={{position: 'absolute', top: 180 + Math.sin(ang) * d, right: 200 - Math.cos(ang) * d, width: 10, height: 10, borderRadius: 5, background: C.gold, boxShadow: `0 0 12px ${C.gold}`}} />;
        }) : null}
      </div>
      <Arabic text={s.ar} delay={unlock + 4} top={1170} size={54} />
    </AbsoluteFill>
  );
};
