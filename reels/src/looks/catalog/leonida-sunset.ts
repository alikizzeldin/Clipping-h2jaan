import {Look} from '../types';

export const leonidaSunset: Look = {
  id: 'leonida-sunset',
  name: 'Leonida Sunset',
  mood: 'Golden hour on the Keys: amber-to-pink gradients, chrome titles, light leaking into the lens, whip pans.',
  palette: {green: '#FFB000', pink: '#FF3C8E', magenta: '#7A2BD9', orange: '#FF7A1A', teal: '#33C3FF', gold: '#FFD166', red: '#FF3D5A', navy: '#140822'},
  fonts: {display: "'Big Shoulders Black', Anton, sans-serif", brand: "'Space Grotesk Bold', sans-serif", mono: "'Space Mono Bold', monospace", arabic: 'Lalezar, Tajawal, sans-serif'},
  displayWidth: 0.471,
  ink: '#140822',
  captions: {style: 'karaoke', size: 104},
  hud: {style: 'minimal'},
  finish: ['lightleak', 'grain', 'vignette'],
  grade: {tint: '#ff5e3a', blend: 'soft-light', amount: 0.32, filter: 'saturate(1.2)'},
  cut: 'whip',
  enter: 'slide',
  title: 'chrome',
  series: {'GTA 6 NEWS': {hud: {style: 'ticker'}, cut: 'flash'}},
};
