import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Background} from '../ui/Background';
import {ease, pop, sec} from '../ui/motion';
import {Arabic, SceneIn, StepLabel} from '../ui/Pieces';
import {C, F} from '../theme';
import {ChatScene} from '../types';

const Pin: React.FC = () => (
  <svg width={44} height={54} viewBox="0 0 44 54">
    <path d="M22 52 C 8 34, 2 26, 2 18 A20 20 0 0 1 42 18 C 42 26, 36 34, 22 52 Z" fill={C.pink} />
    <circle cx={22} cy={18} r={8} fill="#fff" />
  </svg>
);

const Key: React.FC = () => (
  <svg width={54} height={40} viewBox="0 0 54 40">
    <circle cx={14} cy={20} r={11} fill="none" stroke={C.gold} strokeWidth={6} />
    <path d="M25 20 H50 M42 20 V30 M50 20 V28" stroke={C.gold} strokeWidth={6} strokeLinecap="round" />
  </svg>
);

// A messaging app on the phone: a chat from a contact, its messages arriving on the narrator's words.
export const Chat: React.FC<{s: ChatScene}> = ({s}) => {
  const frame = useCurrentFrame();
  const phone = pop(frame, 4, 13, 0.6, 140);
  return (
    <AbsoluteFill>
      <SceneIn>
        <Background broll={s.broll} />
      </SceneIn>
      <StepLabel step={s.step} label={s.label} />
      <div style={{position: 'absolute', top: 410, left: 0, right: 0, display: 'flex', justifyContent: 'center',
        opacity: Math.min(1, phone * 1.5), transform: `translateY(${(1 - phone) * 160}px) rotate(${(1 - phone) * -6}deg)`}}>
        <div style={{width: 600, height: 600, borderRadius: 64, padding: 16, background: '#0d0d12', border: '4px solid #3b3b48',
          boxShadow: '0 40px 90px rgba(0,0,0,0.7)'}}>
          <div style={{width: '100%', height: '100%', borderRadius: 50, overflow: 'hidden', background: 'linear-gradient(180deg, #121a2e, #0a0c16)'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 18, padding: '34px 30px 22px', background: 'rgba(255,255,255,0.06)',
              borderBottom: '2px solid rgba(255,255,255,0.08)'}}>
              <div style={{width: 72, height: 72, borderRadius: 36, background: '#2b2f45', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: F.display, fontSize: 44, color: 'rgba(255,255,255,0.7)'}}>?</div>
              <div>
                <div style={{fontFamily: F.brand, fontWeight: 800, fontSize: 36, color: '#fff'}}>{s.contact}</div>
                <div style={{fontFamily: F.mono, fontWeight: 700, fontSize: 22, color: C.green, letterSpacing: 2}}>{s.app}</div>
              </div>
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: 22, padding: '30px 28px'}}>
              {s.messages.map((m, i) => {
                const at = sec(m.at);
                const p = pop(frame, at, 11, 0.55, 200);
                if (frame < at) return null;
                return (
                  <div key={i} style={{alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 16, maxWidth: 500,
                    padding: '20px 26px', borderRadius: '30px 30px 30px 8px', background: '#22283d', border: `2px solid ${m.icon === 'pin' ? C.pink : C.gold}66`,
                    transform: `scale(${p})`, transformOrigin: 'left bottom', boxShadow: '0 10px 24px rgba(0,0,0,0.4)'}}>
                    {m.icon === 'pin' ? <Pin /> : m.icon === 'key' ? <Key /> : null}
                    <div style={{fontFamily: F.brand, fontWeight: 800, fontSize: 38, color: '#fff', lineHeight: 1.2}}>{m.text}</div>
                  </div>
                );
              })}
              {s.messages.every((m) => frame >= sec(m.at) + 10) ? null : (
                <div style={{alignSelf: 'flex-start', display: 'flex', gap: 10, padding: '18px 24px', borderRadius: 26, background: '#22283d',
                  opacity: ease(frame, 10, 18)}}>
                  {[0, 1, 2].map((k) => (
                    <div key={k} style={{width: 14, height: 14, borderRadius: 7, background: '#fff',
                      opacity: 0.3 + 0.7 * Math.abs(Math.sin((frame - k * 4) / 6))}} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <Arabic text={s.ar} delay={16} top={1060} size={52} />
    </AbsoluteFill>
  );
};
