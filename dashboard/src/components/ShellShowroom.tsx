// The Showroom layout's frame: a slim bar on top, the scene behind, and a
// floating dock at the bottom instead of a sidebar.

import { AnimatePresence, motion } from "framer-motion";
import { Bell } from "lucide-react";
import type { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { CHANNEL_NAME } from "../lib/config";
import { useStore } from "../lib/store";
import { LayoutSwitch } from "./LayoutSwitch";
import { NAV, Wordmark } from "./Shell";

function Backdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <img src={`${import.meta.env.BASE_URL}hero/hero-wide.jpg`} alt="" className="h-full w-full scale-125 object-cover opacity-45 blur-[42px] saturate-150" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_38%,transparent_0%,rgb(7_3_13/0.72)_52%,rgb(7_3_13/0.97)_100%)]" />
    </div>
  );
}

export function ShellShowroom({ children }: { children: ReactNode }) {
  const { snap, demo } = useStore();
  const location = useLocation();
  const alerts = snap?.clips.filter((c) => c.status === "error").length ?? 0;

  return (
    <div className="min-h-dvh">
      <Backdrop />
      <header className="sticky top-0 z-40 flex items-center gap-3 px-4 py-4 backdrop-blur-md sm:px-8">
        <Wordmark />
        <div className="ml-auto flex items-center gap-3">
          {demo && <span className="rounded-full bg-gold/15 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-gold ring-1 ring-gold/40">Demo data</span>}
          <LayoutSwitch />
          <NavLink to="/clips?status=error" aria-label={`${alerts} failed clips`} className="relative grid h-11 w-11 place-items-center rounded-2xl ring-1 ring-line hover:ring-pink/50">
            <Bell className="h-[18px] w-[18px] text-snow" aria-hidden />
            {alerts > 0 && <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-rose ring-2 ring-night" />}
          </NavLink>
          <span className="hidden h-11 items-center gap-3 rounded-2xl pl-1.5 pr-4 ring-1 ring-line sm:flex">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-violet to-pink font-display text-sm">VI</span>
            <span className="text-sm font-semibold">{CHANNEL_NAME}</span>
          </span>
        </div>
      </header>

      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, scale: 0.985 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.985 }}
          transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
          className="mx-auto max-w-[1560px] px-4 pb-36 pt-1 sm:px-8"
        >
          {children}
        </motion.main>
      </AnimatePresence>

      <nav aria-label="Sections" className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2">
        <div className="panel flex items-end gap-1 !rounded-[26px] p-2">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === "/"} className="relative rounded-[18px] outline-none focus-visible:ring-2 focus-visible:ring-pink">
              {({ isActive }) => (
                <motion.span whileHover={{ y: -5, scale: 1.08 }} transition={{ type: "spring", stiffness: 420, damping: 20 }} className="relative flex w-[68px] flex-col items-center gap-1 px-2 py-2.5 sm:w-[84px]">
                  {isActive && <motion.span layoutId="dock-pill" transition={{ type: "spring", stiffness: 400, damping: 32 }} className="absolute inset-0 rounded-[18px] bg-gradient-to-b from-pink/45 to-violet/50 ring-1 ring-pink/60 shadow-[0_0_30px_-4px_rgb(255_47_208/0.95)]" />}
                  <Icon className={`relative h-5 w-5 ${isActive ? "text-snow" : "text-mist"}`} aria-hidden />
                  <span className={`relative text-[10px] font-semibold uppercase tracking-wider ${isActive ? "text-snow" : "text-mist"}`}>{label}</span>
                </motion.span>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
