import { motion } from "framer-motion";
import { Check, Copy, Download, ExternalLink, Play } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Empty, PageTitle, Tag } from "../components/ui";
import type { ManualReel } from "../lib/data";
import { useStore } from "../lib/store";

const POSTED_KEY = "gta6fied-manual-posted";

function readPosted(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(POSTED_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function savePosted(ids: Set<string>) {
  try {
    localStorage.setItem(POSTED_KEY, JSON.stringify([...ids]));
  } catch {
    /* private window: the ticks just won't be remembered */
  }
}

function CopyButton({ label, text }: { label: string; text: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setDone(true);
    setTimeout(() => setDone(false), 1600);
  };
  return (
    <button type="button" onClick={copy} className="btn btn-ghost !px-3 !py-2 text-xs" aria-label={`Copy ${label}`}>
      {done ? <Check size={14} className="text-mint" /> : <Copy size={14} />}
      {done ? "Copied" : label}
    </button>
  );
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return "Today";
  if (same(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" });
}

function Card({ reel, posted, toggle, index }: { reel: ManualReel; posted: boolean; toggle: () => void; index: number }) {
  const [play, setPlay] = useState(false);
  const expired = new Date(reel.hosted_until).getTime() < Date.now();
  return (
    <motion.article
      className={`panel overflow-hidden ${posted ? "opacity-60" : ""}`}
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: posted ? 0.6 : 1, y: 0 }} transition={{ delay: Math.min(index, 12) * 0.04 }}
    >
      <div className="flex gap-4 p-4">
        <button
          type="button" onClick={() => setPlay(true)} aria-label="Play the video"
          className="relative aspect-[9/16] w-28 shrink-0 overflow-hidden rounded-xl bg-black ring-1 ring-line sm:w-32"
        >
          {play && !expired ? (
            <video src={reel.video_url} poster={reel.cover_url} controls autoPlay playsInline className="h-full w-full object-cover" />
          ) : (
            <>
              <img src={reel.cover_url} alt="" loading="lazy" className="h-full w-full object-cover" />
              {!expired && <span className="absolute inset-0 grid place-items-center bg-black/25"><Play size={28} className="text-snow" /></span>}
            </>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <Tag tone="pink">{reel.series}</Tag>
            {reel.rating != null && <Tag tone="gold">★ {reel.rating}</Tag>}
            <Tag tone="mist">{Math.round(reel.duration)}s</Tag>
            {posted && <Tag tone="mint">Posted</Tag>}
          </div>
          <h3 className="text-[15px] font-semibold leading-snug text-snow">{reel.title_en}</h3>
          <p dir="rtl" className="mt-1 text-sm text-mist">{reel.title_ar}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {expired ? (
              <span className="text-xs text-rose">The video is no longer stored (kept for 4 days).</span>
            ) : (
              <a href={reel.video_url} target="_blank" rel="noreferrer" download={`${reel.id}.mp4`} className="btn btn-primary !px-3 !py-2 text-xs">
                <Download size={14} /> Video
              </a>
            )}
            <CopyButton label="Title" text={reel.title} />
            <CopyButton label="Caption" text={reel.caption} />
            <CopyButton label="Description" text={reel.description} />
            <CopyButton label="Hashtags" text={reel.hashtags} />
          </div>
        </div>
      </div>
      <details className="border-t border-line/70 px-4 py-3 text-sm text-mist">
        <summary className="cursor-pointer select-none text-xs uppercase tracking-wider text-mist/80">Caption, hashtags and sources</summary>
        <pre className="mt-3 whitespace-pre-wrap break-words font-sans text-[13px] leading-relaxed text-snow/85">{reel.caption}</pre>
        <p className="mt-3 break-words text-[13px] text-aqua">{reel.hashtags}</p>
        {reel.sources.length > 0 && (
          <ul className="mt-3 space-y-1 text-xs">
            {reel.sources.map((s) => (
              <li key={s}><a href={s} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-snow"><ExternalLink size={12} />{new URL(s).hostname.replace(/^www\./, "")}</a></li>
            ))}
          </ul>
        )}
      </details>
      <label className="flex cursor-pointer items-center gap-3 border-t border-line/70 px-4 py-3 text-sm">
        <input type="checkbox" checked={posted} onChange={toggle} className="h-4 w-4 accent-pink" />
        <span className={posted ? "text-mint" : "text-mist"}>{posted ? "Posted" : "Mark as posted"}</span>
      </label>
    </motion.article>
  );
}

export default function Manual() {
  const { snap } = useStore();
  const [posted, setPosted] = useState<Set<string>>(() => readPosted());
  useEffect(() => savePosted(posted), [posted]);
  const toggle = (id: string) => setPosted((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  const reels = snap?.manual ?? [];
  const days = useMemo(() => {
    const map = new Map<string, ManualReel[]>();
    for (const r of reels) {
      const key = dayLabel(r.created_at);
      map.set(key, [...(map.get(key) ?? []), r]);
    }
    return [...map.entries()];
  }, [reels]);
  const today = reels.filter((r) => dayLabel(r.created_at) === "Today");
  const todayPosted = today.filter((r) => posted.has(r.id)).length;

  return (
    <>
      <PageTitle kicker="Ready for you to post" title="Manual publish">
        {today.length > 0 && <Tag tone={todayPosted === today.length ? "mint" : "gold"}>{todayPosted} of {today.length} posted today</Tag>}
      </PageTitle>
      <p className="-mt-3 mb-6 max-w-2xl text-sm leading-relaxed text-mist">
        Extra reels made for posting by hand on TikTok, Facebook, Snapchat or a second account. Download the video, copy the
        title, caption and hashtags, then tick it off. Videos stay downloadable for 4 days.
      </p>
      {reels.length === 0 ? (
        <Empty title="No reels yet">The studio adds about 12 reels here every day, in three batches.</Empty>
      ) : (
        days.map(([day, list]) => (
          <section key={day} className="mb-8">
            <h2 className="mb-3 font-display text-xl uppercase tracking-wide text-snow/90">{day} <span className="text-mist">· {list.length}</span></h2>
            <div className="grid gap-4 lg:grid-cols-2">
              {list.map((r, i) => <Card key={r.id} reel={r} index={i} posted={posted.has(r.id)} toggle={() => toggle(r.id)} />)}
            </div>
          </section>
        ))
      )}
    </>
  );
}
