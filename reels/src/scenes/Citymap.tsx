import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame} from 'remotion';
import {Background} from '../ui/Background';
import {clamp, ease, pop, sec} from '../ui/motion';
import {Arabic, Flash, SceneIn, StepLabel} from '../ui/Pieces';
import {C, F} from '../theme';
import {CitymapScene} from '../types';

// A top-down city map in two blues, the way the pause map shades buildings.
//   legend: the map zooms into a block; on `darkAt` the dark-blue buildings glow with a door tick
//           (a chip names them), on `lightAt` the light-blue ones fade and get a cross.
//   door:   a round minimap close-up: the player arrow walks up to a dark-blue building and on
//           `doorAt` a white line draws along its doorway.
//   count:  a question, then a wall of tiny buildings fills while a counter rolls to `total`;
//           on `openAt` some of them turn dark blue while a second counter rolls to `open`; a
//           big percentage stamps on `pctAt`.

const DARK = '#2a55d6';
const LIGHT = '#a9cdf5';
const GROUND = '#0c1424';
const STREET = '#1d2c48';

// the map card
const MX = 40;
const MY = 390;
const MW = 1000;
const MH = 850;

type B = {x: number; y: number; w: number; h: number; dark: boolean};
const buildMap = (): B[] => {
  const out: B[] = [];
  const cell = 190;
  const road = 26;
  for (let by = 0; by < Math.ceil(MH / cell); by++) {
    for (let bx = 0; bx < Math.ceil(MW / cell); bx++) {
      const x0 = bx * cell + road / 2;
      const y0 = by * cell + road / 2;
      const s = cell - road;
      // split each block into 2–4 lots
      const split = Math.floor(random(`cm-split-${bx}-${by}`) * 3);
      const lots: [number, number, number, number][] =
        split === 0 ? [[0, 0, 1, 0.5], [0, 0.5, 1, 0.5]] : split === 1 ? [[0, 0, 0.5, 1], [0.5, 0, 0.5, 1]] : [[0, 0, 0.5, 0.5], [0.5, 0, 0.5, 0.5], [0, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]];
      lots.forEach(([lx, ly, lw, lh], i) => {
        const pad = 7;
        out.push({x: x0 + lx * s + pad, y: y0 + ly * s + pad, w: lw * s - pad * 2, h: lh * s - pad * 2, dark: random(`cm-dark-${bx}-${by}-${i}`) < 0.34});
      });
    }
  }
  return out;
};
const MAP = buildMap();

const DoorTick: React.FC<{x: number; y: number; s: number}> = ({x, y, s}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <circle r={22} fill="#fff" />
    <rect x={-8} y={-12} width={16} height={24} rx={2} fill={DARK} />
    <circle cx={4} cy={1} r={2} fill="#fff" />
  </g>
);

const Chip: React.FC<{color: string; ink: string; text: string; s: number; icon: 'door' | 'x'; top: number}> = ({color, ink, text, s, icon, top}) => (
  <div style={{position: 'absolute', left: 0, right: 0, top, display: 'flex', justifyContent: 'center', transform: `scale(${s})`}}>
    <div style={{display: 'flex', alignItems: 'center', gap: 16, fontFamily: F.brand, fontSize: 42, letterSpacing: 2, color: ink, background: color, padding: '10px 28px',
      borderRadius: 12, boxShadow: '0 10px 0 rgba(0,0,0,0.5)'}}>
      <span style={{width: 34, height: 34, borderRadius: 6, background: ink, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color, fontSize: 26, lineHeight: 1}}>
        {icon === 'door' ? '▮' : '✕'}
      </span>
      {text}
    </div>
  </div>
);

const Legend: React.FC<{s: CitymapScene; frame: number}> = ({s, frame}) => {
  const darkAt = sec(s.darkAt ?? 1.5);
  const lightAt = sec(s.lightAt ?? 3);
  const zoom = interpolate(frame, [4, 40], [1, s.zoomTo ?? 1.5], {...clamp, easing: (t) => 1 - Math.pow(1 - t, 3)});
  const dark = frame >= darkAt;
  const light = frame >= lightAt;
  const glow = dark ? 0.6 + 0.4 * Math.sin((frame - darkAt) / 4) : 0;
  const fade = interpolate(frame, [lightAt, lightAt + 10], [1, 0.35], clamp);
  const tick = pop(frame, darkAt, 9, 0.5, 220);
  const cross = pop(frame, lightAt, 9, 0.5, 220);
  const chip1 = pop(frame, darkAt, 10, 0.5, 200);
  const chip2 = pop(frame, lightAt, 10, 0.5, 200);
  return (
    <>
      <div style={{position: 'absolute', left: MX, top: MY, width: MW, height: MH, overflow: 'hidden', borderRadius: 18, border: '4px solid rgba(255,255,255,0.18)',
        boxShadow: '0 30px 80px rgba(0,0,0,0.6)'}}>
        <svg width={MW} height={MH} style={{transform: `scale(${zoom})`, transformOrigin: '52% 46%'}}>
          <rect width={MW} height={MH} fill={STREET} />
          {MAP.map((b, i) => (
            <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx={4}
              fill={b.dark ? DARK : LIGHT} opacity={b.dark ? 1 : fade}
              stroke={b.dark && dark ? `rgba(255,255,255,${glow})` : 'none'} strokeWidth={4} />
          ))}
          {light
            ? MAP.filter((b) => !b.dark).map((b, i) => (
                <g key={`x${i}`} opacity={cross} stroke="rgba(10,20,40,0.65)" strokeWidth={4}>
                  <line x1={b.x + b.w * 0.3} y1={b.y + b.h * 0.3} x2={b.x + b.w * 0.7} y2={b.y + b.h * 0.7} />
                  <line x1={b.x + b.w * 0.7} y1={b.y + b.h * 0.3} x2={b.x + b.w * 0.3} y2={b.y + b.h * 0.7} />
                </g>
              ))
            : null}
          {dark ? MAP.filter((b) => b.dark).map((b, i) => <DoorTick key={`d${i}`} x={b.x + b.w / 2} y={b.y + b.h / 2} s={tick * 0.8} />) : null}
        </svg>
        <div style={{position: 'absolute', left: 22, top: 18, fontFamily: F.mono, fontSize: 24, letterSpacing: 4, color: 'rgba(255,255,255,0.75)'}}>MAP · ZOOM {zoom.toFixed(1)}×</div>
      </div>
      {dark ? <Chip color={DARK} ink="#fff" text={s.darkText ?? 'DARK BLUE = ENTER'} s={chip1} icon="door" top={MY + MH - 180} /> : null}
      {light ? <Chip color={LIGHT} ink="#0c1424" text={s.lightText ?? 'LIGHT BLUE = SCENERY'} s={chip2} icon="x" top={MY + MH - 92} /> : null}
    </>
  );
};

const RX = 540;
const RY = 790;
const RR = 380;

const Door: React.FC<{s: CitymapScene; frame: number}> = ({s, frame}) => {
  const doorAt = sec(s.doorAt ?? 2);
  const open = interpolate(frame, [0, 12], [0.3, 1], {...clamp, easing: (t) => 1 - Math.pow(1 - t, 3)});
  // the building sits above the centre; its doorway is on the bottom edge
  const bx = RX - 210;
  const by = RY - 330;
  const bw = 420;
  const bh = 300;
  const doorY = by + bh;
  const walk = interpolate(frame, [6, doorAt + 10], [RY + 300, doorY + 70], {...clamp, easing: (t) => 1 - Math.pow(1 - t, 2)});
  const line = interpolate(frame, [doorAt, doorAt + 8], [0, 1], {...clamp, easing: (t) => 1 - Math.pow(1 - t, 3)});
  const pulse = frame >= doorAt ? 0.7 + 0.3 * Math.sin((frame - doorAt) / 3) : 0;
  const chip = pop(frame, doorAt + 4, 10, 0.5, 200);
  const r = RR * open;
  return (
    <>
      <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
        <defs>
          <clipPath id="cm-lens"><circle cx={RX} cy={RY} r={r} /></clipPath>
        </defs>
        <g clipPath="url(#cm-lens)">
          <rect x={RX - RR} y={RY - RR} width={RR * 2} height={RR * 2} fill={GROUND} />
          {/* streets */}
          <rect x={RX - RR} y={doorY + 40} width={RR * 2} height={90} fill={STREET} />
          <rect x={RX + 250} y={RY - RR} width={80} height={RR * 2} fill={STREET} />
          <rect x={RX - 330} y={RY - RR} width={80} height={RR * 2} fill={STREET} />
          {/* neighbours: light blue scenery */}
          <rect x={RX - RR} y={by} width={120} height={bh} rx={6} fill={LIGHT} opacity={0.5} />
          <rect x={RX + 340} y={by - 40} width={140} height={bh + 40} rx={6} fill={LIGHT} opacity={0.5} />
          <rect x={RX - 250} y={doorY + 150} width={500} height={200} rx={6} fill={LIGHT} opacity={0.5} />
          {/* the enterable building */}
          <rect x={bx} y={by} width={bw} height={bh} rx={8} fill={DARK} stroke="rgba(255,255,255,0.25)" strokeWidth={4} />
          {/* the doorway: a white line drawn from the middle out */}
          <line x1={RX - 95 * line} y1={doorY} x2={RX + 95 * line} y2={doorY} stroke="#fff" strokeWidth={16} strokeLinecap="round" opacity={line > 0 ? pulse : 0}
            style={{filter: 'drop-shadow(0 0 10px #fff)'}} />
          {/* the player arrow */}
          <g transform={`translate(${RX} ${walk})`}>
            <circle r={44} fill="rgba(255,255,255,0.12)" />
            <path d="M0 -34 L26 26 L0 12 L-26 26 Z" fill="#fff" stroke="#0c1424" strokeWidth={4} strokeLinejoin="round" />
          </g>
        </g>
        <circle cx={RX} cy={RY} r={r} fill="none" stroke="#0a0a0a" strokeWidth={22} />
        <circle cx={RX} cy={RY} r={r - 14} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={4} />
        <text x={RX} y={RY - r + 58} textAnchor="middle" fontFamily="'IBM Plex Mono Bold', monospace" fontSize={26} letterSpacing={4} fill="rgba(255,255,255,0.7)">N</text>
      </svg>
      {frame >= doorAt + 4 ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: RY + RR + 36, display: 'flex', justifyContent: 'center', transform: `scale(${chip})`}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 16, fontFamily: F.brand, fontSize: 42, letterSpacing: 2, color: '#0c1424', background: '#fff', padding: '10px 28px',
            borderRadius: 12, boxShadow: '0 10px 0 rgba(0,0,0,0.5)'}}>
            <span style={{width: 44, height: 10, borderRadius: 5, background: '#0c1424', display: 'inline-block'}} />
            {s.doorText ?? 'WHITE LINE = DOOR'}
          </div>
        </div>
      ) : null}
    </>
  );
};

// the count wall: COLS × ROWS tiny buildings stand for the whole map
const COLS = 40;
const ROWS = 26;
const GX = 70;
const GY = 470;
const GW = 940;
const CELL = GW / COLS;

const Count: React.FC<{s: CitymapScene; frame: number}> = ({s, frame}) => {
  const totalAt = sec(s.totalAt ?? 1);
  const openAt = sec(s.openAt ?? 3);
  const pctAt = sec(s.pctAt ?? 5);
  const total = s.total ?? 0;
  const opened = s.open ?? 0;
  const share = total ? opened / total : 0;
  const n = COLS * ROWS;
  const fill = interpolate(frame, [totalAt, totalAt + Math.max(6, sec(s.totalFor ?? 1))], [0, 1], {...clamp, easing: (t) => 1 - Math.pow(1 - t, 2)});
  const lit = interpolate(frame, [openAt, openAt + Math.max(6, sec(s.openFor ?? 1.2))], [0, 1], {...clamp, easing: (t) => 1 - Math.pow(1 - t, 2)});
  const q = ease(frame, 2, 12);
  const pct = pop(frame, pctAt, 10, 0.45, 220);
  const shown = Math.floor(fill * n);
  return (
    <>
      <div style={{position: 'absolute', top: 372, left: 0, right: 0, textAlign: 'center', fontFamily: F.brand, fontSize: 48, letterSpacing: 3, color: '#fff', opacity: q,
        textShadow: '0 4px 0 #000'}}>{s.question ?? 'HOW MANY CAN YOU ENTER?'}</div>
      <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
        {Array.from({length: shown}).map((_, i) => {
          const c = i % COLS;
          const r = Math.floor(i / COLS);
          const isOpen = random(`cm-open-${i}`) < share;
          const on = isOpen && random(`cm-when-${i}`) < lit;
          return <rect key={i} x={GX + c * CELL + 2} y={GY + r * CELL + 2} width={CELL - 4} height={CELL - 4} rx={2} fill={on ? DARK : LIGHT} opacity={on ? 1 : 0.55}
            stroke={on ? 'rgba(255,255,255,0.6)' : 'none'} strokeWidth={1.5} />;
        })}
      </svg>
      {frame >= totalAt ? (
        <div style={{position: 'absolute', top: GY + ROWS * CELL + 26, left: 70, right: 70, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end'}}>
          <div style={{display: 'flex', flexDirection: 'column', gap: 4}}>
            <div style={{fontFamily: F.mono, fontSize: 26, letterSpacing: 4, color: LIGHT}}>{s.totalLabel ?? 'BUILDINGS'}</div>
            <div style={{fontFamily: F.display, fontSize: 96, lineHeight: 1, color: '#fff', textShadow: '0 6px 0 #000'}}>{Math.round(fill * total).toLocaleString('en-US')}</div>
          </div>
          {frame >= openAt ? (
            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4}}>
              <div style={{fontFamily: F.mono, fontSize: 26, letterSpacing: 4, color: '#8fb0ff'}}>{s.openLabel ?? 'YOU CAN ENTER'}</div>
              <div style={{fontFamily: F.display, fontSize: 96, lineHeight: 1, color: C.gold, textShadow: '0 6px 0 #000'}}>{Math.round(lit * opened).toLocaleString('en-US')}</div>
            </div>
          ) : null}
        </div>
      ) : null}
      {frame >= pctAt ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: GY + (ROWS * CELL) / 2 - 130, display: 'flex', justifyContent: 'center', transform: `scale(${pct}) rotate(-4deg)`}}>
          <div style={{fontFamily: F.display, fontSize: 230, lineHeight: 1, color: C.gold, background: 'rgba(12,20,36,0.86)', padding: '6px 44px', borderRadius: 24,
            border: `8px solid ${C.gold}`, textShadow: '0 8px 0 #000'}}>{s.pct ?? `${Math.round(share * 100)}%`}</div>
        </div>
      ) : null}
      <Flash at={pctAt} length={7} color={C.gold} strength={0.35} />
    </>
  );
};

export const Citymap: React.FC<{s: CitymapScene}> = ({s}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <SceneIn>
        <Background broll={s.broll} />
      </SceneIn>
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(8,12,24,0.55) 0%, rgba(8,12,24,0.82) 40%, rgba(8,12,24,0.9) 100%)'}} />
      {s.mode === 'legend' ? <Legend s={s} frame={frame} /> : s.mode === 'door' ? <Door s={s} frame={frame} /> : <Count s={s} frame={frame} />}
      <StepLabel step={s.step} label={s.label} />
      <Arabic text={s.ar} delay={16} top={1400} size={50} />
    </AbsoluteFill>
  );
};
