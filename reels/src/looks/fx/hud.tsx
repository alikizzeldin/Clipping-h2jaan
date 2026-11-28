import React from 'react';
import {AbsoluteFill, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, F, FPS} from '../../theme';
import {ease} from '../../ui/motion';
import {look} from '../state';

// Top bars. All keep the brand, the series and the episode number in the top 260 px.
type HudProps = {series: string; episode: number};
const num = (n: number) => String(n).padStart(3, '0');

const useEnter = () => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  return {frame, enter: ease(frame, 4, 22), progress: frame / durationInFrames};
};

// A camcorder on playback: ▶ PLAY, tape speed, a running counter, a tape-length bar.
export const TapeHud: React.FC<HudProps> = ({series, episode}) => {
  const {frame, enter, progress} = useEnter();
  const secs = Math.floor(frame / FPS);
  const counter = `0:${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
  const blink = Math.floor(frame / 20) % 2 === 0;
  const txt: React.CSSProperties = {fontFamily: F.mono, fontSize: 46, color: '#fff', letterSpacing: 3, textShadow: `3px 0 ${C.pink}aa, -3px 0 ${C.teal}aa`};
  return (
    <AbsoluteFill style={{pointerEvents: 'none', opacity: enter}}>
      <div style={{position: 'absolute', top: 132, left: 64, right: 64, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div style={txt}>{blink ? '▶ PLAY' : '▶'}</div>
        <div style={txt}>SP {counter}</div>
      </div>
      <div style={{position: 'absolute', top: 196, left: 64, right: 64, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div style={{fontFamily: F.brand, fontSize: 34, color: C.pink, letterSpacing: 2, textShadow: `0 0 18px ${C.pink}`}}>GTA6FIED</div>
        <div style={{...txt, fontSize: 32}}>{series} #{num(episode)}</div>
      </div>
      <div style={{position: 'absolute', top: 246, left: 64, right: 64, height: 8, border: '2px solid rgba(255,255,255,0.7)'}}>
        <div style={{width: `${progress * 100}%`, height: '100%', background: '#fff'}} />
      </div>
    </AbsoluteFill>
  );
};

// A case-file folder tab: brand, case number, a barcode and a dotted progress line.
export const CaseHud: React.FC<HudProps> = ({series, episode}) => {
  const {enter, progress} = useEnter();
  const bars = Array.from({length: 34}).map((_, i) => 2 + Math.round(random(`bar${episode}-${i}`) * 5));
  return (
    <AbsoluteFill style={{pointerEvents: 'none', opacity: enter, transform: `translateY(${(1 - enter) * -30}px)`}}>
      <div style={{position: 'absolute', top: 126, left: 56, right: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
          <div style={{fontFamily: F.brand, fontSize: 36, color: '#0b0b0b', background: C.green, padding: '6px 16px 2px', transform: 'rotate(-1.5deg)'}}>GTA6FIED</div>
          <div style={{fontFamily: F.mono, fontSize: 30, color: '#fff', letterSpacing: 2}}>
            {series} · CASE № {num(episode)}
          </div>
        </div>
        <div style={{display: 'flex', alignItems: 'flex-end', gap: 2, height: 46}}>
          {bars.map((w, i) => <div key={i} style={{width: w, height: i % 7 === 0 ? 46 : 38, background: '#fff', opacity: 0.85}} />)}
        </div>
      </div>
      <div style={{position: 'absolute', top: 206, left: 56, right: 56, height: 4, background: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.35) 0 10px, transparent 10px 18px)'}}>
        <div style={{width: `${progress * 100}%`, height: '100%', background: `repeating-linear-gradient(90deg, ${C.green} 0 10px, transparent 10px 18px)`}} />
      </div>
    </AbsoluteFill>
  );
};

// A news channel: a solid brand block, the series as a strap, a pulsing LIVE tag.
export const TickerHud: React.FC<HudProps> = ({series, episode}) => {
  const {frame, enter, progress} = useEnter();
  const pulse = 0.55 + 0.45 * Math.abs(Math.sin(frame / 9));
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div style={{position: 'absolute', top: 132, left: 0, right: 0, display: 'flex', alignItems: 'stretch', height: 70,
        transform: `translateX(${(1 - enter) * -1100}px)`}}>
        <div style={{background: C.red, padding: '0 22px 0 60px', display: 'flex', alignItems: 'center', fontFamily: F.brand, fontSize: 38, color: '#fff'}}>GTA6FIED</div>
        <div style={{flex: 1, background: 'rgba(255,255,255,0.94)', display: 'flex', alignItems: 'center', padding: '0 22px', fontFamily: F.mono, fontSize: 30,
          color: '#0b0b0b', letterSpacing: 3, fontWeight: 800}}>
          {series} · #{num(episode)}
        </div>
        <div style={{background: '#0b0b0b', display: 'flex', alignItems: 'center', gap: 10, padding: '0 60px 0 20px', fontFamily: F.mono, fontSize: 28, color: '#fff', letterSpacing: 3}}>
          <div style={{width: 16, height: 16, borderRadius: 8, background: C.red, opacity: pulse}} />
          LIVE
        </div>
      </div>
      <div style={{position: 'absolute', top: 202, left: 0, right: 0, height: 8, background: 'rgba(0,0,0,0.5)', opacity: enter}}>
        <div style={{width: `${progress * 100}%`, height: '100%', background: C.red}} />
      </div>
    </AbsoluteFill>
  );
};

// Just the brand and a hairline: let the footage breathe.
export const MinimalHud: React.FC<HudProps> = ({series, episode}) => {
  const {enter, progress} = useEnter();
  return (
    <AbsoluteFill style={{pointerEvents: 'none', opacity: enter}}>
      <div style={{position: 'absolute', top: 140, left: 64, right: 64, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between'}}>
        <div style={{fontFamily: F.brand, fontSize: 34, letterSpacing: 4, color: '#fff'}}>
          GTA6FIED<span style={{color: C.orange}}>.</span>
        </div>
        <div style={{fontFamily: F.mono, fontSize: 26, letterSpacing: 4, color: 'rgba(255,255,255,0.8)'}}>
          {series} <span style={{color: C.orange}}>{num(episode)}</span>
        </div>
      </div>
      <div style={{position: 'absolute', top: 196, left: 64, right: 64, height: 2, background: 'rgba(255,255,255,0.25)'}}>
        <div style={{width: `${progress * 100}%`, height: '100%', background: `linear-gradient(90deg, ${C.orange}, ${C.pink}, ${C.magenta})`}} />
      </div>
    </AbsoluteFill>
  );
};

// An arcade cabinet's score line: 1UP blinking over a running score, the brand as the HI-SCORE
// holder, the series and episode as the stage, and the reel's progress as a row of pixel blocks.
export const ArcadeHud: React.FC<HudProps> = ({series, episode}) => {
  const {frame, enter, progress} = useEnter();
  const score = String(Math.floor(frame * 4.3) * 10).padStart(6, '0');
  const blink = Math.floor(frame / 15) % 2 === 0;
  const px = "'Press Start 2P', monospace";
  const label: React.CSSProperties = {fontFamily: px, fontSize: 22, color: C.red, letterSpacing: 2};
  const value: React.CSSProperties = {fontFamily: px, fontSize: 30, color: '#fff', letterSpacing: 2, textShadow: '3px 3px 0 #000'};
  const blocks = 24;
  const lit = Math.round(progress * blocks);
  return (
    <AbsoluteFill style={{pointerEvents: 'none', opacity: enter}}>
      {/* a dark band behind the score line, like the cabinet's bezel, so it reads on bright footage */}
      <div style={{position: 'absolute', top: 0, left: 0, right: 0, height: 300, background: 'linear-gradient(180deg, rgba(10,4,32,0.78) 0%, rgba(10,4,32,0.55) 70%, rgba(10,4,32,0) 100%)'}} />
      <div style={{position: 'absolute', top: 118, left: 56, right: 56, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
        <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
          <div style={{...label, opacity: blink ? 1 : 0}}>1UP</div>
          <div style={value}>{score}</div>
        </div>
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8}}>
          <div style={label}>HI-SCORE</div>
          <div style={{fontFamily: F.brand, fontSize: 36, color: C.gold, letterSpacing: 2, textShadow: `3px 3px 0 ${C.magenta}`}}>GTA6FIED</div>
        </div>
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10}}>
          <div style={{...label, color: C.teal}}>STAGE {num(episode)}</div>
          <div style={{...value, fontSize: 18, color: '#fff'}}>{series}</div>
        </div>
      </div>
      <div style={{position: 'absolute', top: 222, left: 56, right: 56, display: 'flex', gap: 6}}>
        {Array.from({length: blocks}).map((_, i) => (
          <div key={i} style={{flex: 1, height: 12, background: i < lit ? (i % 3 === 2 ? C.pink : C.gold) : 'rgba(255,255,255,0.18)'}} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

export const HUDS: Record<string, React.FC<HudProps>> = {tape: TapeHud, case: CaseHud, ticker: TickerHud, minimal: MinimalHud, arcade: ArcadeHud};
export const lookHud = () => HUDS[look().hud.style];
