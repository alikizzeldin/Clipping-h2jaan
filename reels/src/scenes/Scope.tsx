import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Background} from '../ui/Background';
import {clamp, pop, sec} from '../ui/motion';
import {Arabic, Flash, SceneIn, StepLabel} from '../ui/Pieces';
import {C, F} from '../theme';
import {ScopeScene} from '../types';

// Seen through the hunter's rifle scope: a round lens (night-vision tint) over the footage, the
// rest of the frame black. A white-hot figure runs across the lens; the crosshair drifts after it
// and locks on at `lockAt` (red, "TARGET: YOU"); a chip adds the tracking dog at `dogAt`.

const LX = 540;
const LY = 860;
const LR = 420;

const Runner: React.FC<{x: number; y: number; step: number}> = ({x, y, step}) => {
  const s = Math.sin(step);
  return (
    <svg width={90} height={160} viewBox="0 0 90 160" style={{position: 'absolute', left: x - 45, top: y - 150, filter: 'blur(1px)'}}>
      <g fill="#f4fff6" stroke="#bfffd6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx={48} cy={18} r={13} />
        <path d="M44 32 L40 84 L52 84 L56 34 Z" />
        <path d={`M44 40 L${26 + 12 * s} ${62 - 6 * s}`} strokeWidth={10} fill="none" />
        <path d={`M52 40 L${68 - 12 * s} ${60 + 6 * s}`} strokeWidth={10} fill="none" />
        <path d={`M44 82 L${30 + 16 * s} ${120} L${24 + 18 * s} ${150}`} strokeWidth={12} fill="none" />
        <path d={`M50 82 L${62 - 16 * s} ${118} L${70 - 18 * s} ${150}`} strokeWidth={12} fill="none" />
      </g>
    </svg>
  );
};

export const Scope: React.FC<{s: ScopeScene}> = ({s}) => {
  const frame = useCurrentFrame();
  const lockAt = sec(s.lockAt);
  const dogAt = s.dogAt !== undefined ? sec(s.dogAt) : 99999;
  const locked = frame >= lockAt;
  const open = interpolate(frame, [0, 12], [0.2, 1], {...clamp, easing: (t) => 1 - Math.pow(1 - t, 3)});
  const r = LR * open;
  // the runner zig-zags across the lens
  const tx = LX - 220 + ((frame * 4.2) % 460);
  const ty = LY + 120 + Math.sin(frame / 9) * 30;
  // the crosshair lags behind until it locks
  const lag = locked ? 0 : 26;
  const cx = LX - 220 + (((frame - lag) * 4.2) % 460 + 460) % 460 + (locked ? 0 : 40 * Math.sin(frame / 7));
  const cy = (locked ? ty - 70 : LY + 40 + Math.sin(frame / 11) * 60);
  const tone = locked ? C.red : '#d9ffe6';
  const lockPop = pop(frame, lockAt, 9, 0.5, 240);
  const dog = pop(frame, dogAt, 10, 0.5, 220);
  return (
    <AbsoluteFill>
      <SceneIn>
        <Background broll={s.broll} />
      </SceneIn>
      {/* night-vision tint inside the lens */}
      <AbsoluteFill style={{background: 'rgba(60,255,140,0.22)', mixBlendMode: 'overlay', clipPath: `circle(${r}px at ${LX}px ${LY}px)`}} />
      <AbsoluteFill style={{background: 'repeating-linear-gradient(180deg, rgba(0,0,0,0.12) 0 2px, rgba(0,0,0,0) 2px 4px)', clipPath: `circle(${r}px at ${LX}px ${LY}px)`}} />
      <Runner x={tx} y={ty} step={frame / 2.5} />
      {/* everything outside the lens is black */}
      <AbsoluteFill style={{background: `radial-gradient(circle at ${LX}px ${LY}px, rgba(0,0,0,0) ${r - 4}px, rgba(0,0,0,0.92) ${r + 2}px, #000 ${r + 80}px)`}} />
      <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
        <circle cx={LX} cy={LY} r={r} fill="none" stroke="#0a0a0a" strokeWidth={26} />
        <circle cx={LX} cy={LY} r={r - 16} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={3} />
      </svg>
      <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, clipPath: `circle(${r - 14}px at ${LX}px ${LY}px)`}}>
        {/* the reticle, clipped to the lens */}
        <g stroke={tone} strokeWidth={4} opacity={open}>
          <line x1={cx - 260} y1={cy} x2={cx - 30} y2={cy} />
          <line x1={cx + 30} y1={cy} x2={cx + 260} y2={cy} />
          <line x1={cx} y1={cy - 260} x2={cx} y2={cy - 30} />
          <line x1={cx} y1={cy + 30} x2={cx} y2={cy + 260} />
          <line x1={cx - 420} y1={cy} x2={cx - 260} y2={cy} strokeWidth={14} />
          <line x1={cx + 260} y1={cy} x2={cx + 420} y2={cy} strokeWidth={14} />
          <line x1={cx} y1={cy + 260} x2={cx} y2={cy + 420} strokeWidth={14} />
          {[-200, -150, -100, -50, 50, 100, 150, 200].map((d) => (
            <g key={d}>
              <circle cx={cx + d} cy={cy} r={4} fill={tone} />
              <circle cx={cx} cy={cy + d} r={4} fill={tone} />
            </g>
          ))}
          {locked ? <circle cx={cx} cy={cy} r={46 + 10 * (1 - lockPop)} fill="none" strokeWidth={5} /> : null}
        </g>
      </svg>
      <div style={{position: 'absolute', left: 120, top: LY - LR + 40, fontFamily: F.mono, fontSize: 26, letterSpacing: 4, color: '#d9ffe6', opacity: 0.85}}>
        {s.zoom ?? 'ZOOM 8×'}
      </div>
      {locked ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: LY - LR + 90, display: 'flex', justifyContent: 'center', transform: `scale(${lockPop})`}}>
          <div style={{fontFamily: F.display, fontSize: 92, letterSpacing: 6, color: '#fff', background: C.red, padding: '6px 30px', borderRadius: 10,
            boxShadow: `0 0 40px ${C.red}`}}>{s.lockText ?? 'TARGET: YOU'}</div>
        </div>
      ) : null}
      {frame >= dogAt ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: LY + LR + 34, display: 'flex', justifyContent: 'center', transform: `scale(${dog})`}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 16, fontFamily: F.brand, fontSize: 44, letterSpacing: 3, color: '#0b0b0b', background: C.gold,
            padding: '10px 28px', borderRadius: 14}}>
            <svg width={46} height={46} viewBox="0 0 40 40"><g fill="#0b0b0b"><circle cx={20} cy={26} r={9} /><circle cx={9} cy={15} r={4.5} /><circle cx={16} cy={9} r={4.5} /><circle cx={24} cy={9} r={4.5} /><circle cx={31} cy={15} r={4.5} /></g></svg>
            {s.dogText ?? '+ TRACKING DOG'}
          </div>
        </div>
      ) : null}
      <Flash at={lockAt} length={6} color={C.red} strength={0.35} />
      <StepLabel step={s.step} label={s.label} />
      <Arabic text={s.ar} delay={16} top={LY + LR + 130} size={50} />
    </AbsoluteFill>
  );
};
