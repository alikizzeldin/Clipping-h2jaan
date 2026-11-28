import {Look} from '../types';

// Leonida Arcade: GTA 6 as an 80s arcade cabinet in a Vice Beach boardwalk parlour. Punchy
// saturated gameplay behind CRT glass, marquee captions with pixel extrusions and score pops,
// a 1UP / HI-SCORE top line, and a pixel-block stage wipe on every cut.
export const leonidaArcade: Look = {
  id: 'leonida-arcade',
  name: 'Leonida Arcade',
  mood: 'An 80s arcade cabinet on a Vice Beach boardwalk: CRT glass, marquee captions extruded in pixels with score pops, a 1UP / HI-SCORE line, and a pixel-block stage wipe on every cut.',
  palette: {green: '#FFE600', gold: '#FFE600', red: '#FF2E63', teal: '#00E5FF', pink: '#FF2BD6', orange: '#FF8A00', magenta: '#7B2CFF', navy: '#0A0420'},
  fonts: {display: "'Big Shoulders Black', Anton, sans-serif", brand: "'Russo One', sans-serif", mono: "'IBM Plex Mono Bold', monospace", arabic: "'Reem Kufi Bold', Tajawal, sans-serif"},
  displayWidth: 0.471,
  ink: '#0A0420',
  captions: {style: 'arcade', size: 92},
  hud: {style: 'arcade'},
  finish: ['crt', 'scanlines', 'bloom', 'vignette'],
  grade: {filter: 'saturate(1.35) contrast(1.1)', tint: '#5b2bd6', blend: 'soft-light', amount: 0.18},
  cut: 'pixels',
  enter: 'snap',
  title: 'neon',
  series: {'GTA 6 NEWS': {hud: {style: 'ticker'}, captions: {style: 'box', size: 86}, cut: 'shutter'}},
};
