import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame} from 'remotion';
import {Background} from '../ui/Background';
import {clamp, ease, pop, sec} from '../ui/motion';
import {Arabic, Flash, GlitchText, SceneIn, StepLabel} from '../ui/Pieces';
import {C, F} from '../theme';
import {PortalScene} from '../types';

// A time portal: a neon tunnel of rings pours towards the centre, sparks get sucked in, and a
// big year counter rolls from one year to another as the narrator names the destination.

const CX = 540;
const CY = 840;

export const Portal: React.FC<{s: PortalScene}> = ({s}) => {
  const frame = useCurrentFrame();
  const open = ease(frame, 0, 18);
  const rollAt = sec(s.rollAt);
  const rollEnd = sec(s.rollEnd);
  const p = interpolate(frame, [rollAt, rollEnd], [0, 1], {...clamp, easing: (t) => t * t * (3 - 2 * t)});
  const year = Math.round(s.fromYear + (s.toYear - s.fromYear) * p);
  const rolling = frame >= rollAt && frame < rollEnd;
  const landed = frame >= rollEnd;
  const speed = 1 + 2.5 * (rolling ? 1 : 0) + (landed ? 0.6 : 0);
  const rings = 14;
  const colors = [C.pink, C.teal, C.magenta, C.gold];
  const title = pop(frame, sec(s.titleAt) - 2, 12, 0.5, 200);
  const glitch = interpolate(frame, [sec(s.titleAt), sec(s.titleAt) + 8], [1, 0], clamp);
  return (
    <AbsoluteFill>
      <SceneIn>
        <Background broll={s.broll} />
      </SceneIn>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 44%, rgba(20,0,40,0.35) 0%, rgba(0,0,0,0.85) 75%)'}} />
      <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, opacity: open}}>
        <defs>
          <radialGradient id="core" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#ffffff" stopOpacity={0.95} />
            <stop offset="0.35" stopColor={C.pink} stopOpacity={0.6} />
            <stop offset="1" stopColor={C.magenta} stopOpacity={0} />
          </radialGradient>
        </defs>
        {Array.from({length: rings}).map((_, i) => {
          // each ring is born small in the centre and grows outwards, fading: a tunnel rushing at you
          const phase = ((frame * 0.012 * speed + i / rings) % 1 + 1) % 1;
          const r = 30 + Math.pow(phase, 1.6) * 760;
          const o = Math.sin(phase * Math.PI) * 0.9;
          const rot = (frame * (i % 2 ? 0.6 : -0.8) * speed + i * 26) % 360;
          // glow = a wide faint stroke under a thin bright one (SVG blur filters are too slow per frame)
          const dash = i % 3 === 0 ? `${r * 0.6} ${r * 0.25}` : undefined;
          return (
            <g key={i} transform={`rotate(${rot} ${CX} ${CY})`} opacity={o}>
              <ellipse cx={CX} cy={CY} rx={r} ry={r * 0.62} fill="none" stroke={colors[i % colors.length]} strokeWidth={10 + phase * 26}
                opacity={0.22} strokeDasharray={dash} />
              <ellipse cx={CX} cy={CY} rx={r} ry={r * 0.62} fill="none" stroke={colors[i % colors.length]} strokeWidth={2 + phase * 8}
                strokeDasharray={dash} />
            </g>
          );
        })}
        {Array.from({length: 36}).map((_, i) => {
          // sparks spiralling into the centre
          const life = 40 + random(`pl${i}`) * 30;
          const t = (((frame * speed + random(`po${i}`) * life) % life) / life);
          const ang = random(`pa${i}`) * Math.PI * 2 + t * 2.4;
          const dist = (1 - t) * (420 + random(`pd${i}`) * 260);
          const x = CX + Math.cos(ang) * dist;
          const y = CY + Math.sin(ang) * dist * 0.62;
          return <circle key={`p${i}`} cx={x} cy={y} r={2 + 4 * (1 - t)} fill={colors[i % colors.length]} opacity={Math.sin(t * Math.PI)} />;
        })}
        <circle cx={CX} cy={CY} r={150 + 30 * Math.sin(frame / 5) + (landed ? 40 : 0)} fill="url(#core)" />
      </svg>
      <StepLabel step={s.step} label={s.label} />
      {s.sub ? (
        <div style={{position: 'absolute', top: 388, left: 0, right: 0, textAlign: 'center', fontFamily: F.mono, fontSize: 32, letterSpacing: 8,
          color: 'rgba(255,255,255,0.8)', opacity: ease(frame, 6, 16)}}>{s.sub}</div>
      ) : null}
      <div style={{position: 'absolute', top: 440, left: 0, right: 0, display: 'flex', justifyContent: 'center',
        opacity: Math.min(1, title * 1.5), transform: `scale(${interpolate(title, [0, 1], [1.6, 1])})`}}>
        <GlitchText text={s.title} size={150} color={C.pink} glitch={glitch} />
      </div>
      <div style={{position: 'absolute', top: 1150, left: 0, right: 0, textAlign: 'center', opacity: ease(frame, 8, 18)}}>
        <div style={{fontFamily: F.mono, fontSize: 30, letterSpacing: 10, color: 'rgba(255,255,255,0.7)'}}>{landed ? 'ARRIVED' : 'TRAVELLING TO'}</div>
        <div style={{fontFamily: F.display, fontSize: 210, lineHeight: 1, color: landed ? C.gold : '#fff', letterSpacing: 6,
          textShadow: `0 0 ${landed ? 50 : 20}px ${landed ? C.gold : C.pink}`, transform: `translateX(${rolling ? (random(`yx${frame}`) - 0.5) * 14 : 0}px)`}}>
          {year}
        </div>
      </div>
      <Flash at={rollEnd} length={10} color="#fff" strength={0.7} />
      <Arabic text={s.ar} delay={14} top={1420} size={52} />
    </AbsoluteFill>
  );
};
