import { motion } from "framer-motion";
import { Captions, ListFilter, LogOut, Rocket, Save, ShieldCheck, Undo2, X } from "lucide-react";
import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { PageTitle, Panel, Tag, Toggle } from "../components/ui";
import type { Effective, Overrides } from "../lib/data";
import { saveSettings } from "../lib/api";
import { useStore } from "../lib/store";

// The settings the dashboard may change; everything else stays in config.yaml.
const EDITABLE = [
  "paused", "privacy", "max_per_day", "featured_per_day", "min_gap_hours", "featured_channels", "block_channels",
  "languages", "min_views", "featured_min_views", "max_duration", "top_channels_only", "require_gameplay",
  "english_subtitles", "own_clips", "caption_glow",
] as const;
type Key = (typeof EDITABLE)[number];

function Chips({ label, hint, values, onChange, placeholder }: { label: string; hint?: string; values: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const value = draft.trim().toLowerCase();
    if (value && !values.includes(value)) onChange([...values, value]);
    setDraft("");
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add();
    }
  };
  return (
    <div className="py-2.5">
      <p className="text-sm font-medium text-snow">{label}</p>
      {hint && <p className="mt-0.5 text-xs leading-relaxed text-mist">{hint}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {values.map((v) => (
          <span key={v} className="flex items-center gap-1.5 rounded-full bg-pink/12 py-1 pl-3 pr-1.5 text-xs font-semibold text-pink ring-1 ring-pink/30">
            {v}
            <button aria-label={`Remove ${v}`} className="grid h-5 w-5 place-items-center rounded-full hover:bg-pink/25" onClick={() => onChange(values.filter((x) => x !== v))}><X className="h-3 w-3" aria-hidden /></button>
          </span>
        ))}
        <input className="field !w-44 !py-1.5 text-xs" aria-label={label} placeholder={placeholder} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKey} onBlur={add} />
      </div>
    </div>
  );
}

function NumberField({ label, hint, value, onChange, min, max, step = 1, suffix }: { label: string; hint?: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number; suffix?: string }) {
  return (
    <label className="flex items-start justify-between gap-4 py-2.5">
      <span>
        <span className="block text-sm font-medium text-snow">{label}</span>
        {hint && <span className="mt-0.5 block text-xs leading-relaxed text-mist">{hint}</span>}
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <input type="number" className="field !w-24 text-right tabular-nums" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value) || 0)))} />
        {suffix && <span className="w-12 text-xs text-mist">{suffix}</span>}
      </span>
    </label>
  );
}

export default function Settings() {
  const { snap, email, signOut, report, demo, setDemo, reload, toast } = useStore();
  const [form, setForm] = useState<Effective | null>(null);
  const [busy, setBusy] = useState("");

  useEffect(() => {
    if (snap) setForm(snap.settings);
  }, [snap]);

  const changed = useMemo(() => {
    if (!snap || !form) return [] as Key[];
    return EDITABLE.filter((k) => JSON.stringify(form[k]) !== JSON.stringify(snap.settings[k]));
  }, [snap, form]);

  if (!snap || !form) return null;
  const set = <K extends Key>(key: K, value: Effective[K]) => setForm({ ...form, [key]: value });

  async function save() {
    if (!snap || !form) return;
    if (demo) return toast("Demo mode: settings are not saved.");
    const next: Overrides = { ...snap.overrides };
    for (const key of changed) (next as Record<string, unknown>)[key] = form[key];
    setBusy("save");
    try {
      await saveSettings(next);
      toast("Saved. The agent uses the new settings from its next run.");
      await reload();
    } catch (error) {
      report(error, "Could not save the settings.");
    } finally {
      setBusy("");
    }
  }

  async function reset() {
    if (demo) return toast("Demo mode: settings are not saved.");
    setBusy("reset");
    try {
      await saveSettings({});
      toast("Reset. The agent is back on the values in config.yaml.");
      await reload();
    } catch (error) {
      report(error, "Could not reset the settings.");
    } finally {
      setBusy("");
    }
  }

  const overridden = Object.keys(snap.overrides).length;

  return (
    <>
      <PageTitle kicker="Tune the machine" title="Settings">
        <div className="flex items-center gap-3">
          {changed.length > 0 && <Tag tone="gold">{changed.length} unsaved change{changed.length === 1 ? "" : "s"}</Tag>}
          <button className="btn btn-ghost" disabled={busy !== "" || overridden === 0} onClick={reset}><Undo2 className="h-4 w-4" aria-hidden /> Reset</button>
          <button className="btn btn-primary" disabled={busy !== "" || changed.length === 0} onClick={save}><Save className="h-4 w-4" aria-hidden /> Save changes</button>
        </div>
      </PageTitle>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Your account" icon={<ShieldCheck className="h-5 w-5 text-mint" />} index={0} className="xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="text-sm leading-relaxed text-mist">
              <p>Signed in as <b className="text-snow" dir="ltr">{email || "the owner"}</b>.</p>
              <p className="mt-1 max-w-2xl">
                This dashboard is private: nothing can be seen or changed without signing in. What you save here is kept on the
                dashboard's server and picked up by the agent at the start of its next run. This device stays signed in for 30 days.
              </p>
            </div>
            <button className="btn btn-ghost" onClick={() => signOut()}><LogOut className="h-4 w-4" aria-hidden /> Sign out</button>
          </div>
        </Panel>

        <Panel title="Publishing" icon={<Rocket className="h-5 w-5" />} index={1}>
          <div className="divide-y divide-line/50">
            <Toggle on={form.paused} onChange={(v) => set("paused", v)} label="Pause the agent" hint="Scheduled runs keep checking in but publish nothing." />
            <label className="flex items-start justify-between gap-4 py-2.5">
              <span><span className="block text-sm font-medium text-snow">Who can see new clips</span><span className="mt-0.5 block text-xs text-mist">Applies to clips published from now on.</span></span>
              <select className="field !w-36" value={form.privacy} onChange={(e) => set("privacy", e.target.value as Effective["privacy"])}>
                <option value="public">Public</option><option value="unlisted">Unlisted</option><option value="private">Private</option>
              </select>
            </label>
            <NumberField label="Clips per day" value={form.max_per_day} onChange={(v) => { set("max_per_day", v); if (form.featured_per_day > v) setForm((f) => f && { ...f, max_per_day: v, featured_per_day: v }); }} min={1} max={12} />
            <NumberField label="Reserved for featured streamers" hint="Of the daily clips, this many are kept for the featured streamers below." value={form.featured_per_day} onChange={(v) => set("featured_per_day", Math.min(v, form.max_per_day))} min={0} max={form.max_per_day} />
            <NumberField label="Time between posts" hint="Spreads the clips across the day." value={form.min_gap_hours} onChange={(v) => set("min_gap_hours", v)} min={0} max={24} step={0.5} suffix="hours" />
          </div>
        </Panel>

        <Panel title="Which clips" icon={<ListFilter className="h-5 w-5" />} index={2}>
          <div className="divide-y divide-line/50">
            <Chips label="Featured streamers" hint="Always followed, with their own daily slots." values={form.featured_channels} onChange={(v) => set("featured_channels", v)} placeholder="Add a Kick channel" />
            <Chips label="Blocked streamers" hint="Never clipped." values={form.block_channels} onChange={(v) => set("block_channels", v)} placeholder="Add a Kick channel" />
            <Toggle on={form.top_channels_only} onChange={(v) => set("top_channels_only", v)} label="Biggest channels only" hint="Besides featured streamers, use only the channels with the most viewers or followers." />
            <Toggle on={form.require_gameplay} onChange={(v) => set("require_gameplay", v)} label="Gameplay only" hint="Skip clips where no game is on screen." />
            <Toggle on={form.own_clips} onChange={(v) => set("own_clips", v)} label="Cut its own clips" hint="For featured streamers, also find highlights in their streams instead of waiting for viewers to clip them." />
            <NumberField label="Views needed" hint="For clips from other channels." value={form.min_views} onChange={(v) => set("min_views", v)} min={0} max={100000} />
            <NumberField label="Views needed, featured" value={form.featured_min_views} onChange={(v) => set("featured_min_views", v)} min={0} max={100000} />
            <NumberField label="Longest clip" value={form.max_duration} onChange={(v) => set("max_duration", v)} min={15} max={175} suffix="seconds" />
          </div>
        </Panel>

        <Panel title="Captions" icon={<Captions className="h-5 w-5" />} index={3}>
          <div className="divide-y divide-line/50">
            <Toggle on={form.english_subtitles} onChange={(v) => set("english_subtitles", v)} label="English line under Arabic captions" hint="Translates what is said so non-Arabic viewers can follow." />
            <label className="block py-2.5">
              <span className="flex items-center justify-between text-sm font-medium text-snow">Neon glow <span className="tabular-nums text-mist">{Math.round(form.caption_glow * 100)}%</span></span>
              <input type="range" min={0} max={1} step={0.05} value={form.caption_glow} onChange={(e) => set("caption_glow", Number(e.target.value))} className="mt-3 w-full accent-pink" aria-label="Neon glow strength" />
              <motion.span
                className="mt-4 block text-center font-display text-3xl uppercase tracking-wide text-[#fff0fb]"
                animate={{ textShadow: `0 0 ${4 + form.caption_glow * 22}px rgb(255 47 208 / ${0.25 + form.caption_glow * 0.75}), 0 0 ${10 + form.caption_glow * 50}px rgb(255 47 208 / ${form.caption_glow * 0.6})` }}
              >
                Vice City <span className="text-[#e7fdff]" style={{ textShadow: "inherit" }}>never</span> sleeps
              </motion.span>
            </label>
          </div>
        </Panel>

        <Panel title="This device" index={4}>
          <Toggle on={demo} onChange={setDemo} label="Demo mode" hint="Fills the dashboard with made-up numbers so you can see the design before real clips exist. Nothing is saved while it is on." />
          <p className="mt-3 text-xs leading-relaxed text-mist">
            {overridden > 0 ? `${overridden} setting${overridden === 1 ? " is" : "s are"} currently changed from the dashboard; the rest come from config.yaml.` : "All settings currently come from config.yaml in the repository."}
          </p>
        </Panel>
      </div>
    </>
  );
}
