import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame} from 'remotion';
import {Background} from '../ui/Background';
import {clamp, ease, pop, sec} from '../ui/motion';
import {Arabic, Flash, Particles, SceneIn, StepLabel} from '../ui/Pieces';
import {C, F, accent} from '../theme';
import {CompareScene, HeadlineScene, RadarScene, SavesScene} from '../types';

// ------------------------------------------------------------------ compare
// Two (or more) bars that grow on the narrator's words, then a big multiplier slams in.
export const Compare: React.FC<{s: CompareScene}> = ({s}) => {
  const frame = useCurrentFrame();
  const max = Math.max(...s.bars.map((b) => b.value));
  const resultAt = s.result ? sec(s.result.at) : 99999;
  const res = pop(frame, resultAt, 9, 0.45, 260);
  const H = 480;
  return (
    <AbsoluteFill>
      <SceneIn><Background broll={s.broll} /></SceneIn>
      <AbsoluteFill style={{background: 'rgba(5,4,14,0.55)'}} />
      <StepLabel step={s.step} label={s.label} />
      <div style={{position: 'absolute', top: 430, left: 90, right: 90, height: H + 150, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 90}}>
        {s.bars.map((b, i) => {
          const at = sec(b.at);
          const grow = interpolate(frame, [at, at + 22], [0, 1], {...clamp, easing: (t) => 1 - Math.pow(1 - t, 3)});
          const h = Math.max(8, (b.value / max) * H * grow);
          const tone = accent(b.color ?? (i === s.bars.length - 1 ? 'green' : 'pink'));
          return (
            <div key={i} style={{display: 'flex', flexDirection: 'column', alignItems: 'center', width: 300, opacity: frame >= at - 4 ? 1 : 0.25}}>
              <div style={{fontFamily: F.display, fontSize: 96, color: tone, opacity: ease(frame, at + 10, at + 20), marginBottom: 14,
                textShadow: `0 0 30px ${tone}88`, WebkitTextStroke: '6px #000', paintOrder: 'stroke fill'}}>{b.display}</div>
              <div style={{width: 230, height: h, borderRadius: '22px 22px 6px 6px', background: `linear-gradient(180deg, ${tone}, ${tone}55)`,
                boxShadow: `0 0 ${grow * 50}px ${tone}88`, border: '3px solid rgba(255,255,255,0.4)'}} />
              <div style={{marginTop: 18, fontFamily: F.brand, fontWeight: 900, fontSize: 40, color: '#fff', letterSpacing: 2}}>{b.label}</div>
              {b.sub ? <div style={{fontFamily: F.mono, fontWeight: 700, fontSize: 24, color: 'rgba(255,255,255,0.7)', letterSpacing: 3}}>{b.sub}</div> : null}
            </div>
          );
        })}
      </div>
      {s.result && frame >= resultAt ? (
        <>
          <Flash at={resultAt} length={8} color={C.gold} strength={0.45} />
          <div style={{position: 'absolute', top: 1090, left: 0, right: 0, display: 'flex', justifyContent: 'center', transform: `scale(${interpolate(res, [0, 1], [2, 1])})`,
            opacity: Math.min(1, res * 2)}}>
            <div style={{fontFamily: F.display, fontSize: 110, color: '#06060F', background: C.gold, padding: '4px 36px', borderRadius: 20,
              boxShadow: `0 0 50px ${C.gold}aa`, transform: 'rotate(-3deg)'}}>{s.result.text}</div>
          </div>
        </>
      ) : null}
      <Arabic text={s.ar} delay={sec(s.bars[s.bars.length - 1].at) + 12} top={s.result ? 1270 : 1200} size={54} />
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ saves
// The pause menu's save screen: a grid of slots; one gets saved on the narrator's word.
export const Saves: React.FC<{s: SavesScene}> = ({s}) => {
  const frame = useCurrentFrame();
  const panel = pop(frame, 4, 13, 0.6, 150);
  const countAt = sec(s.countAt);
  const saveAt = sec(s.saveAt);
  const saved = frame >= saveAt;
  const tick = pop(frame, saveAt + 8, 9, 0.5, 240);
  const cols = 3;
  return (
    <AbsoluteFill>
      <SceneIn><Background broll={s.broll} /></SceneIn>
      <AbsoluteFill style={{background: 'rgba(5,4,14,0.45)'}} />
      <StepLabel step={s.step} label={s.label} />
      <div style={{position: 'absolute', top: 390, left: 60, width: 960, borderRadius: 30, padding: '24px 28px', background: 'rgba(8,8,26,0.84)',
        border: '2px solid rgba(255,255,255,0.16)', boxShadow: '0 30px 80px rgba(0,0,0,0.6)', opacity: Math.min(1, panel * 1.5),
        transform: `perspective(1400px) rotateX(${(1 - panel) * 20}deg) scale(${0.9 + 0.1 * panel})`}}>
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18}}>
          <div style={{fontFamily: F.brand, fontWeight: 900, fontSize: 36, color: '#fff', letterSpacing: 3}}>{s.title}</div>
          <div style={{fontFamily: F.mono, fontWeight: 800, fontSize: 24, color: '#06060F', background: C.gold, padding: '6px 14px', borderRadius: 8,
            opacity: ease(frame, countAt, countAt + 8)}}>{s.slots} MANUAL + 1 AUTO</div>
        </div>
        <div style={{display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12}}>
          {Array.from({length: s.slots}).map((_, i) => {
            const at = countAt + i * 2;
            const a = ease(frame, at, at + 6);
            const target = i === s.slot;
            const lit = target && saved;
            const used = i < s.slot;
            return (
              <div key={i} style={{height: 74, borderRadius: 14, padding: '0 16px', display: 'flex', alignItems: 'center', gap: 12, opacity: 0.25 + 0.75 * a,
                background: lit ? `linear-gradient(90deg, ${C.green}55, ${C.green}22)` : target && frame >= saveAt - 20 ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.06)',
                border: `2px solid ${lit ? C.green : target && frame >= saveAt - 20 ? '#fff' : 'rgba(255,255,255,0.12)'}`,
                boxShadow: lit ? `0 0 30px ${C.green}88` : 'none'}}>
                <div style={{fontFamily: F.mono, fontWeight: 800, fontSize: 24, color: 'rgba(255,255,255,0.6)'}}>{String(i + 1).padStart(2, '0')}</div>
                <div style={{fontFamily: F.brand, fontWeight: 800, fontSize: 22, color: lit ? C.green : used ? '#fff' : 'rgba(255,255,255,0.35)'}}>
                  {lit ? s.savedText : used ? s.usedText : 'EMPTY'}
                </div>
                {lit ? (
                  <div style={{marginLeft: 'auto', width: 40, height: 40, borderRadius: 20, background: C.green, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', transform: `scale(${tick})`}}>
                    <svg width={24} height={24} viewBox="0 0 30 30"><path d="M5 16 L12 23 L25 8" stroke="#06060F" strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
        <div style={{marginTop: 14, height: 64, borderRadius: 14, padding: '0 16px', display: 'flex', alignItems: 'center', gap: 12,
          background: 'rgba(255,200,87,0.12)', border: `2px dashed ${C.gold}88`, opacity: ease(frame, countAt + 10, countAt + 18)}}>
          <div style={{fontFamily: F.mono, fontWeight: 800, fontSize: 22, color: C.gold, letterSpacing: 3}}>AUTOSAVE</div>
          <div style={{fontFamily: F.brand, fontWeight: 700, fontSize: 22, color: 'rgba(255,255,255,0.7)'}}>{s.autoText}</div>
        </div>
      </div>
      {saved ? <Flash at={saveAt} length={8} color={C.green} strength={0.35} /> : null}
      <Arabic text={s.ar} delay={16} top={1260} size={52} />
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ radar
// The minimap: police blips that vanish, then a Focus pulse that finds them again.
export const Radar: React.FC<{s: RadarScene}> = ({s}) => {
  const frame = useCurrentFrame();
  const hideAt = sec(s.hideAt);
  const pulseAt = s.pulseAt !== undefined ? sec(s.pulseAt) : 99999;
  const map = pop(frame, 4, 13, 0.6, 150);
  const hidden = interpolate(frame, [hideAt, hideAt + 10], [0, 1], clamp);
  const pulse = frame >= pulseAt ? ((frame - pulseAt) % 40) / 40 : 0;
  const found = ease(frame, pulseAt + 8, pulseAt + 18);
  const R = 330;
  const blips = Array.from({length: 6}).map((_, i) => ({
    x: Math.cos(random(`a${i}`) * Math.PI * 2) * (90 + random(`r${i}`) * 200),
    y: Math.sin(random(`a${i}`) * Math.PI * 2) * (90 + random(`r${i}`) * 200),
  }));
  const flash = Math.floor(frame / 6) % 2 === 0;
  const label = frame >= pulseAt ? s.foundText : frame >= hideAt ? s.hiddenText : s.introText;
  return (
    <AbsoluteFill>
      <SceneIn><Background broll={s.broll} /></SceneIn>
      <AbsoluteFill style={{background: frame >= pulseAt ? `rgba(40,0,20,${0.35 + 0.15 * (1 - pulse)})` : 'rgba(5,4,14,0.5)'}} />
      <StepLabel step={s.step} label={s.label} />
      <div style={{position: 'absolute', top: 400, left: 540 - R, width: R * 2, height: R * 2, borderRadius: R, overflow: 'hidden',
        background: 'radial-gradient(circle, #1b2a3a 0%, #0b1220 70%)', border: '6px solid rgba(255,255,255,0.8)',
        boxShadow: `0 30px 80px rgba(0,0,0,0.7), 0 0 ${frame >= pulseAt ? 60 : 20}px ${frame >= pulseAt ? C.red : C.teal}88`,
        opacity: Math.min(1, map * 1.5), transform: `scale(${0.8 + 0.2 * map})`}}>
        <svg width={R * 2} height={R * 2}>
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <path key={i} d={`M ${i * 90 - 40} -20 L ${i * 90 + 140} ${R * 2 + 20}`} stroke="rgba(255,255,255,0.09)" strokeWidth={26} />
          ))}
          <path d={`M -20 ${R - 40} C ${R * 0.6} ${R - 120}, ${R * 1.2} ${R + 60}, ${R * 2 + 20} ${R - 10}`} stroke="rgba(255,255,255,0.18)" strokeWidth={34} fill="none" />
          {blips.map((b, i) => {
            const vis = frame >= pulseAt ? found : 1 - hidden;
            const red = (i + (flash ? 0 : 1)) % 2 === 0;
            return (
              <g key={i} transform={`translate(${R + b.x} ${R + b.y})`} opacity={vis}>
                {frame >= pulseAt ? (
                  <>
                    <circle r={30} fill="none" stroke={C.red} strokeWidth={4} opacity={0.8} />
                    <path d="M0 -20 a9 9 0 1 1 0.1 0 M-14 22 Q0 -6 14 22 Z" fill={C.red} />
                  </>
                ) : <circle r={16} fill={red ? C.red : '#3b6cff'} stroke="#fff" strokeWidth={3} />}
              </g>
            );
          })}
          <path d={`M ${R} ${R - 26} L ${R + 18} ${R + 18} L ${R} ${R + 8} L ${R - 18} ${R + 18} Z`} fill="#fff" />
          {frame >= pulseAt ? (
            <circle cx={R} cy={R} r={pulse * R * 1.3} fill="none" stroke={C.pink} strokeWidth={10} opacity={1 - pulse} />
          ) : null}
        </svg>
        {frame >= hideAt && frame < pulseAt ? (
          <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <div style={{fontFamily: F.display, fontSize: 120, color: C.red, transform: `rotate(-12deg) scale(${pop(frame, hideAt, 9, 0.5, 240)})`,
              border: `8px solid ${C.red}`, padding: '0 26px', borderRadius: 18, background: 'rgba(0,0,0,0.55)'}}>NO COPS</div>
          </div>
        ) : null}
      </div>
      {frame >= pulseAt ? <Particles x={100} y={400} w={880} h={700} count={30} seed="radar" color={C.pink} /> : null}
      {frame >= pulseAt ? <Flash at={pulseAt} length={8} color={C.pink} strength={0.4} /> : null}
      <div style={{position: 'absolute', top: 1100, left: 60, right: 60, textAlign: 'center', fontFamily: F.display, fontSize: 92, lineHeight: 1.05,
        color: frame >= pulseAt ? C.pink : '#fff', textTransform: 'uppercase', WebkitTextStroke: '8px #000', paintOrder: 'stroke fill',
        opacity: ease(frame, 10, 20)}}>{label}</div>
      <Arabic text={s.ar} delay={16} top={1250} size={52} />
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ headline
// A news alert card: the source and date, then the headline typed in.
export const Headline: React.FC<{s: HeadlineScene}> = ({s}) => {
  const frame = useCurrentFrame();
  const card = pop(frame, 3, 12, 0.6, 170);
  const t0 = sec(s.typeAt);
  const typed = Math.floor(interpolate(frame, [t0, t0 + s.headline.length * 1.2], [0, s.headline.length], clamp));
  const blink = Math.floor(frame / 8) % 2 === 0;
  return (
    <AbsoluteFill>
      <SceneIn><Background broll={s.broll} /></SceneIn>
      <AbsoluteFill style={{background: 'rgba(5,4,14,0.45)'}} />
      <div style={{position: 'absolute', top: 420, left: 60, width: 960, borderRadius: 28, overflow: 'hidden', background: 'rgba(250,250,252,0.97)',
        boxShadow: '0 40px 90px rgba(0,0,0,0.65)', opacity: Math.min(1, card * 1.5), transform: `translateY(${(1 - card) * 120}px) scale(${0.9 + 0.1 * card})`}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 16, padding: '18px 28px', background: C.red}}>
          <div style={{width: 18, height: 18, borderRadius: 9, background: '#fff', opacity: blink ? 1 : 0.3}} />
          <div style={{fontFamily: F.mono, fontWeight: 800, fontSize: 30, letterSpacing: 8, color: '#fff'}}>{s.tag}</div>
        </div>
        <div style={{padding: '26px 34px 34px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', fontFamily: F.mono, fontWeight: 800, fontSize: 24, letterSpacing: 3, color: '#555'}}>
            <div>{s.source}</div><div>{s.date}</div>
          </div>
          <div style={{marginTop: 18, minHeight: 250, fontFamily: F.display, fontSize: 82, lineHeight: 1.05, color: '#0b0b14', textTransform: 'uppercase'}}>
            {s.headline.slice(0, typed)}
            <span style={{color: C.red, opacity: typed < s.headline.length && blink ? 1 : 0}}>▌</span>
          </div>
        </div>
      </div>
      <Arabic text={s.ar} delay={t0 + 20} top={1080} size={54} />
    </AbsoluteFill>
  );
};
