import {C, F} from '../theme';
import {LOOKS} from './index';
import {Look, LookParts, ResolvedLook} from './types';

// The classic look's values, kept so every reel starts from them (the manual studio's reels
// and older episodes never name a look and must render exactly as before).
const BASE_C = {...C};
const BASE_F = {...F};

const CLASSIC: ResolvedLook = {
  id: 'classic', name: 'Classic', displayWidth: 0.47, ink: '#06060F',
  captions: {style: 'stroke'}, hud: {style: 'bar'}, finish: ['vignette', 'scanlines', 'grain'],
  grade: {}, cut: 'none', enter: 'zoomblur', title: 'glitch',
};

let current: ResolvedLook = CLASSIC;
let applied = '';

const merge = (look: Look, extra?: LookParts): ResolvedLook => {
  const parts: LookParts = {...look, ...(extra ?? {})};
  return {
    id: look.id,
    name: look.name,
    displayWidth: parts.displayWidth ?? CLASSIC.displayWidth,
    ink: parts.ink ?? CLASSIC.ink,
    captions: {...CLASSIC.captions, ...(look.captions ?? {}), ...(extra?.captions ?? {})},
    hud: {...CLASSIC.hud, ...(look.hud ?? {}), ...(extra?.hud ?? {})},
    finish: parts.finish ?? CLASSIC.finish,
    grade: {...(look.grade ?? {}), ...(extra?.grade ?? {})},
    cut: parts.cut ?? CLASSIC.cut,
    enter: parts.enter ?? CLASSIC.enter,
    title: parts.title ?? CLASSIC.title,
  };
};

// Called once at the top of the Reel, before any scene renders. Idempotent.
export const applyLook = (id?: string, series?: string) => {
  const key = `${id ?? ''}|${series ?? ''}`;
  if (key === applied) return;
  applied = key;
  Object.assign(C, BASE_C);
  Object.assign(F, BASE_F);
  if (!id || id === 'classic') {
    current = CLASSIC;
    return;
  }
  const look = LOOKS[id];
  if (!look) throw new Error(`Unknown look "${id}": add it to reels/src/looks/index.ts`);
  const extra = series ? look.series?.[series] : undefined;
  Object.assign(C, look.palette ?? {}, extra?.palette ?? {});
  Object.assign(F, look.fonts ?? {}, extra?.fonts ?? {});
  current = merge(look, extra);
};

export const look = () => current;

// Scale for text set in the display font so it keeps Anton's width.
export const widthScale = () => Math.min(1, 0.47 / current.displayWidth);
