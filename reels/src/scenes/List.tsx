import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Background} from '../ui/Background';
import {clamp, ease, pop, sec} from '../ui/motion';
import {Arabic, SceneIn} from '../ui/Pieces';
import {Icon} from '../ui/Icons';
import {C, F} from '../theme';
import {ListScene} from '../types';

// A checklist that fills in as the narrator names each item: red = lost, green = safe.
export const List: React.FC<{s: ListScene}> = ({s}) => {
  const frame = useCurrentFrame();
  const head = ease(frame, 2, 16);
  const arrow = ease(frame, 10, 30);
  const card = pop(frame, sec(s.cardAt ?? 0.2), 14, 0.7, 120);
  return (
    <AbsoluteFill>
      <SceneIn>
        <Background broll={s.broll} />
      </SceneIn>
      <div style={{position: 'absolute', top: 300, left: 60, right: 60, opacity: head, transform: `translateY(${(1 - head) * -20}px)`}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 18}}>
          <div style={{fontFamily: F.mono, fontWeight: 800, fontSize: 26, color: '#fff', background: C.red, padding: '6px 14px', borderRadius: 6, letterSpacing: 2, boxShadow: `0 0 20px ${C.red}88`}}>
            {s.chip}
          </div>
          <div style={{fontFamily: F.mono, fontWeight: 700, fontSize: 28, color: '#fff', letterSpacing: 5}}>{s.label}</div>
        </div>
        {s.fromLabel && s.toLabel ? (
          <div style={{display: 'flex', alignItems: 'center', gap: 22, marginTop: 30}}>
            <div style={{fontFamily: F.display, fontSize: 84, color: '#fff', textShadow: '0 4px 20px #000'}}>{s.fromLabel}</div>
            <svg width={200} height={40} viewBox="0 0 200 40">
              <path d={`M0 20 H${190 * arrow}`} stroke={C.red} strokeWidth={8} strokeLinecap="round" />
              {arrow > 0.95 ? <path d="M168 4 L192 20 L168 36" stroke={C.red} strokeWidth={8} fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}
            </svg>
            <div style={{fontFamily: F.display, fontSize: 84, color: C.red, opacity: arrow, textShadow: `0 0 30px ${C.red}88`}}>{s.toLabel}</div>
          </div>
        ) : null}
      </div>
      <div
        style={{
          position: 'absolute', top: 1010, left: 60, width: 960, borderRadius: 32, padding: '18px 34px',
          background: 'rgba(8,8,22,0.78)', backdropFilter: 'blur(16px)', border: '2px solid rgba(255,255,255,0.14)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.6)', opacity: Math.min(1, card * 1.4), transform: `translateY(${(1 - card) * 80}px)`,
        }}
      >
        {s.items.map((item, i) => {
          const at = sec(item.at) - 3;
          const show = ease(frame, at, at + 10);
          const stamp = pop(frame, at + 6, 9, 0.45, 260);
          const strike = item.ok || item.alert ? 0 : interpolate(frame, [at + 6, at + 16], [0, 1], clamp);
          const tone = item.ok ? C.green : C.red;
          const shown = frame >= at;
          return (
            <div
              key={i}
              style={{
                display: 'flex', alignItems: 'center', gap: 24, height: 132,
                borderTop: i ? '1px solid rgba(255,255,255,0.1)' : 'none', opacity: shown ? 0.35 + 0.65 * show : 0.25,
              }}
            >
              <Icon name={item.icon} color={shown ? tone : 'rgba(255,255,255,0.5)'} />
              <div style={{position: 'relative', flex: 1}}>
                <div style={{fontFamily: F.brand, fontWeight: 800, fontSize: 40, color: '#fff', lineHeight: 1.1}}>{item.text}</div>
                <div style={{position: 'absolute', left: 0, top: '50%', height: 6, width: `${strike * 100}%`, background: C.red, borderRadius: 3, boxShadow: `0 0 12px ${C.red}`}} />
              </div>
              {shown ? (
                <div
                  style={{
                    fontFamily: F.mono, fontWeight: 800, fontSize: 30, letterSpacing: 3, color: item.ok ? '#06060F' : '#fff',
                    background: tone, padding: '8px 18px', borderRadius: 10, boxShadow: `0 0 24px ${tone}88`,
                    transform: `scale(${interpolate(stamp, [0, 1], [2.2, 1])}) rotate(${item.ok ? 0 : -6}deg)`, opacity: Math.min(1, stamp * 2),
                  }}
                >
                  {item.status}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <Arabic text={s.ar} delay={sec(s.arAt ?? 1.2)} top={620} size={56} />
    </AbsoluteFill>
  );
};
