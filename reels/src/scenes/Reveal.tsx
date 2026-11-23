import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {evolvePath} from '@remotion/paths';
import {Background} from '../ui/Background';
import {clamp, ease, pop, sec} from '../ui/motion';
import {Arabic, Flash, GlitchText, Particles} from '../ui/Pieces';
import {C, F, accent} from '../theme';
import {RevealScene} from '../types';
import {PillBottle, PillHead} from './Manual3';

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

// A cowboy hat that drops in and settles with a little bounce.
const Hat: React.FC<{p: number; frame: number}> = ({p, frame}) => {
  const y = interpolate(p, [0, 1], [-260, 0]);
  const tilt = Math.sin(frame / 10) * 3;
  return (
    <svg width={520} height={300} viewBox="0 0 520 300" style={{overflow: 'visible', transform: `translateY(${y}px) rotate(${tilt}deg)`}}>
      <ellipse cx={260} cy={220} rx={250} ry={52} fill="#5a3b22" stroke="#2a1a0e" strokeWidth={6} />
      <path d="M150 215 C 150 120, 175 60, 225 60 C 245 60, 250 80, 260 80 C 270 80, 275 60, 295 60 C 345 60, 370 120, 370 215 Z" fill="#6e4a2b" stroke="#2a1a0e" strokeWidth={6} />
      <path d="M152 185 C 220 200, 300 200, 368 185 L 370 210 C 300 226, 220 226, 150 210 Z" fill="#2d1c10" />
      <path d="M360 192 q 26 18 10 46 M360 192 q 34 6 34 40" stroke="#c9a46a" strokeWidth={6} fill="none" strokeLinecap="round" />
    </svg>
  );
};

// A big red crab that scuttles in, claws snapping.
const Crab: React.FC<{p: number; frame: number}> = ({p, frame}) => {
  const x = interpolate(p, [0, 1], [-420, 0]);
  const snap = Math.abs(Math.sin(frame / 4)) * 14;
  const leg = (i: number, side: number) => {
    const y = 175 + i * 22;
    const wig = Math.sin(frame / 3 + i) * 8;
    return <path key={`${side}${i}`} d={`M${260 + side * 120} ${y} q ${side * 70} ${-30 + wig} ${side * 120} ${30 + wig}`} stroke="#8e1b1b" strokeWidth={14} fill="none" strokeLinecap="round" />;
  };
  return (
    <svg width={560} height={340} viewBox="0 0 520 320" style={{overflow: 'visible', transform: `translateX(${x}px)`}}>
      {[0, 1, 2].map((i) => leg(i, -1))}
      {[0, 1, 2].map((i) => leg(i, 1))}
      <ellipse cx={260} cy={200} rx={150} ry={92} fill="#d8322f" stroke="#7a1414" strokeWidth={8} style={{filter: `drop-shadow(0 0 24px ${C.red})`}} />
      {[-1, 1].map((side) => (
        <g key={side}>
          <path d={`M${260 + side * 110} 140 Q ${260 + side * 170} 80 ${260 + side * 190} 60`} stroke="#b52424" strokeWidth={22} fill="none" strokeLinecap="round" />
          <path d={`M${260 + side * 190} 60 l ${side * 46} ${-30 - snap} M${260 + side * 190} 60 l ${side * 52} ${10 + snap}`} stroke="#d8322f" strokeWidth={26} strokeLinecap="round" />
        </g>
      ))}
      {[-1, 1].map((side) => (
        <g key={`e${side}`}>
          <path d={`M${260 + side * 34} 120 V 88`} stroke="#7a1414" strokeWidth={8} />
          <circle cx={260 + side * 34} cy={84} r={14} fill="#fff" stroke="#000" strokeWidth={4} />
          <circle cx={260 + side * 34} cy={86} r={6} fill="#000" />
        </g>
      ))}
    </svg>
  );
};

// A helicopter knocked out of the sky: smoking, tilted, rotor still spinning.
const Heli: React.FC<{p: number; frame: number}> = ({p, frame}) => {
  const x = interpolate(p, [0, 1], [360, 0]);
  const y = interpolate(p, [0, 1], [-260, 0]) + Math.sin(frame / 7) * 6;
  const tilt = 18 + Math.sin(frame / 5) * 5;
  const rotor = Math.abs(Math.cos(frame * 0.9));
  return (
    <svg width={640} height={360} viewBox="0 0 640 360" style={{overflow: 'visible', transform: `translate(${x}px, ${y}px) rotate(${tilt}deg)`}}>
      {[0, 1, 2, 3, 4].map((i) => {
        const t = ((frame + i * 9) % 45) / 45;
        return <circle key={i} cx={420 + t * 160} cy={120 - t * 150} r={18 + t * 46} fill="#3b3b46" opacity={0.7 * (1 - t)} />;
      })}
      <path d="M396 118 q 14 -30 30 -6 q 10 -24 24 4" fill="#ffb03a" opacity={0.6 + 0.4 * Math.abs(Math.sin(frame / 2))} />
      <path d="M380 150 L600 132 L606 150 L388 176 Z" fill="#2b3442" stroke="#0e1218" strokeWidth={6} />
      <rect x="586" y="96" width="14" height="70" rx="5" fill="#2b3442" stroke="#0e1218" strokeWidth={5} />
      <ellipse cx="593" cy="104" rx={34 * rotor + 4} ry="6" fill="rgba(200,210,220,0.55)" />
      <path d="M120 160 C 120 100 190 76 280 80 L380 92 C 420 100 430 140 420 180 C 400 214 330 222 250 220 C 170 218 120 206 120 160 Z" fill="#33404f" stroke="#0e1218" strokeWidth={7} />
      <path d="M140 150 C 146 112 186 96 236 98 L250 150 Z" fill="#9fd8ff" stroke="#0e1218" strokeWidth={5} opacity={0.9} />
      <path d="M170 244 H360 M200 220 V244 M320 220 V244" stroke="#0e1218" strokeWidth={8} strokeLinecap="round" />
      <rect x="252" y="64" width="40" height="18" rx="5" fill="#0e1218" />
      <ellipse cx="272" cy="58" rx={250 * rotor + 20} ry="9" fill="rgba(200,210,220,0.5)" />
      <circle cx="272" cy="60" r="9" fill="#0e1218" />
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
              {s.icon === 'snake' ? <Snake p={icon} frame={frame} /> : s.icon === 'hat' ? <Hat p={icon} frame={frame} /> : s.icon === 'crab' ? <Crab p={icon} frame={frame} />
                : s.icon === 'heli' ? <Heli p={icon} frame={frame} />
                : s.icon === 'pill' ? <div style={{transform: `scale(${0.4 + 0.6 * icon}) rotate(${(1 - icon) * 180}deg)`}}><PillHead size={360} frame={frame} /></div>
                : s.icon === 'bottle' ? <div style={{transform: `scale(${0.4 + 0.6 * icon}) rotate(${Math.sin(frame / 8) * 6}deg)`, filter: `drop-shadow(0 0 30px ${C.red})`}}><PillBottle size={360} /></div>
                : <Knife p={icon} frame={frame} />}
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
