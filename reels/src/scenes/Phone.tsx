import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame} from 'remotion';
import {Background} from '../ui/Background';
import {clamp, ease, pop, sec} from '../ui/motion';
import {Arabic, SceneIn} from '../ui/Pieces';
import {C, F} from '../theme';
import {PhoneScene} from '../types';

const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

// A phone banking app moving the whole balance into the account that is kept.
export const Phone: React.FC<{s: PhoneScene}> = ({s}) => {
  const frame = useCurrentFrame();
  const phone = pop(frame, 4, 14, 0.8, 120);
  const notice = pop(frame, sec(s.notice.at) - 2, 12, 0.6, 160);
  const move = sec(s.moveAt);
  const p = interpolate(frame, [move, move + 26], [0, 1], {...clamp, easing: (t) => t * t * (3 - 2 * t)});
  const done = ease(frame, move + 28, move + 38);
  const left = s.source.amount * (1 - p);
  const right = s.target.amount + s.source.amount * p;
  return (
    <AbsoluteFill>
      <SceneIn>
        <Background broll={s.broll} />
      </SceneIn>
      {/* mission notification */}
      <div
        style={{
          position: 'absolute', top: 290, left: 70, right: 70, borderRadius: 26, padding: '22px 28px', display: 'flex', gap: 22, alignItems: 'center',
          background: 'rgba(20,10,16,0.88)', border: `2px solid ${C.red}AA`, boxShadow: `0 0 40px ${C.red}55`,
          transform: `translateY(${(1 - notice) * -260}px)`, opacity: Math.min(1, notice * 1.5),
        }}
      >
        <div style={{width: 14, alignSelf: 'stretch', borderRadius: 7, background: C.red}} />
        <div>
          <div style={{fontFamily: F.mono, fontWeight: 800, fontSize: 26, letterSpacing: 4, color: C.red}}>{s.notice.title}</div>
          <div style={{fontFamily: F.brand, fontWeight: 800, fontSize: 40, color: '#fff', marginTop: 6}}>{s.notice.text}</div>
        </div>
      </div>
      {/* the phone */}
      <div
        style={{
          position: 'absolute', top: 520, left: 540 - 290, width: 580, height: 900, borderRadius: 70, padding: 18,
          background: 'linear-gradient(160deg, #3a3d48, #111318)', boxShadow: '0 40px 100px rgba(0,0,0,0.7), inset 0 0 0 3px #555a66',
          transform: `perspective(1600px) rotateY(${(1 - phone) * -30}deg) translateY(${(1 - phone) * 300}px)`, opacity: Math.min(1, phone * 1.5),
        }}
      >
        <div style={{width: '100%', height: '100%', borderRadius: 54, overflow: 'hidden', background: 'linear-gradient(180deg, #0f1b2b, #0a0c16)', position: 'relative'}}>
          <div style={{position: 'absolute', top: 16, left: '50%', width: 120, height: 30, marginLeft: -60, borderRadius: 15, background: '#000'}} />
          <div style={{padding: '78px 34px 0', fontFamily: F.brand, fontWeight: 900, fontSize: 44, color: '#fff'}}>
            {s.app}
            <div style={{fontFamily: F.mono, fontWeight: 600, fontSize: 20, color: 'rgba(255,255,255,0.55)', letterSpacing: 3, marginTop: 6}}>TRANSFER</div>
          </div>
          {[{a: s.source, v: left, tone: C.red}, {a: s.target, v: right, tone: C.green}].map(({a, v, tone}, i) => (
            <div
              key={i}
              style={{
                margin: i ? '120px 30px 0' : '36px 30px 0', padding: '24px 28px', borderRadius: 26,
                background: i ? 'linear-gradient(135deg, rgba(140,255,90,0.22), rgba(30,242,224,0.12))' : 'rgba(255,255,255,0.07)',
                border: `2px solid ${i && p > 0.98 ? C.green : 'rgba(255,255,255,0.12)'}`,
              }}
            >
              <div style={{fontFamily: F.mono, fontWeight: 700, fontSize: 22, letterSpacing: 3, color: 'rgba(255,255,255,0.7)'}}>{a.label}</div>
              <div style={{fontFamily: F.mono, fontWeight: 800, fontSize: 64, color: p > 0 ? tone : '#fff', marginTop: 4}}>{money(v)}</div>
            </div>
          ))}
          {/* coins flying from the top account to the bottom one */}
          {Array.from({length: 14}).map((_, i) => {
            const t = interpolate(frame, [move + i * 1.6, move + i * 1.6 + 14], [0, 1], clamp);
            if (t <= 0 || t >= 1) return null;
            const x = 270 + (random(`cx${i}`) - 0.5) * 160 + Math.sin(t * Math.PI) * 60 * (i % 2 ? 1 : -1);
            const y = 330 + t * 210;
            return <div key={i} style={{position: 'absolute', left: x, top: y, width: 30, height: 30, borderRadius: 15, background: `radial-gradient(circle at 35% 35%, #fff6c2, ${C.gold})`, boxShadow: `0 0 16px ${C.gold}`}} />;
          })}
          <svg width={120} height={120} viewBox="0 0 120 120" style={{position: 'absolute', left: 230, top: 382}}>
            <path d="M60 20 V96 M34 70 L60 96 L86 70" stroke={p > 0 ? C.gold : 'rgba(255,255,255,0.3)'} strokeWidth={10} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div
            style={{
              position: 'absolute', left: 30, right: 30, bottom: 60, padding: '20px 0', borderRadius: 40, textAlign: 'center',
              fontFamily: F.brand, fontWeight: 800, fontSize: 32, color: '#06060F', background: C.green,
              transform: `scale(${0.8 + 0.2 * done})`, opacity: done, boxShadow: `0 0 30px ${C.green}88`,
            }}
          >
            {s.done}
          </div>
        </div>
      </div>
      <Arabic text={s.ar} delay={sec(s.moveAt) - 4} top={1450} size={54} />
    </AbsoluteFill>
  );
};
