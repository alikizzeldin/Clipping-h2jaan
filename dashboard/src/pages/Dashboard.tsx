// Home, "Cinematic" layout: a wide banner with the logo, then panels below.

import { Activity as ActivityIcon, BarChart3, Bolt, Flame, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Hero, type HeroStat } from "../components/Hero";
import { Empty, Panel } from "../components/ui";
import { ActivityList, PlanSlots, QuickActions, RunsList, StatusChip, TopClip, TrendChart } from "../components/widgets";
import { REPO_URL, WORKFLOW } from "../lib/config";
import { insights, type Snapshot } from "../lib/data";
import { compact } from "../lib/format";
import { useStore } from "../lib/store";

export function heroStats(snap: Snapshot): HeroStat[] {
  const info = insights(snap);
  const featuredName = snap.settings.featured_channels[0];
  return [
    { label: "Total views", value: info.totalViews, icon: "views", note: info.measuredClips ? `${compact(info.avgViews)} per clip` : "Counted a day after posting" },
    { label: "Clips published", value: info.totalClips, icon: "clips", note: `${info.today} in the last 24 hours` },
    { label: featuredName ? `Clips from ${featuredName}` : "Featured clips", value: info.featuredShare, icon: "star", note: `${snap.settings.featured_per_day} reserved every day` },
  ];
}

export default function Dashboard() {
  const { snap, runs, demo } = useStore();
  if (!snap) return <div className="panel h-[560px] animate-pulse" />;
  const info = insights(snap);

  return (
    <div className="space-y-6">
      <Hero stats={heroStats(snap)} status={<StatusChip snap={snap} runs={runs} />} />

      <div className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <Panel title="Views over time" icon={<BarChart3 className="h-5 w-5" />} index={0}
          action={<Link to="/analytics" className="text-xs font-medium text-mist hover:text-pink">Full analytics →</Link>}>
          {snap.history.length > 1 ? (
            <>
              <p className="font-display text-5xl tracking-wide text-snow">{compact(info.totalViews)}</p>
              <p className="text-sm text-mist">total views across {info.totalClips} clips</p>
              <div className="mt-4 h-56"><TrendChart history={snap.history} id="trend" /></div>
            </>
          ) : (
            <Empty title="No view history yet">The chart fills in once clips are published and YouTube reports their views, about a day after each post.</Empty>
          )}
        </Panel>

        <Panel title="Top performing clip" icon={<Flame className="h-5 w-5 text-sunset" />} index={1}>
          <TopClip snap={snap} />
          <div className="mt-6 border-t border-line/60 pt-5"><PlanSlots snap={snap} /></div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr_1.1fr]">
        <Panel title="Quick actions" icon={<Bolt className="h-5 w-5 text-gold" />} index={0}><QuickActions /></Panel>
        <Panel title="Agent runs" icon={<ActivityIcon className="h-5 w-5" />} index={1}
          action={<a href={`${REPO_URL}/actions/workflows/${WORKFLOW}`} target="_blank" rel="noreferrer" className="text-xs font-medium text-mist hover:text-pink">All runs →</a>}>
          <RunsList runs={runs} demo={demo} />
        </Panel>
        <Panel title="Recent activity" icon={<Sparkles className="h-5 w-5 text-aqua" />} index={2}>
          <ActivityList items={snap.activity.slice(0, 5)} />
        </Panel>
      </div>
    </div>
  );
}
