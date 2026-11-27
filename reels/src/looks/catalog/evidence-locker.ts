import {Look} from '../types';

// Evidence Locker: a detective's case file on Leonida's strangest secrets. Sepia gameplay, words
// punched on label-maker tape, a flashbulb and a numbered evidence marker on every cut.
export const evidenceLocker: Look = {
  id: 'evidence-locker',
  name: 'Evidence Locker',
  mood: "A detective's case file on Leonida's strangest secrets: label-maker captions, typewriter labels, a flashbulb and a numbered evidence marker on every cut.",
  palette: {green: '#FFD21F', red: '#D7263D', gold: '#FFD21F', teal: '#7FDBDA', pink: '#D7263D', orange: '#F28C28', magenta: '#9B5DE5', navy: '#0D0B08'},
  fonts: {display: "'Barlow Condensed ExtraBold', Anton, sans-serif", brand: "'Black Ops One', sans-serif", mono: "'Special Elite', monospace", arabic: "'Changa Bold', Tajawal, sans-serif"},
  displayWidth: 0.477,
  ink: '#0D0B08',
  captions: {style: 'dymo', size: 72},
  hud: {style: 'case'},
  finish: ['dust', 'grain', 'vignette'],
  grade: {tint: '#c9a24a', blend: 'soft-light', amount: 0.3, filter: 'sepia(0.35) saturate(0.85) contrast(1.12)'},
  cut: 'marker',
  enter: 'snap',
  title: 'outline',
  series: {'GTA 6 NEWS': {hud: {style: 'ticker'}, captions: {style: 'box', size: 86}, cut: 'shutter'}},
};
