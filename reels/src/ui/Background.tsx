import React from 'react';
import {AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {noise2D} from '@remotion/noise';
import {Broll} from '../types';
import {clamp} from './motion';
import {interpolate} from 'remotion';

const GRADES: Record<string, string> = {
  night: 'linear-gradient(180deg, rgba(10,8,40,0.55) 0%, rgba(30,0,60,0.15) 45%, rgba(5,5,20,0.8) 100%)',
  green: 'linear-gradient(180deg, rgba(20,80,30,0.45) 0%, rgba(0,40,10,0.25) 50%, rgba(0,10,5,0.85) 100%)',
  warm: 'linear-gradient(180deg, rgba(255,90,60,0.18) 0%, rgba(120,0,90,0.12) 50%, rgba(10,0,20,0.8) 100%)',
  cold: 'linear-gradient(180deg, rgba(0,60,120,0.35) 0%, rgba(0,20,60,0.2) 50%, rgba(0,5,20,0.85) 100%)',
  none: 'linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.75) 100%)',
};

export const Background: React.FC<{broll?: Broll; shake?: number}> = ({broll, shake = 0}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  if (!broll) return <AbsoluteFill style={{background: '#06060F'}} />;
  const [z0, z1] = broll.zoom ?? [1.06, 1.16];
  const zoom = interpolate(frame, [0, durationInFrames], [z0, z1], clamp);
  const dx = noise2D('x', frame / 14, 0) * shake;
  const dy = noise2D('y', frame / 14, 1) * shake;
  return (
    <AbsoluteFill style={{background: '#000', overflow: 'hidden'}}>
      <AbsoluteFill
        style={{
          transform: `translate(${dx}px, ${dy}px) scale(${zoom})`,
          filter: `${broll.blur ? `blur(${broll.blur}px) ` : ''}saturate(1.15) contrast(1.05)`,
        }}
      >
        <OffthreadVideo
          src={staticFile(broll.src)}
          startFrom={Math.round((broll.startFrom ?? 0) * 30)}
          muted
          style={{width: '100%', height: '100%', objectFit: 'cover'}}
        />
      </AbsoluteFill>
      <AbsoluteFill style={{background: GRADES[broll.grade ?? 'night']}} />
      {broll.dim ? <AbsoluteFill style={{background: `rgba(0,0,0,${broll.dim})`}} /> : null}
    </AbsoluteFill>
  );
};

// Film grain, vignette and faint scanlines over everything: the "premium" finish.
export const Finish: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <AbsoluteFill
        style={{background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.7) 100%)'}}
      />
      <AbsoluteFill
        style={{
          background: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.035) 0px, rgba(255,255,255,0.035) 1px, transparent 1px, transparent 4px)',
          mixBlendMode: 'overlay',
        }}
      />
      <svg width="1080" height="1920" style={{position: 'absolute', opacity: 0.11, mixBlendMode: 'overlay'}}>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={frame % 12} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="1080" height="1920" filter="url(#grain)" />
      </svg>
    </AbsoluteFill>
  );
};
