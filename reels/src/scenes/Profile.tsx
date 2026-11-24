import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {noise2D} from '@remotion/noise';
import {Background} from '../ui/Background';
import {clamp, ease, pop, sec} from '../ui/motion';
import {Arabic, Flash, SceneIn, Stamp, StepLabel} from '../ui/Pieces';
import {C, F} from '../theme';
import {ProfileScene} from '../types';

// A scale between two ends (e.g. PROFESSIONAL → PSYCHO): dossier cards with their own
// mini gauge for each person, and/or one big gauge whose needle slides on the narration.

const scaleGradient = () => `linear-gradient(90deg, ${C.teal} 0%, ${C.gold} 55%, ${C.red} 100%)`;

const Gauge: React.FC<{value: number; width: number; height: number; glow?: number}> = ({value, width, height, glow = 0}) => (
  <div style={{position: 'relative', width, height}}>
    <div style={{position: 'absolute', inset: 0, borderRadius: height, background: scaleGradient(), boxShadow: `0 0 ${20 + glow * 40}px ${C.red}${glow > 0 ? 'aa' : '00'}`}} />
    {Array.from({length: 9}).map((_, i) => (
      <div key={i} style={{position: 'absolute', left: ((i + 1) / 10) * width - 1, top: height * 0.25, width: 2, height: height * 0.5, background: 'rgba(0,0,0,0.35)'}} />
    ))}
    <div
      style={{
        position: 'absolute', left: value * width - height * 0.45, top: -height * 0.55, width: height * 0.9, height: height * 2.1,
        borderRadius: height, background: '#fff', border: `${Math.max(3, height / 8)}px solid #0b0b12`, boxShadow: '0 6px 18px rgba(0,0,0,0.6)',
      }}
    />
  </div>
);

const Card: React.FC<{name: string; at: number; value: number; frame: number}> = ({name, at, value, frame}) => {
  const p = pop(frame, sec(at) - 2, 12, 0.6, 180);
  if (frame < sec(at) - 2) return <div style={{width: 440}} />;
  return (
    <div
      style={{
        width: 440, padding: '30px 30px 38px', borderRadius: 26, background: 'rgba(8,8,16,0.82)', border: '2px solid rgba(255,255,255,0.14)',
        boxShadow: '0 24px 60px rgba(0,0,0,0.55)', transform: `translateY(${(1 - p) * 80}px) scale(${0.9 + 0.1 * p})`, opacity: Math.min(1, p * 1.6),
      }}
    >
      <div style={{display: 'flex', alignItems: 'center', gap: 18}}>
        <div style={{width: 84, height: 84, borderRadius: 42, background: C.green, color: '#0b0b12', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: F.display, fontSize: 56}}>{name[0]}</div>
        <div>
          <div style={{fontFamily: F.mono, fontSize: 22, letterSpacing: 4, color: 'rgba(255,255,255,0.6)'}}>PROFILE</div>
          <div style={{fontFamily: F.display, fontSize: 64, lineHeight: 1, color: '#fff', textTransform: 'uppercase'}}>{name}</div>
        </div>
      </div>
      <div style={{marginTop: 34}}>
        <Gauge value={interpolate(p, [0, 1], [0, value])} width={380} height={22} />
      </div>
    </div>
  );
};

export const Profile: React.FC<{s: ProfileScene}> = ({s}) => {
  const frame = useCurrentFrame();
  const title = pop(frame, sec(s.titleAt) - 2, 12, 0.5, 200);
  const n = s.needle;
  const value = n ? interpolate(frame, [sec(n.startAt), sec(n.endAt)], [n.from, n.to], {...clamp, easing: (t) => t * t * (3 - 2 * t)}) : 0;
  const hit = n ? frame >= sec(n.endAt) : false;
  const shake = hit ? interpolate(frame, [sec(n!.endAt), sec(n!.endAt) + 20], [16, 0], clamp) : 0;
  const dx = noise2D('px', frame / 4, 0) * shake;
  const glow = hit ? 0.5 + 0.5 * Math.abs(Math.sin(frame / 5)) : 0;
  return (
    <AbsoluteFill>
      <SceneIn>
        <Background broll={s.broll} />
      </SceneIn>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0.25) 10%, rgba(0,0,0,0.7) 100%)'}} />
      <StepLabel step={s.step} label={s.label} />
      <div style={{position: 'absolute', top: 420, left: 60, right: 60, textAlign: 'center', fontFamily: F.display, fontSize: 118, lineHeight: 1,
        textTransform: 'uppercase', color: '#fff', WebkitTextStroke: '8px #000', paintOrder: 'stroke fill', opacity: Math.min(1, title * 1.5),
        transform: `scale(${0.8 + 0.2 * title})`}}>
        {s.title}
      </div>
      {s.people ? (
        <div style={{position: 'absolute', top: 640, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 40}}>
          {s.people.map((person, i) => <Card key={i} name={person.name} at={person.at} value={person.value} frame={frame} />)}
        </div>
      ) : null}
      {n ? (
        <div style={{position: 'absolute', top: 700, left: 70, right: 70, transform: `translateX(${dx}px)`, opacity: ease(frame, 4, 16)}}>
          <Gauge value={value} width={940} height={46} glow={glow} />
          <div style={{display: 'flex', justifyContent: 'space-between', marginTop: 46, fontFamily: F.mono, fontWeight: 800, fontSize: 34, letterSpacing: 3}}>
            <span style={{color: C.teal}}>{s.left}</span>
            <span style={{color: hit ? C.red : 'rgba(255,255,255,0.75)', textShadow: hit ? `0 0 ${20 * glow}px ${C.red}` : 'none'}}>{s.right}</span>
          </div>
        </div>
      ) : null}
      {s.flag ? <Stamp text={s.flag.text} delay={sec(s.flag.at)} top={940} color={C.red} rotate={-6} /> : null}
      {n ? <Flash at={sec(n.endAt)} length={9} color={C.red} strength={0.45} /> : null}
      <Arabic text={s.ar} delay={16} top={s.people ? 1150 : 1120} size={54} />
    </AbsoluteFill>
  );
};
