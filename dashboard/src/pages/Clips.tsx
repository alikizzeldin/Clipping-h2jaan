import { motion } from "framer-motion";
import { ExternalLink, Eye, Scissors } from "lucide-react";
import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Empty, PageTitle, Tag } from "../components/ui";
import { thumb } from "../components/widgets";
import type { Clip } from "../lib/data";
import { compact, dateTime, duration } from "../lib/format";
import { useStore } from "../lib/store";

function status(clip: Clip) {
  if (clip.status === "error") return <Tag tone="rose">Failed</Tag>;
  if (clip.link || clip.status === "sent") return <Tag tone="mint">Live</Tag>;
  return <Tag tone="gold">Sending</Tag>;
}

export default function Clips() {
  const { snap } = useStore();
  const [params, setParams] = useSearchParams();
  const q = (params.get("q") ?? "").toLowerCase();
  const only = params.get("status") ?? "all";
  const channel = params.get("channel") ?? "all";

  const channels = useMemo(() => [...new Set(snap?.clips.map((c) => c.channel) ?? [])].sort(), [snap]);
  const clips = useMemo(
    () =>
      (snap?.clips ?? []).filter((c) => {
        if (only === "error" && c.status !== "error") return false;
        if (only === "live" && c.status === "error") return false;
        if (channel !== "all" && c.channel !== channel) return false;
        return !q || c.title.toLowerCase().includes(q) || c.channel.toLowerCase().includes(q);
      }),
    [snap, q, only, channel],
  );

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value === "all" || value === "") next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  return (
    <>
      <PageTitle kicker="Everything published" title="Clips">
        <div className="flex flex-wrap gap-2">
          <input className="field !w-52" placeholder="Search…" aria-label="Search clips" value={params.get("q") ?? ""} onChange={(e) => set("q", e.target.value)} />
          <select className="field !w-auto" aria-label="Streamer" value={channel} onChange={(e) => set("channel", e.target.value)}>
            <option value="all">All streamers</option>
            {channels.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="field !w-auto" aria-label="Status" value={only} onChange={(e) => set("status", e.target.value)}>
            <option value="all">Any status</option>
            <option value="live">Published</option>
            <option value="error">Failed</option>
          </select>
        </div>
      </PageTitle>

      {clips.length === 0 ? (
        <Empty title={snap?.clips.length ? "No clips match" : "No clips yet"}>
          {snap?.clips.length ? "Try a different search or filter." : "Clips appear here as soon as the agent publishes them."}
        </Empty>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {clips.map((clip, i) => (
            <motion.article
              key={clip.id} className="panel group overflow-hidden"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.04 }}
              whileHover={{ y: -4 }}
            >
              <div className="relative aspect-video overflow-hidden">
                {thumb(clip) ? (
                  <img src={thumb(clip)} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <div className="grid h-full w-full place-items-center bg-[linear-gradient(135deg,#2a0f55,#a11d8f_55%,#ff8a3d)]">
                    <span className="font-display text-5xl uppercase tracking-wider text-snow/85">{clip.channel.slice(0, 3)}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-night/90 via-transparent to-transparent" />
                <div className="absolute left-3 top-3 flex gap-2">
                  {status(clip)}
                  {clip.origin === "auto" && <Tag tone="aqua"><Scissors className="h-3 w-3" aria-hidden /> Agent cut</Tag>}
                </div>
                {clip.duration ? <span className="absolute bottom-3 right-3 rounded-md bg-night/80 px-2 py-0.5 text-xs font-semibold tabular-nums">{duration(clip.duration)}</span> : null}
              </div>
              <div className="p-4">
                <h3 dir="auto" className="line-clamp-2 min-h-[2.75rem] text-[15px] font-semibold leading-snug text-snow">{clip.title}</h3>
                <p className="mt-1 text-xs text-mist">{clip.channel}{clip.language ? ` · ${clip.language}` : ""} · {dateTime(clip.uploaded_at)}</p>
                {clip.status === "error" && clip.error && <p className="mt-2 text-xs leading-relaxed text-rose">{clip.error}</p>}
                <div className="mt-3 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm text-snow">
                    <Eye className="h-4 w-4 text-pink" aria-hidden />
                    {clip.views === undefined ? <span className="text-mist">Views not counted yet</span> : <><b className="font-display text-lg tracking-wide">{compact(clip.views)}</b> views</>}
                  </span>
                  {clip.link && <a href={clip.link} target="_blank" rel="noreferrer" aria-label={`Open ${clip.title} on YouTube`} className="text-mist hover:text-pink"><ExternalLink className="h-4 w-4" aria-hidden /></a>}
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      )}
    </>
  );
}
