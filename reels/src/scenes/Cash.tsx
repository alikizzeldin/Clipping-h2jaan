import React from 'react';
import {AbsoluteFill, Img, interpolate, random, staticFile, useCurrentFrame} from 'remotion';
import {Background} from '../ui/Background';
import {clamp, ease, pop, sec} from '../ui/motion';
import {Arabic, Flash, SceneIn} from '../ui/Pieces';
import {C, F} from '../theme';
import {CashScene} from '../types';

const Bill: React.FC<{i: number; frame: number}> = ({i, frame}) => {
  const x = random(`bx${i}`) * 1080;
  const speed = 9 + random(`bs${i}`) * 9;
  const y = -200 + ((frame * speed + random(`bo${i}`) * 2200) % 2300);
  const rot = random(`br${i}`) * 360 + frame * (random(`bw${i}`) - 0.5) * 8;
  const flip = Math.cos(frame / (6 + random(`bf${i}`) * 6));
  return (
    <div
      style={{
        position: 'absolute', left: x, top: y, width: 150, height: 70, borderRadius: 6,
        transform: `rotate(${rot}deg) scaleY(${flip})`, background: 'linear-gradient(135deg, #8fd694, #2f7a3a)',
        border: '3px solid #cdeccc', boxShadow: '0 8px 20px rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: F.display, fontSize: 40, color: '#e7f7e4', opacity: 0.9,
      }}
    >
      $
    </div>
  );
};

// The optional fence lead-in: a stack of banded bundles is stamped (e.g. MARKED), then slides
// down into a buyer chip; it all clears away just before the payout lands.
const FenceLead: React.FC<{f: NonNullable<CashScene['fence']>; frame: number; end: number}> = ({f, frame, end}) => {
  const at = sec(f.at);
  const toAt = sec(f.toAt);
  const card = pop(frame, at, 12, 0.6, 160);
  const stamp = pop(frame, at + 6, 9, 0.5, 260);
  const slide = interpolate(frame, [toAt - 4, toAt + 12], [0, 1], {...clamp, easing: (t) => t * t * (3 - 2 * t)});
  const chip = pop(frame, toAt, 10, 0.5, 220);
  const out = ease(frame, end - 8, end);
  if (out >= 1) return null;
  return (
    <AbsoluteFill style={{opacity: 1 - out}}>
      <div style={{position: 'absolute', top: 420, left: 0, right: 0, display: 'flex', justifyContent: 'center',
        opacity: Math.min(1, card * 1.5) * (1 - slide),
        transform: `translateY(${slide * 520}px) scale(${(0.8 + 0.2 * card) * (1 - 0.6 * slide)})`}}>
        <div style={{position: 'relative', width: 620, height: 430}}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{position: 'absolute', left: 30 + (i % 2) * 24, top: 40 + i * 120, width: 540, height: 126, borderRadius: 14,
              background: 'linear-gradient(135deg, #8fd694, #2f7a3a)', border: '4px solid #cdeccc', boxShadow: '0 14px 30px rgba(0,0,0,0.55)'}}>
              <div style={{position: 'absolute', left: 230, top: 0, width: 80, height: '100%', background: '#e8dcb0', borderLeft: '3px solid #b9a970',
                borderRight: '3px solid #b9a970'}} />
              <div style={{position: 'absolute', left: 40, top: 18, fontFamily: F.display, fontSize: 80, color: '#e7f7e4', lineHeight: 1}}>$</div>
              <div style={{position: 'absolute', right: 40, top: 18, fontFamily: F.display, fontSize: 80, color: '#e7f7e4', lineHeight: 1}}>$</div>
            </div>
          ))}
          {frame >= at + 6 ? (
            <div style={{position: 'absolute', left: 0, right: 0, top: 150, display: 'flex', justifyContent: 'center',
              transform: `rotate(-11deg) scale(${interpolate(stamp, [0, 1], [2.2, 1])})`, opacity: Math.min(1, stamp * 2)}}>
              <div style={{fontFamily: F.display, fontSize: 130, lineHeight: 1, letterSpacing: 8, color: C.red, padding: '8px 34px',
                border: `10px solid ${C.red}`, borderRadius: 18, background: 'rgba(20,0,4,0.55)', textShadow: '0 4px 0 #000'}}>{f.stamp}</div>
            </div>
          ) : null}
        </div>
      </div>
      {frame >= toAt ? (
        <div style={{position: 'absolute', top: 960, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center',
          transform: `scale(${chip})`}}>
          {f.label ? (
            <div style={{fontFamily: F.brand, fontWeight: 900, fontSize: 46, letterSpacing: 10, color: '#fff', marginBottom: 18,
              textShadow: '0 3px 14px #000'}}>{f.label}</div>
          ) : null}
          <div style={{fontFamily: F.display, fontSize: 120, lineHeight: 1, letterSpacing: 6, color: '#fff', padding: '18px 54px', borderRadius: 26,
            background: 'rgba(6,6,15,0.8)', border: `6px solid ${C.gold}`, boxShadow: `0 0 50px ${C.gold}88`}}>{f.to}</div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

// Proof from the game first (a screenshot with the key lines marked), then the payout.
export const Cash: React.FC<{s: CashScene}> = ({s}) => {
  const frame = useCurrentFrame();
  const proof = s.proof;
  const pIn = proof ? pop(frame, sec(proof.at), 13, 0.7, 140) : 0;
  const pOut = proof ? ease(frame, sec(proof.until) - 6, sec(proof.until) + 4) : 1;
  const amountAt = sec(s.amountAt);
  const amount = pop(frame, amountAt, 10, 0.5, 200);
  const repeatAt = s.repeatAt !== undefined ? sec(s.repeatAt) : 99999;
  const rep = pop(frame, repeatAt, 10, 0.5, 200);
  return (
    <AbsoluteFill>
      <SceneIn>
        <Background broll={s.broll} />
      </SceneIn>
      {frame >= amountAt ? Array.from({length: 22}).map((_, i) => <Bill key={i} i={i} frame={frame - amountAt} />) : null}
      {s.fence ? <FenceLead f={s.fence} frame={frame} end={amountAt} /> : null}
      {proof && pOut < 1 ? (
        <div
          style={{
            position: 'absolute', top: 380, left: 60, width: 960, opacity: Math.min(1, pIn * 1.5) * (1 - pOut),
            transform: `perspective(1600px) rotateX(${(1 - pIn) * 30}deg) scale(${(0.85 + 0.15 * pIn) * (1 - 0.15 * pOut)})`,
          }}
        >
          <div style={{fontFamily: F.mono, fontWeight: 800, fontSize: 26, letterSpacing: 4, color: C.teal, marginBottom: 14}}>{proof.caption}</div>
          <div style={{position: 'relative', borderRadius: 24, overflow: 'hidden', border: `3px solid ${C.teal}88`, boxShadow: `0 30px 80px rgba(0,0,0,0.7), 0 0 50px ${C.teal}33`}}>
            <Img src={staticFile(proof.src)} style={{width: '100%', display: 'block'}} />
            {proof.highlights.map((hl, i) => {
              const at = sec(proof.at) + 10 + i * 12;
              const a = ease(frame, at, at + 10);
              const tone = hl.color === 'gold' ? C.gold : C.green;
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute', left: 8, right: 8, top: `${hl.y}%`, height: `${hl.h}%`, borderRadius: 10,
                    border: `5px solid ${tone}`, boxShadow: `0 0 24px ${tone}, inset 0 0 20px ${tone}55`, opacity: a,
                    transform: `scaleX(${0.6 + 0.4 * a})`,
                  }}
                />
              );
            })}
          </div>
        </div>
      ) : null}
      {frame >= amountAt ? (
        <>
          <Flash at={amountAt} length={8} color={C.gold} strength={0.5} />
          <div style={{position: 'absolute', top: 330, left: 0, right: 0, textAlign: 'center', fontFamily: F.brand, fontWeight: 900, fontSize: 52, color: '#fff', letterSpacing: 4, opacity: ease(frame, amountAt, amountAt + 10), textShadow: '0 4px 20px #000'}}>
            {s.title}
          </div>
          <div
            style={{
              position: 'absolute', top: 430, left: 0, right: 0, textAlign: 'center', fontFamily: F.display, fontSize: 300, lineHeight: 1,
              transform: `scale(${interpolate(amount, [0, 1], [2.2, 1])})`, opacity: Math.min(1, amount * 2),
              background: `linear-gradient(180deg, #eaffd9, ${C.green} 55%, #2f9e3c)`, WebkitBackgroundClip: 'text', color: 'transparent',
              filter: `drop-shadow(0 0 40px ${C.green}88) drop-shadow(0 10px 0 #000)`,
            }}
          >
            {s.amount}
          </div>
          <div style={{position: 'absolute', top: 760, left: 0, right: 0, textAlign: 'center', fontFamily: F.display, fontSize: 96, color: '#fff', textTransform: 'uppercase', opacity: ease(frame, amountAt + 6, amountAt + 16), WebkitTextStroke: '8px #000', paintOrder: 'stroke fill'}}>
            {s.per}
          </div>
        </>
      ) : null}
      {s.repeat && frame >= repeatAt ? (
        <div style={{position: 'absolute', top: 960, left: 0, right: 0, display: 'flex', justifyContent: 'center', transform: `scale(${rep})`}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 20, padding: '20px 44px', borderRadius: 60, background: `linear-gradient(90deg, ${C.pink}, ${C.orange})`, boxShadow: `0 0 40px ${C.pink}88`}}>
            <svg width={70} height={70} viewBox="0 0 70 70" style={{transform: `rotate(${(frame - repeatAt) * 9}deg)`}}>
              <path d="M58 35 A23 23 0 1 1 48 16" stroke="#fff" strokeWidth={8} fill="none" strokeLinecap="round" />
              <path d="M46 4 L50 18 L36 20" stroke="#fff" strokeWidth={8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div style={{fontFamily: F.display, fontSize: 92, color: '#fff', letterSpacing: 4}}>{s.repeat}</div>
          </div>
        </div>
      ) : null}
      <Arabic text={s.ar} delay={amountAt + 14} top={1180} size={58} />
    </AbsoluteFill>
  );
};
