import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame} from 'remotion';
import {Background} from '../ui/Background';
import {clamp, ease, pop, sec} from '../ui/motion';
import {Arabic, SceneIn, StepLabel} from '../ui/Pieces';
import {C, F} from '../theme';
import {WinchScene} from '../types';

// A street at night, side view: a pickup reverses up to an ATM set in a wall, a winch hook latches
// on, the truck floors it, the cable snaps taut, cracks run through the wall and the whole machine
// tears out in a burst of debris and dust, leaving a hole.

const GROUND = 1130;
const ATM_X = 730; // left face of the machine
const ATM_W = 170;
const ATM_H = 300;
const REST = ATM_X - 90 - 560; // truck x when its rear bumper waits by the machine

const Truck: React.FC<{x: number; spin: number; brake: boolean}> = ({x, spin, brake}) => (
  <svg width={560} height={260} viewBox="0 0 560 260" style={{position: 'absolute', left: x, top: GROUND - 252}}>
    <path d="M10 200 L10 140 Q12 118 40 116 L170 112 L225 42 L335 42 L345 112 L540 112 L548 120 L548 200 Z"
      fill="#141826" stroke={C.teal} strokeWidth={3} strokeLinejoin="round" />
    <path d="M184 110 L231 54 L324 54 L329 110 Z" fill="#0d2b3a" stroke="#2b5b6e" strokeWidth={2} />
    <line x1={278} y1={54} x2={278} y2={110} stroke="#141826" strokeWidth={6} />
    <line x1={345} y1={112} x2={345} y2={196} stroke="#2a3044" strokeWidth={3} />
    <rect x={14} y={128} width={22} height={14} rx={4} fill="#fff6c2" />
    <rect x={536} y={124} width={12} height={24} rx={3} fill={brake ? '#ff3b4e' : '#8a1c26'} />
    {/* the winch drum on the rear bumper */}
    <rect x={548} y={168} width={14} height={26} rx={4} fill="#9aa0ae" stroke="#2a2c35" strokeWidth={2} />
    {[110, 450].map((cx) => (
      <g key={cx} transform={`rotate(${spin} ${cx} 205)`}>
        <circle cx={cx} cy={205} r={46} fill="#07080d" stroke="#2a3044" strokeWidth={6} />
        <circle cx={cx} cy={205} r={22} fill="#9aa0ae" />
        {[0, 72, 144, 216, 288].map((a) => (
          <rect key={a} x={cx - 3} y={185} width={6} height={14} fill="#2a2c35" transform={`rotate(${a} ${cx} 205)`} />
        ))}
      </g>
    ))}
  </svg>
);

export const Winch: React.FC<{s: WinchScene}> = ({s}) => {
  const frame = useCurrentFrame();
  const backAt = sec(s.backAt);
  const hookAt = sec(s.hookAt);
  const pullAt = sec(s.pullAt);
  const ripAt = sec(s.ripAt);
  const r = frame - ripAt;
  const ripped = r >= 0;
  const strain = interpolate(frame, [pullAt, ripAt], [0, 1], clamp);
  // the truck: reverses in, strains against the cable, then takes off once the machine gives
  const arrive = interpolate(frame, [backAt, backAt + 18], [0, 1], {...clamp, easing: (t) => 1 - Math.pow(1 - t, 3)});
  const shake = frame >= pullAt && !ripped ? (random(`ws${frame}`) - 0.5) * 8 * strain : 0;
  let truckX = interpolate(arrive, [0, 1], [-640, REST]) - strain * 26 + shake;
  if (ripped) truckX = REST - 26 - 7 * r - 0.9 * r * r;
  const spin = ripped ? -r * 40 : frame >= pullAt ? -(frame - pullAt) * 22 : -(1 - arrive) * 400;
  const rear = truckX + 560;
  // the machine: jolts out of the wall, tips over and gets dragged behind the truck
  const jolt = ripped ? Math.min(1, r / 4) : 0;
  const atmX = ripped ? Math.min(ATM_X - 130 * jolt, rear + 80) : ATM_X - strain * 6;
  const atmRot = ripped ? -16 * jolt - Math.min(10, r * 0.3) : 0;
  // cracks grow while the cable strains
  const crack = strain;
  const hooked = frame >= hookAt;
  const hookIn = ease(frame, hookAt - 6, hookAt);
  const camShake = ripped && r < 10 ? (random(`cs${frame}`) - 0.5) * 18 * (1 - r / 10) : 0;
  const card = pop(frame, 3, 13, 0.6, 150);
  // the cable from the winch drum to the hook on the machine: slack until the pull, then taut
  const x1 = rear + 2;
  const y1 = GROUND - 70;
  const x2 = atmX + 6;
  const y2 = GROUND - 150;
  const sag = frame >= pullAt ? 0 : 60 * (1 - 0.3 * hookIn);
  const hx = interpolate(hookIn, [0, 1], [x1, x2]);
  const hy = interpolate(hookIn, [0, 1], [y1, y2]);
  const status = ripped ? s.done ?? 'RIPPED OUT' : frame >= pullAt ? 'FLOOR IT' : hooked ? 'HOOKED' : frame >= backAt ? 'BACK UP' : s.find ?? 'FIND AN OUTDOOR ATM';
  const tone = ripped ? C.green : frame >= pullAt ? C.pink : hooked ? C.gold : '#ffffff';
  const statusAt = ripped ? ripAt : frame >= pullAt ? pullAt : hooked ? hookAt : frame >= backAt ? backAt : 6;
  const sp = pop(frame, statusAt, 10, 0.5, 220);
  const lamp = 0.85 + 0.15 * Math.sin(frame / 3);
  return (
    <AbsoluteFill>
      <SceneIn>
        <Background broll={s.broll} />
      </SceneIn>
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(4,6,18,0.55) 0%, rgba(4,6,18,0.82) 60%, rgba(2,3,8,0.95) 100%)'}} />
      <div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, opacity: Math.min(1, card * 1.4),
        transform: `translate(${camShake}px, ${camShake * 0.6}px)`}}>
        <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
          <defs>
            <radialGradient id="lampPool" cx="0.5" cy="0" r="1">
              <stop offset="0" stopColor="#ffd9a0" stopOpacity={0.35} />
              <stop offset="1" stopColor="#ffd9a0" stopOpacity={0} />
            </radialGradient>
          </defs>
          {/* the building: a concrete wall with brick courses */}
          <rect x={680} y={470} width={420} height={GROUND - 470} fill="#2b2833" />
          {Array.from({length: 22}).map((_, i) => (
            <line key={`c${i}`} x1={680} y1={500 + i * 34} x2={1080} y2={500 + i * 34} stroke="#24212b" strokeWidth={3} />
          ))}
          {Array.from({length: 22}).map((_, i) =>
            Array.from({length: 6}).map((__, j) => (
              <line key={`v${i}-${j}`} x1={700 + j * 70 + (i % 2) * 35} y1={500 + i * 34} x2={700 + j * 70 + (i % 2) * 35} y2={534 + i * 34}
                stroke="#24212b" strokeWidth={3} />
            )),
          )}
          <rect x={672} y={456} width={436} height={22} fill="#3a3644" />
          {/* the lit sign over the machine */}
          <rect x={ATM_X - 10} y={GROUND - ATM_H - 110} width={ATM_W + 20} height={74} rx={10} fill="#0a0a14" stroke={C.teal} strokeWidth={4} opacity={lamp} />
          <text x={ATM_X + ATM_W / 2} y={GROUND - ATM_H - 56} textAnchor="middle" fontFamily="Anton, Impact, sans-serif" fontSize={50} fill={C.teal}
            opacity={lamp}>{s.sign ?? 'ATM'}</text>
          {/* the hole it leaves */}
          <path d={`M${ATM_X - 8} ${GROUND} L${ATM_X - 14} ${GROUND - ATM_H + 20} L${ATM_X + 10} ${GROUND - ATM_H - 8} L${ATM_X + 70} ${GROUND - ATM_H - 2}
            L${ATM_X + 120} ${GROUND - ATM_H - 14} L${ATM_X + ATM_W + 12} ${GROUND - ATM_H + 6} L${ATM_X + ATM_W + 8} ${GROUND} Z`} fill="#06050a" />
          {/* cracks spreading from the machine's edges */}
          {[[ATM_X, GROUND - ATM_H, -60, -80], [ATM_X + ATM_W, GROUND - ATM_H, 70, -90], [ATM_X + ATM_W, GROUND - 120, 110, 10], [ATM_X + 40, GROUND - ATM_H, -10, -120]].map(
            ([x, y, dx, dy], i) => (
              <polyline key={`k${i}`} points={`${x},${y} ${x + dx * 0.4},${y + dy * 0.5} ${x + dx * 0.7},${y + dy * 0.6} ${x + dx},${y + dy}`}
                fill="none" stroke="#d9d4e6" strokeWidth={4} strokeDasharray={400} strokeDashoffset={400 * (1 - crack)} opacity={0.8} />
            ),
          )}
          {/* street lamp, sidewalk and road */}
          <rect x={120} y={430} width={14} height={GROUND - 430} fill="#1c2030" />
          <rect x={120} y={430} width={110} height={12} rx={6} fill="#1c2030" />
          <ellipse cx={226} cy={446} rx={26} ry={10} fill="#ffe2b0" opacity={lamp} />
          <polygon points={`200,446 252,446 420,${GROUND} 30,${GROUND}`} fill="url(#lampPool)" opacity={lamp} />
          <rect x={0} y={GROUND} width={1080} height={46} fill="#3b3a44" />
          <rect x={0} y={GROUND + 46} width={1080} height={120} fill="#17171f" />
          {Array.from({length: 8}).map((_, i) => (
            <rect key={`l${i}`} x={i * 150 - ((ripped ? r * 20 : 0) % 150)} y={GROUND + 100} width={80} height={8} fill="#c9a94a" opacity={0.6} />
          ))}
        </svg>
        {/* the machine itself */}
        <div style={{position: 'absolute', left: atmX, top: GROUND - ATM_H, width: ATM_W, height: ATM_H, transformOrigin: 'left bottom',
          transform: `rotate(${atmRot}deg)`, borderRadius: 10, background: 'linear-gradient(180deg, #9aa0ae, #5d6271)', border: '4px solid #2a2c35',
          boxShadow: ripped ? '0 20px 40px rgba(0,0,0,0.6)' : 'inset 0 0 0 3px rgba(255,255,255,0.08)'}}>
          <div style={{position: 'absolute', left: 18, top: 22, width: ATM_W - 44, height: 80, borderRadius: 6, background: '#05141a', border: `3px solid ${C.teal}`,
            boxShadow: `0 0 18px ${C.teal}88`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.mono, fontWeight: 800, fontSize: 20,
            color: C.teal, letterSpacing: 2}}>{ripped ? 'ERROR' : 'WELCOME'}</div>
          <div style={{position: 'absolute', left: 30, top: 120, display: 'grid', gridTemplateColumns: 'repeat(3, 24px)', gap: 8}}>
            {Array.from({length: 9}).map((_, i) => (
              <div key={i} style={{width: 24, height: 18, borderRadius: 4, background: '#2a2c35'}} />
            ))}
          </div>
          <div style={{position: 'absolute', left: 24, right: 24, top: 210, height: 12, borderRadius: 6, background: '#16171d'}} />
          <div style={{position: 'absolute', left: 24, right: 24, top: 240, height: 34, borderRadius: 6, background: '#3d4150', border: '2px solid #2a2c35'}} />
        </div>
        {/* debris and dust when it tears out */}
        {ripped && r < 40
          ? Array.from({length: 18}).map((_, i) => {
              const a = random(`da${i}`) * Math.PI - Math.PI * 0.95;
              const v = 10 + random(`dv${i}`) * 16;
              const px = ATM_X + random(`dx${i}`) * ATM_W + Math.cos(a) * v * r;
              const py = GROUND - random(`dy${i}`) * ATM_H + Math.sin(a) * v * r + 0.9 * r * r;
              const sz = 8 + random(`ds${i}`) * 18;
              return py < GROUND + 10 ? (
                <div key={`d${i}`} style={{position: 'absolute', left: px, top: py, width: sz, height: sz * 0.8, background: i % 3 ? '#6b6577' : '#a39db0',
                  transform: `rotate(${r * 20 + i * 40}deg)`, borderRadius: 2}} />
              ) : null;
            })
          : null}
        {ripped && r < 45
          ? Array.from({length: 7}).map((_, i) => {
              const grow = Math.min(1, r / 25);
              return (
                <div key={`p${i}`} style={{position: 'absolute', left: ATM_X - 60 + i * 40 - 120 * grow * (i / 7), top: GROUND - 120 - i * 24 * grow,
                  width: 120 + 160 * grow, height: 120 + 160 * grow, marginLeft: -60 * grow, marginTop: -60 * grow, borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(190,180,200,0.45) 0%, rgba(190,180,200,0) 70%)', opacity: 1 - r / 45}} />
              );
            })
          : null}
        <Truck x={truckX} spin={spin} brake={frame >= backAt && frame < pullAt} />
        {/* cable and hook */}
        {frame >= hookAt - 6 ? (
          <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
            <path d={`M${x1} ${y1} Q${(x1 + hx) / 2} ${Math.max(y1, hy) + sag} ${hx} ${hy}`} fill="none" stroke="#e6e8ef" strokeWidth={frame >= pullAt ? 6 : 5}
              strokeLinecap="round" />
            {frame >= pullAt && !ripped ? (
              <path d={`M${x1} ${y1} L${hx} ${hy}`} fill="none" stroke={C.pink} strokeWidth={14} opacity={0.25 + 0.25 * Math.sin(frame)} />
            ) : null}
            <path d={`M${hx} ${hy - 4} q 14 -2 14 14 q 0 16 -14 16 q -10 0 -12 -10`} fill="none" stroke={C.gold} strokeWidth={6} strokeLinecap="round" />
          </svg>
        ) : null}
      </div>
      <StepLabel step={s.step} label={s.label} />
      {/* status chip and the tension meter */}
      <div style={{position: 'absolute', top: 1222, left: 0, right: 0, display: 'flex', justifyContent: 'center', transform: `scale(${0.85 + 0.15 * sp})`}}>
        <div style={{fontFamily: F.brand, fontWeight: 900, fontSize: 42, letterSpacing: 4, color: '#06060F', background: tone, padding: '12px 34px',
          borderRadius: 14, boxShadow: `0 0 34px ${tone}aa`}}>{status}</div>
      </div>
      {frame >= pullAt ? (
        <div style={{position: 'absolute', top: 1306, left: 190, right: 190, opacity: ease(frame, pullAt, pullAt + 6)}}>
          <div style={{display: 'flex', justifyContent: 'space-between', fontFamily: F.mono, fontWeight: 800, fontSize: 24, letterSpacing: 4, color: '#fff', marginBottom: 8}}>
            <span>WINCH TENSION</span>
            <span style={{color: ripped ? C.green : C.pink}}>{ripped ? 'SNAP' : `${Math.round(strain * 100)}%`}</span>
          </div>
          <div style={{height: 18, borderRadius: 9, background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.4)', overflow: 'hidden'}}>
            <div style={{width: `${(ripped ? 1 : strain) * 100}%`, height: '100%', background: `linear-gradient(90deg, ${C.gold}, ${C.pink})`}} />
          </div>
        </div>
      ) : null}
      <Arabic text={s.ar} delay={16} top={1396} size={50} />
    </AbsoluteFill>
  );
};
