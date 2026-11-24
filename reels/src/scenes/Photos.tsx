import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {Background} from '../ui/Background';
import {clamp, ease, pop, sec} from '../ui/motion';
import {Arabic, SceneIn} from '../ui/Pieces';
import {C, F} from '../theme';
import {PhotosScene} from '../types';

// Real photos from the web, dropped onto the screen like prints taped to a wall: players'
// handwritten notes, a Reddit find, a store-page screenshot. Each one lands on the narrator's word.
export const Photos: React.FC<{s: PhotosScene}> = ({s}) => {
  const frame = useCurrentFrame();
  const kick = ease(frame, 2, 12);
  const titleAt = sec(s.titleAt ?? (s.photos.length ? s.photos[s.photos.length - 1].at + 0.6 : 0.4));
  const title = ease(frame, titleAt, titleAt + 12);
  return (
    <AbsoluteFill>
      <SceneIn><Background broll={s.broll} /></SceneIn>
      <AbsoluteFill style={{background: 'rgba(6,5,12,0.55)'}} />
      {s.kicker ? (
        <div style={{position: 'absolute', top: 300, left: 0, right: 0, textAlign: 'center', fontFamily: F.mono, fontWeight: 800, fontSize: 32,
          letterSpacing: 6, color: '#fff', opacity: kick}}>{s.kicker}</div>
      ) : null}
      {s.photos.map((p, i) => {
        const at = sec(p.at);
        if (frame < at) return null;
        const drop = pop(frame, at, 13, 0.55, 170);
        const sway = Math.sin((frame - at) / 22 + i) * 0.7;
        return (
          <div key={i} style={{position: 'absolute', left: p.x, top: p.y - (1 - drop) * 200, width: p.w, padding: '16px 16px 0', background: '#f4efe3',
            borderRadius: 6, transform: `rotate(${p.rot * (0.4 + 0.6 * drop) + sway}deg) scale(${1.25 - 0.25 * drop})`, opacity: Math.min(1, drop * 1.6),
            boxShadow: '0 30px 70px rgba(0,0,0,0.7), 0 4px 10px rgba(0,0,0,0.4)'}}>
            <Img src={staticFile(p.src)} style={{width: '100%', display: 'block', borderRadius: 2}} />
            <div style={{minHeight: 22, padding: p.caption ? '10px 4px 12px' : 0, textAlign: 'center', fontFamily: F.hand, fontSize: 32, color: '#1d1a2b'}}>
              {p.caption}
            </div>
            {p.credit ? (
              <div style={{position: 'absolute', right: 10, bottom: -30, fontFamily: F.mono, fontWeight: 700, fontSize: 18, color: 'rgba(255,255,255,0.75)',
                textShadow: '0 2px 4px #000'}}>{p.credit}</div>
            ) : null}
            <div style={{position: 'absolute', top: -18, left: '50%', width: 150, height: 40, marginLeft: -75, background: 'rgba(240,228,190,0.82)',
              transform: `rotate(${i % 2 ? 4 : -5}deg)`, boxShadow: '0 2px 6px rgba(0,0,0,0.25)'}} />
          </div>
        );
      })}
      {s.title ? (
        <div style={{position: 'absolute', top: 1330, left: 50, right: 50, textAlign: 'center', fontFamily: F.display, fontSize: 92, lineHeight: 1,
          textTransform: 'uppercase', color: '#fff', opacity: title, transform: `translateY(${interpolate(title, [0, 1], [30, 0], clamp)}px)`,
          WebkitTextStroke: '8px #000', paintOrder: 'stroke fill', textShadow: `0 0 30px ${C.pink}55`}}>{s.title}</div>
      ) : null}
      <Arabic text={s.ar} delay={titleAt + 6} top={s.title ? 1460 : 1380} size={50} />
    </AbsoluteFill>
  );
};
