import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { loadSnapshot, type Snapshot } from "./data";
import { ownerKey, recentRuns, type Run } from "./github";

export type Layout = "cinematic" | "showroom";

function savedLayout(): Layout {
  const asked = new URLSearchParams(location.search).get("layout");
  if (asked === "showroom" || asked === "cinematic") return asked;
  try {
    return localStorage.getItem("gta6fied.layout") === "showroom" ? "showroom" : "cinematic";
  } catch {
    return "cinematic";
  }
}

type Store = {
  layout: Layout;
  setLayout: (layout: Layout) => void;
  snap: Snapshot | null;
  runs: Run[];
  demo: boolean;
  setDemo: (on: boolean) => void;
  hasKey: boolean;
  refreshKey: () => void;
  reload: () => Promise<void>;
  toast: (text: string, tone?: "ok" | "bad") => void;
};

const Ctx = createContext<Store | null>(null);

export function useStore(): Store {
  const store = useContext(Ctx);
  if (!store) throw new Error("store missing");
  return store;
}

type Toast = { id: number; text: string; tone: "ok" | "bad" };

export function StoreProvider({ children }: { children: ReactNode }) {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [demo, setDemoState] = useState(() => new URLSearchParams(location.search).has("demo"));
  const [hasKey, setHasKey] = useState(() => Boolean(ownerKey.get()));
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [layout, setLayoutState] = useState<Layout>(savedLayout);

  const reload = useCallback(async () => {
    setSnap(await loadSnapshot(demo));
    if (!demo) recentRuns().then(setRuns).catch(() => setRuns([]));
  }, [demo]);

  useEffect(() => {
    reload();
    const timer = setInterval(reload, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, [reload]);

  const toast = useCallback((text: string, tone: "ok" | "bad" = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((list) => [...list, { id, text, tone }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 5200);
  }, []);

  const value = useMemo<Store>(
    () => ({
      layout,
      setLayout: (next) => {
        setLayoutState(next);
        try {
          localStorage.setItem("gta6fied.layout", next);
        } catch {
          /* private window: the choice just won't be remembered */
        }
      },
      snap, runs, demo,
      setDemo: (on) => {
        setSnap(null);
        setDemoState(on);
      },
      hasKey,
      refreshKey: () => setHasKey(Boolean(ownerKey.get())),
      reload, toast,
    }),
    [layout, snap, runs, demo, hasKey, reload, toast],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[120] flex w-[min(92vw,380px)] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`panel pointer-events-auto px-4 py-3 text-sm ${t.tone === "bad" ? "text-rose" : "text-snow"}`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
