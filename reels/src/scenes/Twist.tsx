import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Background} from '../ui/Background';
import {clamp, ease, pop, sec} from '../ui/motion';
import {Arabic, Flash, GlitchText, Particles} from '../ui/Pieces';
import {Beam, Ufo} from '../ui/Ufo';
import {C, F, accent} from '../theme';
import {TwistScene} from '../types';

export const Twist: React.FC<{s: TwistScene}> = ({s}) => {
  const frame = useCurrentFrame();
  const slam = sec(s.slamAt);
  const before = frame < slam;
  const typed = Math.floor(interpolate(frame, [2, 20], [0, s.pre.length], clamp));
  const heartbeat = 0.5 + 0.5 * Math.abs(Math.sin(frame / 6));
  const shake = before ? 0 : interpolate(frame, [slam, slam + 24], [26, 3], clamp);
  const ufo = ease(frame, slam - 2, slam + 12);
  return (
    <AbsoluteFill>
      <Background broll={s.broll} shake={shake} />
      {before ? (
        <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.65) 20%, rgba(0,0,0,${0.85 + 0.1 * heartbeat}) 100%)`}}>
          <div style={{position: 'absolute', top: 860, left: 0, right: 0, textAlign: 'center', fontFamily: F.mono, fontWeight: 800, fontSize: 84, color: '#fff', letterSpacing: 4}}>
            {s.pre.slice(0, typed)}
            <span style={{opacity: Math.floor(frame / 8) % 2 ? 0 : 1, color: C.green}}>▌</span>
          </div>
        </AbsoluteFill>
      ) : (
        <>
          <Beam x={540} top={430} bottom={1920} topWidth={200} bottomWidth={1100} opacity={ufo * 0.85} />
          <Particles x={100} y={500} w={880} h={1400} count={70} seed="twist" speed={2.2} />
          <div style={{position: 'absolute', left: 540 - 260, top: 230 + Math.sin(frame / 7) * 12, transform: `scale(${0.6 + 0.4 * ufo})`, opacity: ufo}}>
            <Ufo width={520} />
          </div>
          <div style={{position: 'absolute', top: 700, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6}}>
            {s.lines.map((line, i) => {
              const at = sec(line.at);
              const p = pop(frame, at - 1, 10, 0.5, 240);
              if (frame < at - 1) return <div key={i} style={{height: (line.size ?? 160) * 0.92}} />;
              const glitch = interpolate(frame, [at, at + 8], [1, 0], clamp);
              return (
                <div key={i} style={{transform: `scale(${interpolate(p, [0, 1], [2, 1])})`, opacity: Math.min(1, p * 2)}}>
                  <GlitchText text={line.text} size={line.size ?? 160} color={line.color ? accent(line.color) : '#fff'} glitch={glitch} />
                </div>
              );
            })}
          </div>
          <Arabic text={s.ar} delay={sec(s.lines[s.lines.length - 1].at) + 6} top={1330} size={62} />
          <Flash at={slam} length={10} color={C.green} strength={0.95} />
        </>
      )}
    </AbsoluteFill>
  );
};
