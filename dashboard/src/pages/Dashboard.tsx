import { motion } from "framer-motion";
import { Activity as ActivityIcon, BarChart3, Bolt, CircleAlert, ExternalLink, Flame, FlaskConical, Play, Rocket, ShieldCheck, Sparkles, MonitorPlay } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Hero, type HeroStat } from "../components/Hero";
import { Empty, Panel, Tag } from "../components/ui";
import { REPO_URL, WORKFLOW, YOUTUBE_URL } from "../lib/config";
import { insights, type Activity, type Snapshot } from "../lib/data";
import { ago, compact, shortDate, until } from "../lib/format";
import { GitHubError, startRun, type Run } from "../lib/github";
import { useStore } from "../lib/store";
import { thumb } from "./Clips";

function useNow(everyMs = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(t);
  }, [everyMs]);
  return now;
}

function StatusChip({ snap, runs }: { snap: Snapshot; runs: Run[] }) {
  const now = useNow();
  const start = snap.settings.start_at ? new Date(snap.settings.start_at).getTime() : 0;
  const info = insights(snap);
  const lastRun = runs.find((r) => r.status === "completed");
  const shell = "rounded-2xl bg-night/60 px-5 py-4 ring-1 backdrop-blur-md";

  if (snap.settings.paused) {
    return <div className={`${shell} ring-gold/40`}><Tag tone="gold">Paused</Tag><p className="mt-2 text-sm text-snow/80">The agent is not publishing.</p></div>;
  }
  if (start && now < start) {
    const t = until(start - now);
    return (
      <div className={`${shell} ring-pink/40`}>
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-pink"><Rocket className="h-4 w-4" aria-hidden /> Launch in</p>
        <div className="mt-2 flex gap-3 font-display text-4xl tabular-nums tracking-wide text-snow">
          {[["d", t.d], ["h", t.h], ["m", t.m], ["s", t.s]].map(([unit, value]) => (
            <span key={unit as string} className="flex items-baseline gap-1">
              {String(value).padStart(2, "0")}<span className="font-sans text-xs font-medium uppercase text-mist">{unit}</span>
            </span>
          ))}
        </div>
        <p className="mt-1 text-xs text-snow/60">First GTA 6 unlock · the agent is armed</p>
      </div>
    );
  }
  const failed = lastRun?.conclusion === "failure";
  const wait = info.nextSlot - now;
  const room = info.today < snap.settings.max_per_day;
  return (
    <div className={`${shell} ${failed ? "ring-rose/50" : "ring-mint/40"}`}>
      <p className="flex items-center gap-2.5 text-xs font-semibold uppercase tracking-widest text-mint">
        <span className={`h-2.5 w-2.5 rounded-full ${failed ? "bg-rose" : "live-dot bg-mint"}`} />
        {failed ? <span className="text-rose">Last run failed</span> : "Agent live"}
      </p>
      <p className="mt-2 font-display text-3xl tracking-wide text-snow">
        {!room ? "Today's clips are out" : wait > 0 ? `Next clip in ${until(wait).h}h ${until(wait).m}m` : "Next clip any moment"}
      </p>
      <p className="mt-1 text-xs text-snow/60">{info.today} of {snap.settings.max_per_day} posted in the last 24 hours</p>
    </div>
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

const ACTIVITY_STYLE: Record<Activity["type"], { tone: string; icon: typeof Play }> = {
  published: { tone: "text-mint bg-mint/10 ring-mint/30", icon: Play },
  skipped: { tone: "text-mist bg-white/5 ring-white/10", icon: ShieldCheck },
  error: { tone: "text-rose bg-rose/10 ring-rose/40", icon: CircleAlert },
  learned: { tone: "text-aqua bg-aqua/10 ring-aqua/30", icon: Sparkles },
  info: { tone: "text-gold bg-gold/10 ring-gold/30", icon: Bolt },
};

export function ActivityList({ items }: { items: Activity[] }) {
  return (
    <ul className="divide-y divide-line/50">
      {items.map((item, i) => {
        const style = ACTIVITY_STYLE[item.type] ?? ACTIVITY_STYLE.info;
        const Icon = style.icon;
        return (
          <motion.li
            key={item.time + i} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }} transition={{ delay: 0.04 * i }}
            className="flex items-center gap-3.5 py-3"
          >
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ring-1 ${style.tone}`}><Icon className="h-4 w-4" aria-hidden /></span>
            <p className="min-w-0 flex-1 text-sm leading-snug text-snow/90">{item.text}</p>
            <time className="shrink-0 text-xs text-mist">{ago(item.time)}</time>
          </motion.li>
        );
      })}
    </ul>
  );
}

export default function Dashboard() {
  const { snap, runs, hasKey, demo, toast } = useStore();
  const [busy, setBusy] = useState("");
  if (!snap) return <div className="panel h-[430px] animate-pulse" />;

  const info = insights(snap);
  const featuredName = snap.settings.featured_channels[0];
  const stats: HeroStat[] = [
    { label: "Total views", value: info.totalViews, icon: "views", note: info.measuredClips ? `${compact(info.avgViews)} per clip` : "Counted a day after posting" },
    { label: "Clips published", value: info.totalClips, icon: "clips", note: `${info.today} in the last 24 hours` },
    { label: featuredName ? `Clips from ${featuredName}` : "Featured clips", value: info.featuredShare, icon: "star", note: `${snap.settings.featured_per_day} reserved every day` },
  ];

  async function run(kind: "live" | "dry" | "check") {
    if (demo) return toast("Demo mode: nothing was started.");
    setBusy(kind);
    try {
      await startRun({ dry_run: kind !== "live", check_setup: kind === "check" });
      toast(kind === "live" ? "Run started. It appears under the agent's runs in a moment." : kind === "dry" ? "Test run started. It renders a clip without publishing." : "Setup check started.");
    } catch (error) {
      toast(error instanceof GitHubError ? error.message : "Could not start the run.", "bad");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="space-y-6">
      <Hero stats={stats} status={<StatusChip snap={snap} runs={runs} />} />

      <div className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <Panel title="Views over time" icon={<BarChart3 className="h-5 w-5" />} index={0}
          action={<Link to="/analytics" className="text-xs font-medium text-mist hover:text-pink">Full analytics →</Link>}>
          {snap.history.length > 1 ? (
            <>
              <p className="font-display text-5xl tracking-wide text-snow">{compact(info.totalViews)}</p>
              <p className="text-sm text-mist">total views across {info.totalClips} clips</p>
              <div className="mt-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={snap.history} margin={{ top: 6, right: 6, left: -14, bottom: 0 }}>
                    <defs>
                      <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#ff2fd0" stopOpacity={0.55} />
                        <stop offset="1" stopColor="#8a3cff" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="trend-line" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0" stopColor="#8a3cff" /><stop offset="0.6" stopColor="#ff2fd0" /><stop offset="1" stopColor="#ff8a3d" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#2b1740" strokeDasharray="3 6" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fill: "#a999c2", fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={28} />
                    <YAxis tickFormatter={compact} tick={{ fill: "#a999c2", fontSize: 11 }} axisLine={false} tickLine={false} width={52} />
                    <Tooltip content={<TrendTooltip />} cursor={{ stroke: "#ff2fd0", strokeOpacity: 0.4 }} />
                    <Area type="monotone" dataKey="views" stroke="url(#trend-line)" strokeWidth={3} fill="url(#trend-fill)" animationDuration={1600} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <Empty title="No view history yet">The chart fills in once clips are published and YouTube reports their views, about a day after each post.</Empty>
          )}
        </Panel>

        <Panel title="Top performing clip" icon={<Flame className="h-5 w-5 text-sunset" />} index={1}>
          {info.top ? (
            <div className="flex gap-5">
              <div className="relative aspect-[9/16] w-32 shrink-0 overflow-hidden rounded-2xl ring-1 ring-pink/40">
                {thumb(info.top) ? <img src={thumb(info.top)} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-gradient-to-br from-violet via-pink to-sunset" />}
                <span className="absolute inset-0 grid place-items-center"><span className="grid h-10 w-10 place-items-center rounded-full bg-night/60 ring-1 ring-white/30"><Play className="h-4 w-4 fill-snow text-snow" aria-hidden /></span></span>
              </div>
              <div className="min-w-0">
                <p dir="auto" className="line-clamp-3 text-lg font-semibold leading-snug text-snow">{info.top.title}</p>
                <p className="mt-1 text-sm text-mist">from {info.top.channel}</p>
                <p className="mt-4 font-display text-4xl tracking-wide text-snow">{compact(info.top.views ?? 0)} <span className="font-sans text-sm text-mist">views</span></p>
                {info.avgViews > 0 && <p className="text-xs text-mint">{((info.top.views ?? 0) / info.avgViews).toFixed(1)}× the average clip</p>}
                {info.top.link && <a href={info.top.link} target="_blank" rel="noreferrer" className="btn btn-ghost mt-4">Watch <ExternalLink className="h-4 w-4" aria-hidden /></a>}
              </div>
            </div>
          ) : (
            <Empty title="Nothing to rank yet">The best clip shows here after the first views are counted.</Empty>
          )}
          <div className="mt-6 border-t border-line/60 pt-5">
            <p className="mb-3 flex items-center justify-between text-xs uppercase tracking-widest text-mist">
              Last 24 hours <span className="normal-case tracking-normal text-snow">{info.today} of {snap.settings.max_per_day} clips posted</span>
            </p>
            <div className="flex gap-2.5">
              {Array.from({ length: snap.settings.max_per_day }, (_, i) => {
                const reserved = i < snap.settings.featured_per_day;
                const filled = reserved ? i < info.todayFeatured : i - snap.settings.featured_per_day < info.today - info.todayFeatured;
                return (
                  <motion.div
                    key={i} initial={{ scaleX: 0.4, opacity: 0 }} whileInView={{ scaleX: 1, opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.1 * i }}
                    className={`h-11 flex-1 rounded-xl px-3 text-[11px] font-semibold uppercase leading-[2.75rem] tracking-wider ring-1 ${filled ? "bg-gradient-to-r from-violet to-pink text-snow ring-pink/60 shadow-[0_0_24px_-6px_rgb(255_47_208/0.9)]" : "text-mist ring-line"}`}
                  >
                    {reserved ? (featuredName ?? "Featured") : "Open"}
                  </motion.div>
                );
              })}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-mist">
              {snap.settings.featured_per_day} slot{snap.settings.featured_per_day === 1 ? " is" : "s are"} kept for {featuredName ?? "featured streamers"}; the rest go to the biggest other channels.
            </p>
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr_1.1fr]">
        <Panel title="Quick actions" icon={<Bolt className="h-5 w-5 text-gold" />} index={0}>
          <div className="grid grid-cols-2 gap-3">
            <button className="btn btn-primary" disabled={!hasKey || busy !== ""} onClick={() => run("live")}><Play className="h-4 w-4" aria-hidden /> Run now</button>
            <button className="btn btn-ghost" disabled={!hasKey || busy !== ""} onClick={() => run("dry")}><FlaskConical className="h-4 w-4" aria-hidden /> Test run</button>
            <button className="btn btn-ghost" disabled={!hasKey || busy !== ""} onClick={() => run("check")}><ShieldCheck className="h-4 w-4" aria-hidden /> Check setup</button>
            <a className="btn btn-ghost" href={YOUTUBE_URL} target="_blank" rel="noreferrer"><MonitorPlay className="h-4 w-4" aria-hidden /> Channel</a>
          </div>
          {!hasKey && <p className="mt-4 text-xs leading-relaxed text-mist">Starting runs needs your owner key. <Link to="/settings" className="text-pink hover:underline">Add it in Settings</Link>.</p>}
        </Panel>

        <Panel title="Agent runs" icon={<ActivityIcon className="h-5 w-5" />} index={1}
          action={<a href={`${REPO_URL}/actions/workflows/${WORKFLOW}`} target="_blank" rel="noreferrer" className="text-xs font-medium text-mist hover:text-pink">All runs →</a>}>
          {runs.length ? (
            <ul className="space-y-2.5">
              {runs.slice(0, 5).map((r) => {
                const good = r.conclusion === "success";
                const running = r.status !== "completed";
                return (
                  <li key={r.id}>
                    <a href={r.html_url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm ring-1 ring-line/70 hover:ring-pink/40">
                      <span className={`h-2.5 w-2.5 rounded-full ${running ? "live-dot bg-gold" : good ? "bg-mint" : "bg-rose"}`} />
                      <span className="flex-1 text-snow/90">{running ? "Running" : good ? "Completed" : "Failed"} · {r.event === "schedule" ? "scheduled" : "started by hand"}</span>
                      <time className="text-xs text-mist">{ago(r.created_at)}</time>
                    </a>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty title={demo ? "Runs are hidden in demo mode" : "No runs to show"}>{demo ? "" : "Runs appear here once GitHub reports them."}</Empty>
          )}
        </Panel>

        <Panel title="Recent activity" icon={<Sparkles className="h-5 w-5 text-aqua" />} index={2}>
          {snap.activity.length ? <ActivityList items={snap.activity.slice(0, 5)} /> : <Empty title="Quiet so far">Posts, skips and lessons learned are listed here as they happen.</Empty>}
        </Panel>
      </div>
    </div>
  );
}
