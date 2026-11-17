import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ApiError, getSession, signOut as apiSignOut } from "./api";
import { loadSnapshot, type Snapshot } from "./data";
import { recentRuns, type Run } from "./github";

export type Layout = "cinematic" | "showroom";
/** "checking" until the server has said whether this browser is signed in. */
export type Auth = "checking" | "out" | "in";

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
  auth: Auth;
  email: string;
  /** False when the server has no account set up yet. */
  ready: boolean;
  /** Called by the sign-in page once the server has accepted the password. */
  enter: (email: string) => void;
  /** True when this visit came through the sign-in page (rather than an existing session). */
  arrived: boolean;
  signOut: () => Promise<void>;
  /** Show a failed save's message, and return to the sign-in page if the session has ended. */
  report: (error: unknown, fallback: string) => void;
  layout: Layout;
  setLayout: (layout: Layout) => void;
  snap: Snapshot | null;
  runs: Run[];
  demo: boolean;
  setDemo: (on: boolean) => void;
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
  const [auth, setAuth] = useState<Auth>("checking");
  const [email, setEmail] = useState("");
  const [ready, setReady] = useState(true);
  const [arrived, setArrived] = useState(false);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [demo, setDemoState] = useState(() => new URLSearchParams(location.search).has("demo"));
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [layout, setLayoutState] = useState<Layout>(savedLayout);

  useEffect(() => {
    getSession()
      .then((session) => {
        setReady(session.ready);
        setEmail(session.email ?? "");
        setAuth(session.signedIn ? "in" : "out");
      })
      .catch(() => setAuth("out"));
  }, []);

  const reload = useCallback(async () => {
    setSnap(await loadSnapshot(demo));
    if (!demo) recentRuns().then(setRuns).catch(() => setRuns([]));
  }, [demo]);

  useEffect(() => {
    if (auth !== "in") return;
    reload();
    const timer = setInterval(reload, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, [auth, reload]);

  const toast = useCallback((text: string, tone: "ok" | "bad" = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((list) => [...list, { id, text, tone }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 5200);
  }, []);

  const leave = useCallback(() => {
    setArrived(false);
    setAuth("out");
    setSnap(null);
    setRuns([]);
  }, []);

  const value = useMemo<Store>(
    () => ({
      auth, email, ready,
      arrived,
      enter: (who) => {
        setEmail(who);
        setArrived(true);
        setAuth("in");
      },
      signOut: async () => {
        await apiSignOut().catch(() => undefined);
        leave();
      },
      report: (error, fallback) => {
        if (error instanceof ApiError && error.status === 401) {
          leave();
          return;
        }
        toast(error instanceof ApiError ? error.message : fallback, "bad");
      },
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
      reload, toast,
    }),
    [auth, email, ready, arrived, layout, snap, runs, demo, reload, toast, leave],
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
