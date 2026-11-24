import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile} from 'remotion';
import {Captions} from './ui/Captions';
import {Finish} from './ui/Background';
import {Hud} from './ui/Hud';
import {sec} from './ui/motion';
import {Cta} from './scenes/Cta';
import {Hook} from './scenes/Hook';
import {Location} from './scenes/Location';
import {Reward} from './scenes/Reward';
import {Time} from './scenes/Time';
import {Trigger} from './scenes/Trigger';
import {Twist} from './scenes/Twist';
import {List} from './scenes/List';
import {Phone} from './scenes/Phone';
import {Scan} from './scenes/Scan';
import {Cash} from './scenes/Cash';
import {Control} from './scenes/Control';
import {Era} from './scenes/Era';
import {Combo, Dial, Menu, Stat} from './scenes/Cheats';
import {Setting} from './scenes/Setting';
import {Code} from './scenes/Code';
import {Reveal} from './scenes/Reveal';
import {Proof} from './scenes/Proof';
import {Chat} from './scenes/Chat';
import {Compare, Headline, Heat, Radar, Saves} from './scenes/Manual2';
import {Comic, Credits, Health, Mailbox, Radio} from './scenes/Manual3';
import {Evidence, Receipt} from './scenes/Manual4';
import {Alt, Boost, Chain, Consoles, FgApp} from './scenes/Fps';
import {Photos} from './scenes/Photos';
import {Profile} from './scenes/Profile';
import {Loop} from './scenes/Loop';
import {Trunk} from './scenes/Trunk';
import {Reel as ReelProps, Scene} from './types';
import {FPS} from './theme';
import {applyLook, look} from './looks/state';
import {CUT_LENGTH, CutFx, LEAD} from './looks/fx/cuts';

const render = (s: Scene, words: ReelProps['words']) => {
  switch (s.type) {
    case 'hook': return <Hook s={s} t0={s.from} words={words} />;
    case 'location': return <Location s={s} />;
    case 'time': return <Time s={s} />;
    case 'trigger': return <Trigger s={s} />;
    case 'twist': return <Twist s={s} />;
    case 'reward': return <Reward s={s} />;
    case 'cta': return <Cta s={s} />;
    case 'list': return <List s={s} />;
    case 'phone': return <Phone s={s} />;
    case 'scan': return <Scan s={s} />;
    case 'cash': return <Cash s={s} />;
    case 'control': return <Control s={s} />;
    case 'era': return <Era s={s} />;
    case 'consoles': return <Consoles s={s} />;
    case 'chain': return <Chain s={s} />;
    case 'fgapp': return <FgApp s={s} />;
    case 'boost': return <Boost s={s} />;
    case 'alt': return <Alt s={s} />;
    case 'dial': return <Dial s={s} />;
    case 'stat': return <Stat s={s} />;
    case 'combo': return <Combo s={s} />;
    case 'menu': return <Menu s={s} />;
    case 'setting': return <Setting s={s} />;
    case 'code': return <Code s={s} />;
    case 'reveal': return <Reveal s={s} />;
    case 'proof': return <Proof s={s} />;
    case 'chat': return <Chat s={s} />;
    case 'compare': return <Compare s={s} />;
    case 'saves': return <Saves s={s} />;
    case 'radar': return <Radar s={s} />;
    case 'headline': return <Headline s={s} />;
    case 'heat': return <Heat s={s} />;
    case 'comic': return <Comic s={s} />;
    case 'health': return <Health s={s} />;
    case 'mailbox': return <Mailbox s={s} />;
    case 'credits': return <Credits s={s} />;
    case 'radio': return <Radio s={s} />;
    case 'evidence': return <Evidence s={s} />;
    case 'receipt': return <Receipt s={s} />;
    case 'profile': return <Profile s={s} />;
    case 'loop': return <Loop s={s} />;
    case 'trunk': return <Trunk s={s} />;
    case 'photos': return <Photos s={s} />;
  }
};

export const Reel: React.FC<ReelProps> = (props) => {
  applyLook(props.style, props.series);
  const {scenes, words, sfx} = props;
  const cut = look().cut;
  const quiet = scenes.filter((s) => s.captions === false);
  const voiceEnd = words.length ? words[words.length - 1].end : 0;
  const total = sec(props.duration);
  const base = props.musicVolume ?? 0.32;
  return (
    <AbsoluteFill style={{background: '#000'}}>
      {scenes.map((s, i) => (
        <Sequence key={i} from={sec(s.from)} durationInFrames={sec(s.to) - sec(s.from)} name={`${s.type} ${i + 1}`}>
          {render(s, words)}
        </Sequence>
      ))}
      {cut !== 'none'
        ? scenes.slice(1).map((s, i) => (
            <Sequence key={`cut${i}`} from={Math.max(0, sec(s.from) - LEAD)} durationInFrames={CUT_LENGTH} name={`cut ${i + 2}`}>
              <CutFx kind={cut} />
            </Sequence>
          ))
        : null}
      <Captions words={words} hidden={(t) => quiet.some((s) => t >= s.from && t < s.to)} />
      <Hud series={props.series} episode={props.episode} />
      <Finish />
      <Audio src={staticFile(props.voice)} />
      <Audio
        src={staticFile(props.music)}
        volume={(f) => {
          // The music sits under the voice, swells once the voice ends, and fades out.
          const end = Math.min(sec(voiceEnd), total - 34);
          return interpolate(f, [0, 6, end, end + 12, total - 20, total], [0, base, base, base * 1.7, base * 1.7, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
        }}
      />
      {sfx.map((x, i) => (
        <Sequence key={`sfx${i}`} from={Math.max(0, Math.round(x.at * FPS))}>
          <Audio src={staticFile(x.src)} volume={x.volume ?? 0.6} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
