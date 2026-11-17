// The dashboard's building blocks, shared by both home layouts.

import { motion } from "framer-motion";
import { Bolt, CircleAlert, ExternalLink, FlaskConical, MonitorPlay, Play, Rocket, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { YOUTUBE_URL } from "../lib/config";
import { insights, type Activity, type Clip, type HistoryPoint, type Snapshot } from "../lib/data";
import { ago, compact, shortDate, until } from "../lib/format";
import { cancelRun, requestRun, type RunKind } from "../lib/api";
import { REPO_URL, WORKFLOW } from "../lib/config";
import { forgetRuns, type Run } from "../lib/github";
import { useStore } from "../lib/store";
import { Empty, Tag } from "./ui";

export function useNow(everyMs = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(t);
  }, [everyMs]);
  return now;
}

/** YouTube's own thumbnail for a published clip, when its link is known. */
export function thumb(clip: Clip): string {
  const match = clip.link?.match(/(?:v=|youtu\.be\/|shorts\/)([\w-]{6,})/);
  return match ? `https://i.ytimg.com/vi/${match[1]}/hqdefault.jpg` : "";
}

export type AgentState =
  | { kind: "paused" }
  | { kind: "armed"; left: ReturnType<typeof until> }
  | { kind: "live" | "failed"; headline: string; posted: number; perDay: number };

export function agentState(snap: Snapshot, runs: Run[], now: number): AgentState {
  if (snap.settings.paused) return { kind: "paused" };
  const start = snap.settings.start_at ? new Date(snap.settings.start_at).getTime() : 0;
  if (start && now < start) return { kind: "armed", left: until(start - now) };
  const info = insights(snap);
  const lastRun = runs.find((r) => r.status === "completed");
  const wait = info.nextSlot - now;
  const headline =
    info.today >= snap.settings.max_per_day ? "Today's clips are out"
    : wait > 0 ? `Next clip in ${until(wait).h}h ${until(wait).m}m`
    : "Next clip any moment";
  return { kind: lastRun?.conclusion === "failure" ? "failed" : "live", headline, posted: info.today, perDay: snap.settings.max_per_day };
}

export function Countdown({ left, size = "text-4xl" }: { left: ReturnType<typeof until>; size?: string }) {
  return (
    <div className={`flex gap-3 font-display tabular-nums tracking-wide text-snow ${size}`}>
      {([["d", left.d], ["h", left.h], ["m", left.m], ["s", left.s]] as const).map(([unit, value]) => (
        <span key={unit} className="flex items-baseline gap-1">
          {String(value).padStart(2, "0")}
          <span className="font-sans text-[0.3em] font-medium uppercase text-mist">{unit}</span>
        </span>
      ))}
    </div>
  );
}

export function StatusChip({ snap, runs }: { snap: Snapshot; runs: Run[] }) {
  const state = agentState(snap, runs, useNow());
  const shell = "rounded-2xl bg-night/60 px-5 py-4 ring-1 backdrop-blur-md";
  if (state.kind === "paused") {
    return <div className={`${shell} ring-gold/40`}><Tag tone="gold">Paused</Tag><p className="mt-2 text-sm text-snow/80">The agent is not publishing.</p></div>;
  }
  if (state.kind === "armed") {
    return (
      <div className={`${shell} ring-pink/40`}>
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-pink"><Rocket className="h-4 w-4" aria-hidden /> Launch in</p>
        <div className="mt-2"><Countdown left={state.left} /></div>
        <p className="mt-1 text-xs text-snow/60">First GTA 6 unlock · the agent is armed</p>
      </div>
    );
  }
  const failed = state.kind === "failed";
  return (
    <div className={`${shell} ${failed ? "ring-rose/50" : "ring-mint/40"}`}>
      <p className="flex items-center gap-2.5 text-xs font-semibold uppercase tracking-widest text-mint">
        <span className={`h-2.5 w-2.5 rounded-full ${failed ? "bg-rose" : "live-dot bg-mint"}`} />
        {failed ? <span className="text-rose">Last run failed</span> : "Agent live"}
      </p>
      <p className="mt-2 font-display text-3xl tracking-wide text-snow">{state.headline}</p>
      <p className="mt-1 text-xs text-snow/60">{state.posted} of {state.perDay} posted in the last 24 hours</p>
    </div>
  );
}

/** The day's slots: which are reserved for the featured streamer, which are filled. */
export function PlanSlots({ snap }: { snap: Snapshot }) {
  const info = insights(snap);
  const name = snap.settings.featured_channels[0];
  const reservedCount = Math.min(snap.settings.featured_per_day, snap.settings.max_per_day);
  return (
    <div>
      <p className="mb-3 flex items-center justify-between text-xs uppercase tracking-widest text-mist">
        Last 24 hours <span className="normal-case tracking-normal text-snow">{info.today} of {snap.settings.max_per_day} clips posted</span>
      </p>
      <div className="flex gap-2.5">
        {Array.from({ length: snap.settings.max_per_day }, (_, i) => {
          const reserved = i < reservedCount;
          const filled = reserved ? i < info.todayFeatured : i - reservedCount < info.today - info.todayFeatured;
          return (
            <motion.div
              key={i} initial={{ scaleX: 0.4, opacity: 0 }} whileInView={{ scaleX: 1, opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.1 * i }}
              className={`h-11 min-w-0 flex-1 truncate rounded-xl px-3 text-[11px] font-semibold uppercase leading-[2.75rem] tracking-wider ring-1 ${filled ? "bg-gradient-to-r from-violet to-pink text-snow ring-pink/60 shadow-[0_0_24px_-6px_rgb(255_47_208/0.9)]" : "text-mist ring-line"}`}
            >
              {reserved ? (name ?? "Featured") : "Open"}
            </motion.div>
          );
        })}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-mist">
        {reservedCount} slot{reservedCount === 1 ? " is" : "s are"} kept for {name ?? "featured streamers"}; the rest go to the biggest other channels.
      </p>
    </div>
  );
}

const ACTIVITY_STYLE: Record<Activity["type"], { tone: string; icon: typeof Play }> = {
  published: { tone: "text-mint bg-mint/10 ring-mint/30", icon: Play },
  skipped: { tone: "text-mist bg-white/5 ring-white/10", icon: ShieldCheck },
  error: { tone: "text-rose bg-rose/10 ring-rose/40", icon: CircleAlert },
  learned: { tone: "text-aqua bg-aqua/10 ring-aqua/30", icon: Sparkles },
  info: { tone: "text-gold bg-gold/10 ring-gold/30", icon: Bolt },
};

export function ActivityList({ items, compact: tight = false }: { items: Activity[]; compact?: boolean }) {
  if (!items.length) return <Empty title="Quiet so far">Posts, skips and lessons learned are listed here as they happen.</Empty>;
  return (
    <ul className="divide-y divide-line/50">
      {items.map((item, i) => {
        const style = ACTIVITY_STYLE[item.type] ?? ACTIVITY_STYLE.info;
        const Icon = style.icon;
        return (
          <motion.li
            key={item.time + i} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }} transition={{ delay: 0.04 * i }}
            className={`flex items-center gap-3 ${tight ? "py-2" : "py-3"}`}
          >
            <span className={`grid shrink-0 place-items-center rounded-xl ring-1 ${tight ? "h-7 w-7" : "h-9 w-9"} ${style.tone}`}><Icon className={tight ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden /></span>
            <p dir="auto" className={`min-w-0 flex-1 leading-snug text-snow/90 ${tight ? "line-clamp-2 text-xs" : "text-sm"}`}>{item.text}</p>
            <time className="shrink-0 text-xs text-mist">{ago(item.time)}</time>
          </motion.li>
        );
      })}
    </ul>
  );
}

const RUN_ORIGIN: Record<Run["origin"], string> = { schedule: "on the timer", timer: "on the timer", dashboard: "from the dashboard", hand: "by hand" };

export function RunsList({ runs, demo, limit = 5 }: { runs: Run[]; demo: boolean; limit?: number }) {
  if (!runs.length) return <Empty title={demo ? "Runs are hidden in demo mode" : "No runs to show"}>{demo ? "" : "Runs appear here once GitHub reports them."}</Empty>;
  return (
    <ul className="space-y-2">
      {runs.slice(0, limit).map((r) => {
        const good = r.conclusion === "success";
        const running = r.status !== "completed";
        return (
          <li key={r.id}>
            <a href={r.html_url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm ring-1 ring-line/70 hover:ring-pink/40">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${running ? "live-dot bg-gold" : good ? "bg-mint" : "bg-rose"}`} />
              <span className="min-w-0 flex-1 truncate text-snow/90">{running ? "Running" : good ? "Completed" : "Failed"} · {RUN_ORIGIN[r.origin] ?? "by hand"}</span>
              <time className="shrink-0 text-xs text-mist">{ago(r.created_at)}</time>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

const RUN_WORDS: Record<RunKind, string> = { run: "A run", test: "A test run", setup: "A setup check" };

/** The run the owner asked for, while the agent has not started it yet. */
export function waitingRun(snap: Snapshot | null, runs: Run[], now: number) {
  const request = snap?.request;
  if (!request) return null;
  const asked = new Date(request.requested_at).getTime();
  if (!Number.isFinite(asked) || now - asked > 2 * 60 * 60 * 1000) return null;
  const started = runs.some((r) => r.event === "workflow_dispatch" && new Date(r.created_at).getTime() >= asked);
  return started ? null : { ...request, minutes: Math.max(0, Math.floor((now - asked) / 60000)) };
}

export function QuickActions({ stacked = false }: { stacked?: boolean }) {
  const { snap, runs, demo, reload, report, toast } = useStore();
  const now = useNow(20000);
  const [busy, setBusy] = useState(false);
  const waiting = waitingRun(snap, runs, now);

  async function ask(kind: RunKind) {
    if (demo) return toast("Demo mode: nothing was started.");
    setBusy(true);
    try {
      await requestRun(kind);
      forgetRuns();
      toast(`${RUN_WORDS[kind]} is on its way. The agent starts it at its next check.`);
      await reload();
    } catch (error) {
      report(error, "Could not ask for the run.");
    } finally {
      setBusy(false);
    }
  }

  async function withdraw() {
    setBusy(true);
    try {
      await cancelRun();
      await reload();
    } catch (error) {
      report(error, "Could not withdraw the request.");
    } finally {
      setBusy(false);
    }
  }

  // While a request is waiting, look for its run more often than the usual refresh.
  useEffect(() => {
    if (!waiting) return;
    const timer = setInterval(() => { forgetRuns(); reload(); }, 60000);
    return () => clearInterval(timer);
  }, [waiting?.id, reload]);

  const off = busy || Boolean(waiting);
  return (
    <>
      <div className={stacked ? "flex flex-wrap justify-center gap-3" : "grid grid-cols-2 gap-3"}>
        <button className="btn btn-primary" disabled={off} onClick={() => ask("run")}><Play className="h-4 w-4" aria-hidden /> Run now</button>
        <button className="btn btn-ghost" disabled={off} onClick={() => ask("test")}><FlaskConical className="h-4 w-4" aria-hidden /> Test run</button>
        <button className="btn btn-ghost" disabled={off} onClick={() => ask("setup")}><ShieldCheck className="h-4 w-4" aria-hidden /> Check setup</button>
        <a className="btn btn-ghost" href={YOUTUBE_URL} target="_blank" rel="noreferrer"><MonitorPlay className="h-4 w-4" aria-hidden /> Channel</a>
      </div>
      {waiting && (
        <p role="status" className={`mt-4 text-xs leading-relaxed text-mist ${stacked ? "text-center" : ""}`}>
          <span className="mr-2 inline-block h-2 w-2 rounded-full bg-gold align-middle live-dot" />
          {RUN_WORDS[waiting.kind]} was requested {waiting.minutes < 1 ? "just now" : `${waiting.minutes} min ago`}. The agent starts it at its next check, within two hours at most.{" "}
          <button className="text-pink hover:underline" disabled={busy} onClick={withdraw}>Withdraw</button>
          {" · "}Need it this minute? <a className="text-pink hover:underline" href={`${REPO_URL}/actions/workflows/${WORKFLOW}`} target="_blank" rel="noreferrer">Start it on GitHub</a>
        </p>
      )}
    </>
  );
}

function TrendTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="panel px-3.5 py-2.5 text-xs">
      <p className="text-mist">{label ? shortDate(label) : ""}</p>
      <p className="mt-0.5 font-display text-xl tracking-wide text-snow">{compact(payload[0].value)} <span className="font-sans text-xs text-mist">views</span></p>
    </div>
  );
}

export function TrendChart({ history, id, bare = false }: { history: HistoryPoint[]; id: string; bare?: boolean }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={history} margin={bare ? { top: 4, right: 0, left: 0, bottom: 0 } : { top: 6, right: 6, left: -14, bottom: 0 }}>
        <defs>
          <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ff2fd0" stopOpacity={0.55} /><stop offset="1" stopColor="#8a3cff" stopOpacity={0} />
          </linearGradient>
          <linearGradient id={`${id}-line`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#8a3cff" /><stop offset="0.6" stopColor="#ff2fd0" /><stop offset="1" stopColor="#ff8a3d" />
          </linearGradient>
        </defs>
        {!bare && <CartesianGrid stroke="#2b1740" strokeDasharray="3 6" vertical={false} />}
        {!bare && <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fill: "#a999c2", fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={28} />}
        {!bare && <YAxis tickFormatter={compact} tick={{ fill: "#a999c2", fontSize: 11 }} axisLine={false} tickLine={false} width={52} />}
        <Tooltip content={<TrendTooltip />} cursor={{ stroke: "#ff2fd0", strokeOpacity: 0.4 }} />
        <Area type="monotone" dataKey="views" stroke={`url(#${id}-line)`} strokeWidth={bare ? 2.5 : 3} fill={`url(#${id}-fill)`} animationDuration={1600} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function TopClip({ snap, small = false }: { snap: Snapshot; small?: boolean }) {
  const info = insights(snap);
  const top = info.top;
  if (!top) return <Empty title="Nothing to rank yet">The best clip shows here after the first views are counted.</Empty>;
  return (
    <div className="flex gap-4">
      <div className={`relative aspect-[9/16] shrink-0 overflow-hidden rounded-2xl ring-1 ring-pink/40 ${small ? "w-20" : "w-32"}`}>
        {thumb(top) ? <img src={thumb(top)} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-gradient-to-br from-violet via-pink to-sunset" />}
        <span className="absolute inset-0 grid place-items-center"><span className="grid h-9 w-9 place-items-center rounded-full bg-night/60 ring-1 ring-white/30"><Play className="h-4 w-4 fill-snow text-snow" aria-hidden /></span></span>
      </div>
      <div className="min-w-0">
        <p dir="auto" className={`font-semibold leading-snug text-snow ${small ? "line-clamp-2 text-sm" : "line-clamp-3 text-lg"}`}>{top.title}</p>
        <p className="mt-1 text-xs text-mist">from {top.channel}</p>
        <p className={`font-display tracking-wide text-snow ${small ? "mt-2 text-3xl" : "mt-4 text-4xl"}`}>{compact(top.views ?? 0)} <span className="font-sans text-sm text-mist">views</span></p>
        {info.avgViews > 0 && <p className="text-xs text-mint">{((top.views ?? 0) / info.avgViews).toFixed(1)}× the average clip</p>}
        {top.link && !small && <a href={top.link} target="_blank" rel="noreferrer" className="btn btn-ghost mt-4">Watch <ExternalLink className="h-4 w-4" aria-hidden /></a>}
      </div>
    </div>
  );
}
