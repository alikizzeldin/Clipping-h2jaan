import { AnimatePresence, motion } from "framer-motion";
import { BarChart3, Bell, BrainCircuit, Clapperboard, Crown, Home, Search, Settings2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { CHANNEL_NAME } from "../lib/config";
import { useStore } from "../lib/store";
import { LayoutSwitch } from "./LayoutSwitch";

export const NAV = [
  { to: "/", label: "Dashboard", icon: Home },
  { to: "/clips", label: "Clips", icon: Clapperboard },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/learning", label: "Learning", icon: BrainCircuit },
  { to: "/settings", label: "Settings", icon: Settings2 },
];

export function Wordmark() {
  return (
    <div className="select-none leading-none">
      <span className="font-display text-3xl uppercase italic tracking-wide text-snow">gta</span>
      <span className="font-display text-3xl italic text-pink neon-text">6</span>
      <span className="font-script text-3xl text-pink neon-text">fied</span>
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const { snap, demo } = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const alerts = snap?.clips.filter((c) => c.status === "error").length ?? 0;

  return (
    <div className="mx-auto flex min-h-dvh max-w-[1500px]">
      <aside className="sticky top-0 hidden h-dvh w-[232px] shrink-0 flex-col gap-6 border-r border-line/60 px-4 py-6 lg:flex">
        <div className="px-2"><Wordmark /></div>
        <nav className="flex flex-col gap-1" aria-label="Sections">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === "/"} className="relative rounded-2xl px-4 py-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-pink">
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="nav-pill" transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      className="absolute inset-0 rounded-2xl bg-gradient-to-r from-violet/70 via-pink/45 to-transparent ring-1 ring-pink/50 shadow-[0_0_30px_-6px_rgb(255_47_208/0.8)]"
                    />
                  )}
                  <span className={`relative flex items-center gap-3 ${isActive ? "text-snow" : "text-mist hover:text-snow"}`}>
                    <Icon className="h-[18px] w-[18px]" aria-hidden />
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="relative mt-auto overflow-hidden rounded-3xl ring-1 ring-pink/30">
          <img src={`${import.meta.env.BASE_URL}hero/side-card.jpg`} alt="" className="h-56 w-full object-cover object-top" />
          <div className="absolute inset-0 bg-gradient-to-t from-night via-night/20 to-transparent" />
          <p className="absolute bottom-3 left-4 -rotate-6 font-script text-2xl leading-tight text-pink neon-text">
            Vice City<br />awaits…
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl px-4 py-3 text-xs text-mist ring-1 ring-line">
          <Crown className="h-4 w-4 text-gold" aria-hidden /> {CHANNEL_NAME} Control
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-40 flex items-center gap-3 bg-night/70 px-4 py-4 backdrop-blur-xl sm:px-8">
          <div className="lg:hidden"><Wordmark /></div>
          <form
            className="relative hidden max-w-md flex-1 sm:block"
            onSubmit={(e) => {
              e.preventDefault();
              navigate(`/clips?q=${encodeURIComponent(query)}`);
            }}
          >
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-mist" aria-hidden />
            <input
              value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search clips and streamers…" aria-label="Search clips and streamers"
              className="field !rounded-2xl !py-3 !pl-11"
            />
          </form>
          <div className="ml-auto flex items-center gap-3">
            {demo && <span className="rounded-full bg-gold/15 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-gold ring-1 ring-gold/40">Demo data</span>}
            <LayoutSwitch />
            <NavLink to="/clips?status=error" aria-label={`${alerts} failed clips`} className="relative grid h-11 w-11 place-items-center rounded-2xl ring-1 ring-line hover:ring-pink/50">
              <Bell className="h-[18px] w-[18px] text-snow" aria-hidden />
              {alerts > 0 && <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-rose ring-2 ring-night" />}
            </NavLink>
            <div className="flex items-center gap-3 rounded-2xl py-1.5 pl-1.5 pr-4 ring-1 ring-line">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-violet to-pink font-display text-sm">VI</span>
              <span className="hidden text-sm font-semibold sm:block">{CHANNEL_NAME}</span>
            </div>
          </div>
        </header>

        <nav className="flex gap-1 overflow-x-auto px-4 pb-2 lg:hidden" aria-label="Sections">
          {NAV.map(({ to, label }) => (
            <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => `shrink-0 rounded-full px-4 py-2 text-sm ${isActive ? "bg-pink/20 text-snow ring-1 ring-pink/50" : "text-mist"}`}>
              {label}
            </NavLink>
          ))}
        </nav>

        <AnimatePresence mode="wait">
          <motion.main
            key={location.pathname}
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
            className="px-4 pb-16 pt-2 sm:px-8"
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </div>
    </div>
  );
}
