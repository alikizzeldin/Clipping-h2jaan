import React from 'react';
import {AbsoluteFill, Img, interpolate, random, staticFile, useCurrentFrame} from 'remotion';
import {evolvePath, getLength, getPointAtLength} from '@remotion/paths';
import {Background} from '../ui/Background';
import {clamp, ease, pop} from '../ui/motion';
import {Arabic, SceneIn, StepLabel} from '../ui/Pieces';
import {C, F} from '../theme';
import {LocationScene} from '../types';

// One scene, several map looks, so the feed never shows the same map twice in a row:
//   hud (default) · gps (in-game minimap) · paper (hand-drawn treasure map) · neon (Vice City synthwave)
//   radar (a sweep that finds the spot) · image (a real map/screenshot with a pin, from plan.stills or plan.media)
const W = 960;
const H = 760;
const CONTOURS = [
  'M40 600 C 160 520, 260 640, 380 560 S 620 470, 920 540',
  'M40 660 C 180 600, 300 700, 440 630 S 680 560, 920 610',
  'M40 160 C 200 230, 330 120, 470 190 S 760 260, 920 170',
  'M40 220 C 190 300, 340 190, 500 250 S 770 320, 920 240',
  'M560 420 C 600 330, 760 320, 800 420 S 640 520, 560 420 Z',
];
const ROUTE = 'M250 430 C 380 500, 520 300, 740 360';
const START = {x: 250, y: 430};
const END = {x: 740, y: 360};

type Look = {
  card: React.CSSProperties;
  route: string;
  routeWidth: number;
  pin: string;
  chip: string;
  chipText: string;
  label: string;
  labelFont: string;
  direction: string;
};
const LOOKS: Record<NonNullable<LocationScene['style']>, Look> = {
  hud: {card: {background: 'rgba(8,8,26,0.62)', backdropFilter: 'blur(18px)', border: '2px solid rgba(255,255,255,0.16)',
    boxShadow: '0 30px 80px rgba(0,0,0,0.6), inset 0 0 60px rgba(30,242,224,0.08)'},
    route: C.green, routeWidth: 6, pin: C.pink, chip: C.pink, chipText: '#fff', label: '#fff', labelFont: F.mono, direction: C.green},
  gps: {card: {background: '#1a1f26', border: '6px solid #0c0f13', boxShadow: 'inset 0 0 80px rgba(0,0,0,0.7)'},
    route: '#f5c518', routeWidth: 12, pin: '#f5c518', chip: '#f5c518', chipText: '#111', label: '#e8edf2', labelFont: F.body, direction: '#f5c518'},
  paper: {card: {background: 'linear-gradient(160deg, #efe3c6, #d9c49b)', border: '3px solid #b39762'},
    route: '#c0392b', routeWidth: 7, pin: '#c0392b', chip: '#2b1d0e', chipText: '#f3e6c8', label: '#3b2a14', labelFont: F.hand, direction: '#c0392b'},
  neon: {card: {background: 'linear-gradient(180deg, #1a0633 0%, #3b0a4f 55%, #ff3cac 140%)', border: `2px solid ${C.pink}88`},
    route: C.teal, routeWidth: 7, pin: C.pink, chip: C.teal, chipText: '#06060F', label: '#fff', labelFont: F.brand, direction: C.teal},
  radar: {card: {background: 'radial-gradient(circle at 50% 50%, #06281f 0%, #03130f 70%, #020a08 100%)', border: '2px solid #1ef2a055'},
    route: '#3dffb0', routeWidth: 5, pin: '#3dffb0', chip: '#3dffb0', chipText: '#03130f', label: '#9dffd9', labelFont: F.mono, direction: '#3dffb0'},
  image: {card: {background: '#000', border: '3px solid rgba(255,255,255,0.25)'},
    route: C.green, routeWidth: 6, pin: C.pink, chip: C.pink, chipText: '#fff', label: '#fff', labelFont: F.mono, direction: C.green},
};

// The part that differs per look: what is under the route.
const Base: React.FC<{s: LocationScene; frame: number}> = ({s, frame}) => {
  const style = s.style ?? 'hud';
  if (style === 'gps') {
    return (
      <g>
        <path d="M0 520 C 200 470, 380 600, 560 560 S 820 470, 960 520 L 960 760 L 0 760 Z" fill="#1e3a5f" opacity={0.9} />
        {[[120, 120, 140, 90], [620, 470, 170, 110], [380, 150, 120, 80]].map(([x, y, w, h], i) => (
          <rect key={i} x={x} y={y} width={w} height={h} rx={30} fill="#23452e" opacity={0.85} />
        ))}
        {Array.from({length: 9}).map((_, i) => (
          <line key={`r${i}`} x1={60 + i * 110 + random(`gx${i}`) * 30} y1={0} x2={30 + i * 115} y2={760} stroke="#3a424d" strokeWidth={i % 3 ? 8 : 16} />
        ))}
        {Array.from({length: 6}).map((_, i) => (
          <line key={`c${i}`} x1={0} y1={70 + i * 120} x2={960} y2={50 + i * 125 + random(`gy${i}`) * 40} stroke="#3a424d" strokeWidth={i % 2 ? 8 : 14} />
        ))}
      </g>
    );
  }
  if (style === 'paper') {
    return (
      <g>
        {Array.from({length: 14}).map((_, i) => (
          <line key={i} x1={0} y1={40 + i * 52} x2={960} y2={44 + i * 52} stroke="#8a6d3b" strokeOpacity={0.08} strokeWidth={2} />
        ))}
        <circle cx={160} cy={620} r={70} fill="none" stroke="#8a5a2b" strokeOpacity={0.18} strokeWidth={10} />
        {CONTOURS.slice(0, 4).map((d, i) => {
          const p = evolvePath(ease(frame, 4 + i * 4, 36 + i * 4), d);
          return <path key={i} d={d} fill="none" stroke="#6b4a22" strokeOpacity={0.55} strokeWidth={4} strokeLinecap="round" {...p} />;
        })}
        {[[180, 230], [700, 600], [840, 140]].map(([x, y], i) => (
          <text key={i} x={x} y={y} fill="#6b4a22" fillOpacity={0.5} fontFamily={F.hand} fontSize={34}>{['~', '≈', '~'][i]}</text>
        ))}
      </g>
    );
  }
  if (style === 'neon') {
    return (
      <g>
        <circle cx={760} cy={170} r={110} fill="url(#sun)" opacity={0.85} />
        {Array.from({length: 6}).map((_, i) => (
          <rect key={i} x={640} y={170 + i * 16} width={240} height={5 + i} fill="#1a0633" />
        ))}
        {Array.from({length: 14}).map((_, i) => (
          <line key={`p${i}`} x1={480} y1={430} x2={-400 + i * 140} y2={760} stroke={C.pink} strokeOpacity={0.35} strokeWidth={2} />
        ))}
        {Array.from({length: 7}).map((_, i) => {
          const y = 440 + Math.pow(i / 6, 1.8) * 320 + ((frame * 2) % 40) * (i / 6);
          return <line key={`h${i}`} x1={0} y1={y} x2={960} y2={y} stroke={C.pink} strokeOpacity={0.35} strokeWidth={2} />;
        })}
        {CONTOURS.slice(2).map((d, i) => {
          const p = evolvePath(ease(frame, 4 + i * 4, 40 + i * 4), d);
          return <path key={i} d={d} fill="none" stroke={C.teal} strokeWidth={4} style={{filter: `drop-shadow(0 0 10px ${C.teal})`}} {...p} />;
        })}
      </g>
    );
  }
  if (style === 'radar') {
    const sweep = (frame * 6) % 360;
    return (
      <g>
        {[90, 180, 270, 360].map((r) => <circle key={r} cx={480} cy={380} r={r} fill="none" stroke="#3dffb0" strokeOpacity={0.18} strokeWidth={2} />)}
        <line x1={480} y1={0} x2={480} y2={760} stroke="#3dffb0" strokeOpacity={0.12} />
        <line x1={0} y1={380} x2={960} y2={380} stroke="#3dffb0" strokeOpacity={0.12} />
        <g transform={`rotate(${sweep} 480 380)`}>
          <path d="M480 380 L 480 0 A 380 380 0 0 1 760 120 Z" fill="url(#sweep)" />
        </g>
        {Array.from({length: 10}).map((_, i) => {
          const a = random(`ra${i}`) * Math.PI * 2;
          const r = 80 + random(`rr${i}`) * 260;
          return <circle key={i} cx={480 + Math.cos(a) * r} cy={380 + Math.sin(a) * r} r={5} fill="#3dffb0" opacity={0.25 + 0.4 * random(`rb${i}`)} />;
        })}
      </g>
    );
  }
  // hud
  return (
    <g>
      {Array.from({length: 16}).map((_, i) => <line key={`v${i}`} x1={i * 64} y1={0} x2={i * 64} y2={760} stroke="rgba(255,255,255,0.05)" />)}
      {Array.from({length: 12}).map((_, i) => <line key={`h${i}`} x1={0} y1={i * 64} x2={960} y2={i * 64} stroke="rgba(255,255,255,0.05)" />)}
      {CONTOURS.map((d, i) => {
        const p = evolvePath(ease(frame, 4 + i * 4, 40 + i * 4), d);
        return <path key={i} d={d} fill="none" stroke={C.teal} strokeOpacity={0.22} strokeWidth={2} {...p} />;
      })}
      {Array.from({length: 18}).map((_, i) => {
        const a = ease(frame, 8 + i, 20 + i);
        const sz = 10 + random(`bs${i}`) * 18;
        return <rect key={i} x={150 + random(`bx${i}`) * 130} y={380 + random(`by${i}`) * 110} width={sz} height={sz} rx={2} fill={C.teal}
          opacity={0.25 + 0.5 * a * random(`bo${i}`)} />;
      })}
    </g>
  );
};

export const Location: React.FC<{s: LocationScene}> = ({s}) => {
  const frame = useCurrentFrame();
  const style = s.style ?? 'hud';
  const look = LOOKS[style];
  const card = pop(frame, 6, 14, 0.7, 120);
  const draw = ease(frame, 18, 62);
  const len = getLength(ROUTE);
  const car = getPointAtLength(ROUTE, len * draw);
  const pinAt = s.pin ? {x: (s.pin.x / 100) * W, y: (s.pin.y / 100) * H} : END;
  const showRoute = style !== 'radar' && style !== 'image';
  const found = style === 'radar' ? 52 : 66; // the radar "finds" the spot a little earlier
  const pin = pop(frame, found, 9, 0.5, 220);
  const chip = ease(frame, 74, 88);
  const ripple = (k: number) => ((frame - found - 4 + k * 14) % 42) / 42;
  const zoom = style === 'image' ? interpolate(frame, [0, 90], [1.02, 1.16], clamp) : 1;
  const ox = style === 'image' ? (pinAt.x / W) * 100 : 50;
  const oy = style === 'image' ? (pinAt.y / H) * 100 : 50;
  // Without a custom pin the chip sits where it always did (older episodes must render exactly as before).
  const chipX = s.pin ? Math.max(20, Math.min(W - 420, pinAt.x - 200)) : 520;
  const chipY = s.pin ? (pinAt.y > 300 ? 60 : H - 150) : 180;
  return (
    <AbsoluteFill>
      <SceneIn>
        <Background broll={s.broll} />
      </SceneIn>
      <StepLabel step={s.step} label={s.label} />
      <div
        style={{
          position: 'absolute', top: 400, left: 60, width: W, height: H, borderRadius: style === 'paper' ? 14 : 36, overflow: 'hidden',
          boxShadow: '0 30px 80px rgba(0,0,0,0.6)', ...look.card,
          opacity: Math.min(1, card * 1.5),
          transform: `perspective(1400px) rotateX(${(1 - card) * 24}deg) rotate(${style === 'paper' ? -1.5 : 0}deg) scale(${0.9 + 0.1 * card})`,
        }}
      >
        {style === 'image' && s.image ? (
          <AbsoluteFill style={{transform: `scale(${zoom})`, transformOrigin: `${ox}% ${oy}%`}}>
            <Img src={staticFile(s.image)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
            <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.55) 100%)'}} />
          </AbsoluteFill>
        ) : null}
        <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
          <defs>
            <radialGradient id="sun"><stop offset="0%" stopColor="#ffe36e" /><stop offset="100%" stopColor="#ff3cac" /></radialGradient>
            <linearGradient id="sweep" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#3dffb0" stopOpacity={0.35} /><stop offset="100%" stopColor="#3dffb0" stopOpacity={0} />
            </linearGradient>
          </defs>
          {style === 'image' ? null : <Base s={s} frame={frame} />}
          {showRoute ? (
            <>
              <circle cx={START.x} cy={START.y} r={12} fill={style === 'paper' ? '#3b2a14' : '#fff'} />
              <path d={ROUTE} fill="none" stroke={look.route} strokeWidth={look.routeWidth * 2.3} strokeOpacity={0.18} strokeLinecap="round" {...evolvePath(draw, ROUTE)} />
              {style === 'gps' ? (
                <path d={ROUTE} fill="none" stroke={look.route} strokeWidth={look.routeWidth} strokeLinecap="round" {...evolvePath(draw, ROUTE)} />
              ) : (
                <path d={ROUTE} fill="none" stroke={look.route} strokeWidth={look.routeWidth} strokeLinecap="round"
                  strokeDasharray={style === 'paper' ? '14 14' : '2 18'} strokeDashoffset={-frame * 2}
                  style={{clipPath: `inset(0 ${(1 - draw) * 100}% 0 0)`}} />
              )}
              {car && draw > 0 && draw < 1 ? (
                style === 'gps' ? (
                  <path d="M0 -18 L 13 14 L 0 6 L -13 14 Z" fill="#fff" transform={`translate(${car.x} ${car.y}) rotate(${60})`} />
                ) : (
                  <circle cx={car.x} cy={car.y} r={14} fill={look.route} style={{filter: `drop-shadow(0 0 12px ${look.route})`}} />
                )
              ) : null}
            </>
          ) : null}
          <text x={style === 'image' ? 40 : 150} y={style === 'image' ? 70 : 350} fill={look.label} fontFamily={look.labelFont} fontWeight={800}
            fontSize={style === 'paper' ? 40 : 30} letterSpacing={style === 'paper' ? 1 : 3} opacity={ease(frame, 12, 24)}
            style={style === 'image' ? {paintOrder: 'stroke', stroke: '#000', strokeWidth: 6} : undefined}>
            {s.place}
          </text>
          {[0, 1, 2].map((k) => (frame >= found + 4 ? (
            <circle key={k} cx={pinAt.x} cy={pinAt.y} r={20 + ripple(k) * 90} fill="none" stroke={look.pin} strokeWidth={4} opacity={(1 - ripple(k)) * 0.8} />
          ) : null))}
          {style === 'paper' ? (
            <g transform={`translate(${pinAt.x} ${pinAt.y}) scale(${pin}) rotate(${(1 - pin) * 40})`}>
              <path d="M-34 -34 L 34 34 M 34 -34 L -34 34" stroke={look.pin} strokeWidth={14} strokeLinecap="round" />
            </g>
          ) : style === 'gps' ? (
            <g transform={`translate(${pinAt.x} ${pinAt.y}) scale(${pin})`}>
              <circle r={26} fill={look.pin} stroke="#111" strokeWidth={5} />
              <circle r={9} fill="#111" />
            </g>
          ) : (
            <g transform={`translate(${pinAt.x} ${interpolate(pin, [0, 1], [pinAt.y - 180, pinAt.y])}) scale(${pin})`}>
              <path d="M0 0 C -40 -50, -46 -96, 0 -110 C 46 -96, 40 -50, 0 0 Z" fill={look.pin} style={{filter: `drop-shadow(0 0 18px ${look.pin})`}} />
              <circle cx={0} cy={-72} r={16} fill="#fff" />
            </g>
          )}
          <g opacity={chip} transform={`translate(${chipX + (1 - chip) * 30} ${chipY})`}>
            <rect x={0} y={0} width={400} height={74} rx={style === 'paper' ? 8 : 37} fill={look.chip} />
            <text x={200} y={49} textAnchor="middle" fill={look.chipText} fontFamily={style === 'paper' ? F.hand : F.brand} fontWeight={800} fontSize={30}>{s.target}</text>
          </g>
          <g opacity={ease(frame, 30, 44)} style={style === 'image' ? {filter: 'drop-shadow(0 3px 0 #000)'} : undefined}>
            <text x={560} y={690} fill={look.direction} fontFamily={style === 'paper' ? F.hand : F.display} fontSize={s.direction.length > 6 ? 64 : 88}>{s.direction}</text>
            {style === 'paper' ? null : (
              <path d={`M${560 + s.direction.length * (s.direction.length > 6 ? 34 : 46)} ${s.direction.length > 6 ? 668 : 660} l 90 0 m -30 -26 l 30 26 l -30 26`}
                stroke={look.direction} strokeWidth={9} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </g>
          {s.region ? (
            <text x={40} y={720} fill={style === 'paper' ? '#6b4a22' : 'rgba(255,255,255,0.32)'} fontFamily={style === 'paper' ? F.hand : F.mono} fontWeight={700}
              fontSize={26} letterSpacing={style === 'paper' ? 2 : 8}>{s.region}</text>
          ) : null}
          <g transform="translate(880 70)" opacity={ease(frame, 10, 24)}>
            <circle r={36} fill="none" stroke={style === 'paper' ? '#6b4a22' : 'rgba(255,255,255,0.4)'} strokeWidth={2} />
            <path d="M0 -26 L 9 4 L 0 0 L -9 4 Z" fill={style === 'paper' ? '#6b4a22' : C.red} />
            <text y={-44} textAnchor="middle" fill={style === 'paper' ? '#3b2a14' : '#fff'} fontFamily={F.mono} fontSize={20}>N</text>
          </g>
        </svg>
      </div>
      <Arabic text={s.ar} delay={34} top={1220} />
    </AbsoluteFill>
  );
};
