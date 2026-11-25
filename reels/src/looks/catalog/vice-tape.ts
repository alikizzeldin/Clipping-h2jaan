import {Look} from '../types';

export const viceTape: Look = {
  id: 'vice-tape',
  name: 'Vice Tape',
  mood: 'A 1986 camcorder tape found in a Vice City pawn shop: neon on black, tracking lines, a tape counter.',
  palette: {pink: '#FF2BD6', magenta: '#7B2FFF', orange: '#FF8A00', teal: '#00F0FF', green: '#00F0FF', gold: '#FFE600', red: '#FF2B4F', navy: '#0A0420'},
  fonts: {display: "'Bebas Neue', Anton, sans-serif", brand: "Righteous, sans-serif", mono: 'VT323, monospace', arabic: 'Lalezar, Tajawal, sans-serif'},
  displayWidth: 0.39,
  ink: '#0A0420',
  captions: {style: 'cc', size: 100, font: 'VT323, monospace', active: 'pink'},
  hud: {style: 'tape'},
  finish: ['vhs', 'scanlines', 'grain', 'vignette'],
  grade: {tint: '#5b1aff', blend: 'soft-light', amount: 0.3, filter: 'saturate(1.25) contrast(1.08)'},
  cut: 'tracking',
  enter: 'snap',
  title: 'neon',
  series: {'GTA 6 NEWS': {hud: {style: 'ticker'}, captions: {style: 'cc', size: 100, font: 'VT323, monospace', active: 'red'}}},
};
