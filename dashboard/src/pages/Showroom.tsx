// Home, "Showroom" layout: the 3D logo stands in the middle of the screen and
// the dashboard's panels float to its left and right, wired to it by light.

import { motion } from "framer-motion";
import { Activity as ActivityIcon, BrainCircuit, CalendarCheck, Eye, Flame, Hand, Rocket, Sparkles } from "lucide-react";
import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Logo3D } from "../components/Logo3D";
import { Counter, Tag } from "../components/ui";
import { ActivityList, agentState, Countdown, PlanSlots, QuickActions, RunsList, TopClip, TrendChart, useNow } from "../components/widgets";
import { CHANNEL_NAME } from "../lib/config";
import { insights } from "../lib/data";
import { compact } from "../lib/format";
import { useStore } from "../lib/store";

type Side = "left" | "right";
type Hover = { side: Side; index: number } | null;
type Beam = { key: string; d: string; side: Side; index: number };

function HudPanel({
  side, index, title, icon, children, onHover, register,
}: {
  side: Side; index: number; title: string; icon: ReactNode; children: ReactNode;
  onHover: (h: Hover) => void; register: (key: string, el: HTMLElement | null) => void;
}) {
  const tilt = side === "left" ? 9 : -9;
  return (
    <motion.section
      ref={(el) => register(`${side}-${index}`, el)}
      className="panel relative z-10 p-5"
      style={{ transformPerspective: 1300 }}
      initial={{ opacity: 0, x: side === "left" ? -60 : 60, rotateY: tilt * 2.2 }}
      animate={{ opacity: 1, x: 0, rotateY: tilt }}
      transition={{ duration: 0.9, delay: 0.35 + index * 0.12, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ rotateY: 0, scale: 1.035, transition: { type: "spring", stiffness: 260, damping: 22 } }}
      onHoverStart={() => onHover({ side, index })}
      onHoverEnd={() => onHover(null)}
    >
      <h2 className="mb-3 flex items-center gap-2.5 text-[13px] font-semibold uppercase tracking-[0.18em] text-snow/90">
        <span className="text-pink">{icon}</span>{title}
      </h2>
      {children}
    </motion.section>
  );
}

export default function Showroom() {
  const { snap, runs, demo } = useStore();
  const now = useNow();
  const [hover, setHover] = useState<Hover>(null);
  const [beams, setBeams] = useState<{ w: number; h: number; list: Beam[] }>({ w: 0, h: 0, list: [] });
  const frame = useRef<HTMLDivElement>(null);
  const centre = useRef<HTMLDivElement>(null);
  const panels = useRef(new Map<string, HTMLElement>());

  const measure = useCallback(() => {
    const box = frame.current?.getBoundingClientRect();
    const mid = centre.current?.getBoundingClientRect();
    if (!box || !mid || window.innerWidth < 1280) return setBeams({ w: 0, h: 0, list: [] });
    const cx = mid.left + mid.width / 2 - box.left;
    const cy = mid.top + mid.height * 0.44 - box.top;
    const list: Beam[] = [];
    panels.current.forEach((el, key) => {
      const r = el.getBoundingClientRect();
      const [side, index] = key.split("-") as [Side, string];
      const x = (side === "left" ? r.right : r.left) - box.left;
      const y = r.top + r.height / 2 - box.top;
      const bend = (cx - x) * 0.55;
      list.push({ key, side, index: Number(index), d: `M${x},${y} C${x + bend},${y} ${cx - bend * 0.35},${cy} ${cx},${cy}` });
    });
    setBeams({ w: box.width, h: box.height, list });
  }, []);

  const register = useCallback((key: string, el: HTMLElement | null) => {
    if (el) panels.current.set(key, el);
    else panels.current.delete(key);
  }, []);

  useLayoutEffect(() => {
    measure();
    const timer = setTimeout(measure, 1500); // once the entrance animation has settled
    const observer = new ResizeObserver(measure);
    if (frame.current) observer.observe(frame.current);
    window.addEventListener("resize", measure);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure, snap]);

  if (!snap) return <div className="panel h-[70dvh] animate-pulse" />;
  const info = insights(snap);
  const state = agentState(snap, runs, now);
  const inUse = [...snap.learned.rules, ...snap.rules.manual].filter((r) => !snap.rules.dismissed.includes(r.id) && !snap.rules.disabled.includes(r.id)).length;
  const hud = { onHover: setHover, register };

  return (
    <div ref={frame} className="relative">
      {/* light running from every panel into the logo */}
      {beams.w > 0 && (
        <svg className="pointer-events-none absolute inset-0 z-0" width={beams.w} height={beams.h} viewBox={`0 0 ${beams.w} ${beams.h}`} aria-hidden>
          <defs>
            <linearGradient id="beam-left" x1="0" x2="1"><stop offset="0" stopColor="#8a3cff" /><stop offset="1" stopColor="#ff2fd0" /></linearGradient>
            <linearGradient id="beam-right" x1="1" x2="0"><stop offset="0" stopColor="#ff8a3d" /><stop offset="1" stopColor="#ff2fd0" /></linearGradient>
          </defs>
          {beams.list.map((beam) => {
            const lit = hover?.side === beam.side && hover.index === beam.index;
            return (
              <g key={beam.key}>
                <path d={beam.d} fill="none" stroke={`url(#beam-${beam.side})`} strokeWidth={lit ? 3 : 1.2} opacity={lit ? 1 : 0.28}
                  style={{ transition: "opacity .3s, stroke-width .3s", filter: lit ? "drop-shadow(0 0 8px #ff2fd0)" : undefined }} />
                <path d={beam.d} fill="none" stroke="#fff" strokeWidth={lit ? 2.5 : 1.4} strokeLinecap="round" className="beam-pulse" opacity={lit ? 0.95 : 0.5}
                  style={{ animationDuration: lit ? "1.1s" : `${3.2 + beam.index * 0.7}s` }} />
              </g>
            );
          })}
        </svg>
      )}

      <div className="grid items-center gap-6 xl:min-h-[calc(100dvh-210px)] xl:grid-cols-[minmax(290px,350px)_minmax(0,1fr)_minmax(290px,350px)]">
        <div className="order-2 space-y-5 xl:order-1">
          <HudPanel side="left" index={0} title="Total views" icon={<Eye className="h-4 w-4" />} {...hud}>
            <Counter value={info.totalViews} className="block font-display text-6xl leading-none tracking-wide sunset-text" />
            <p className="mt-1.5 text-xs text-mint">{info.measuredClips ? `${compact(info.avgViews)} per clip · ${info.totalClips} clips` : "Counted about a day after each post"}</p>
            {snap.history.length > 1 && <div className="mt-3 h-16"><TrendChart history={snap.history} id="spark" bare /></div>}
          </HudPanel>
          <HudPanel side="left" index={1} title="Today's plan" icon={<CalendarCheck className="h-4 w-4" />} {...hud}>
            <PlanSlots snap={snap} />
          </HudPanel>
          <HudPanel side="left" index={2} title="Top clip" icon={<Flame className="h-4 w-4 text-sunset" />} {...hud}>
            <TopClip snap={snap} small />
          </HudPanel>
        </div>

        <div ref={centre} className="relative order-1 xl:order-2">
          <motion.p initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="text-center text-sm text-snow/70">
            Welcome back, <span className="font-semibold text-snow">{CHANNEL_NAME}</span>
          </motion.p>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }} className="mt-1.5 hidden items-center justify-center gap-2 text-[11px] uppercase tracking-[0.25em] text-mist sm:flex">
            <Hand className="h-3.5 w-3.5" aria-hidden /> Drag the logo to turn it · double-click to spin
          </motion.p>
          <div className="mx-auto h-[360px] w-full max-w-[760px] sm:h-[460px] xl:h-[min(46dvh,540px)]">
            <Logo3D lean={hover ? (hover.side === "left" ? -1 : 1) : 0} />
          </div>

          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.7 }} className="relative z-10 mt-4 flex flex-col items-center text-center">
            {state.kind === "armed" && (
              <>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-pink neon-text"><Rocket className="h-4 w-4" aria-hidden /> Launch in</p>
                <div className="mt-1"><Countdown left={state.left} size="text-6xl sm:text-7xl" /></div>
                <p className="mt-1 text-xs text-snow/60">First GTA 6 unlock · the agent is armed</p>
              </>
            )}
            {state.kind === "paused" && <><Tag tone="gold">Paused</Tag><p className="mt-2 font-display text-5xl tracking-wide text-snow">Not publishing</p></>}
            {(state.kind === "live" || state.kind === "failed") && (
              <>
                <p className={`flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.3em] ${state.kind === "failed" ? "text-rose" : "text-mint"}`}>
                  <span className={`h-2.5 w-2.5 rounded-full ${state.kind === "failed" ? "bg-rose" : "live-dot bg-mint"}`} />
                  {state.kind === "failed" ? "Last run failed" : "Agent live"}
                </p>
                <p className="mt-1 font-display text-5xl tracking-wide text-snow sm:text-6xl">{state.headline}</p>
                <p className="mt-1 text-xs text-snow/60">{state.posted} of {state.perDay} posted in the last 24 hours</p>
              </>
            )}
            <div className="mt-5"><QuickActions stacked /></div>
          </motion.div>
        </div>

        <div className="order-3 space-y-5">
          <HudPanel side="right" index={0} title="Agent runs" icon={<ActivityIcon className="h-4 w-4" />} {...hud}>
            <RunsList runs={runs} demo={demo} limit={4} />
          </HudPanel>
          <HudPanel side="right" index={1} title="Recent activity" icon={<Sparkles className="h-4 w-4 text-aqua" />} {...hud}>
            <ActivityList items={snap.activity.slice(0, 4)} compact />
          </HudPanel>
          <HudPanel side="right" index={2} title="Learning" icon={<BrainCircuit className="h-4 w-4" />} {...hud}>
            <div className="flex items-end justify-between gap-3">
              <div>
                <Counter value={inUse} className="font-display text-5xl leading-none tracking-wide text-snow" />
                <p className="mt-1 text-xs text-mist">rule{inUse === 1 ? "" : "s"} shaping which clips are picked</p>
              </div>
              <Link to="/learning" className="btn btn-ghost !px-3.5 !py-2 text-xs">Open</Link>
            </div>
          </HudPanel>
        </div>
      </div>
    </div>
  );
}
