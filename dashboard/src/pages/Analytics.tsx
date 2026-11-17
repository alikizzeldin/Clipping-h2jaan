import { Clock, Globe2, Scissors, Trophy, Users } from "lucide-react";
import { Bars, Counter, Empty, PageTitle, Panel } from "../components/ui";
import { insights, type Group } from "../lib/data";
import { compact } from "../lib/format";
import { useStore } from "../lib/store";

function rows(groups: Group[]) {
  return groups.map((g) => ({ key: g.key, value: Math.round(g.avg), note: `${g.clips} clip${g.clips === 1 ? "" : "s"}` }));
}

export default function Analytics() {
  const { snap } = useStore();
  if (!snap) return null;
  const info = insights(snap);
  const tiles = [
    { label: "Total views", value: info.totalViews },
    { label: "Clips published", value: info.totalClips },
    { label: "Average per clip", value: Math.round(info.avgViews) },
    { label: "Failed uploads", value: info.failed },
  ];

  return (
    <>
      <PageTitle kicker="What is working" title="Analytics" />
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {tiles.map((t, i) => (
          <Panel key={t.label} index={i} className="!p-5">
            <p className="text-xs uppercase tracking-widest text-mist">{t.label}</p>
            <Counter value={t.value} className="mt-1 block font-display text-4xl tracking-wide text-snow" />
          </Panel>
        ))}
      </div>

      {info.measuredClips === 0 ? (
        <Empty title="Waiting for the first numbers">
          YouTube's view counts reach the agent about a day after each clip is posted. Breakdowns by streamer, clip length and language appear here then.
        </Empty>
      ) : (
        <>
          <div className="grid gap-6 xl:grid-cols-2">
            <Panel title="Average views by streamer" icon={<Users className="h-5 w-5" />} index={0}><Bars rows={rows(info.byChannel)} /></Panel>
            <Panel title="Average views by clip length" icon={<Clock className="h-5 w-5" />} index={1}>
              {info.byLength.length ? <Bars rows={rows(info.byLength)} /> : <Empty title="No lengths recorded yet" />}
            </Panel>
            <Panel title="Average views by language" icon={<Globe2 className="h-5 w-5" />} index={2}>
              {info.byLanguage.length ? <Bars rows={rows(info.byLanguage)} /> : <Empty title="No languages recorded yet" />}
            </Panel>
            <Panel title="Viewer clips or the agent's own cuts" icon={<Scissors className="h-5 w-5" />} index={3}><Bars rows={rows(info.byOrigin)} /></Panel>
          </div>

          <Panel title="Streamer leaderboard" icon={<Trophy className="h-5 w-5 text-gold" />} className="mt-6">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className="text-xs uppercase tracking-widest text-mist">
                  <tr><th className="pb-3 font-medium">Streamer</th><th className="pb-3 text-right font-medium">Clips</th><th className="pb-3 text-right font-medium">Total views</th><th className="pb-3 text-right font-medium">Average</th></tr>
                </thead>
                <tbody className="divide-y divide-line/50">
                  {info.byChannel.map((g, i) => (
                    <tr key={g.key}>
                      <td className="py-3 font-medium text-snow"><span className="mr-3 font-display text-lg text-pink">{i + 1}</span>{g.key}</td>
                      <td className="py-3 text-right tabular-nums text-snow/90">{g.clips}</td>
                      <td className="py-3 text-right tabular-nums text-snow/90">{compact(g.views)}</td>
                      <td className="py-3 text-right font-semibold tabular-nums text-snow">{compact(g.avg)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}
    </>
  );
}
