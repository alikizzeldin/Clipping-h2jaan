import { motion } from "framer-motion";
import gsap from "gsap";
import { BadgeCheck, Clapperboard, Eye, Star } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { CHANNEL_NAME } from "../lib/config";
import { Counter, rise } from "./ui";

const asset = (name: string) => `${import.meta.env.BASE_URL}hero/${name}`;

// Where the 3D logo sits inside the wide banner, as a share of the image.
const LOGO = { left: "33%", top: "17.5%", width: "30.2%" };

export type HeroStat = { label: string; value: number; note: string; icon: "views" | "clips" | "star" };

const ICONS = { views: Eye, clips: Clapperboard, star: Star } as const;

export function Hero({ stats, status }: { stats: HeroStat[]; status: ReactNode }) {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const bg = useRef<HTMLImageElement>(null);
  const logo = useRef<HTMLDivElement>(null);
  const float = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!root.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      // Entrance: the city settles, then the logo lands with weight.
      gsap.timeline({ defaults: { ease: "power3.out" } })
        .fromTo(bg.current, { scale: 1.22, filter: "brightness(0.35) saturate(0.6)" }, { scale: 1.07, filter: "brightness(1) saturate(1.1)", duration: 2.2 })
        .fromTo(logo.current, { opacity: 0, scale: 0.72, y: 60, filter: "blur(18px)" }, { opacity: 1, scale: 1.035, y: 0, filter: "blur(0px)", duration: 1.5, ease: "back.out(1.5)" }, 0.35);
      gsap.to(float.current, { y: -9, duration: 3.2, ease: "sine.inOut", yoyo: true, repeat: -1 });

      // The scene tilts toward the pointer; the logo rides in front of the city.
      const tiltX = gsap.quickTo(stage.current, "rotationX", { duration: 0.9, ease: "power3.out" });
      const tiltY = gsap.quickTo(stage.current, "rotationY", { duration: 0.9, ease: "power3.out" });
      const bgX = gsap.quickTo(bg.current, "x", { duration: 1.1, ease: "power3.out" });
      const bgY = gsap.quickTo(bg.current, "y", { duration: 1.1, ease: "power3.out" });
      const logoX = gsap.quickTo(logo.current, "x", { duration: 0.7, ease: "power3.out" });
      const logoY = gsap.quickTo(logo.current, "y", { duration: 0.7, ease: "power3.out" });
      const move = (event: PointerEvent) => {
        const box = root.current!.getBoundingClientRect();
        const px = (event.clientX - box.left) / box.width - 0.5;
        const py = (event.clientY - box.top) / box.height - 0.5;
        tiltY(px * 5);
        tiltX(-py * 4);
        bgX(-px * 16);
        bgY(-py * 10);
        logoX(px * 22);
        logoY(py * 14);
      };
      const leave = () => [tiltX, tiltY, bgX, bgY, logoX, logoY].forEach((to) => to(0));
      root.current!.addEventListener("pointermove", move);
      root.current!.addEventListener("pointerleave", leave);
      return () => {
        root.current?.removeEventListener("pointermove", move);
        root.current?.removeEventListener("pointerleave", leave);
      };
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <>
    <section
      ref={root}
      className="relative isolate min-h-[500px] overflow-hidden sm:min-h-[560px] rounded-[28px] shadow-[0_40px_120px_-40px_rgb(255_47_208/0.55)] xl:aspect-[2/1]"
      style={{ perspective: 1400 }}
    >
      <div
        ref={stage}
        className="absolute left-1/2 top-1/2 aspect-[21/9] h-full min-w-full -translate-x-1/2 -translate-y-1/2"
        style={{ transformStyle: "preserve-3d" }}
      >
        <img ref={bg} src={asset("hero-wide.jpg")} alt="" className="absolute inset-0 h-full w-full scale-[1.07] object-cover" />
        {/* warm bloom behind the logo */}
        <div className="absolute left-[30%] top-[8%] h-[84%] w-[36%] rounded-full bg-[radial-gradient(closest-side,rgb(255_120_200/0.42),transparent)] mix-blend-screen" />
        <div ref={logo} className="absolute will-change-transform" style={{ ...LOGO, aspectRatio: "570 / 510", transform: "translateZ(90px)" }}>
          <div ref={float} className="relative h-full w-full">
            <img
              src={asset("logo.webp")} alt="Grand Theft Auto VI"
              className="h-full w-full drop-shadow-[0_30px_40px_rgb(20_0_40/0.75)]"
            />
            <div
              className="logo-sweep pointer-events-none absolute inset-0 overflow-hidden mix-blend-overlay"
              style={{ WebkitMaskImage: `url(${asset("logo.webp")})`, maskImage: `url(${asset("logo.webp")})` }}
            />
          </div>
        </div>
      </div>

      {/* readability: darker on the left where the text sits, and at the base */}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgb(7_3_13/0.92)_0%,rgb(7_3_13/0.55)_26%,transparent_48%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(0deg,rgb(7_3_13/0.85)_0%,transparent_32%)]" />
      <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-inset ring-pink/40" />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 16 }, (_, i) => (
          <span
            key={i} className="ember"
            style={{
              left: `${(i * 61) % 100}%`, width: 3 + (i % 3) * 2, height: 3 + (i % 3) * 2,
              background: i % 2 ? "#ff8a3d" : "#ff5fd6",
              ["--t" as string]: `${8 + (i % 5) * 2}s`, ["--d" as string]: `${-(i * 1.3)}s`,
              ["--dx" as string]: `${((i % 4) - 1.5) * 40}px`, ["--o" as string]: 0.35 + (i % 4) * 0.15,
            }}
          />
        ))}
      </div>

      <div className="absolute inset-0 flex flex-col justify-between gap-6 p-6 sm:p-9">
        <div>
          <motion.p variants={rise} initial="hidden" animate="show" custom={2} className="text-sm text-snow/75">Welcome back,</motion.p>
          <motion.h1 variants={rise} initial="hidden" animate="show" custom={3} className="mt-1 flex items-center gap-3 font-display text-5xl uppercase tracking-wide text-snow sm:text-6xl">
            {CHANNEL_NAME}
            <BadgeCheck className="h-8 w-8 text-pink drop-shadow-[0_0_12px_rgb(255_47_208/0.9)]" aria-hidden />
          </motion.h1>
          <motion.p variants={rise} initial="hidden" animate="show" custom={4} className="mt-2 font-script text-2xl text-pink neon-text">
            Keep the hype alive
          </motion.p>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="hidden w-full max-w-[290px] gap-3 sm:grid">
            {stats.map((stat, i) => {
              const Icon = ICONS[stat.icon];
              return (
                <motion.div
                  key={stat.label} variants={rise} initial="hidden" animate="show" custom={5 + i}
                  whileHover={{ x: 6 }}
                  className="flex items-center gap-4 rounded-2xl bg-night/55 px-4 py-3 ring-1 ring-white/10 backdrop-blur-md"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet/50 to-pink/40 ring-1 ring-pink/40">
                    <Icon className="h-5 w-5 text-snow" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs text-snow/65">{stat.label}</span>
                    <Counter value={stat.value} className="block font-display text-3xl leading-tight tracking-wide text-snow" />
                    <span className="block truncate text-[11px] text-mint">{stat.note}</span>
                  </span>
                </motion.div>
              );
            })}
          </div>
          <motion.div variants={rise} initial="hidden" animate="show" custom={8}>{status}</motion.div>
        </div>
      </div>
    </section>
    <div className="mt-4 grid grid-cols-3 gap-3 sm:hidden">
      {stats.map((stat) => (
        <div key={stat.label} className="panel px-3 py-3 text-center">
          <Counter value={stat.value} className="block font-display text-2xl tracking-wide text-snow" />
          <span className="block text-[11px] leading-tight text-mist">{stat.label}</span>
        </div>
      ))}
    </div>
    </>
  );
}
