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
  items: {text: string; status: string; ok: boolean; at: number; icon: 'cash' | 'house' | 'bank' | 'car' | 'phone'}[];
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

export type Scene =
  | HookScene | LocationScene | TimeScene | TriggerScene | TwistScene | RewardScene | CtaScene
  | ListScene | PhoneScene | ScanScene | CashScene;

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
