import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Background} from '../ui/Background';
import {clamp, pop, sec} from '../ui/motion';
import {Arabic, SceneIn, StepLabel} from '../ui/Pieces';
import {C, F} from '../theme';
import {SnapScene} from '../types';

// A phone camera hunting for murals: the viewfinder shows a painted wall with a tag; on each shot
// the shutter flashes, the counter ticks up, a thumbnail drops into the strip and the next mural
// slides in. After the last one a chip pops (e.g. "CLUE UNLOCKED").

const PALETTES: [string, string, string][] = [
  ['#ff5fa2', '#ffb347', '#2b1055'],
  ['#21d4fd', '#b721ff', '#0b1d3a'],
  ['#f9f871', '#ff6f91', '#3a0f2e'],
  ['#5ef2c2', '#2a7bff', '#071b2a'],
  ['#ffcf5c', '#ff3d77', '#1f0b33'],
];

const Mural: React.FC<{i: number; tag: string; w: number; h: number}> = ({i, tag, w, h}) => {
  const [a, b, bg] = PALETTES[i % PALETTES.length];
  return (
    <div style={{position: 'relative', width: w, height: h, overflow: 'hidden', background: `linear-gradient(${30 + i * 50}deg, ${bg}, ${a}55 60%, ${b}88)`}}>
      {/* brick courses */}
      <div style={{position: 'absolute', inset: 0, background: 'repeating-linear-gradient(180deg, rgba(0,0,0,0.16) 0 3px, rgba(0,0,0,0) 3px 46px)'}} />
      <div style={{position: 'absolute', left: w * (0.1 + 0.15 * (i % 3)), top: h * 0.08, width: h * 0.42, height: h * 0.42, borderRadius: '50%',
        background: `radial-gradient(circle, ${b} 0%, ${a} 70%)`, opacity: 0.85}} />
      {[0, 1, 2, 3].map((k) => (
        <div key={k} style={{position: 'absolute', left: -40, right: -40, top: h * (0.56 + k * 0.08), height: h * 0.035, background: k % 2 ? a : b,
          transform: `rotate(${(i % 2 ? -1 : 1) * 4}deg)`, opacity: 0.8}} />
      ))}
      <div style={{position: 'absolute', left: 0, right: 0, top: h * 0.3, textAlign: 'center', fontFamily: F.display, fontSize: h * 0.34, lineHeight: 1,
        color: '#fff', letterSpacing: 4, transform: `rotate(${(i % 2 ? 1 : -1) * 6}deg)`, WebkitTextStroke: `10px ${bg}`, paintOrder: 'stroke fill',
        textShadow: `8px 8px 0 ${a}`}}>{tag}</div>
    </div>
  );
};

export const Snap: React.FC<{s: SnapScene}> = ({s}) => {
  const frame = useCurrentFrame();
  const shots = s.shots.map((x) => sec(x.at));
  const taken = shots.filter((t) => frame >= t).length;
  const last = taken > 0 ? shots[taken - 1] : -99;
  const flash = interpolate(frame, [last, last + 1, last + 7], [0, 1, 0], clamp);
  const slide = taken > 0 && taken < shots.length ? interpolate(frame, [last + 3, last + 12], [1, 0], {...clamp, easing: (t) => 1 - Math.pow(1 - t, 3)}) : 0;
  const card = pop(frame, 3, 13, 0.6, 150);
  const doneAt = s.done ? sec(s.done.at) : 99999;
  const done = pop(frame, doneAt, 10, 0.5, 220);
  const SW = 720;
  const MH = 580;
  return (
    <AbsoluteFill>
      <SceneIn>
        <Background broll={s.broll} />
      </SceneIn>
      <AbsoluteFill style={{background: 'rgba(0,0,0,0.45)'}} />
      <StepLabel step={s.step} label={s.label} />
      {/* the phone */}
      <div style={{position: 'absolute', left: 150, top: 380, width: 780, height: 950, borderRadius: 64, background: '#0b0c10', border: '6px solid #2c2f38',
        boxShadow: '0 40px 90px rgba(0,0,0,0.7)', opacity: Math.min(1, card * 1.4), transform: `scale(${0.88 + 0.12 * card}) rotate(${(1 - card) * -4}deg)`}}>
        <div style={{position: 'absolute', left: 24, top: 24, right: 24, bottom: 24, borderRadius: 44, overflow: 'hidden', background: '#000'}}>
          {/* top bar */}
          <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px',
            fontFamily: F.mono, fontSize: 26, letterSpacing: 4, color: '#fff', zIndex: 3}}>
            <span>{s.mode ?? 'PHOTO'}</span>
            <span style={{color: C.gold}}>{Math.min(taken + (taken < shots.length ? 1 : 0), shots.length)}/{shots.length}</span>
          </div>
          {/* the viewfinder: the next mural slides in after each shot */}
          <div style={{position: 'absolute', left: 0, top: 70, width: SW, height: MH, overflow: 'hidden'}}>
            <div style={{position: 'absolute', left: slide * SW, top: 0}}>
              <Mural i={Math.min(taken, shots.length - 1)} tag={s.tag} w={SW} h={MH} />
            </div>
            {slide > 0 ? (
              <div style={{position: 'absolute', left: (slide - 1) * SW, top: 0}}>
                <Mural i={taken - 1} tag={s.tag} w={SW} h={MH} />
              </div>
            ) : null}
            {/* focus brackets */}
            {[[40, 40], [SW - 90, 40], [40, MH - 90], [SW - 90, MH - 90]].map(([x, y], k) => (
              <div key={k} style={{position: 'absolute', left: x, top: y, width: 50, height: 50, borderColor: '#fff', borderStyle: 'solid', borderWidth: 0,
                borderTopWidth: k < 2 ? 5 : 0, borderBottomWidth: k > 1 ? 5 : 0, borderLeftWidth: k % 2 ? 0 : 5, borderRightWidth: k % 2 ? 5 : 0}} />
            ))}
            <div style={{position: 'absolute', inset: 0, background: '#fff', opacity: flash}} />
          </div>
          {/* the strip of shots */}
          <div style={{position: 'absolute', left: 0, right: 0, top: 70 + MH + 22, display: 'flex', justifyContent: 'center', gap: 14}}>
            {shots.map((t, k) => {
              const p = pop(frame, t + 2, 10, 0.5, 220);
              return (
                <div key={k} style={{width: 112, height: 112, borderRadius: 14, overflow: 'hidden', border: `4px solid ${frame >= t ? C.gold : 'rgba(255,255,255,0.25)'}`,
                  background: 'rgba(255,255,255,0.06)'}}>
                  {frame >= t ? (
                    <div style={{transform: `scale(${0.155 * p})`, transformOrigin: 'top left'}}>
                      <Mural i={k} tag={s.tag} w={SW} h={MH} />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
          {/* shutter */}
          <div style={{position: 'absolute', left: '50%', bottom: 22, marginLeft: -44, width: 88, height: 88, borderRadius: 44, border: '6px solid #fff',
            background: flash > 0 ? '#fff' : 'rgba(255,255,255,0.25)', transform: `scale(${1 - 0.15 * flash})`}} />
          {s.done && frame >= doneAt ? (
            <div style={{position: 'absolute', left: 0, right: 0, top: 300, display: 'flex', justifyContent: 'center', transform: `scale(${done}) rotate(-4deg)`, zIndex: 4}}>
              <div style={{fontFamily: F.display, fontSize: 82, letterSpacing: 4, color: '#0b0b0b', background: C.gold, padding: '12px 34px', borderRadius: 16,
                boxShadow: '0 14px 0 rgba(0,0,0,0.55)'}}>{s.done.text}</div>
            </div>
          ) : null}
        </div>
      </div>
      <Arabic text={s.ar} delay={16} top={1370} size={52} />
    </AbsoluteFill>
  );
};
