import {Look} from '../types';

export const leonidaHerald: Look = {
  id: 'leonida-herald',
  name: 'Leonida Herald',
  mood: "A trashy Florida tabloid's front page: newsprint photos, yellow word boxes, red ink, a serif masthead.",
  palette: {green: '#FFE500', red: '#E3000F', pink: '#E3000F', orange: '#FF6B00', gold: '#FFE500', teal: '#00A6FF', magenta: '#E3000F', navy: '#0B0B0B'},
  fonts: {display: "'Oswald Bold', Anton, sans-serif", brand: "'Playfair Display Black', serif", mono: "'IBM Plex Mono Bold', monospace", arabic: "'El Messiri Bold', Tajawal, sans-serif"},
  displayWidth: 0.535,
  ink: '#0B0B0B',
  captions: {style: 'box', size: 88},
  hud: {style: 'ticker'},
  finish: ['halftone', 'paper', 'grain', 'vignette'],
  grade: {duotone: ['#1b1712', '#efe3c8']},
  cut: 'ink',
  enter: 'slide',
  title: 'print',
};
