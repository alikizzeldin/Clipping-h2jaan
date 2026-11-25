// A "look" is one day's visual identity for the reels: colours, fonts, captions, top bar,
// film finish, colour grade, scene cuts and how big words are drawn. Every reel names its
// look in plan.json (`reel.style`); a reel without one keeps the classic look.
//
// Palette slots keep their old names so every scene follows the look without changes:
//   green  = the main accent (active caption word, checks, step chips, "go")
//   red    = danger / alerts / stamps        gold = rewards and money
//   teal   = tech, scans, maps               pink + orange = the brand gradient
//   magenta = a spare accent                 navy = the darkest background

export type Palette = {
  pink: string; magenta: string; orange: string; teal: string; green: string; gold: string; red: string; navy: string; white: string;
};
export type Fonts = {display: string; brand: string; mono: string; arabic: string; hand: string; body: string};

// Caption styles (looks/fx/captions.tsx).
export type CaptionStyle = 'stroke' | 'box' | 'karaoke' | 'tape' | 'stack' | 'cc';
// Top bars (looks/fx/hud.tsx).
export type HudStyle = 'bar' | 'tape' | 'case' | 'ticker' | 'minimal';
// Full-frame finishes, drawn in order over everything (looks/fx/finish.tsx).
export type FinishFx = 'vignette' | 'scanlines' | 'grain' | 'vhs' | 'halftone' | 'paper' | 'lightleak' | 'dust' | 'crt' | 'bloom';
// What happens on every cut between scenes (looks/fx/cuts.tsx).
export type CutStyle = 'none' | 'flash' | 'shutter' | 'whip' | 'glitch' | 'iris' | 'ink' | 'tracking';
// How a scene's own content arrives (ui/Pieces.tsx SceneIn).
export type EnterStyle = 'zoomblur' | 'slide' | 'rise' | 'snap';
// How big words (hook titles, twists, reveals) are drawn (looks/fx/titles.tsx).
export type TitleStyle = 'glitch' | 'chrome' | 'outline' | 'neon' | 'print';

export type LookParts = {
  palette?: Partial<Palette>;
  fonts?: Partial<Fonts>;
  // Average letter width of the display font, in em (Anton = 0.47). Big words and captions
  // shrink to keep the same width when a wider font is used.
  displayWidth?: number;
  ink?: string; // text drawn on top of accent chips
  captions?: {style: CaptionStyle; size?: number; y?: number; font?: string; active?: keyof Palette};
  hud?: {style: HudStyle};
  finish?: FinishFx[];
  grade?: {
    filter?: string; // extra CSS filter on the gameplay, e.g. "saturate(1.3) contrast(1.1)"
    tint?: string; blend?: string; amount?: number; // one colour laid over the gameplay
    duotone?: [string, string]; // [shadows, highlights]: gameplay as a two-colour print
  };
  cut?: CutStyle;
  enter?: EnterStyle;
  title?: TitleStyle;
};

export type Look = LookParts & {
  id: string; // also the file name in looks/catalog/
  name: string; // shown to the owner, e.g. "Vice Tape"
  mood: string; // one line: the idea behind it
  // Per-format tweaks on top of the look, keyed by series label ("GTA 6 NEWS", "MONEY FILE"…).
  series?: Record<string, LookParts>;
};

export type ResolvedLook = Required<Pick<LookParts, 'displayWidth' | 'ink' | 'captions' | 'hud' | 'finish' | 'grade' | 'cut' | 'enter' | 'title'>> & {
  id: string;
  name: string;
};
