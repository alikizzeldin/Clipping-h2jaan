export type Word = {text: string; start: number; end: number};

export type Broll = {
  src: string; // file under public/
  startFrom?: number; // seconds into the file
  grade?: 'night' | 'green' | 'warm' | 'cold' | 'none';
  dim?: number; // 0..1 extra darkness
  blur?: number; // px
  zoom?: [number, number];
};

type Base = {from: number; to: number; broll?: Broll; captions?: boolean};

export type HookScene = Base & {
  type: 'hook';
  stamp: string;
  kicker: string;
  title: string[];
  color?: string;
  tag?: string;
  tagAt?: number;
  ar?: string;
  ufo?: boolean;
  counter?: {from: number; to: number; at: number}; // a balance that drains (money hooks)
};
export type LocationScene = Base & {
  type: 'location';
  step: string;
  label: string;
  place: string;
  target: string;
  direction: string;
  region?: string;
  ar?: string;
  // The map's look (default hud). "image" puts the pin on a real picture: `image` names a file from
  // plan.stills or plan.media (an in-game map screenshot, a photo…), `pin` is where, in % of the card.
  style?: 'hud' | 'gps' | 'paper' | 'neon' | 'radar' | 'image';
  image?: string;
  pin?: {x: number; y: number};
};
// Real photos/screenshots from the web (Reddit posts, store pages, old games…) as taped cards over b-roll.
// Each src names a file from plan.media or plan.stills; x/y/w are px on the 1080x1920 frame, rot in degrees.
export type PhotosScene = Base & {
  type: 'photos';
  kicker?: string; // a small line on top, e.g. "REAL PLAYERS' NOTES"
  title?: string; // a big line under the photos
  titleAt?: number;
  photos: {src: string; at: number; x: number; y: number; w: number; rot: number; caption?: string; credit?: string}[];
  ar?: string;
};
export type TimeScene = Base & {
  type: 'time';
  step: string;
  label: string;
  times: string[];
  suffix: string;
  note: string;
  ar?: string;
};
export type TriggerScene = Base & {
  type: 'trigger';
  step: string;
  label: string;
  title: string;
  sub: string;
  ar?: string;
  target: {x: number; y: number; w: number; h: number};
  tagText?: string;
  contact?: string; // the small label on the brackets (default "CONTACT")
};
export type TwistScene = Base & {
  type: 'twist';
  pre: string;
  slamAt: number;
  lines: {text: string; at: number; color?: string; size?: number}[];
  ar?: string;
  ufo?: boolean;
};
export type RewardScene = Base & {
  type: 'reward';
  later?: string;
  rewardAt: number;
  label: string;
  name: string;
  tier: string;
  ar?: string;
};
export type CtaScene = Base & {
  type: 'cta';
  line1: string;
  line2: string;
  button: string;
  ar?: string;
  next?: string;
};

export type ListScene = Base & {
  type: 'list';
  chip: string;
  label: string;
  fromLabel?: string; // e.g. "CHAPTER 1"
  toLabel?: string; // e.g. "CHAPTER 2"
  items: {text: string; status: string; ok: boolean; at: number; icon: 'cash' | 'house' | 'bank' | 'car' | 'phone' | 'trophy' | 'save' | 'ticket' | 'boat' | 'wave' | 'gun' | 'lock' | 'shop' | 'book' | 'paper' | 'pill' | 'barn' | 'flask' | 'alert' | 'ladder' | 'fire' | 'fish' | 'eye' | 'siren'; alert?: boolean}[];
  ar?: string;
  arAt?: number;
  cardAt?: number; // when the list card rises (leave the footage clear until then)
};
export type PhoneScene = Base & {
  type: 'phone';
  app: string;
  notice: {title: string; text: string; at: number};
  source: {label: string; amount: number};
  target: {label: string; amount: number};
  moveAt: number;
  done: string;
  ar?: string;
};
export type ScanScene = Base & {
  type: 'scan';
  step: string;
  label: string;
  hud?: string; // the blinking line under the checks (default: "● SCANNING VEHICLE…")
  target: {x: number; y: number; w: number; h: number};
  checks: {text: string; at: number}[];
  ar?: string;
};
export type CashScene = Base & {
  type: 'cash';
  proof?: {src: string; at: number; until: number; highlights: {y: number; h: number; color?: string}[]; caption: string};
  title: string;
  amount: string;
  per: string;
  amountAt: number;
  repeat?: string;
  repeatAt?: number;
  // Optional lead-in before the payout: a cash bundle gets a rubber stamp (`stamp`, e.g. "MARKED"), then
  // slides over to a buyer chip (`to`, e.g. "YASMANI") under a small `label` (e.g. "SELL TO"). Seconds into the scene.
  fence?: {stamp: string; to: string; label?: string; at: number; toAt: number};
  ar?: string;
};

export type ControlScene = Base & {
  type: 'control';
  rank: string; // "4" … "1": a countdown, best last ("" hides the rank)
  label: string; // e.g. "HIDDEN CONTROL"
  title: string;
  button: 'TRIANGLE' | 'R3' | 'DPAD_LEFT' | 'L3R3'; // L3R3: both sticks clicked together
  taps: 1 | 2 | 'hold';
  pressAt: number; // seconds into the scene, on the word that names the input
  chip?: string; // e.g. "XBOX: Y"
  flip?: boolean; // draw a car rolling back onto its wheels instead of a button
  ar?: string;
};

export type Era = {
  game: string; // "VICE CITY"
  year: string; // "2002"
  look: 'vc' | 'sa' | 'iv' | 'v';
  at: number; // seconds into the scene
  cheat: string; // what is shown: buttons ("R1 R2 L1 R2 ← ↓ → ↑"), a word, or a number
  kind: 'buttons' | 'typed' | 'dial';
  note?: string; // small caption, e.g. "ALL WEAPONS"
  beats?: number[]; // seconds in the scene when each spoken button appears
  // Real footage/photos of the old game, played inside the TV one after another (scene seconds).
  // With media, the cheat shows on a strip under the TV (or on a phone for "dial").
  media?: {src: string; at: number; kind: 'video' | 'image'; startFrom?: number; zoom?: [number, number]; flash?: boolean}[];
  // Photos people posted (cheats written on paper…): taped cards under the TV.
  photos?: {src: string; at: number; x: number; y: number; w: number; rot: number; caption?: string}[];
  done?: number; // dial: seconds in the scene when the call goes through ("Cheat activated")
};
export type EraScene = Base & {
  type: 'era';
  eras: Era[];
  recap?: {at: number; lines: {text: string; at: number; color?: string}[]}; // the closing look back
  ar?: string;
};
export type DialScene = Base & {
  type: 'dial';
  kicker: string;
  number: string;
  typeFrom: number;
  failAt: number;
  stamp: string;
  title: string[];
  ar?: string;
};
export type StatScene = Base & {
  type: 'stat';
  kicker: string;
  value: number;
  countAt: number;
  label: string;
  sub?: string;
  ar?: string;
};
export type ComboScene = Base & {
  type: 'combo';
  label: string;
  phoneAt: number;
  holdAt: number;
  typeAt: number;
  sequence: string[]; // D-pad presses shown, e.g. ["↑", "→", "↓", "←"]
  xbox: string; // "LB + RB"
  title: string;
  ar?: string;
};
export type MenuScene = Base & {
  type: 'menu';
  menu: string; // "PROGRESS"
  tab: string; // "CHEATS"
  revealAt: number;
  unlockAt: number;
  note?: string;
  ar?: string;
};
export type SettingScene = Base & {
  type: 'setting';
  rank: string; // "4" … "1": a countdown, best last
  label: string; // e.g. "CHANGE THIS"
  tabs: string[]; // the menu's tabs, e.g. ["DISPLAY", "CAMERA", "UI"]
  tab: string; // the active one
  name: string; // the setting's row, e.g. "Camera Shake"
  kind: 'toggle' | 'slider' | 'option';
  fromValue: string; // "ON", "10", "MISSIONS ONLY"
  toValue: string; // "OFF", "5", "ALL DIALOGUE"
  max?: number; // slider range (0..max)
  changeAt: number; // seconds into the scene, on the word that changes it
  title: string;
  chip?: string; // e.g. "DEFAULT: 10"
  ar?: string;
};

export type CodeScene = Base & {
  type: 'code';
  step: string;
  label: string;
  device: 'laptop' | 'keypad' | 'safe'; // safe: a steel safe door with a keypad that swings open
  inside?: {text: string; at: number}[]; // safe only: what's revealed inside, seconds into the scene
  prompt: string; // "PASSWORD", "ENTER CODE"
  code: string; // what gets typed
  typeAt: number; // seconds into the scene: first character
  typeEnd: number; // seconds into the scene: last character
  done: string; // "ACCESS GRANTED"
  doneAt?: number; // defaults to just after the last character
  note?: string; // a small line under the device
  ar?: string;
};

export type RevealScene = Base & {
  type: 'reveal';
  pre: string; // typed in the dark first
  slamAt: number;
  lines: {text: string; at: number; color?: string; size?: number}[];
  icon?: 'snake' | 'knife' | 'hat' | 'crab' | 'heli' | 'pill' | 'bottle' | 'block';
  color?: string; // flash and glow colour
  ar?: string;
};

export type ProofScene = Base & {
  type: 'proof';
  step: string;
  label: string;
  proof: {src: string; at: number; caption: string; highlights: {x?: number; y: number; w?: number; h: number; color?: string}[]}; // a still (from plan.stills); highlights in percent
  title: string;
  sub?: string;
  titleAt: number;
  ar?: string;
};

export type ChatScene = Base & {
  type: 'chat';
  step: string;
  label: string;
  app: string; // e.g. "WhatUp"
  contact: string; // e.g. "Unknown"
  messages: {text: string; at: number; icon?: 'pin' | 'key'}[];
  ar?: string;
};

// ---- the 60 FPS reel: consoles, a cable chain, the frame-gen app, 30 → 60, and a fallback ----
export type ConsolesScene = Base & {
  type: 'consoles';
  title: string; // "EVERY CONSOLE"
  value: string; // "30"
  items: {name: string; at: number; hot?: boolean}[];
  ar?: string;
};
export type ChainScene = Base & {
  type: 'chain';
  step: string;
  label: string;
  devices: {name: string; sub?: string; at: number; icon: 'console' | 'capture' | 'pc'}[];
  links: string[]; // cable labels between devices, e.g. ["HDMI", "USB"]
  title: string;
  ar?: string;
};
export type AppScene = Base & {
  type: 'fgapp';
  step: string;
  label: string;
  capture: {at: number; title: string; fps: string}; // the capture viewer window
  app: {at: number; src: string; name: string; price: string; priceAt: number}; // the real app screenshot
  rows: {label: string; from: string; value: string; at: number}[];
  scaleAt: number;
  ar?: string;
};
export type BoostScene = Base & {
  type: 'boost';
  fromValue: string;
  toValue: string;
  fromAt: number;
  toAt: number;
  caption: string;
  ar?: string;
};
export type AltScene = Base & {
  type: 'alt';
  question: string;
  answer: string;
  answerAt: number;
  chips: {text: string; at: number; tone: 'good' | 'warn' | 'bad'}[];
  shot?: string; // a real screenshot of the app, shown in the window
  shotUntil?: number; // after this, the window shows the streamed game instead
  ar?: string;
};

export type CompareScene = Base & {
  type: 'compare';
  step: string;
  label: string;
  bars: {label: string; sub?: string; value: number; display: string; at: number; color?: string}[];
  result?: {text: string; at: number};
  ar?: string;
};

export type SavesScene = Base & {
  type: 'saves';
  step: string;
  label: string;
  title: string; // "SAVE GAME"
  slots: number; // 15
  slot: number; // the slot that gets saved (0-based)
  countAt: number;
  saveAt: number;
  usedText: string; // label on the slots before it, e.g. "CHAPTER 1"
  savedText: string; // e.g. "BEFORE THE FINALE"
  autoText: string;
  ar?: string;
};

export type HeadlineScene = Base & {
  type: 'headline';
  tag: string; // "BREAKING NEWS"
  source: string;
  date: string;
  headline: string;
  typeAt: number;
  ar?: string;
};

export type HeatScene = Base & {
  type: 'heat';
  step: string;
  label: string;
  stars: number;
  icons: {icon: 'outfit' | 'face' | 'car' | 'weapon' | 'cctv'; label: string; at: number; clearAt?: number}[];
  title: string;
  doneTitle?: string; // shown once every icon is cleared
  ar?: string;
};

export type RadarScene = Base & {
  type: 'radar';
  step: string;
  label: string;
  hideAt: number; // the police blips vanish
  pulseAt?: number; // a Focus pulse finds them again
  introText: string;
  hiddenText: string;
  foundText: string;
  ar?: string;
};

export type ComicScene = Base & {
  type: 'comic';
  step: string;
  label: string;
  title: string; // the masthead, e.g. "RX-MEN"
  publisher: string;
  issue: string;
  price: string;
  cover: string; // the cover line, e.g. "PAGING DR. PLACEBO!"
  coverAt?: number;
  callouts?: {text: string; at: number; color?: string}[];
  burst?: {text: string; at: number};
  ar?: string;
};

export type HealthScene = Base & {
  type: 'health';
  step: string;
  label: string;
  item: string; // the item picked on the wheel
  wheelAt: number;
  pickAt: number;
  fillAt: number;
  hpFrom: number; // health before, 0..1
  hpTo: number; // health after, 0..1
  title: string;
  ar?: string;
};

export type MailboxScene = Base & {
  type: 'mailbox';
  step: string;
  label: string;
  flagAt: number;
  pressAt: number;
  prompt: string; // "COLLECT"
  title: string;
  sub?: string;
  subAt?: number;
  ar?: string;
};

export type ProfileScene = Base & {
  type: 'profile';
  step: string;
  label: string;
  title: string;
  titleAt: number;
  left: string; // the calm end of the scale, e.g. "PROFESSIONAL"
  right: string; // the extreme end, e.g. "PSYCHO"
  people?: {name: string; at: number; value: number}[]; // dossier cards, each with a mini gauge (value 0..1)
  needle?: {from: number; to: number; startAt: number; endAt: number}; // one big gauge whose needle slides
  flag?: {text: string; at: number}; // a stamp, e.g. when the needle hits the end
  ar?: string;
};

export type CreditsScene = Base & {
  type: 'credits';
  step: string;
  label: string;
  lines: {role: string; name: string}[];
  highlight: number; // index of the line that lights up
  highlightAt: number;
  ar?: string;
};

export type RadioScene = Base & {
  type: 'radio';
  step: string;
  label: string;
  stations: {freq: string; name: string; host: string; note?: string; at: number; color?: string}[];
  ar?: string;
};

// A case file of evidence bags, each with a numbered marker, photographed one by one.
export type EvidenceScene = Base & {
  type: 'evidence';
  step: string;
  label: string;
  caseTitle: string; // e.g. "CASE FILE · MANDY"
  items: {n: number; name: string; where: string; icon: 'finger' | 'cleaver' | 'tape' | 'shears'; at: number}[];
  ar?: string;
};

// A thermal receipt prints line by line from a slot; an optional rubber stamp lands on it.
export type ReceiptScene = Base & {
  type: 'receipt';
  step: string;
  label: string;
  title: string;
  sub?: string;
  lines: {text: string; amount?: string; at: number; color?: string; big?: boolean}[];
  stamp?: {text: string; at: number; color?: string};
  ar?: string;
};

// A typed dossier sheet: each value sits under a black redaction bar that peels off on its cue.
// keep: the bar never lifts (a small red note can sit beside it); hi: a highlighter mark once revealed.
export type RedactedScene = Base & {
  type: 'redacted';
  step: string;
  label: string;
  docTitle: string;
  lines: {label: string; value: string; at?: number; keep?: boolean; note?: string; hi?: boolean}[];
  stamp?: {text: string; at: number; color?: string};
  ar?: string;
};

// Two elevator doors: an out-of-order sign with a red balloon, the other car opens full of balloons,
// the lights die and a clown face flashes in the dark.
export type ElevatorScene = Base & {
  type: 'elevator';
  step: string;
  label: string;
  sign: string; // the paper sign on the broken door, e.g. "OUT OF ORDER"
  signAt: number;
  callAt: number;
  openAt: number;
  darkAt?: number;
  clownAt?: number;
  goneAt?: number;
  ar?: string;
};

// A bedroom window shows the day sky; a sleep menu lists wake-up times, the cursor lands on one,
// the eyes blink shut and the window opens on the new time (night: moon and stars).
export type SleepScene = Base & {
  type: 'sleep';
  step: string;
  label: string;
  title: string; // the menu header, e.g. "SLEEP UNTIL…"
  options: {text: string; icon: 'sunrise' | 'sun' | 'sunset' | 'moon'}[];
  menuAt: number;
  pick: number; // index of the chosen option
  pickAt: number;
  wakeAt: number; // the blink; the window shows the chosen time after it
  wakeText?: string; // a chip on the window after waking, e.g. "WOKE UP · NIGHT"
  ar?: string;
};

// A hotel corridor in one-point perspective: the ceiling lights flicker and die, red symbols glow on
// the walls, a whisper caption drifts in, and the far door swings open on white fog.
export type HallwayScene = Base & {
  type: 'hallway';
  step: string;
  label: string;
  floor?: string; // a sign by the door, e.g. "TOP FLOOR"
  darkAt: number;
  symbolsAt: number;
  whisperAt?: number;
  doorAt: number;
  fogAt?: number;
  fogText?: string;
  ar?: string;
};

export type LoopScene = Base & {
  type: 'loop';
  step: string;
  label: string;
  nodes: {text: string; at: number}[]; // steps round a ring, clockwise from the top; each lights up at `at`
  center: string; // the word in the middle, e.g. "REPEAT"
  centerAt: number;
  ar?: string;
};

// A car seen from behind: the trunk opens, what's inside rises out as cards; optionally it burns.
export type TrunkScene = Base & {
  type: 'trunk';
  step: string;
  label: string;
  title?: string;
  titleAt?: number;
  color?: string; // palette slot for the car (default red)
  openAt: number; // seconds into the scene; 0 or less = already open
  items: {name: string; sub?: string; icon: 'gascan' | 'revolver' | 'cash'; at: number; hero?: boolean}[];
  heroChip?: {text: string; at: number}; // e.g. UNIQUE, on the hero card
  burnAt?: number; // the car goes up in flames, the cards turn grey
  gone?: {text: string; at: number}; // a stamp over the cards
  note?: {text: string; at: number}; // a chip under the cards
  ar?: string;
};

// A time portal: a neon ring tunnel, sparks sucked in, a year counter rolling between two years.
export type PortalScene = Base & {
  type: 'portal';
  step: string;
  label: string;
  title: string; // the destination, big (e.g. "VICE CITY")
  titleAt: number;
  sub?: string; // a small line above the title
  fromYear: number;
  toYear: number;
  rollAt: number; // seconds into the scene: the counter starts rolling
  rollEnd: number; // ...and lands (with a flash)
  ar?: string;
};

// A bank vault on a security camera: a round steel door stays shut until a guard walks in with the
// cash; then the bolts slide back, the wheel spins, the door swings open and a "window" bar drains.
export type VaultScene = Base & {
  type: 'vault';
  step: string;
  label: string;
  guardAt: number; // seconds into the scene: the guard walks in with the cash bag
  openAt: number; // the door unlocks and swings open
  windowAt?: number; // the "window" bar appears and starts draining
  lockedText?: string; // status pill texts (defaults: LOCKED / DELIVERY IN PROGRESS / VAULT OPEN)
  deliveryText?: string;
  openText?: string;
  windowText?: string; // default "THAT'S YOUR WINDOW"
  ar?: string;
};

// Side view of a street at night: a pickup reverses up to an ATM in a wall, a winch hook latches on,
// the truck floors it, cracks spread and the machine tears out of the wall (seconds into the scene).
export type WinchScene = Base & {
  type: 'winch';
  step: string;
  label: string;
  backAt: number; // the truck reverses in
  hookAt: number; // the hook latches on
  pullAt: number; // the truck floors it, cable taut, tension meter fills
  ripAt: number; // the machine tears out
  find?: string; // status before the truck arrives (default "FIND AN OUTDOOR ATM")
  sign?: string; // the lit sign over the machine (default "ATM")
  done?: string; // status after the rip (default "RIPPED OUT")
  ar?: string;
};

// A film poster from the game world, redrawn (explosion sky, soldier, title, billing block). On
// `zoomAt` the camera zooms into the billing block; each name lifts off its grey bar under a
// highlighter at its `at`. Every other billing line stays an unreadable bar (no invented names).
export type PosterScene = Base & {
  type: 'poster';
  step: string;
  label: string;
  title: string; // the film's title on the poster
  subtitle?: string; // a second title line in red
  credit: string; // the readable credit, e.g. "PRODUCED BY"
  names: {text: string; at: number}[]; // seconds into the scene
  notes?: {text: string; at: number}[]; // sticky notes pinned over the poster (they leave on the zoom)
  zoomAt?: number;
  zoomTo?: number; // zoom scale (default 1.85)
  redraw?: string; // the small honesty chip (default "REDRAWN")
  ar?: string;
};

export type Scene =
  | PhotosScene | ConsolesScene | ChainScene | AppScene | BoostScene | AltScene
  | HookScene | LocationScene | TimeScene | TriggerScene | TwistScene | RewardScene | CtaScene
  | ListScene | PhoneScene | ScanScene | CashScene | ControlScene
  | EraScene | DialScene | StatScene | ComboScene | MenuScene
  | SettingScene | CodeScene | RevealScene | ProofScene | ChatScene | CompareScene | SavesScene | RadarScene | HeadlineScene | HeatScene
  | ComicScene | HealthScene | MailboxScene | ProfileScene | CreditsScene | RadioScene | LoopScene | EvidenceScene | ReceiptScene | TrunkScene | RedactedScene | ElevatorScene | PortalScene | SleepScene | VaultScene | WinchScene | HallwayScene | PosterScene;

export type Sfx = {src: string; at: number; volume?: number};

export type Reel = {
  series: string; // e.g. "SECRET FILE"
  style?: string; // the day's look (reels/src/looks/catalog); none = classic
  episode: number;
  duration: number; // seconds
  voice: string;
  music: string;
  musicVolume?: number;
  words: Word[];
  scenes: Scene[];
  sfx: Sfx[];
};
