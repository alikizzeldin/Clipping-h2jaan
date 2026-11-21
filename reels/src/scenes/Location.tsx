import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame} from 'remotion';
import {evolvePath, getLength, getPointAtLength} from '@remotion/paths';
import {Background} from '../ui/Background';
import {clamp, ease, pop} from '../ui/motion';
import {Arabic, SceneIn, StepLabel} from '../ui/Pieces';
import {C, F} from '../theme';
import {LocationScene} from '../types';

const CONTOURS = [
  'M40 600 C 160 520, 260 640, 380 560 S 620 470, 920 540',
  'M40 660 C 180 600, 300 700, 440 630 S 680 560, 920 610',
  'M40 160 C 200 230, 330 120, 470 190 S 760 260, 920 170',
  'M40 220 C 190 300, 340 190, 500 250 S 770 320, 920 240',
  'M560 420 C 600 330, 760 320, 800 420 S 640 520, 560 420 Z',
];
const ROUTE = 'M250 430 C 380 500, 520 300, 740 360';

export const Location: React.FC<{s: LocationScene}> = ({s}) => {
  const frame = useCurrentFrame();
  const card = pop(frame, 6, 14, 0.7, 120);
  const draw = ease(frame, 18, 62);
  const len = getLength(ROUTE);
  const car = getPointAtLength(ROUTE, len * draw);
  const pin = pop(frame, 66, 9, 0.5, 220);
  const chip = ease(frame, 74, 88);
  const ripple = (k: number) => ((frame - 70 + k * 14) % 42) / 42;
  return (
    <AbsoluteFill>
      <SceneIn>
        <Background broll={s.broll} />
      </SceneIn>
      <StepLabel step={s.step} label={s.label} />
      <div
        style={{
          position: 'absolute', top: 400, left: 60, width: 960, height: 760, borderRadius: 36, overflow: 'hidden',
          background: 'rgba(8,8,26,0.62)', backdropFilter: 'blur(18px)', border: '2px solid rgba(255,255,255,0.16)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.6), inset 0 0 60px rgba(30,242,224,0.08)',
          opacity: Math.min(1, card * 1.5), transform: `perspective(1400px) rotateX(${(1 - card) * 24}deg) scale(${0.9 + 0.1 * card})`,
        }}
      >
        <svg width={960} height={760}>
          {Array.from({length: 16}).map((_, i) => (
            <line key={`v${i}`} x1={i * 64} y1={0} x2={i * 64} y2={760} stroke="rgba(255,255,255,0.05)" />
          ))}
          {Array.from({length: 12}).map((_, i) => (
            <line key={`h${i}`} x1={0} y1={i * 64} x2={960} y2={i * 64} stroke="rgba(255,255,255,0.05)" />
          ))}
          {CONTOURS.map((d, i) => {
            const p = evolvePath(ease(frame, 4 + i * 4, 40 + i * 4), d);
            return <path key={i} d={d} fill="none" stroke={C.teal} strokeOpacity={0.22} strokeWidth={2} {...p} />;
          })}
          {Array.from({length: 18}).map((_, i) => {
            const bx = 150 + random(`bx${i}`) * 130;
            const by = 380 + random(`by${i}`) * 110;
            const a = ease(frame, 8 + i, 20 + i);
            const sz = 10 + random(`bs${i}`) * 18;
            return <rect key={i} x={bx} y={by} width={sz} height={sz} rx={2} fill={C.teal} opacity={0.25 + 0.5 * a * random(`bo${i}`)} />;
          })}
          <circle cx={250} cy={430} r={12} fill="#fff" />
          <text x={150} y={350} fill="#fff" fontFamily={F.mono} fontWeight={800} fontSize={30} letterSpacing={3} opacity={ease(frame, 12, 24)}>
            {s.place}
          </text>
          <path d={ROUTE} fill="none" stroke={C.green} strokeWidth={14} strokeOpacity={0.18} strokeLinecap="round" {...evolvePath(draw, ROUTE)} />
          <path d={ROUTE} fill="none" stroke={C.green} strokeWidth={6} strokeLinecap="round" strokeDasharray="2 18" strokeDashoffset={-frame * 2}
            style={{clipPath: `inset(0 ${(1 - draw) * 100}% 0 0)`}} />
          {car && draw > 0 && draw < 1 ? <circle cx={car.x} cy={car.y} r={14} fill={C.green} style={{filter: `drop-shadow(0 0 12px ${C.green})`}} /> : null}
          {[0, 1, 2].map((k) => (frame >= 70 ? (
            <circle key={k} cx={740} cy={360} r={20 + ripple(k) * 90} fill="none" stroke={C.pink} strokeWidth={4} opacity={(1 - ripple(k)) * 0.8} />
          ) : null))}
          <g transform={`translate(740 ${interpolate(pin, [0, 1], [180, 360])}) scale(${pin})`}>
            <path d="M0 0 C -40 -50, -46 -96, 0 -110 C 46 -96, 40 -50, 0 0 Z" fill={C.pink} style={{filter: `drop-shadow(0 0 18px ${C.pink})`}} />
            <circle cx={0} cy={-72} r={16} fill="#fff" />
          </g>
          <g opacity={chip} transform={`translate(${520 + (1 - chip) * 30} 180)`}>
            <rect x={0} y={0} width={400} height={74} rx={37} fill={C.pink} />
            <text x={200} y={49} textAnchor="middle" fill="#fff" fontFamily={F.brand} fontWeight={800} fontSize={30}>{s.target}</text>
          </g>
          <g opacity={ease(frame, 30, 44)}>
            <text x={560} y={690} fill={C.green} fontFamily={F.display} fontSize={88}>{s.direction}</text>
            <path d={`M${560 + s.direction.length * 46} 660 l 90 0 m -30 -26 l 30 26 l -30 26`} stroke={C.green} strokeWidth={9} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </g>
          {s.region ? (
            <text x={40} y={720} fill="rgba(255,255,255,0.32)" fontFamily={F.mono} fontWeight={700} fontSize={26} letterSpacing={8}>{s.region}</text>
          ) : null}
          <g transform="translate(880 70)" opacity={ease(frame, 10, 24)}>
            <circle r={36} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={2} />
            <path d="M0 -26 L 9 4 L 0 0 L -9 4 Z" fill={C.red} />
            <text y={-44} textAnchor="middle" fill="#fff" fontFamily={F.mono} fontSize={20}>N</text>
          </g>
        </svg>
      </div>
      <Arabic text={s.ar} delay={34} top={1220} />
    </AbsoluteFill>
  );
};
