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
      {name === 'phone' ? (
        <>
          <rect x="22" y="8" width="36" height="64" rx="8" {...common} />
          <path d="M36 62 H44" {...common} />
        </>
      ) : null}
    </svg>
  );
};
