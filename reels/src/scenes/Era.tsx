import React from 'react';
import {AbsoluteFill, Img, OffthreadVideo, Sequence, interpolate, random, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Background} from '../ui/Background';
import {clamp, ease, pop, sec} from '../ui/motion';
import {Arabic, Flash} from '../ui/Pieces';
import {C, F} from '../theme';
import {Era as EraT, EraScene} from '../types';

// Each era's screen and colours: an old CRT for the PS2 games, a flat panel for GTA 4,
// a crisp HD screen for GTA 5. The look is our own; no game logos are used.
const LOOK = {
  vc: {w: 900, h: 675, radius: 70, bezel: 34, bg: 'linear-gradient(160deg, #ff3cac 0%, #784ba0 55%, #2b86c5 100%)',
    ink: '#fff', accent: '#3ff2ff', font: F.brand, italic: true, scan: 0.22, wobble: 1, sat: 1.15},
  sa: {w: 900, h: 675, radius: 70, bezel: 34, bg: 'linear-gradient(160deg, #f6b042 0%, #b8692b 50%, #2c4a2e 100%)',
    ink: '#fff6dc', accent: '#9cff6e', font: F.display, italic: false, scan: 0.2, wobble: 0.8, sat: 1.05},
  iv: {w: 960, h: 540, radius: 18, bezel: 16, bg: 'linear-gradient(160deg, #6f7f8f 0%, #2c3640 60%, #12171d 100%)',
    ink: '#e9eef3', accent: '#ffd86b', font: F.body, italic: false, scan: 0.08, wobble: 0.3, sat: 0.6},
  v: {w: 960, h: 540, radius: 10, bezel: 8, bg: 'linear-gradient(160deg, #1b5e3b 0%, #0d2a1c 60%, #050d09 100%)',
    ink: '#ffffff', accent: '#8cff5a', font: F.brand, italic: false, scan: 0.03, wobble: 0, sat: 1},
} as const;

const Chip: React.FC<{text: string; show: number; accent: string}> = ({text, show, accent}) => (
  <div style={{
    minWidth: 92, height: 92, padding: '0 14px', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.45)', border: `4px solid ${accent}`, color: '#fff', fontFamily: F.display, fontSize: 54,
    boxShadow: `0 0 ${20 * show}px ${accent}`, transform: `scale(${0.4 + 0.6 * show})`, opacity: show,
  }}>{text}</div>
);

const EraCard: React.FC<{era: EraT; start: number; end: number; beats?: number[]}> = ({era, start, end}) => {
  const frame = useCurrentFrame();
  const look = LOOK[era.look];
  const t = frame - start;
  const on = pop(frame, start, 12, 0.6, 170);
  const jitter = (random(`j${frame}`) - 0.5) * 6 * look.wobble;
  const roll = interpolate(t, [0, 6], [60, 0], clamp); // the picture rolls into place like a channel switch
  const noise = interpolate(t, [0, 3, 7], [1, 0.8, 0], clamp);
  const fadeOut = interpolate(frame, [end - 5, end], [1, 0], clamp);
  const items = era.cheat.split(' ');
  const typedChars = Math.floor(interpolate(t, [10, 10 + era.cheat.length * 3], [0, era.cheat.length], clamp));
  const done = t > 10 + era.cheat.length * 3 + 6;
  // Spoken buttons appear on the narrator's word; the rest follow quickly.
  const beats = (era.beats ?? []).map((b) => sec(b) - start);
  const chipAt = (i: number) => (i < beats.length ? beats[i] : (beats.length ? beats[beats.length - 1] + 6 + (i - beats.length) * 4 : 12 + i * 4));
  return (
    <div style={{position: 'absolute', left: (1080 - look.w) / 2, top: 360 + (675 - look.h) / 2, width: look.w, height: look.h,
      opacity: Math.min(1, on * 1.5) * fadeOut, transform: `scale(${0.9 + 0.1 * on}) translateX(${jitter}px)`}}>
      {/* the set around the picture */}
      <div style={{position: 'absolute', inset: -look.bezel, borderRadius: look.radius + look.bezel,
        background: era.look === 'v' ? '#0a0a0a' : 'linear-gradient(180deg, #3a3a3a, #161616)',
        boxShadow: `0 40px 90px rgba(0,0,0,0.7), 0 0 80px ${look.accent}33`}} />
      <div style={{position: 'absolute', inset: 0, borderRadius: look.radius, overflow: 'hidden', background: look.bg,
        filter: `saturate(${look.sat})`, transform: `translateY(${roll}px)`}}>
        <div style={{position: 'absolute', top: 30, left: 40, fontFamily: F.mono, fontWeight: 800, fontSize: 34, color: look.ink, opacity: 0.85, letterSpacing: 6}}>
          {era.year}
        </div>
        <div style={{position: 'absolute', top: 76, left: 0, right: 0, textAlign: 'center', fontFamily: look.font, fontWeight: 900,
          fontStyle: look.italic ? 'italic' : 'normal', fontSize: era.look === 'iv' ? 84 : 104, color: look.ink, letterSpacing: era.look === 'iv' ? 14 : 2,
          textShadow: era.look === 'vc' ? `0 0 30px ${C.pink}, 4px 4px 0 #2b0a3d` : '0 6px 0 rgba(0,0,0,0.45)', textTransform: 'uppercase'}}>
          {era.game}
        </div>
        <div style={{position: 'absolute', top: look.h * 0.45, left: 30, right: 30, display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap'}}>
          {era.kind === 'buttons' ? items.map((it, i) => (
            <Chip key={i} text={it} accent={look.accent} show={interpolate(t, [chipAt(i), chipAt(i) + 5], [0, 1], clamp)} />
          )) : null}
          {era.kind !== 'buttons' ? (
            <div style={{fontFamily: era.kind === 'dial' ? F.mono : F.display, fontWeight: 800, fontSize: era.kind === 'dial' ? 70 : 140,
              color: look.ink, letterSpacing: era.kind === 'dial' ? 2 : 10, padding: '6px 26px', borderRadius: 16,
              background: era.kind === 'dial' ? 'rgba(0,0,0,0.5)' : 'transparent', border: era.kind === 'dial' ? `3px solid ${look.accent}` : 'none',
              textShadow: `0 0 24px ${look.accent}`}}>
              {era.cheat.slice(0, typedChars)}
              <span style={{opacity: Math.floor(frame / 8) % 2 ? 0 : 1, color: look.accent}}>▌</span>
            </div>
          ) : null}
        </div>
        {era.note ? (
          <div style={{position: 'absolute', bottom: 40, left: 0, right: 0, textAlign: 'center', fontFamily: F.mono, fontWeight: 800, fontSize: 30,
            letterSpacing: 6, color: look.accent, opacity: done || era.kind === 'buttons' ? ease(t, 50, 62) : 0}}>{era.note}</div>
        ) : null}
        {era.kind === 'typed' && done ? (
          <div style={{position: 'absolute', top: 30, right: 40, fontFamily: F.body, fontWeight: 800, fontSize: 30, color: '#fff',
            background: 'rgba(0,0,0,0.55)', padding: '6px 14px', borderRadius: 6}}>Cheat activated</div>
        ) : null}
        {era.look === 'v' && t > 70 ? (
          <svg width={260} height={110} viewBox="0 0 260 110" style={{position: 'absolute', top: 40, left: interpolate(t, [70, 130], [-260, look.w + 40], clamp)}}>
            <rect x={60} y={44} width={140} height={34} rx={17} fill="#111" />
            <rect x={196} y={54} width={60} height={8} fill="#111" />
            <rect x={20} y={36} width={220} height={5} fill="#111" transform={`rotate(${(frame * 25) % 12 - 6} 130 38)`} />
            <rect x={126} y={36} width={8} height={12} fill="#111" />
            <rect x={80} y={84} width={100} height={5} fill="#111" />
          </svg>
        ) : null}
        <AbsoluteFill style={{background: `repeating-linear-gradient(0deg, rgba(0,0,0,${look.scan}) 0px, rgba(0,0,0,${look.scan}) 2px, transparent 2px, transparent 5px)`}} />
        {noise > 0 ? (
          <svg width={look.w} height={look.h} style={{position: 'absolute', inset: 0, opacity: noise}}>
            <filter id={`n${start}`}><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed={frame} /><feColorMatrix type="saturate" values="0" /></filter>
            <rect width={look.w} height={look.h} filter={`url(#n${start})`} />
          </svg>
        ) : null}
        <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)'}} />
      </div>
    </div>
  );
};


// ---------- With real footage: the old game plays in the TV, the cheat sits under it ----------

const LIVE = {vc: {w: 760, h: 570}, sa: {w: 760, h: 570}, iv: {w: 960, h: 540}, v: {w: 960, h: 540}} as const;
const TV_TOP = 372;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
const keyOf = (ch: string) => {
  const c = ch.toUpperCase();
  if (/[0-9*#]/.test(c)) return c;
  const groups: Record<string, string> = {ABC: '2', DEF: '3', GHI: '4', JKL: '5', MNO: '6', PQRS: '7', TUV: '8', WXYZ: '9'};
  for (const [g, k] of Object.entries(groups)) if (g.includes(c)) return k;
  return '';
};
const TITLE_STYLE: Record<EraT['look'], React.CSSProperties> = {
  vc: {fontFamily: F.brand, fontStyle: 'italic', fontWeight: 900, color: '#fff', textShadow: `0 0 18px ${C.pink}, 3px 3px 0 #2b0a3d`, background: 'linear-gradient(90deg, #ff3cac, #784ba0)'},
  sa: {fontFamily: F.display, color: '#fff6dc', letterSpacing: 3, textShadow: '3px 3px 0 #3a2410', background: 'linear-gradient(90deg, #b8692b, #2c4a2e)'},
  iv: {fontFamily: F.body, fontWeight: 800, color: '#e9eef3', letterSpacing: 10, background: 'linear-gradient(90deg, #3c4650, #12171d)'},
  v: {fontFamily: F.brand, fontWeight: 900, color: '#fff', background: 'linear-gradient(90deg, #1b5e3b, #0d2a1c)'},
};

const Screen: React.FC<{era: EraT; start: number; end: number}> = ({era, start, end}) => {
  const frame = useCurrentFrame();
  const media = era.media ?? [];
  const size = LIVE[era.look];
  const look = LOOK[era.look];
  const cuts = media.map((m) => sec(m.at));
  const sinceCut = Math.min(...cuts.map((c) => (frame >= c ? frame - c : 999)), frame - start);
  const noise = interpolate(sinceCut, [0, 2, 6], [0.9, 0.6, 0], clamp);
  return (
    <div style={{position: 'absolute', inset: 0, borderRadius: look.radius, overflow: 'hidden', background: '#000'}}>
      {media.map((m, i) => {
        const from = sec(m.at);
        const to = i + 1 < media.length ? sec(media[i + 1].at) : end;
        const local = frame - from;
        const z = m.zoom ? interpolate(local, [0, to - from], m.zoom, clamp) : 1.04;
        return (
          <Sequence key={i} from={from} durationInFrames={Math.max(1, to - from)} layout="none">
            <div style={{position: 'absolute', inset: 0, transform: `scale(${z})`, filter: `saturate(${era.look === 'iv' ? 0.85 : 1.15}) contrast(1.08)`}}>
              {m.kind === 'video' ? (
                <OffthreadVideo src={staticFile(m.src)} startFrom={Math.round((m.startFrom ?? 0) * 30)} muted
                  style={{width: '100%', height: '100%', objectFit: 'cover'}} />
              ) : (
                <Img src={staticFile(m.src)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
              )}
            </div>
            {m.flash ? <Flash at={0} length={9} strength={0.85} /> : null}
          </Sequence>
        );
      })}
      <AbsoluteFill style={{background: `repeating-linear-gradient(0deg, rgba(0,0,0,${look.scan}) 0px, rgba(0,0,0,${look.scan}) 2px, transparent 2px, transparent 5px)`}} />
      {noise > 0 ? (
        <svg width={size.w} height={size.h} style={{position: 'absolute', inset: 0, opacity: noise}}>
          <filter id={`ln${start}`}><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed={frame} /><feColorMatrix type="saturate" values="0" /></filter>
          <rect width={size.w} height={size.h} filter={`url(#ln${start})`} />
        </svg>
      ) : null}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, transparent 58%, rgba(0,0,0,0.6) 100%)'}} />
    </div>
  );
};

const Strip: React.FC<{era: EraT; start: number}> = ({era, start}) => {
  const frame = useCurrentFrame();
  const look = LOOK[era.look];
  const t = frame - start;
  const top = TV_TOP + LIVE[era.look].h + 26;
  const on = ease(t, 4, 16);
  const beats = (era.beats ?? []).map((b) => sec(b) - start);
  if (era.kind === 'buttons') {
    const items = era.cheat.split(' ');
    const chipAt = (i: number) => (i < beats.length ? beats[i] : (beats.length ? beats[beats.length - 1] + 6 + (i - beats.length) * 3 : 12 + i * 4));
    const allIn = chipAt(items.length - 1) + 6;
    return (
      <div style={{position: 'absolute', top, left: 40, right: 40, height: 104, borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        background: 'rgba(8,6,16,0.78)', border: `2px solid ${look.accent}66`, opacity: on, boxShadow: `0 20px 50px rgba(0,0,0,0.6)`}}>
        {items.map((it, i) => {
          const show = interpolate(t, [chipAt(i), chipAt(i) + 5], [0, 1], clamp);
          return (
            <div key={i} style={{minWidth: 70, height: 70, padding: '0 8px', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.5)', border: `3px solid ${look.accent}`, color: '#fff', fontFamily: F.display, fontSize: 40,
              boxShadow: `0 0 ${16 * show}px ${look.accent}`, transform: `scale(${0.4 + 0.6 * show})`, opacity: show}}>{it}</div>
          );
        })}
        {era.note ? (
          <div style={{position: 'absolute', top: -22, right: 24, fontFamily: F.mono, fontWeight: 800, fontSize: 24, letterSpacing: 3, padding: '4px 12px',
            borderRadius: 8, background: look.accent, color: '#06060F', opacity: ease(t, allIn, allIn + 8)}}>{era.note}</div>
        ) : null}
      </div>
    );
  }
  // typed (San Andreas): the letters land on the narrator's word
  const typeAt = beats.length ? beats[0] : 10;
  const typed = Math.floor(interpolate(t, [typeAt, typeAt + era.cheat.length * 3], [0, era.cheat.length], clamp));
  const done = t > typeAt + era.cheat.length * 3 + 2;
  return (
    <div style={{position: 'absolute', top, left: 80, right: 80, height: 120, borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(8,6,16,0.78)', border: `2px solid ${look.accent}66`, opacity: on, boxShadow: '0 20px 50px rgba(0,0,0,0.6)'}}>
      <div style={{fontFamily: F.display, fontSize: 96, letterSpacing: 12, color: look.ink, textShadow: `0 0 24px ${look.accent}`}}>
        {era.cheat.slice(0, typed)}
        <span style={{opacity: done ? 0 : Math.floor(frame / 8) % 2 ? 0 : 1, color: look.accent}}>▌</span>
      </div>
      {era.note ? (
        <div style={{position: 'absolute', top: -22, right: 24, fontFamily: F.mono, fontWeight: 800, fontSize: 24, letterSpacing: 3, padding: '4px 12px',
          borderRadius: 8, background: look.accent, color: '#06060F', opacity: done ? ease(t, typeAt + era.cheat.length * 3 + 2, typeAt + era.cheat.length * 3 + 12) : 0}}>{era.note}</div>
      ) : null}
    </div>
  );
};

const Phone: React.FC<{era: EraT; start: number; end: number}> = ({era, start, end}) => {
  const frame = useCurrentFrame();
  const t = frame - start;
  const beats = (era.beats ?? []).map((b) => sec(b) - start);
  const typeAt = beats.length ? beats[0] : 12;
  const doneAt = era.done !== undefined ? sec(era.done) - start : typeAt + era.cheat.length * 2 + 4;
  const n = era.cheat.length;
  const typed = Math.floor(interpolate(t, [typeAt, doneAt - 3], [0, n], clamp));
  const current = typed > 0 && t < doneAt ? keyOf(era.cheat[typed - 1]) : '';
  const done = t >= doneAt;
  const iv = era.look === 'iv';
  const rise = pop(frame, start + 2, 14, 0.6, 150);
  const out = interpolate(frame, [end - 5, end], [1, 0], clamp);
  const W = iv ? 340 : 360;
  const accent = LOOK[era.look].accent;
  return (
    <div style={{position: 'absolute', top: 1000 + (1 - rise) * 260, left: 540 - W / 2, width: W, height: 500, opacity: Math.min(1, rise * 1.4) * out,
      borderRadius: iv ? 44 : 58, padding: iv ? 18 : 14, background: iv ? 'linear-gradient(160deg, #5b636c, #23282e)' : 'linear-gradient(160deg, #26272b, #0b0b0d)',
      boxShadow: `0 40px 90px rgba(0,0,0,0.75), 0 0 0 3px rgba(255,255,255,0.06), 0 0 60px ${accent}33`, transform: `rotate(${iv ? -3 : 3}deg)`}}>
      <div style={{height: iv ? 168 : 196, borderRadius: iv ? 14 : 40, padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        background: iv ? 'linear-gradient(180deg, #9fc7d8, #6d9fb6)' : 'linear-gradient(180deg, #1b1d22, #0e0f12)', boxShadow: 'inset 0 0 0 2px rgba(0,0,0,0.3)'}}>
        <div style={{fontFamily: F.mono, fontWeight: 800, fontSize: 20, letterSpacing: 3, color: iv ? '#16303d' : 'rgba(255,255,255,0.55)'}}>{iv ? 'PHONE' : 'iFRUIT'}</div>
        <div style={{fontFamily: iv ? F.mono : F.body, fontWeight: 800, fontSize: Math.min(40, Math.floor((iv ? 268 : 300) / (n * (iv ? 0.62 : 0.6)))), color: iv ? '#0b1e28' : '#fff', whiteSpace: 'nowrap', textAlign: 'center'}}>
          {era.cheat.slice(0, typed)}<span style={{opacity: done ? 0 : Math.floor(frame / 8) % 2 ? 0 : 1}}>|</span>
        </div>
        <div style={{height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.mono, fontWeight: 800, fontSize: 20,
          letterSpacing: 2, color: done ? '#06060F' : (iv ? '#16303d' : 'rgba(255,255,255,0.5)'), background: done ? accent : 'transparent',
          transform: `scale(${done ? 0.9 + 0.1 * pop(frame, start + doneAt, 10, 0.5, 220) : 1})`}}>{done ? 'CHEAT ACTIVATED' : typed ? 'CALLING…' : ''}</div>
      </div>
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: iv ? 10 : 14, marginTop: 18, padding: iv ? '0 8px' : '0 16px'}}>
        {KEYS.map((k) => {
          const hit = k === current;
          return (
            <div key={k} style={{height: iv ? 56 : 54, borderRadius: iv ? 12 : 27, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: F.body, fontWeight: 800, fontSize: 28, color: hit ? '#06060F' : '#fff',
              background: hit ? accent : (iv ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.1)'), boxShadow: hit ? `0 0 18px ${accent}` : 'none'}}>{k}</div>
          );
        })}
      </div>
    </div>
  );
};

const Photo: React.FC<{p: NonNullable<EraT['photos']>[number]; end: number; index: number}> = ({p, end, index}) => {
  const frame = useCurrentFrame();
  const at = sec(p.at);
  if (frame < at) return null;
  const drop = pop(frame, at, 13, 0.55, 170);
  const out = interpolate(frame, [end - 6, end], [1, 0], clamp);
  const sway = Math.sin((frame - at) / 22 + index) * 0.8;
  return (
    <div style={{position: 'absolute', left: p.x, top: p.y - (1 - drop) * 180, width: p.w, padding: '14px 14px 0', background: '#f4efe3', borderRadius: 6,
      transform: `rotate(${p.rot * (0.4 + 0.6 * drop) + sway}deg) scale(${1.25 - 0.25 * drop})`, opacity: Math.min(1, drop * 1.6) * out,
      boxShadow: '0 30px 70px rgba(0,0,0,0.7), 0 4px 10px rgba(0,0,0,0.4)'}}>
      <Img src={staticFile(p.src)} style={{width: '100%', display: 'block', borderRadius: 2}} />
      <div style={{height: p.caption ? 64 : 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.hand, fontSize: 30, color: '#1d1a2b'}}>{p.caption}</div>
      <div style={{position: 'absolute', top: -16, left: '50%', width: 140, height: 38, marginLeft: -70, background: 'rgba(240,228,190,0.82)',
        transform: `rotate(${index % 2 ? 4 : -5}deg)`, boxShadow: '0 2px 6px rgba(0,0,0,0.25)'}} />
    </div>
  );
};

const EraLive: React.FC<{era: EraT; start: number; end: number}> = ({era, start, end}) => {
  const frame = useCurrentFrame();
  const size = LIVE[era.look];
  const look = LOOK[era.look];
  const t = frame - start;
  const on = pop(frame, start, 12, 0.6, 170);
  const fadeOut = interpolate(frame, [end - 5, end], [1, 0], clamp);
  const jitter = (random(`j${frame}`) - 0.5) * 4 * look.wobble;
  const title = ease(t, 2, 12);
  return (
    <AbsoluteFill style={{opacity: Math.min(1, on * 1.5) * fadeOut}}>
      <div style={{position: 'absolute', left: (1080 - size.w) / 2, top: TV_TOP, width: size.w, height: size.h,
        transform: `scale(${0.92 + 0.08 * on}) translateX(${jitter}px)`}}>
        <div style={{position: 'absolute', inset: -look.bezel * 0.7, borderRadius: look.radius + look.bezel * 0.7,
          background: era.look === 'v' ? '#0a0a0a' : 'linear-gradient(180deg, #3a3a3a, #161616)', boxShadow: `0 40px 90px rgba(0,0,0,0.7), 0 0 80px ${look.accent}33`}} />
        <Screen era={era} start={start} end={end} />
      </div>
      <div style={{position: 'absolute', top: TV_TOP - 70, left: (1080 - size.w) / 2 - 18, padding: '6px 22px', borderRadius: 12, fontSize: 52, lineHeight: 1.1,
        textTransform: 'uppercase', transform: `rotate(-3deg) translateX(${(1 - title) * -40}px)`, opacity: title, boxShadow: '0 10px 30px rgba(0,0,0,0.5)', ...TITLE_STYLE[era.look]}}>
        {era.game} <span style={{fontFamily: F.mono, fontStyle: 'normal', fontWeight: 800, fontSize: 30, letterSpacing: 2, opacity: 0.85}}>{era.year}</span>
      </div>
      {era.kind === 'dial' ? <Phone era={era} start={start} end={end} /> : <Strip era={era} start={start} />}
      {(era.photos ?? []).map((p, i) => <Photo key={i} p={p} end={end} index={i} />)}
    </AbsoluteFill>
  );
};

export const Era: React.FC<{s: EraScene}> = ({s}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const starts = s.eras.map((e) => sec(e.at));
  const breakout = interpolate(frame, [durationInFrames - 12, durationInFrames], [0, 1], clamp);
  const live = s.eras.some((e) => e.media?.length);
  const glow = s.eras.length ? LOOK[s.eras[Math.max(0, starts.filter((st) => frame >= st).length - 1)].look].accent : C.pink;
  if (s.recap) {
    const tiles = ['VICE CITY', 'SAN ANDREAS', 'GTA IV', 'GTA V', 'GTA 6'];
    const at = sec(s.recap.at);
    return (
      <AbsoluteFill>
        <Background broll={s.broll} />
        <div style={{position: 'absolute', top: 360, left: 40, right: 40, display: 'flex', justifyContent: 'center', gap: 14}}>
          {tiles.map((name, i) => {
            const p = pop(frame, at + i * 6, 12, 0.5, 200);
            const last = i === tiles.length - 1;
            return (
              <div key={name} style={{width: last ? 220 : 170, height: last ? 260 : 210, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                textAlign: 'center', padding: 10, fontFamily: last ? F.display : F.mono, fontWeight: 800, fontSize: last ? 54 : 24, color: '#fff',
                background: last ? `linear-gradient(160deg, ${C.pink}, ${C.orange})` : 'rgba(255,255,255,0.08)', border: `2px solid ${last ? '#fff' : 'rgba(255,255,255,0.25)'}`,
                transform: `translateY(${(1 - p) * 60}px) scale(${0.8 + 0.2 * p})`, opacity: p, alignSelf: 'flex-end',
                boxShadow: last ? `0 0 50px ${C.pink}99` : 'none', filter: last ? 'none' : 'grayscale(0.6)'}}>{name}</div>
            );
          })}
        </div>
        <div style={{position: 'absolute', top: 720, left: 60, right: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10}}>
          {s.recap.lines.map((line, i) => {
            const a = ease(frame, sec(line.at), sec(line.at) + 12);
            return (
              <div key={i} style={{fontFamily: F.display, fontSize: 104, lineHeight: 1, textAlign: 'center', textTransform: 'uppercase',
                color: line.color === 'pink' ? C.pink : '#fff', opacity: a, transform: `translateY(${(1 - a) * 30}px)`,
                WebkitTextStroke: '8px #000', paintOrder: 'stroke fill', textShadow: line.color === 'pink' ? `0 0 30px ${C.pink}88` : 'none'}}>{line.text}</div>
            );
          })}
        </div>
        <Arabic text={s.ar} delay={at + 30} top={1150} size={56} />
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{background: '#07060c'}}>
      <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 45%, ${glow}33 0%, transparent 60%)`}} />
      {s.eras.map((era, i) => {
        const end = i + 1 < starts.length ? starts[i + 1] : durationInFrames + 30;
        return era.media?.length ? <EraLive key={i} era={era} start={starts[i]} end={end} /> : <EraCard key={i} era={era} start={starts[i]} end={end} />;
      })}
      <div style={{position: 'absolute', top: live ? 226 : 1150, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: live ? 12 : 18,
        transform: live ? 'scale(0.82)' : 'none'}}>
        {s.eras.map((era, i) => {
          const active = frame >= starts[i] && (i + 1 >= starts.length || frame < starts[i + 1]);
          return (
            <div key={i} style={{fontFamily: F.mono, fontWeight: 800, fontSize: 26, letterSpacing: 3, padding: '8px 14px', borderRadius: 30,
              color: active ? '#06060F' : 'rgba(255,255,255,0.5)', background: active ? LOOK[era.look].accent : 'rgba(255,255,255,0.06)',
              opacity: frame >= starts[i] ? 1 : 0.35}}>{era.year}</div>
          );
        })}
        <div style={{fontFamily: F.mono, fontWeight: 800, fontSize: 26, letterSpacing: 3, padding: '8px 14px', borderRadius: 30,
          color: 'rgba(255,255,255,0.5)', border: `2px dashed ${C.pink}`}}>2026</div>
      </div>
      <Arabic text={s.ar} delay={20} top={live ? 1560 : 1260} size={live ? 42 : 54} />
      {breakout > 0 ? <AbsoluteFill style={{background: '#fff', opacity: breakout}} /> : null}
    </AbsoluteFill>
  );
};
