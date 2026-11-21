import {Easing, interpolate, spring} from 'remotion';
import {FPS} from '../theme';

export const sec = (s: number) => Math.round(s * FPS);

export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// A springy 0→1 that starts at `delay` frames.
export const pop = (frame: number, delay = 0, damping = 12, mass = 0.6, stiffness = 140) =>
  spring({frame: frame - delay, fps: FPS, config: {damping, mass, stiffness}});

export const ease = (frame: number, from: number, to: number, out: [number, number] = [0, 1]) =>
  interpolate(frame, [from, to], out, {...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1)});

export const easeIn = (frame: number, from: number, to: number, out: [number, number] = [0, 1]) =>
  interpolate(frame, [from, to], out, {...clamp, easing: Easing.bezier(0.7, 0, 0.84, 0)});
