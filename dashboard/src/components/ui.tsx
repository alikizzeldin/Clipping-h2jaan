import { animate, motion, useInView, useMotionValue, useTransform } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";
import { compact } from "../lib/format";

export const rise = {
  hidden: { opacity: 0, y: 18 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.55, delay: 0.06 * i, ease: [0.2, 0.8, 0.2, 1] as const } }),
};

export function Panel({
  children, className = "", index = 0, title, icon, action,
}: {
  children: ReactNode; className?: string; index?: number; title?: string; icon?: ReactNode; action?: ReactNode;
}) {
  return (
    <motion.section
      className={`panel p-5 sm:p-6 ${className}`}
      variants={rise} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }} custom={index}
    >
      {(title || action) && (
        <header className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2.5 text-[15px] font-semibold tracking-wide text-snow">
            {icon && <span className="text-pink">{icon}</span>}
            {title}
          </h2>
          {action}
        </header>
      )}
      {children}
    </motion.section>
  );
}

/** A number that counts up when it first scrolls into view. */
export function Counter({ value, className = "" }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true });
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => compact(v));
  useEffect(() => {
    if (!seen) return;
    const controls = animate(mv, value, { duration: 1.4, ease: [0.16, 1, 0.3, 1] });
    return controls.stop;
  }, [seen, value, mv]);
  return <motion.span ref={ref} className={className}>{text}</motion.span>;
}

export function Tag({ children, tone = "pink" }: { children: ReactNode; tone?: "pink" | "aqua" | "mint" | "gold" | "rose" | "mist" }) {
  const tones = {
    pink: "bg-pink/12 text-pink ring-pink/30",
    aqua: "bg-aqua/10 text-aqua ring-aqua/30",
    mint: "bg-mint/10 text-mint ring-mint/30",
    gold: "bg-gold/10 text-gold ring-gold/30",
    rose: "bg-rose/12 text-rose ring-rose/35",
    mist: "bg-white/5 text-mist ring-white/10",
  } as const;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ring-1 ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function Toggle({ on, onChange, label, hint, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string; disabled?: boolean }) {
  return (
    <label className={`flex cursor-pointer items-start justify-between gap-4 py-2.5 ${disabled ? "opacity-50" : ""}`}>
      <span>
        <span className="block text-sm font-medium text-snow">{label}</span>
        {hint && <span className="mt-0.5 block text-xs leading-relaxed text-mist">{hint}</span>}
      </span>
      <button
        type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled}
        onClick={() => onChange(!on)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-gradient-to-r from-violet to-pink" : "bg-line"}`}
      >
        <motion.span
          layout transition={{ type: "spring", stiffness: 520, damping: 32 }}
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow ${on ? "right-0.5" : "left-0.5"}`}
        />
      </button>
    </label>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line/80 px-6 py-10 text-center">
      <p className="font-display text-xl tracking-wide text-snow/90">{title}</p>
      {children && <p className="mt-2 max-w-md text-sm leading-relaxed text-mist">{children}</p>}
    </div>
  );
}

export function PageTitle({ kicker, title, children }: { kicker: string; title: string; children?: ReactNode }) {
  return (
    <motion.div className="mb-6 flex flex-wrap items-end justify-between gap-4" variants={rise} initial="hidden" animate="show">
      <div>
        <p className="font-script text-2xl text-pink neon-text">{kicker}</p>
        <h1 className="font-display text-4xl uppercase tracking-wide sunset-text sm:text-5xl">{title}</h1>
      </div>
      {children}
    </motion.div>
  );
}

/** Horizontal bars for a ranked breakdown. */
export function Bars({ rows, unit = "views" }: { rows: { key: string; value: number; note?: string }[]; unit?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-3.5">
      {rows.map((row, i) => (
        <li key={row.key}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-medium text-snow">{row.key}</span>
            <span className="shrink-0 tabular-nums text-mist">
              <span className="font-semibold text-snow">{compact(row.value)}</span> {unit}
              {row.note && <span className="ml-2 text-xs">· {row.note}</span>}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/5">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-violet via-pink to-sunset"
              initial={{ width: 0 }} whileInView={{ width: `${Math.max(3, (row.value / max) * 100)}%` }}
              viewport={{ once: true }} transition={{ duration: 0.9, delay: 0.08 * i, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
