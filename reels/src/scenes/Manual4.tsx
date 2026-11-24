import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Background} from '../ui/Background';
import {clamp, ease, pop, sec} from '../ui/motion';
import {Arabic, Flash, SceneIn, StepLabel} from '../ui/Pieces';
import {C, F, accent} from '../theme';
import {EvidenceScene, ReceiptScene} from '../types';

const INK = '#1a0a0e';

// ------------------------------------------------------------------ evidence art
const EvidenceIcon: React.FC<{icon: EvidenceScene['items'][number]['icon']; size: number}> = ({icon, size}) => (
  <svg width={size} height={size} viewBox="0 0 200 200" style={{overflow: 'visible'}}>
    {icon === 'finger' ? (
      <g transform="rotate(-32 100 100)">
        <rect x="30" y="76" width="142" height="48" rx="24" fill="#e7c09c" stroke={INK} strokeWidth={6} />
        <rect x="132" y="84" width="32" height="32" rx="12" fill="#f7e6d8" stroke={INK} strokeWidth={4} />
        <path d="M84 82 Q90 100 84 118 M104 82 Q110 100 104 118" stroke="#b5835f" strokeWidth={4} fill="none" strokeLinecap="round" />
        <ellipse cx="34" cy="100" rx="11" ry="22" fill={C.red} stroke={INK} strokeWidth={5} />
        <circle cx="34" cy="100" r="6" fill="#f4f1ea" />
      </g>
    ) : null}
    {icon === 'cleaver' ? (
      <g transform="rotate(-18 100 100)">
        <path d="M24 58 H138 V132 Q84 144 24 132 Z" fill="#cfd6de" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
        <circle cx="120" cy="78" r="9" fill={INK} />
        <path d="M32 124 Q84 133 130 124" stroke="#fff" strokeWidth={4} opacity={0.65} fill="none" />
        <rect x="138" y="80" width="54" height="24" rx="9" fill="#5a3a22" stroke={INK} strokeWidth={6} />
        <circle cx="154" cy="92" r="3.5" fill="#d9c19a" />
        <circle cx="174" cy="92" r="3.5" fill="#d9c19a" />
      </g>
    ) : null}
    {icon === 'tape' ? (
      <g>
        {/* a thick silver roll seen at an angle, with a torn strip hanging off its bottom */}
        <path d="M86 150 H196 L188 160 L196 170 L188 180 H86 Z" fill="#a9b2bc" stroke={INK} strokeWidth={5} strokeLinejoin="round" />
        <path d="M96 158 H180" stroke="rgba(255,255,255,0.45)" strokeWidth={4} />
        <ellipse cx="86" cy="104" rx="66" ry="78" fill="#7d8690" stroke={INK} strokeWidth={6} />
        <ellipse cx="100" cy="100" rx="66" ry="78" fill="#b9c2cc" stroke={INK} strokeWidth={6} />
        <ellipse cx="100" cy="100" rx="50" ry="60" fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth={4} />
        <ellipse cx="100" cy="100" rx="30" ry="36" fill="#d9c7a0" stroke={INK} strokeWidth={6} />
        <ellipse cx="100" cy="100" rx="18" ry="22" fill="#2a2a34" />
        <path d="M58 54 Q74 34 96 30" stroke="#fff" strokeWidth={7} opacity={0.6} fill="none" strokeLinecap="round" />
      </g>
    ) : null}
    {icon === 'shears' ? (
      <g>
        <path d="M100 100 L132 182" stroke={INK} strokeWidth={26} strokeLinecap="round" />
        <path d="M100 100 L68 182" stroke={INK} strokeWidth={26} strokeLinecap="round" />
        <path d="M100 100 L132 182" stroke={C.red} strokeWidth={16} strokeLinecap="round" />
        <path d="M100 100 L68 182" stroke={C.red} strokeWidth={16} strokeLinecap="round" />
        <path d="M104 104 L58 26 Q92 38 112 96 Z" fill="#cfd6de" stroke={INK} strokeWidth={5} strokeLinejoin="round" />
        <path d="M96 104 L142 26 Q108 38 88 96 Z" fill="#b5bec7" stroke={INK} strokeWidth={5} strokeLinejoin="round" />
        <circle cx="100" cy="100" r="10" fill={INK} />
        <circle cx="100" cy="100" r="4" fill="#cfd6de" />
      </g>
    ) : null}
  </svg>
);

// ------------------------------------------------------------------ evidence
// A case file: evidence bags pop in one by one with a numbered marker and a camera flash.
export const Evidence: React.FC<{s: EvidenceScene}> = ({s}) => {
  const frame = useCurrentFrame();
  const head = pop(frame, 2, 12, 0.6, 150);
  const one = s.items.length === 1;
  const rowH = one ? 300 : 225;
  const scale = one ? 1.3 : 1;
  const top0 = one ? 560 : 470 + (3 - Math.min(3, s.items.length)) * 112;
  const lastAt = Math.max(...s.items.map((it) => sec(it.at)));
  return (
    <AbsoluteFill>
      <SceneIn><Background broll={s.broll} /></SceneIn>
      <AbsoluteFill style={{background: 'rgba(4,4,10,0.74)'}} />
      <StepLabel step={s.step} label={s.label} />
      {/* case-file tab */}
      <div style={{position: 'absolute', top: 372, left: 70, width: 940, height: 64, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 26px', boxSizing: 'border-box', borderRadius: '14px 14px 4px 4px',
        background: 'linear-gradient(180deg, #e2bd73, #c99d4f)', boxShadow: '0 14px 40px rgba(0,0,0,0.5)',
        opacity: Math.min(1, head * 1.5), transform: `translateY(${(1 - head) * -40}px)`}}>
        <div style={{fontFamily: F.mono, fontWeight: 800, fontSize: 30, color: INK, letterSpacing: 3}}>{s.caseTitle}</div>
        <div style={{fontFamily: F.mono, fontWeight: 800, fontSize: 22, color: '#fff', background: C.red, padding: '4px 12px', borderRadius: 6, letterSpacing: 3}}>EVIDENCE</div>
      </div>
      {s.items.map((it, i) => {
        const at = sec(it.at);
        const p = pop(frame, at, 11, 0.55, 200);
        if (frame < at - 1) return null;
        const rot = i % 2 === 0 ? -4 : 3;
        const text = ease(frame, at + 4, at + 16);
        const tent = pop(frame, at + 6, 10, 0.5, 240);
        const bag = (
          <>
            <div style={{position: 'absolute', left: 0, top: 0, width: 200, height: 200, borderRadius: 10, overflow: 'hidden',
              background: 'linear-gradient(160deg, rgba(255,255,255,0.20), rgba(255,255,255,0.06))', border: '3px solid rgba(255,255,255,0.4)',
              boxShadow: '0 18px 40px rgba(0,0,0,0.55)', transform: `rotate(${rot * p}deg) scale(${0.5 + 0.5 * p})`, opacity: Math.min(1, p * 1.6)}}>
              <div style={{height: 30, background: C.red, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: F.mono, fontWeight: 800, fontSize: 17, color: '#fff', letterSpacing: 4}}>EVIDENCE</div>
              <div style={{height: 4, background: 'rgba(255,255,255,0.55)'}} />
              <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: 160}}>
                <EvidenceIcon icon={it.icon} size={140} />
              </div>
              <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.22) 50%, transparent 60%)'}} />
            </div>
            <div style={{position: 'absolute', left: -14, top: 150, width: 70, height: 62, background: C.gold,
              clipPath: 'polygon(14% 0, 86% 0, 100% 100%, 0 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: F.display, fontSize: 42, color: INK, transform: `scale(${tent})`, boxShadow: '0 6px 0 rgba(0,0,0,0.4)'}}>{it.n}</div>
          </>
        );
        if (one) {
          // a single exhibit: a big bag in the middle, its label centred under it
          return (
            <React.Fragment key={i}>
              <div style={{position: 'absolute', top: 500, left: (1080 - 200 * 1.7) / 2, width: 200, height: 200,
                transform: 'scale(1.7)', transformOrigin: 'left top'}}>{bag}</div>
              <div style={{position: 'absolute', top: 900, left: 90, width: 900, textAlign: 'center', opacity: text,
                transform: `translateY(${(1 - text) * 30}px)`}}>
                <div style={{fontFamily: F.display, fontSize: 100, color: '#fff', lineHeight: 1, whiteSpace: 'nowrap'}}>{it.name}</div>
                <div style={{fontFamily: F.mono, fontWeight: 800, fontSize: 32, color: C.gold, letterSpacing: 3, marginTop: 16}}>FOUND · {it.where}</div>
              </div>
            </React.Fragment>
          );
        }
        return (
          <div key={i} style={{position: 'absolute', top: top0 + i * rowH, left: 70, width: 860, height: rowH - 20,
            transform: `scale(${scale})`, transformOrigin: 'left top'}}>
            {/* the bag */}
            <div style={{position: 'absolute', left: 0, top: 0, width: 200, height: 200, borderRadius: 10, overflow: 'hidden',
              background: 'linear-gradient(160deg, rgba(255,255,255,0.20), rgba(255,255,255,0.06))', border: '3px solid rgba(255,255,255,0.4)',
              boxShadow: '0 18px 40px rgba(0,0,0,0.55)', transform: `rotate(${rot * p}deg) scale(${0.5 + 0.5 * p})`, opacity: Math.min(1, p * 1.6)}}>
              <div style={{height: 30, background: C.red, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: F.mono, fontWeight: 800, fontSize: 17, color: '#fff', letterSpacing: 4}}>EVIDENCE</div>
              <div style={{height: 4, background: 'rgba(255,255,255,0.55)'}} />
              <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: 160}}>
                <EvidenceIcon icon={it.icon} size={140} />
              </div>
              <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.22) 50%, transparent 60%)'}} />
            </div>
            {/* numbered marker */}
            <div style={{position: 'absolute', left: -14, top: 150, width: 70, height: 62, background: C.gold,
              clipPath: 'polygon(14% 0, 86% 0, 100% 100%, 0 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: F.display, fontSize: 42, color: INK, transform: `scale(${tent})`, boxShadow: '0 6px 0 rgba(0,0,0,0.4)'}}>{it.n}</div>
            {/* label */}
            <div style={{position: 'absolute', left: 250, top: 42, width: 600, opacity: text, transform: `translateX(${(1 - text) * 30}px)`}}>
              <div style={{fontFamily: F.display, fontSize: 72, color: '#fff', lineHeight: 1, whiteSpace: 'nowrap'}}>{it.name}</div>
              <div style={{fontFamily: F.mono, fontWeight: 800, fontSize: 28, color: C.gold, letterSpacing: 3, marginTop: 14}}>FOUND · {it.where}</div>
            </div>
          </div>
        );
      })}
      {s.items.map((it, i) => (frame >= sec(it.at) ? <Flash key={i} at={sec(it.at)} length={7} color="#fff" strength={0.28} /> : null))}
      <Arabic text={s.ar} delay={Math.min(lastAt, 16) + 10} top={one ? 1130 : 1180} size={52} />
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ receipt
// A thermal receipt prints from a slot, line by line; a rubber stamp can land on it at the end.
export const Receipt: React.FC<{s: ReceiptScene}> = ({s}) => {
  const frame = useCurrentFrame();
  const HEAD = s.sub ? 190 : 150;
  const ROW = 96;
  const BIG = 132;
  const FOOT = 76;
  const rowH = (l: ReceiptScene['lines'][number]) => (l.big ? BIG : ROW);
  const total = HEAD + s.lines.reduce((a, l) => a + rowH(l), 0) + FOOT;
  const headOut = ease(frame, 4, 16);
  const printed =
    HEAD * headOut +
    s.lines.reduce((a, l) => a + rowH(l) * ease(frame, sec(l.at), sec(l.at) + 8), 0) +
    FOOT * ease(frame, sec(s.lines[s.lines.length - 1]?.at ?? 0) + 6, sec(s.lines[s.lines.length - 1]?.at ?? 0) + 14);
  const printing = s.lines.some((l) => frame >= sec(l.at) && frame < sec(l.at) + 8) || frame < 16;
  const shake = printing ? Math.sin(frame * 3.1) * 1.5 : 0;
  const slot = pop(frame, 0, 12, 0.6, 150);
  const SLOT_Y = 400;
  const stampAt = s.stamp ? sec(s.stamp.at) : 0;
  const stamp = s.stamp ? pop(frame, stampAt, 9, 0.45, 260) : 0;
  const stampTone = accent(s.stamp?.color ?? 'red');
  return (
    <AbsoluteFill>
      <SceneIn><Background broll={s.broll} /></SceneIn>
      <AbsoluteFill style={{background: 'rgba(4,4,10,0.62)'}} />
      <StepLabel step={s.step} label={s.label} />
      {/* paper: hangs from the slot and grows as each line prints, torn edge always at the bottom */}
      <div style={{position: 'absolute', top: SLOT_Y + 30, left: 160, width: 760, height: Math.max(18, printed + 16), overflow: 'hidden',
        transform: `translateX(${shake}px)`, background: 'linear-gradient(180deg, #ecebe4, #f7f6f0 30%, #f2f0e8)',
        filter: 'drop-shadow(0 30px 40px rgba(0,0,0,0.55))',
        clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 16px), 95% 100%, 90% calc(100% - 16px), 85% 100%, 80% calc(100% - 16px), 75% 100%, 70% calc(100% - 16px), 65% 100%, 60% calc(100% - 16px), 55% 100%, 50% calc(100% - 16px), 45% 100%, 40% calc(100% - 16px), 35% 100%, 30% calc(100% - 16px), 25% 100%, 20% calc(100% - 16px), 15% 100%, 10% calc(100% - 16px), 5% 100%, 0 calc(100% - 16px))'}}>
        <div style={{position: 'absolute', left: 0, top: 0, width: 760, height: total}}>
          <div style={{height: HEAD, boxSizing: 'border-box', padding: '32px 40px 0', textAlign: 'center'}}>
            <div style={{fontFamily: F.display, fontSize: 74, color: INK, lineHeight: 1}}>{s.title}</div>
            {s.sub ? <div style={{fontFamily: F.mono, fontWeight: 700, fontSize: 26, color: '#4a4a52', letterSpacing: 3, marginTop: 12}}>{s.sub}</div> : null}
            <div style={{borderTop: '3px dashed #9a9aa2', marginTop: 20}} />
          </div>
          {s.lines.map((l, i) => {
            const tone = l.color ? (l.color === 'green' ? '#1f9d4c' : l.color === 'red' ? '#d81f35' : accent(l.color)) : INK;
            return (
              <div key={i} style={{height: rowH(l), display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px',
                boxSizing: 'border-box', borderTop: l.big ? '3px solid #1a0a0e' : 'none', borderBottom: l.big ? '3px solid #1a0a0e' : 'none'}}>
                <div style={{fontFamily: F.mono, fontWeight: 800, fontSize: l.big ? 40 : 35, color: INK, letterSpacing: 1}}>{l.text}</div>
                {l.amount ? (
                  <div style={{fontFamily: l.big ? F.display : F.mono, fontWeight: 800, fontSize: l.big ? 88 : 38, color: tone}}>{l.amount}</div>
                ) : null}
              </div>
            );
          })}
          <div style={{height: FOOT, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6}}>
            {Array.from({length: 40}).map((_, i) => (
              <div key={i} style={{width: i % 3 === 0 ? 7 : 3, height: 38, background: INK, opacity: 0.85}} />
            ))}
          </div>
        </div>
      </div>
      {/* printer slot on top */}
      <div style={{position: 'absolute', top: SLOT_Y, left: 120, width: 840, height: 52, borderRadius: 18,
        background: 'linear-gradient(180deg, #2a2a38, #0d0d16)', border: '3px solid rgba(255,255,255,0.18)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.6)', opacity: Math.min(1, slot * 1.5), transform: `scaleX(${0.6 + 0.4 * slot})`}}>
        <div style={{position: 'absolute', left: 40, right: 40, top: 30, height: 8, borderRadius: 4, background: '#000'}} />
        <div style={{position: 'absolute', right: 18, top: 10, width: 12, height: 12, borderRadius: 6,
          background: printing ? C.green : '#2c4a2c', boxShadow: printing ? `0 0 14px ${C.green}` : 'none'}} />
      </div>
      {s.stamp && frame >= stampAt ? (
        <div style={{position: 'absolute', top: SLOT_Y + 30 + total * 0.74, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
          <div style={{fontFamily: F.display, fontSize: 80, color: stampTone, border: `8px solid ${stampTone}`, borderRadius: 16,
            padding: '6px 26px', letterSpacing: 2, opacity: Math.min(0.92, stamp * 1.4),
            transform: `rotate(-9deg) scale(${interpolate(stamp, [0, 1], [1.8, 1], clamp)})`, background: 'rgba(255,255,255,0.04)'}}>{s.stamp.text}</div>
        </div>
      ) : null}
      {s.stamp && frame >= stampAt ? <Flash at={stampAt} length={6} color={stampTone} strength={0.25} /> : null}
      <Arabic text={s.ar} delay={20} top={SLOT_Y + 30 + total + 60} size={52} />
    </AbsoluteFill>
  );
};
