import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Background} from '../ui/Background';
import {clamp, ease, pop, sec} from '../ui/motion';
import {Arabic, Flash, GlitchText, Particles, Stamp} from '../ui/Pieces';
import {Beam, Ufo} from '../ui/Ufo';
import {C, F, accent} from '../theme';
import {HookScene} from '../types';

// A balance that counts down to nothing, turning red and glitching as it goes.
const Counter: React.FC<{c: {from: number; to: number; at: number}}> = ({c}) => {
  const frame = useCurrentFrame();
  const start = sec(c.at) - 14;
  const p = interpolate(frame, [start, start + 16], [0, 1], clamp);
  const value = Math.round(c.from + (c.to - c.from) * p * p);
  const enter = pop(frame, 2, 12, 0.5, 180);
  const red = p > 0;
  const glitch = red ? (frame % 3 === 0 ? 1 : 0.4) * Math.max(0, 1 - Math.max(0, p - 0.9) * 10) : 0;
  const tone = red ? C.red : C.green;
  return (
    <div
      style={{
        position: 'absolute', top: 440, left: 0, right: 0, display: 'flex', justifyContent: 'center',
        opacity: Math.min(1, enter * 1.5), transform: `scale(${0.7 + 0.3 * enter})`,
      }}
    >
      <div style={{padding: '10px 36px', borderRadius: 24, background: 'rgba(0,0,0,0.55)', border: `3px solid ${tone}`, boxShadow: `0 0 40px ${tone}66`}}>
        <GlitchText text={'$' + value.toLocaleString('en-US')} size={150} color={tone} glitch={glitch} />
      </div>
    </div>
  );
};

export const Hook: React.FC<{s: HookScene; t0: number; words: {text: string; start: number}[]}> = ({s, t0, words}) => {
  const frame = useCurrentFrame();
  const color = accent(s.color);
  // Each title word lands when the narrator says it.
  const said = (word: string, fallback: number) => {
    const w = words.find((x) => x.text.replace(/[^\w]/g, '').toLowerCase() === word.toLowerCase() && x.start >= t0);
    return sec((w ? w.start : fallback) - t0) - 2;
  };
  const kickerIn = pop(frame, 4);
  const lines = s.title.map((word, i) => ({word, at: said(word, 1.4 + i * 0.4)}));
  const tagAt = sec(s.tagAt ?? 3);
  const beamOn = ease(frame, tagAt - 4, tagAt + 10);
  const ufoIn = ease(frame, tagAt - 26, tagAt + 4);
  const ufoX = interpolate(ufoIn, [0, 1], [1250, 540]);
  const ufoY = interpolate(ufoIn, [0, 1], [-80, 330]) + Math.sin(frame / 9) * 10;
  const ufoTilt = interpolate(ufoIn, [0, 1], [-18, 0]) + Math.sin(frame / 13) * 3;
  const stampOut = s.counter ? 0 : ease(frame, tagAt - 30, tagAt - 18);
  const shift = s.counter ? 200 : 0; // room for the counter above the headline
  return (
    <AbsoluteFill>
      <Background broll={s.broll} shake={frame < 12 ? 14 : 3} />
      <Flash at={0} length={10} />
      {s.ufo ? (
        <>
          <Beam x={ufoX} top={ufoY + 80} bottom={1920} topWidth={180} bottomWidth={980} opacity={beamOn * 0.75} />
          <Particles x={140} y={500} w={800} h={1400} count={50} seed="hook" />
        </>
      ) : null}
      <div style={{opacity: 1 - stampOut}}>
        <Stamp text={s.stamp} delay={6} top={s.counter ? 250 : 300} />
      </div>
      {s.counter ? <Counter c={s.counter} /> : null}
      <div
        style={{
          position: 'absolute', top: 500 + shift, left: 60, right: 60, textAlign: 'center', fontFamily: F.brand, fontWeight: 800,
          fontSize: 54, letterSpacing: 10, color: '#fff', opacity: kickerIn, transform: `translateY(${(1 - kickerIn) * 30}px)`,
          textShadow: '0 4px 20px rgba(0,0,0,0.8)',
        }}
      >
        {s.kicker}
      </div>
      <div style={{position: 'absolute', top: 580 + shift + (s.kicker.length > 18 ? 70 : 0), left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        {lines.map(({word, at}, i) => {
          const p = pop(frame, at, 10, 0.55, 200);
          const last = i === lines.length - 1;
          const glitch = interpolate(frame, [at, at + 10], [1, 0], clamp) + (frame % 23 === 0 ? 0.6 : 0);
          return (
            <div key={i} style={{opacity: Math.min(1, p * 2), transform: `scale(${interpolate(p, [0, 1], [1.8, 1])})`}}>
              <GlitchText text={word} size={Math.min(last ? 330 : 230, Math.floor(960 / (word.length * 0.47)))}
                color={last ? color : '#fff'} glitch={frame >= at ? glitch : 0} />
            </div>
          );
        })}
      </div>
      {s.ufo ? (
        <div style={{position: 'absolute', left: ufoX - 220, top: ufoY - 60, transform: `rotate(${ufoTilt}deg)`, opacity: ufoIn}}>
          <Ufo width={440} />
        </div>
      ) : null}
      {s.tag ? (
        <div
          style={{
            position: 'absolute', top: 1200, left: 60, right: 60, textAlign: 'center', fontFamily: F.display, fontSize: 104,
            color: '#fff', textTransform: 'uppercase', opacity: ease(frame, tagAt, tagAt + 8),
            transform: `translateY(${(1 - ease(frame, tagAt, tagAt + 10)) * 40}px)`, WebkitTextStroke: '10px #000', paintOrder: 'stroke fill',
            textShadow: `0 0 30px ${color}66`,
          }}
        >
          {s.tag}
        </div>
      ) : null}
      <Arabic text={s.ar} delay={tagAt + 10} top={1380} size={60} />
    </AbsoluteFill>
  );
};
