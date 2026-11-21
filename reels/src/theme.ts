// The GTA6Fied look: Vice City sunset colours on a deep night navy.
export const C = {
  pink: '#FF2E88',
  magenta: '#B517FF',
  orange: '#FF8A3D',
  teal: '#1EF2E0',
  green: '#8CFF5A',
  gold: '#FFC857',
  red: '#FF3B4E',
  navy: '#06060F',
  white: '#FFFFFF',
};

export const F = {
  display: 'Anton, Impact, sans-serif',
  brand: 'Unbounded, sans-serif',
  mono: '"JetBrains Mono", monospace',
  arabic: 'Tajawal, Cairo, sans-serif',
  hand: '"Permanent Marker", cursive',
  body: 'Inter, sans-serif',
};

export const FPS = 30;
export const W = 1080;
export const H = 1920;

export const accent = (name?: string) => (name && name in C ? C[name as keyof typeof C] : C.green);
