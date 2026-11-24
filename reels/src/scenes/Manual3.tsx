import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Background} from '../ui/Background';
import {clamp, ease, pop, sec} from '../ui/motion';
import {Arabic, Flash, Particles, SceneIn, StepLabel} from '../ui/Pieces';
import {C, F, accent} from '../theme';
import {ComicScene, CreditsScene, HealthScene, MailboxScene, RadioScene} from '../types';

// ------------------------------------------------------------------ shared art
// A grumpy pill capsule with a face (a villain's head).
export const PillHead: React.FC<{size: number; frame: number; tilt?: number}> = ({size, frame, tilt = -24}) => {
  const blink = frame % 70 < 4;
  const wob = Math.sin(frame / 9) * 4;
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" style={{overflow: 'visible', transform: `rotate(${tilt + wob}deg)`}}>
      <defs>
        <clipPath id="capsule"><rect x="62" y="10" width="76" height="180" rx="38" /></clipPath>
      </defs>
      <g clipPath="url(#capsule)">
        <rect x="62" y="10" width="76" height="90" fill={C.red} />
        <rect x="62" y="100" width="76" height="90" fill="#f4f1ea" />
        <rect x="74" y="20" width="12" height="60" rx="6" fill="rgba(255,255,255,0.45)" />
      </g>
      <rect x="62" y="10" width="76" height="180" rx="38" fill="none" stroke="#120812" strokeWidth={7} />
      <path d="M62 100 H138" stroke="#120812" strokeWidth={5} />
      {/* angry brows and eyes on the white half */}
      <path d="M76 116 L96 126 M124 116 L104 126" stroke="#120812" strokeWidth={6} strokeLinecap="round" />
      {blink ? (
        <path d="M80 134 H94 M106 134 H120" stroke="#120812" strokeWidth={5} strokeLinecap="round" />
      ) : (
        <>
          <circle cx={87} cy={134} r={6} fill="#120812" />
          <circle cx={113} cy={134} r={6} fill="#120812" />
        </>
      )}
      <path d="M86 160 Q100 150 114 160" stroke="#120812" strokeWidth={5} fill="none" strokeLinecap="round" />
    </svg>
  );
};

// A red pill bottle with a white heart label.
export const PillBottle: React.FC<{size: number}> = ({size}) => (
  <svg width={size * 0.8} height={size} viewBox="0 0 160 200" style={{overflow: 'visible'}}>
    <rect x="30" y="8" width="100" height="36" rx="8" fill="#f4f1ea" stroke="#1a0a0e" strokeWidth={6} />
    <path d="M42 14 V38 M58 14 V38 M74 14 V38 M90 14 V38 M106 14 V38 M122 14 V38" stroke="rgba(0,0,0,0.18)" strokeWidth={4} />
    <rect x="22" y="44" width="116" height="148" rx="18" fill={C.red} stroke="#1a0a0e" strokeWidth={6} />
    <rect x="34" y="60" width="14" height="110" rx="7" fill="rgba(255,255,255,0.35)" />
    <rect x="40" y="88" width="80" height="64" rx="8" fill="#fff" />
    <path d="M80 140 C 58 124 58 104 70 102 C 76 101 80 106 80 110 C 80 106 84 101 90 102 C 102 104 102 124 80 140 Z" fill={C.red} />
  </svg>
);

// ------------------------------------------------------------------ comic
// A parody comic cover rises in; callouts and a comic burst land on the narrator's words.
export const Comic: React.FC<{s: ComicScene}> = ({s}) => {
  const frame = useCurrentFrame();
  const card = pop(frame, 2, 12, 0.6, 150);
  const float = Math.sin(frame / 18) * 6;
  const coverAt = sec(s.coverAt ?? 0.6);
  const cover = pop(frame, coverAt, 10, 0.5, 220);
  const burstAt = s.burst ? sec(s.burst.at) : 99999;
  const burst = pop(frame, burstAt, 8, 0.45, 260);
  const shake = frame >= burstAt ? interpolate(frame, [burstAt, burstAt + 14], [14, 0], clamp) * Math.sin(frame * 2.3) : 0;
  return (
    <AbsoluteFill>
      <SceneIn><Background broll={s.broll} /></SceneIn>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 40%, rgba(181,23,255,0.25), rgba(5,4,14,0.75) 70%)'}} />
      <StepLabel step={s.step} label={s.label} />
      <div style={{position: 'absolute', top: 380, left: 280, width: 520, height: 720, borderRadius: 10, overflow: 'hidden',
        border: '6px solid #0b0610', boxShadow: '0 40px 90px rgba(0,0,0,0.7), 0 0 60px rgba(181,23,255,0.35)',
        opacity: Math.min(1, card * 1.5), transform: `translate(${shake}px, ${(1 - card) * 160 + float}px) rotate(${-3 + (1 - card) * 12}deg)`}}>
        {/* cover art: purple and red, halftone dots, burst rays */}
        <div style={{position: 'absolute', inset: 0, background: `linear-gradient(165deg, ${C.magenta} 0%, #5b0b8f 45%, ${C.red} 100%)`}} />
        <div style={{position: 'absolute', inset: 0, opacity: 0.35, background: `repeating-conic-gradient(from ${frame * 0.4}deg at 50% 62%, rgba(255,255,255,0.22) 0deg 7deg, transparent 7deg 18deg)`}} />
        <div style={{position: 'absolute', inset: 0, opacity: 0.22, backgroundImage: 'radial-gradient(#000 22%, transparent 24%)', backgroundSize: '16px 16px'}} />
        <div style={{position: 'absolute', top: 14, left: 14, right: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
          <div style={{fontFamily: F.brand, fontWeight: 900, fontSize: 22, color: '#0b0610', background: '#fff', padding: '6px 12px', borderRadius: 6, letterSpacing: 2}}>{s.publisher}</div>
          <div style={{fontFamily: F.mono, fontWeight: 800, fontSize: 24, color: '#fff', textAlign: 'right', lineHeight: 1.1, textShadow: '0 2px 0 #000'}}>{s.issue}<br />{s.price}</div>
        </div>
        <div style={{position: 'absolute', top: 70, left: 0, right: 0, textAlign: 'center', fontFamily: F.display, fontSize: 150, lineHeight: 1,
          color: C.gold, WebkitTextStroke: '9px #0b0610', paintOrder: 'stroke fill', transform: 'skewX(-8deg)', letterSpacing: 2,
          textShadow: '8px 8px 0 #0b0610'}}>{s.title}</div>
        <div style={{position: 'absolute', top: 250, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
          <PillHead size={330} frame={frame} />
        </div>
        <div style={{position: 'absolute', bottom: 22, left: 26, right: 26, display: 'flex', justifyContent: 'center',
          transform: `scale(${interpolate(cover, [0, 1], [1.8, 1])}) rotate(-2deg)`, opacity: Math.min(1, cover * 2)}}>
          <div style={{fontFamily: F.display, fontSize: 46, color: '#0b0610', background: C.gold, padding: '6px 18px', border: '4px solid #0b0610', letterSpacing: 1}}>{s.cover}</div>
        </div>
      </div>
      {s.callouts ? (
        <div style={{position: 'absolute', top: 1132, left: 60, right: 60, display: 'flex', justifyContent: 'center', gap: 22}}>
          {s.callouts.map((c, i) => {
            const at = sec(c.at);
            const p = pop(frame, at, 9, 0.45, 260);
            if (frame < at) return null;
            const tone = accent(c.color ?? 'teal');
            return (
              <div key={i} style={{fontFamily: F.mono, fontWeight: 800, fontSize: 38, color: '#06060F', background: tone, padding: '8px 22px', borderRadius: 12,
                boxShadow: `0 0 30px ${tone}88`, transform: `scale(${interpolate(p, [0, 1], [2, 1])})`, opacity: Math.min(1, p * 2), whiteSpace: 'nowrap'}}>{c.text}</div>
            );
          })}
        </div>
      ) : null}
      {s.burst && frame >= burstAt ? (
        <>
          <Flash at={burstAt} length={8} color={C.gold} strength={0.5} />
          <div style={{position: 'absolute', top: 560, left: 200, width: 680, height: 330, display: 'flex', alignItems: 'center', justifyContent: 'center',
            transform: `scale(${interpolate(burst, [0, 1], [0.2, 1])}) rotate(-7deg)`, opacity: Math.min(1, burst * 2)}}>
            <svg width={680} height={330} viewBox="0 0 680 330" style={{position: 'absolute', inset: 0}}>
              <path d="M340 6 L392 72 L478 26 L470 104 L596 74 L534 148 L670 168 L540 202 L606 286 L486 252 L456 324 L388 262 L316 322 L290 248 L180 300 L198 222 L40 232 L142 170 L10 120 L156 104 L118 30 L238 76 L278 8 Z"
                fill={C.gold} stroke="#0b0610" strokeWidth={8} strokeLinejoin="round" />
            </svg>
            <div style={{position: 'relative', fontFamily: F.display, fontSize: 70, lineHeight: 0.95, color: C.red, textAlign: 'center',
              WebkitTextStroke: '5px #0b0610', paintOrder: 'stroke fill', maxWidth: 440}}>{s.burst.text}</div>
          </div>
        </>
      ) : null}
      <Arabic text={s.ar} delay={14} top={1230} size={54} />
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ health
// The item wheel opens, the pills are picked, and the health bar refills.
export const Health: React.FC<{s: HealthScene}> = ({s}) => {
  const frame = useCurrentFrame();
  const wheelAt = sec(s.wheelAt);
  const pickAt = sec(s.pickAt);
  const fillAt = sec(s.fillAt);
  const wheel = pop(frame, wheelAt, 12, 0.55, 170);
  const picked = frame >= pickAt;
  const pick = pop(frame, pickAt, 9, 0.45, 260);
  const fill = interpolate(frame, [fillAt, fillAt + 26], [s.hpFrom, s.hpTo], {...clamp, easing: (t) => 1 - Math.pow(1 - t, 3)});
  const filled = frame >= fillAt;
  const segs = 6;
  const R = 220;
  const bar = 760;
  const tone = filled ? C.green : C.red;
  return (
    <AbsoluteFill>
      <SceneIn><Background broll={s.broll} /></SceneIn>
      <AbsoluteFill style={{background: 'rgba(5,4,14,0.55)'}} />
      <StepLabel step={s.step} label={s.label} />
      <div style={{position: 'absolute', top: 400, left: 540 - R, width: R * 2, height: R * 2, opacity: Math.min(1, wheel * 1.5),
        transform: `scale(${0.6 + 0.4 * wheel}) rotate(${(1 - wheel) * -40}deg)`}}>
        <svg width={R * 2} height={R * 2} viewBox={`0 0 ${R * 2} ${R * 2}`}>
          {Array.from({length: segs}).map((_, i) => {
            const a0 = (i / segs) * Math.PI * 2 - Math.PI / 2 + 0.04;
            const a1 = ((i + 1) / segs) * Math.PI * 2 - Math.PI / 2 - 0.04;
            const r0 = R * 0.42;
            const p = (a: number, r: number) => `${R + Math.cos(a) * r} ${R + Math.sin(a) * r}`;
            const sel = i === 1 && picked;
            return (
              <path key={i} d={`M ${p(a0, r0)} L ${p(a0, R - 4)} A ${R - 4} ${R - 4} 0 0 1 ${p(a1, R - 4)} L ${p(a1, r0)} A ${r0} ${r0} 0 0 0 ${p(a0, r0)} Z`}
                fill={sel ? 'rgba(255,59,78,0.55)' : 'rgba(10,10,28,0.82)'} stroke={sel ? '#fff' : 'rgba(255,255,255,0.22)'} strokeWidth={sel ? 5 : 2} />
            );
          })}
        </svg>
        {Array.from({length: segs}).map((_, i) => {
          const a = ((i + 0.5) / segs) * Math.PI * 2 - Math.PI / 2;
          const x = R + Math.cos(a) * R * 0.71;
          const y = R + Math.sin(a) * R * 0.71;
          return i === 1 ? (
            <div key={i} style={{position: 'absolute', left: x - 40, top: y - 50, transform: `scale(${picked ? 1 + 0.25 * pick : 1})`}}>
              <PillBottle size={100} />
            </div>
          ) : (
            <div key={i} style={{position: 'absolute', left: x - 14, top: y - 14, width: 28, height: 28, borderRadius: 14, background: 'rgba(255,255,255,0.18)'}} />
          );
        })}
        <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.brand, fontWeight: 900,
          fontSize: 34, color: picked ? '#fff' : 'rgba(255,255,255,0.4)', letterSpacing: 2}}>{picked ? s.item : '···'}</div>
      </div>
      <div style={{position: 'absolute', top: 920, left: (1080 - bar) / 2, width: bar, opacity: ease(frame, wheelAt + 6, wheelAt + 16)}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12}}>
          <svg width={44} height={40} viewBox="0 0 44 40"><path d="M22 38 C 4 26 0 14 8 6 C 14 0 20 4 22 9 C 24 4 30 0 36 6 C 44 14 40 26 22 38 Z" fill={tone} /></svg>
          <div style={{fontFamily: F.mono, fontWeight: 800, fontSize: 30, color: '#fff', letterSpacing: 4}}>HEALTH</div>
          <div style={{marginLeft: 'auto', fontFamily: F.mono, fontWeight: 800, fontSize: 30, color: tone}}>{filled ? '▲' : ''}</div>
        </div>
        <div style={{position: 'relative', height: 58, borderRadius: 12, background: 'rgba(255,255,255,0.08)', border: '3px solid rgba(255,255,255,0.3)', overflow: 'hidden'}}>
          <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: `${fill * 100}%`, background: `linear-gradient(90deg, ${tone}, ${tone}aa)`,
            boxShadow: `0 0 ${filled ? 40 : 10}px ${tone}`}} />
          {Array.from({length: 9}).map((_, i) => (
            <div key={i} style={{position: 'absolute', top: 0, bottom: 0, left: `${(i + 1) * 10}%`, width: 4, background: 'rgba(5,4,14,0.6)'}} />
          ))}
        </div>
      </div>
      {filled ? <Particles x={160} y={880} w={760} h={160} count={26} seed="heal" speed={3} color={C.green} /> : null}
      <div style={{position: 'absolute', top: 1060, left: 0, right: 0, textAlign: 'center', fontFamily: F.display, fontSize: 88, color: '#fff',
        opacity: ease(frame, fillAt + 8, fillAt + 18), WebkitTextStroke: '7px #000', paintOrder: 'stroke fill'}}>{s.title}</div>
      <Arabic text={s.ar} delay={fillAt + 14} top={1200} size={54} />
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ mailbox
// A roadside mailbox: the flag goes up, the button prompt is pressed, and the cash slides out.
export const Mailbox: React.FC<{s: MailboxScene}> = ({s}) => {
  const frame = useCurrentFrame();
  const box = pop(frame, 2, 12, 0.6, 150);
  const flagAt = sec(s.flagAt);
  const pressAt = sec(s.pressAt);
  const flag = interpolate(frame, [flagAt, flagAt + 10], [90, 0], {...clamp, easing: (t) => 1 - Math.pow(1 - t, 3)});
  const door = interpolate(frame, [pressAt + 2, pressAt + 12], [0, 1], {...clamp, easing: (t) => 1 - Math.pow(1 - t, 3)});
  const cash = interpolate(frame, [pressAt + 8, pressAt + 22], [0, 1], {...clamp, easing: (t) => 1 - Math.pow(1 - t, 3)});
  const prompt = pop(frame, flagAt + 8, 10, 0.5, 200);
  const pressed = frame >= pressAt;
  const press = pressed ? interpolate(frame, [pressAt, pressAt + 5, pressAt + 12], [1, 0.82, 1], clamp) : 1;
  const ring = pressed ? interpolate(frame, [pressAt, pressAt + 16], [0, 1], clamp) : 0;
  const subAt = sec(s.subAt ?? 99);
  return (
    <AbsoluteFill>
      <SceneIn><Background broll={s.broll} /></SceneIn>
      <AbsoluteFill style={{background: 'rgba(5,4,14,0.5)'}} />
      <StepLabel step={s.step} label={s.label} />
      <div style={{position: 'absolute', top: 380, left: 0, right: 0, height: 520, display: 'flex', justifyContent: 'center',
        opacity: Math.min(1, box * 1.5), transform: `translateY(${(1 - box) * 120}px)`}}>
        <svg width={720} height={520} viewBox="0 0 720 520" style={{overflow: 'visible'}}>
          {/* post */}
          <rect x="330" y="300" width="60" height="230" fill="#6b4a2b" stroke="#2a1a0e" strokeWidth={6} />
          {/* cash sliding out of the open front */}
          <g transform={`translate(${-cash * 150} ${-cash * 30}) rotate(${-cash * 8} 170 200)`} opacity={cash > 0 ? 1 : 0}>
            <rect x="120" y="170" width="190" height="90" rx="8" fill="#3f8f3a" stroke="#123d12" strokeWidth={5} />
            <rect x="136" y="184" width="158" height="62" rx="6" fill="none" stroke="#bff0a8" strokeWidth={4} />
            <text x="215" y="230" textAnchor="middle" fontFamily="Anton, Impact, sans-serif" fontSize="48" fill="#eaffde">$</text>
          </g>
          {/* body: a rounded-top rural mailbox seen from the side */}
          <path d="M170 300 V170 a120 120 0 0 1 120 -120 H520 a120 120 0 0 1 120 120 V300 Z" fill="url(#metal)" stroke="#1c2230" strokeWidth={8} />
          <defs>
            <linearGradient id="metal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#d9e1ea" />
              <stop offset="0.55" stopColor="#9aa8b8" />
              <stop offset="1" stopColor="#6b7889" />
            </linearGradient>
          </defs>
          <path d="M210 120 H600" stroke="rgba(255,255,255,0.6)" strokeWidth={10} strokeLinecap="round" />
          {/* front door swings open */}
          <g transform={`translate(170 300) rotate(${-door * 72}) translate(-170 -300)`}>
            <path d="M170 300 V170 a120 120 0 0 1 40 -90 V300 Z" fill="#c3ccd7" stroke="#1c2230" strokeWidth={7} />
          </g>
          {/* the red flag */}
          <g transform={`translate(600 230) rotate(${flag}) translate(-600 -230)`}>
            <rect x="590" y="70" width="20" height="170" rx="6" fill={C.red} stroke="#5a0d14" strokeWidth={5} />
            <rect x="590" y="70" width="80" height="54" rx="6" fill={C.red} stroke="#5a0d14" strokeWidth={5} />
          </g>
          <circle cx="600" cy="230" r="12" fill="#1c2230" />
        </svg>
      </div>
      {cash > 0.6 ? <Particles x={140} y={420} w={520} h={300} count={22} seed="mail" speed={2} color={C.green} /> : null}
      <div style={{position: 'absolute', top: 930, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: Math.min(1, prompt * 2),
        transform: `scale(${interpolate(prompt, [0, 1], [1.6, 1]) * press})`}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 18, background: 'rgba(8,8,26,0.85)', border: `3px solid ${pressed ? C.green : 'rgba(255,255,255,0.4)'}`,
          borderRadius: 20, padding: '14px 30px', boxShadow: pressed ? `0 0 40px ${C.green}88` : 'none', position: 'relative'}}>
          <div style={{width: 64, height: 64, borderRadius: 32, background: '#111827', border: '3px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <svg width={34} height={32} viewBox="0 0 34 32"><path d="M17 4 L31 28 H3 Z" fill="none" stroke="#2fd6b4" strokeWidth={4} strokeLinejoin="round" /></svg>
          </div>
          <div style={{fontFamily: F.brand, fontWeight: 900, fontSize: 48, color: '#fff', letterSpacing: 3}}>{s.prompt}</div>
          {ring > 0 && ring < 1 ? (
            <div style={{position: 'absolute', left: 14 + 32 - 60 * (1 + ring), top: 14 + 32 - 60 * (1 + ring) + 0, width: 120 * (1 + ring), height: 120 * (1 + ring),
              borderRadius: '50%', border: `4px solid ${C.green}`, opacity: 1 - ring}} />
          ) : null}
        </div>
      </div>
      <div style={{position: 'absolute', top: 1060, left: 0, right: 0, textAlign: 'center', fontFamily: F.display, fontSize: 84, color: C.gold,
        opacity: ease(frame, pressAt + 10, pressAt + 20), WebkitTextStroke: '7px #000', paintOrder: 'stroke fill'}}>{s.title}</div>
      {s.sub ? (
        <div style={{position: 'absolute', top: 1170, left: 60, right: 60, textAlign: 'center', fontFamily: F.mono, fontWeight: 800, fontSize: 32, color: '#fff',
          letterSpacing: 3, opacity: ease(frame, subAt, subAt + 10)}}>{s.sub}</div>
      ) : null}
      <Arabic text={s.ar} delay={pressAt + 16} top={1290} size={52} />
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ credits
// End credits roll past; one line lights up and the roll stops on it.
export const Credits: React.FC<{s: CreditsScene}> = ({s}) => {
  const frame = useCurrentFrame();
  const hiAt = sec(s.highlightAt);
  const rowH = 86;
  const stopY = 330 - s.highlight * rowH; // the highlighted row ends centred in the window
  const startY = stopY + 360;
  const y = interpolate(frame, [0, hiAt], [startY, stopY], {...clamp, easing: (t) => 1 - Math.pow(1 - t, 2)});
  const lit = frame >= hiAt;
  const glow = pop(frame, hiAt, 9, 0.45, 240);
  const panel = pop(frame, 2, 12, 0.6, 150);
  const mask = 'linear-gradient(180deg, transparent 0%, #000 18%, #000 82%, transparent 100%)';
  return (
    <AbsoluteFill>
      <SceneIn><Background broll={s.broll} /></SceneIn>
      <AbsoluteFill style={{background: 'rgba(2,2,8,0.78)'}} />
      <StepLabel step={s.step} label={s.label} />
      <div style={{position: 'absolute', top: 380, left: 60, width: 960, height: 740, overflow: 'hidden', opacity: Math.min(1, panel * 1.5),
        maskImage: mask, WebkitMaskImage: mask}}>
        <div style={{position: 'absolute', left: 0, right: 0, top: y}}>
          {s.lines.map((l, i) => {
            const hi = i === s.highlight && lit;
            return (
              <div key={i} style={{height: rowH, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 34,
                transform: hi ? `scale(${1 + 0.12 * glow})` : 'none'}}>
                <div style={{width: 400, textAlign: 'right', fontFamily: F.mono, fontWeight: 700, fontSize: 30, letterSpacing: 3,
                  color: hi ? C.gold : 'rgba(255,255,255,0.55)'}}>{l.role}</div>
                <div style={{width: 400, textAlign: 'left', fontFamily: F.brand, fontWeight: 800, fontSize: 36,
                  color: hi ? '#fff' : 'rgba(255,255,255,0.8)', textShadow: hi ? `0 0 24px ${C.gold}` : 'none'}}>{l.name}</div>
              </div>
            );
          })}
        </div>
        {lit ? (
          <div style={{position: 'absolute', left: 20, right: 20, top: 336, height: rowH - 12, borderRadius: 16,
            border: `4px solid ${C.gold}`, boxShadow: `0 0 40px ${C.gold}88`, opacity: Math.min(1, glow * 2)}} />
        ) : null}
      </div>
      {lit ? <Flash at={hiAt} length={8} color={C.gold} strength={0.35} /> : null}
      <Arabic text={s.ar} delay={hiAt + 10} top={1180} size={54} />
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ radio
// A car stereo tunes from station to station; each shows its host.
export const Radio: React.FC<{s: RadioScene}> = ({s}) => {
  const frame = useCurrentFrame();
  const panel = pop(frame, 2, 12, 0.6, 150);
  const idx = s.stations.reduce((acc, st, i) => (frame >= sec(st.at) - 6 ? i : acc), -1);
  const st = idx >= 0 ? s.stations[idx] : null;
  const since = st ? frame - (sec(st.at) - 6) : 0;
  const tuning = st ? since < 8 : true;
  const show = st ? pop(frame, sec(st.at) - 2, 10, 0.5, 220) : 0;
  const tone = accent(st?.color ?? 'pink');
  const noise = (k: number) => ((Math.sin(frame * 12.9898 + k * 78.233) * 43758.5453) % 1 + 1) % 1;
  return (
    <AbsoluteFill>
      <SceneIn><Background broll={s.broll} /></SceneIn>
      <AbsoluteFill style={{background: 'rgba(5,4,14,0.55)'}} />
      <StepLabel step={s.step} label={s.label} />
      <div style={{position: 'absolute', top: 400, left: 70, width: 940, height: 560, borderRadius: 40, padding: 30, boxSizing: 'border-box',
        background: 'linear-gradient(180deg, #1b1b2a, #0b0b14)', border: '3px solid rgba(255,255,255,0.16)',
        boxShadow: '0 40px 90px rgba(0,0,0,0.7)', opacity: Math.min(1, panel * 1.5), transform: `translateY(${(1 - panel) * 80}px)`}}>
        <div style={{position: 'relative', height: 330, borderRadius: 24, overflow: 'hidden', padding: '26px 34px', boxSizing: 'border-box',
          background: '#06140f', border: `3px solid ${tone}66`, boxShadow: `inset 0 0 60px ${tone}33`}}>
          {tuning ? (
            <div style={{position: 'absolute', inset: 0, opacity: 0.5,
              backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.12) 0 2px, transparent 2px 5px)',
              transform: `translateY(${noise(1) * 10}px)`}} />
          ) : null}
          <div style={{display: 'flex', alignItems: 'baseline', gap: 16}}>
            <div style={{fontFamily: F.mono, fontWeight: 800, fontSize: 88, color: tone, textShadow: `0 0 24px ${tone}`, letterSpacing: 2}}>
              {tuning || !st ? (88 + noise(2) * 20).toFixed(1) : st.freq}
            </div>
            <div style={{fontFamily: F.mono, fontWeight: 800, fontSize: 34, color: `${tone}aa`}}>FM</div>
          </div>
          {st && !tuning ? (
            <div style={{opacity: Math.min(1, show * 2), transform: `translateX(${(1 - show) * 40}px)`}}>
              <div style={{fontFamily: F.display, fontSize: 92, color: '#fff', lineHeight: 1.05, marginTop: 8}}>{st.name}</div>
              <div style={{fontFamily: F.mono, fontWeight: 800, fontSize: 32, color: tone, letterSpacing: 3, marginTop: 6}}>HOST · {st.host}</div>
            </div>
          ) : (
            <div style={{fontFamily: F.mono, fontWeight: 800, fontSize: 34, color: `${tone}88`, letterSpacing: 6, marginTop: 30}}>TUNING…</div>
          )}
        </div>
        <div style={{display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 10, height: 120, marginTop: 30}}>
          {Array.from({length: 22}).map((_, i) => {
            const h = tuning ? 10 : 20 + Math.abs(Math.sin(frame / (4 + (i % 5)) + i)) * 90;
            return <div key={i} style={{width: 26, height: h, borderRadius: 6, background: `linear-gradient(180deg, ${tone}, ${tone}44)`}} />;
          })}
        </div>
      </div>
      {st && st.note && !tuning ? (
        <div style={{position: 'absolute', top: 1000, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: ease(frame, sec(st.at) + 8, sec(st.at) + 18)}}>
          <div style={{fontFamily: F.mono, fontWeight: 800, fontSize: 32, color: '#06060F', background: C.gold, padding: '8px 20px', borderRadius: 10, letterSpacing: 2}}>{st.note}</div>
        </div>
      ) : null}
      <Arabic text={s.ar} delay={16} top={1100} size={54} />
    </AbsoluteFill>
  );
};
