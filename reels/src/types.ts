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
  items: {text: string; status: string; ok: boolean; at: number; icon: 'cash' | 'house' | 'bank' | 'car' | 'phone' | 'trophy' | 'save'}[];
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
  ar?: string;
};

export type ControlScene = Base & {
  type: 'control';
  rank: string; // "4" … "1": a countdown, best last
  label: string; // e.g. "HIDDEN CONTROL"
  title: string;
  button: 'TRIANGLE' | 'R3' | 'DPAD_LEFT';
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
  device: 'laptop' | 'keypad';
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
  icon?: 'snake' | 'knife';
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

export type Scene =
  | HookScene | LocationScene | TimeScene | TriggerScene | TwistScene | RewardScene | CtaScene
  | ListScene | PhoneScene | ScanScene | CashScene | ControlScene
  | EraScene | DialScene | StatScene | ComboScene | MenuScene
  | SettingScene | CodeScene | RevealScene | ProofScene | ChatScene;

export type Sfx = {src: string; at: number; volume?: number};

export type Reel = {
  series: string; // e.g. "SECRET FILE"
  episode: number;
  duration: number; // seconds
  voice: string;
  music: string;
  musicVolume?: number;
  words: Word[];
  scenes: Scene[];
  sfx: Sfx[];
};
