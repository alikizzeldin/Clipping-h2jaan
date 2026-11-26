import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C, F, FPS} from '../theme';
import {Word} from '../types';
import {pop} from './motion';
import {look, widthScale} from '../looks/state';
import {BoxCaptions, CcCaptions, KaraokeCaptions, RansomCaptions, StackCaptions, TapeCaptions} from '../looks/fx/captions';

type Chunk = {words: Word[]; start: number; end: number};

const BREAK = /[.,!?…:;]$/;

export function chunkWords(words: Word[], max = 3): Chunk[] {
  const chunks: Chunk[] = [];
  let cur: Word[] = [];
  for (const w of words) {
    cur.push(w);
    if (cur.length >= max || BREAK.test(w.text)) {
      chunks.push({words: cur, start: cur[0].start, end: cur[cur.length - 1].end});
      cur = [];
    }
  }
  if (cur.length) chunks.push({words: cur, start: cur[0].start, end: cur[cur.length - 1].end});
  return chunks;
}

// Word-by-word captions synced to the voice; the word being said lights up.
export const Captions: React.FC<{words: Word[]; hidden: (t: number) => boolean; y?: number}> = ({words, hidden, y = 1500}) => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const chunks = chunkWords(words);
  const idx = chunks.findIndex((c, i) => t >= c.start - 0.05 && t < (chunks[i + 1]?.start ?? c.end + 0.6));
  if (idx < 0 || hidden(t)) return null;
  const chunk = chunks[idx];
  const enter = pop(frame, Math.round((chunk.start - 0.05) * FPS), 13, 0.5, 220);
  const cap = look().captions;
  const top = cap.y ?? y;
  const Variant = {box: BoxCaptions, karaoke: KaraokeCaptions, tape: TapeCaptions, stack: StackCaptions, cc: CcCaptions, ransom: RansomCaptions}[cap.style as string];
  if (Variant) {
    return (
      <AbsoluteFill style={{pointerEvents: 'none'}}>
        <Variant words={chunk.words} t={t} enter={enter} y={top} />
      </AbsoluteFill>
    );
  }
  const accent = cap.active ? C[cap.active] : C.green;
  const size = Math.round((cap.size ?? 92) * widthScale());
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute', top, left: 70, right: 70, display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
          gap: '0 22px', transform: `scale(${0.85 + 0.15 * enter}) translateY(${(1 - enter) * 26}px)`, opacity: Math.min(1, enter * 1.4),
        }}
      >
        {chunk.words.map((w, i) => {
          const active = t >= w.start - 0.03 && t < w.end + 0.08;
          return (
            <span
              key={i}
              style={{
                fontFamily: cap.font ?? F.display, fontSize: size, lineHeight: 1.05, textTransform: 'uppercase',
                color: active ? accent : '#fff', transform: `scale(${active ? 1.08 : 1})`, display: 'inline-block',
                WebkitTextStroke: '10px #000', paintOrder: 'stroke fill',
                textShadow: active ? `0 0 28px ${accent}88, 0 6px 0 #000` : '0 6px 0 #000',
              }}
            >
              {w.text.replace(/[…]/g, '')}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
