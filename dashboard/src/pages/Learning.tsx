import { AnimatePresence, motion } from "framer-motion";
import { BrainCircuit, GraduationCap, Lightbulb, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Empty, PageTitle, Panel, Tag, Toggle } from "../components/ui";
import { ruleSentence, type Rule, type RuleKind, type RulesControl } from "../lib/data";
import { ago, compact } from "../lib/format";
import { GitHubError, saveJson } from "../lib/github";
import { useStore } from "../lib/store";

const KINDS: { value: RuleKind; label: string; placeholder: string }[] = [
  { value: "channel", label: "A streamer", placeholder: "Kick channel name, e.g. sxb" },
  { value: "duration", label: "Clip length", placeholder: "" },
  { value: "language", label: "A language", placeholder: "e.g. Arabic" },
  { value: "keyword", label: "A word in the title or speech", placeholder: "e.g. police" },
];
const LENGTHS = ["Under 30s", "30–60s", "Over 60s"];
const EFFECTS = [
  { value: 2, label: "Strongly prefer" },
  { value: 1.5, label: "Prefer" },
  { value: 0.5, label: "Use less" },
  { value: 0, label: "Never use" },
];

function effectTag(factor: number) {
  if (factor === 0) return <Tag tone="rose">Never use</Tag>;
  const change = Math.round((factor - 1) * 100);
  return <Tag tone={change >= 0 ? "mint" : "gold"}>{change >= 0 ? "+" : ""}{change}% priority</Tag>;
}

export default function Learning() {
  const { snap, hasKey, demo, reload, toast } = useStore();
  const [local, setLocal] = useState<RulesControl | null>(null);
  const [saving, setSaving] = useState(false);
  const [kind, setKind] = useState<RuleKind>("channel");
  const [target, setTarget] = useState("");
  const [factor, setFactor] = useState(1.5);
  const [note, setNote] = useState("");
  if (!snap) return null;

  const control = local ?? snap.rules;
  const learned = snap.learned.rules.filter((r) => !control.dismissed.includes(r.id));
  const measured = snap.learned.measured_clips ?? 0;
  const needed = snap.learned.needed_clips ?? 8;
  const canSave = demo || hasKey;

  async function commit(next: RulesControl, message: string, done: string) {
    setLocal(next);
    if (demo) return toast("Demo mode: the change is shown but not saved.");
    setSaving(true);
    try {
      await saveJson("control/rules.json", next, message);
      toast(done);
      await reload();
    } catch (error) {
      setLocal(null);
      toast(error instanceof GitHubError ? error.message : "Could not save the change.", "bad");
    } finally {
      setSaving(false);
    }
  }

  const toggle = (rule: Rule, on: boolean) =>
    commit(
      { ...control, disabled: on ? control.disabled.filter((id) => id !== rule.id) : [...control.disabled, rule.id] },
      `${on ? "Turn on" : "Turn off"} a learned rule from the dashboard`,
      on ? "Rule switched on. The agent uses it from its next run." : "Rule switched off. The agent ignores it from its next run.",
    );
  const forget = (rule: Rule) =>
    commit(
      { ...control, dismissed: [...control.dismissed, rule.id], disabled: control.disabled.filter((id) => id !== rule.id) },
      "Remove a learned rule from the dashboard",
      "Removed. The agent will not learn this one again.",
    );
  const removeManual = (rule: Rule) =>
    commit({ ...control, manual: control.manual.filter((r) => r.id !== rule.id) }, "Remove a taught rule from the dashboard", "Rule removed.");
  const teach = () => {
    const value = (kind === "duration" ? target || LENGTHS[0] : target).trim();
    if (!value) return toast("Say what the rule is about first.", "bad");
    const rule: Rule = { id: `manual-${Date.now()}`, kind, target: kind === "channel" ? value.toLowerCase() : value, factor, note: note.trim() || undefined, created_at: new Date().toISOString() };
    setTarget("");
    setNote("");
    return commit({ ...control, manual: [...control.manual, rule] }, "Teach the agent a rule from the dashboard", "Taught. The agent applies it from its next run.");
  };

  return (
    <>
      <PageTitle kicker="How the agent picks clips" title="Learning" />

      <Panel className="mb-6" index={0}>
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2.5 text-[15px] font-semibold text-snow"><BrainCircuit className="h-5 w-5 text-pink" aria-hidden /> How it learns</p>
            <p className="mt-2 text-sm leading-relaxed text-mist">
              Every day the agent reads how many views each published clip got and compares streamers, clip lengths and languages.
              When one group clearly beats the rest it writes a rule here and gives those clips more or less priority. You can switch
              any rule off, remove it for good, or teach it rules of your own.
            </p>
          </div>
          <div className="w-full max-w-xs">
            <div className="mb-2 flex justify-between text-xs text-mist">
              <span>Clips measured</span><span className="font-semibold text-snow">{measured} of {needed} needed</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/5">
              <motion.div className="h-full rounded-full bg-gradient-to-r from-violet via-pink to-sunset" initial={{ width: 0 }} animate={{ width: `${Math.min(100, (measured / needed) * 100)}%` }} transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }} />
            </div>
            {snap.learned.updated_at && <p className="mt-2 text-xs text-mist">Last studied {ago(snap.learned.updated_at)}</p>}
          </div>
        </div>
      </Panel>

      {!canSave && (
        <p className="mb-6 rounded-2xl bg-gold/10 px-5 py-3.5 text-sm text-gold ring-1 ring-gold/30">
          You can read everything here. To change rules, <Link to="/settings" className="font-semibold underline">add your owner key in Settings</Link>.
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
        <Panel title="What the agent has learned" icon={<Lightbulb className="h-5 w-5 text-gold" />} index={1}>
          {learned.length === 0 ? (
            <Empty title="Nothing learned yet">
              {measured < needed ? `It needs view counts for ${needed} clips before it draws conclusions, so that one lucky clip does not mislead it.` : "No group of clips has clearly beaten the rest so far."}
            </Empty>
          ) : (
            <ul className="space-y-3">
              <AnimatePresence initial={false}>
                {learned.map((rule) => {
                  const on = !control.disabled.includes(rule.id);
                  return (
                    <motion.li key={rule.id} layout exit={{ opacity: 0, x: -30 }} className={`rounded-2xl p-4 ring-1 ring-line ${on ? "" : "opacity-55"}`}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[15px] font-semibold text-snow">{ruleSentence(rule)}</p>
                          {rule.evidence && (
                            <p className="mt-1 text-xs leading-relaxed text-mist">
                              {rule.evidence.clips} clips averaged <b className="text-snow">{compact(rule.evidence.avg_views)}</b> views, against {compact(rule.evidence.baseline)} for the rest · found {ago(rule.created_at)}
                            </p>
                          )}
                        </div>
                        {effectTag(rule.factor)}
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-3 border-t border-line/50 pt-2">
                        <Toggle on={on} onChange={(v) => toggle(rule, v)} label={on ? "In use" : "Switched off"} disabled={saving || !canSave} />
                        <button className="btn btn-ghost !px-3 !py-2 text-xs" disabled={saving || !canSave} onClick={() => forget(rule)}>
                          <Trash2 className="h-3.5 w-3.5" aria-hidden /> This is wrong, remove it
                        </button>
                      </div>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          )}
        </Panel>

        <div className="space-y-6">
          <Panel title="Teach it something" icon={<GraduationCap className="h-5 w-5 text-aqua" />} index={2}>
            <div className="space-y-3">
              <label className="block text-xs font-medium uppercase tracking-widest text-mist">
                The rule is about
                <select className="field mt-1.5" value={kind} onChange={(e) => { setKind(e.target.value as RuleKind); setTarget(""); }}>
                  {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                </select>
              </label>
              <label className="block text-xs font-medium uppercase tracking-widest text-mist">
                Which one
                {kind === "duration" ? (
                  <select className="field mt-1.5" value={target || LENGTHS[0]} onChange={(e) => setTarget(e.target.value)}>
                    {LENGTHS.map((l) => <option key={l}>{l}</option>)}
                  </select>
                ) : (
                  <input className="field mt-1.5" dir="auto" value={target} onChange={(e) => setTarget(e.target.value)} placeholder={KINDS.find((k) => k.value === kind)?.placeholder} />
                )}
              </label>
              <label className="block text-xs font-medium uppercase tracking-widest text-mist">
                What should the agent do
                <select className="field mt-1.5" value={factor} onChange={(e) => setFactor(Number(e.target.value))}>
                  {EFFECTS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
                </select>
              </label>
              <label className="block text-xs font-medium uppercase tracking-widest text-mist">
                Note to yourself (optional)
                <input className="field mt-1.5" dir="auto" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why you added it" />
              </label>
              <button className="btn btn-primary w-full" disabled={saving || !canSave} onClick={teach}><Plus className="h-4 w-4" aria-hidden /> Teach the agent</button>
            </div>
          </Panel>

          <Panel title="What you taught it" index={3}>
            {control.manual.length === 0 ? (
              <Empty title="No rules of your own yet" />
            ) : (
              <ul className="space-y-2.5">
                {control.manual.map((rule) => (
                  <li key={rule.id} className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 ring-1 ring-line">
                    <div className="min-w-0">
                      <p dir="auto" className="text-sm font-semibold text-snow">{ruleSentence(rule)}</p>
                      {rule.note && <p dir="auto" className="mt-0.5 truncate text-xs text-mist">{rule.note}</p>}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {effectTag(rule.factor)}
                      <button aria-label={`Remove rule: ${ruleSentence(rule)}`} className="grid h-8 w-8 place-items-center rounded-lg text-mist hover:bg-rose/15 hover:text-rose" disabled={saving || !canSave} onClick={() => removeManual(rule)}>
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
