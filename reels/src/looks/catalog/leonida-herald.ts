import {Look} from '../types';

// Leonida Herald: a trashy Florida tabloid. Gameplay printed as two-tone newsprint, ransom-note
// captions cut letter by letter from other pages, a page turning over every cut.
export const leonidaHerald: Look = {
  id: 'leonida-herald',
  name: 'Leonida Herald',
  mood: "A trashy Florida tabloid's front page: newsprint photos, ransom-note captions cut from other pages, red ink, a page turning on every cut.",
  palette: {green: '#FFE500', red: '#E3000F', pink: '#E3000F', orange: '#FF6B00', gold: '#FFE500', teal: '#00A6FF', magenta: '#E3000F', navy: '#0B0B0B'},
  fonts: {display: "'Oswald Bold', Anton, sans-serif", brand: "'Playfair Display Black', serif", mono: "'IBM Plex Mono Bold', monospace", arabic: "'El Messiri Bold', Tajawal, sans-serif"},
  displayWidth: 0.535,
  ink: '#0B0B0B',
  captions: {style: 'ransom', size: 80},
  hud: {style: 'ticker'},
  finish: ['halftone', 'paper', 'grain', 'vignette'],
  grade: {duotone: ['#1b1712', '#efe3c8']},
  cut: 'pageturn',
  enter: 'slide',
  title: 'print',
  // News reads cleaner in plain word boxes; the ransom note is for secrets and money.
  series: {'GTA 6 NEWS': {captions: {style: 'box', size: 84}, cut: 'ink'}},
};
