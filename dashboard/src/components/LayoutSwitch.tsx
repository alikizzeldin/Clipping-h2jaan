import { motion } from "framer-motion";
import { GalleryHorizontalEnd, Orbit } from "lucide-react";
import { useStore, type Layout } from "../lib/store";

const OPTIONS: { value: Layout; label: string; icon: typeof Orbit }[] = [
  { value: "cinematic", label: "Cinematic", icon: GalleryHorizontalEnd },
  { value: "showroom", label: "Showroom", icon: Orbit },
];

/** Choose between the two dashboard layouts; the choice is remembered. */
export function LayoutSwitch() {
  const { layout, setLayout } = useStore();
  return (
    <div role="radiogroup" aria-label="Dashboard layout" className="flex rounded-2xl p-1 ring-1 ring-line">
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const on = layout === value;
        return (
          <button
            key={value} role="radio" aria-checked={on} onClick={() => setLayout(value)}
            className={`relative flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${on ? "text-snow" : "text-mist hover:text-snow"}`}
          >
            {on && <motion.span layoutId="layout-pill" transition={{ type: "spring", stiffness: 420, damping: 32 }} className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet to-pink shadow-[0_0_22px_-4px_rgb(255_47_208/0.9)]" />}
            <Icon className="relative h-4 w-4" aria-hidden />
            <span className="relative hidden md:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
