import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {evolvePath} from '@remotion/paths';
import {Background} from '../ui/Background';
import {clamp, ease, pop, sec} from '../ui/motion';
import {Arabic, Flash, GlitchText, Particles} from '../ui/Pieces';
import {C, F, accent} from '../theme';
import {RevealScene} from '../types';

const BODY = 'M40 230 C 120 120, 200 300, 290 200 S 440 90, 520 160';

// A snake that strikes out of the dark: its body draws in, the head lunges, the tongue flicks.
const Snake: React.FC<{p: number; frame: number}> = ({p, frame}) => {
  const lunge = Math.sin(Math.min(1, p) * Math.PI) * 30;
  const tongue = Math.floor(frame / 5) % 2 === 0;
  const head = ease(frame, 0, 1) * p;
  return (
    <svg width={760} height={380} viewBox="0 0 640 320" style={{overflow: 'visible'}}>
      <path d={BODY} fill="none" stroke="#1d5a1f" strokeWidth={54} strokeLinecap="round" {...evolvePath(p, BODY)} />
      <path d={BODY} fill="none" stroke={C.green} strokeWidth={40} strokeLinecap="round" {...evolvePath(p, BODY)}
        style={{filter: `drop-shadow(0 0 18px ${C.green})`}} />
      <path d={BODY} fill="none" stroke="#1d5a1f" strokeWidth={8} strokeDasharray="6 22" strokeLinecap="round" opacity={0.8 * p} />
      {p > 0.92 ? (
        <g transform={`translate(${520 + lunge} 160) rotate(-20)`} opacity={head}>
          <ellipse cx={30} cy={0} rx={58} ry={38} fill={C.green} stroke="#1d5a1f" strokeWidth={6} />
          <circle cx={46} cy={-14} r={9} fill="#ffe14d" />
          <ellipse cx={47} cy={-14} rx={3} ry={8} fill="#06060F" />
          {tongue ? <path d="M86 6 L120 10 M120 10 L134 0 M120 10 L134 20" stroke={C.red} strokeWidth={6} strokeLinecap="round" /> : null}
        </g>
      ) : null}
    </svg>
  );
};

// A kitchen knife that spins in and lands with a glint.
const Knife: React.FC<{p: number; frame: number}> = ({p, frame}) => {
  const rot = interpolate(p, [0, 1], [-200, -28]);
  const shine = ((frame * 6) % 400) - 100;
  return (
    <svg width={640} height={300} viewBox="0 0 640 300" style={{overflow: 'visible', transform: `rotate(${rot}deg) scale(${0.6 + 0.4 * p})`}}>
      <defs>
        <linearGradient id="blade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.5" stopColor="#c9d3dd" />
          <stop offset="1" stopColor="#7d8a96" />
        </linearGradient>
        <clipPath id="bladeclip"><path d="M250 110 L600 120 Q620 150 580 175 L250 190 Z" /></clipPath>
      </defs>
      <rect x={40} y={118} width={200} height={64} rx={20} fill="#2b2118" stroke="#000" strokeWidth={4} />
      {[80, 130, 180].map((x) => <circle key={x} cx={x} cy={150} r={8} fill="#cfcfcf" />)}
      <rect x={232} y={104} width={24} height={92} rx={6} fill="#9aa4ad" />
      <path d="M250 110 L600 120 Q620 150 580 175 L250 190 Z" fill="url(#blade)" stroke="#5c6670" strokeWidth={4}
        style={{filter: `drop-shadow(0 0 22px ${C.red}88)`}} />
      <rect x={shine} y={90} width={40} height={120} fill="rgba(255,255,255,0.8)" clipPath="url(#bladeclip)" transform="skewX(-20)" />
    </svg>
  );
};

// The payoff: a line typed in the dark, then a slam with big words (no UFO; see Twist for that).
export const Reveal: React.FC<{s: RevealScene}> = ({s}) => {
  const frame = useCurrentFrame();
  const slam = sec(s.slamAt);
  const before = frame < slam;
  const color = accent(s.color ?? 'green');
  const typed = Math.floor(interpolate(frame, [2, 20], [0, s.pre.length], clamp));
  const heartbeat = 0.5 + 0.5 * Math.abs(Math.sin(frame / 6));
  const shake = before ? 0 : interpolate(frame, [slam, slam + 24], [26, 3], clamp);
  const icon = interpolate(frame, [slam - 2, slam + 14], [0, 1], {...clamp, easing: (t) => 1 - Math.pow(1 - t, 3)});
  return (
    <AbsoluteFill>
      <Background broll={s.broll} shake={shake} />
      {before ? (
        <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.65) 20%, rgba(0,0,0,${0.85 + 0.1 * heartbeat}) 100%)`}}>
          <div style={{position: 'absolute', top: 860, left: 40, right: 40, textAlign: 'center', fontFamily: F.mono, fontWeight: 800, fontSize: 80, color: '#fff', letterSpacing: 4}}>
            {s.pre.slice(0, typed)}
            <span style={{opacity: Math.floor(frame / 8) % 2 ? 0 : 1, color}}>▌</span>
          </div>
        </AbsoluteFill>
      ) : (
        <>
          <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 40%, ${color}33 0%, rgba(0,0,0,0.55) 70%)`}} />
          <Particles x={100} y={500} w={880} h={1300} count={50} seed="reveal" speed={2} color={color} />
          {s.icon ? (
            <div style={{position: 'absolute', top: 300, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: Math.min(1, icon * 2)}}>
              {s.icon === 'snake' ? <Snake p={icon} frame={frame} /> : <Knife p={icon} frame={frame} />}
            </div>
          ) : null}
          <div style={{position: 'absolute', top: s.icon ? 720 : 640, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18}}>
            {s.lines.map((line, i) => {
              const at = sec(line.at);
              const p = pop(frame, at - 1, 10, 0.5, 240);
              if (frame < at - 1) return <div key={i} style={{height: (line.size ?? 160) * 0.92}} />;
              const glitch = interpolate(frame, [at, at + 8], [1, 0], clamp);
              return (
                <div key={i} style={{transform: `scale(${interpolate(p, [0, 1], [2, 1])})`, opacity: Math.min(1, p * 2)}}>
                  <GlitchText text={line.text} size={line.size ?? 160} color={line.color ? accent(line.color) : '#fff'} glitch={glitch} />
                </div>
              );
            })}
          </div>
          <Arabic text={s.ar} delay={sec(s.lines[s.lines.length - 1].at) + 6} top={1340} size={60} />
          <Flash at={slam} length={10} color={color} strength={0.9} />
        </>
      )}
    </AbsoluteFill>
  );
};
