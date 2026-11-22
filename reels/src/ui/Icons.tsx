import React from 'react';

// Simple line icons drawn in SVG (no emoji font needed).
export const Icon: React.FC<{name: string; color: string; size?: number}> = ({name, color, size = 72}) => {
  const common = {fill: 'none', stroke: color, strokeWidth: 6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};
  return (
    <svg width={size} height={size} viewBox="0 0 80 80">
      {name === 'cash' ? (
        <>
          <rect x="8" y="20" width="64" height="40" rx="6" {...common} />
          <circle cx="40" cy="40" r="9" {...common} />
          <path d="M18 30 v20 M62 30 v20" {...common} />
        </>
      ) : null}
      {name === 'house' ? (
        <>
          <path d="M10 38 L40 12 L70 38" {...common} />
          <path d="M18 32 V68 H62 V32" {...common} />
          <rect x="33" y="46" width="14" height="22" {...common} />
        </>
      ) : null}
      {name === 'bank' ? (
        <>
          <path d="M8 30 L40 12 L72 30 Z" {...common} />
          <path d="M16 36 V60 M32 36 V60 M48 36 V60 M64 36 V60" {...common} />
          <path d="M8 68 H72" {...common} />
        </>
      ) : null}
      {name === 'car' ? (
        <>
          <path d="M10 50 L16 32 Q18 26 26 26 H54 Q62 26 64 32 L70 50 V60 H10 Z" {...common} />
          <circle cx="24" cy="60" r="7" {...common} />
          <circle cx="56" cy="60" r="7" {...common} />
        </>
      ) : null}
      {name === 'trophy' ? (
        <>
          <path d="M24 12 H56 V34 C56 46 48 52 40 52 C32 52 24 46 24 34 Z" {...common} />
          <path d="M24 18 H12 C12 30 18 36 26 36 M56 18 H68 C68 30 62 36 54 36" {...common} />
          <path d="M40 52 V62 M28 68 H52" {...common} />
        </>
      ) : null}
      {name === 'save' ? (
        <>
          <path d="M12 12 H58 L68 22 V68 H12 Z" {...common} />
          <rect x="24" y="12" width="28" height="18" {...common} />
          <rect x="22" y="44" width="36" height="24" {...common} />
        </>
      ) : null}
      {name === 'phone' ? (
        <>
          <rect x="22" y="8" width="36" height="64" rx="8" {...common} />
          <path d="M36 62 H44" {...common} />
        </>
      ) : null}
      {name === 'ticket' ? (
        <>
          <path d="M10 24 H70 V36 C64 36 62 40 62 40 C62 40 64 44 70 44 V56 H10 V44 C16 44 18 40 18 40 C18 40 16 36 10 36 Z" {...common} />
          <path d="M46 26 V54" {...common} strokeDasharray="4 6" />
        </>
      ) : null}
      {name === 'boat' ? (
        <>
          <path d="M8 50 H72 L62 64 H18 Z" {...common} />
          <path d="M38 50 V12 L60 44 H38" {...common} />
          <path d="M8 72 Q18 66 28 72 T48 72 T68 72" {...common} />
        </>
      ) : null}
      {name === 'wave' ? (
        <>
          <path d="M8 30 Q18 22 28 30 T48 30 T68 30" {...common} />
          <path d="M8 46 Q18 38 28 46 T48 46 T68 46" {...common} />
          <path d="M8 62 Q18 54 28 62 T48 62 T68 62" {...common} />
        </>
      ) : null}
    </svg>
  );
};
