// The GTA VI logo as a solid 3D object you can play with.
//
// The artwork is one flat cut-out. Stacking copies of it along the depth axis
// gives it real thickness, so it shows its sides when it turns. It follows the
// pointer anywhere on the page, can be dragged to turn it, flicked or
// double-clicked to spin, and clicked for a pulse.

import gsap from "gsap";
import { useEffect, useRef } from "react";

const SRC = `${import.meta.env.BASE_URL}hero/logo.webp`;
const SLICES = 18;
const DEPTH = 4; // px between slices

export function Logo3D({ lean = 0 }: { lean?: number }) {
  const stage = useRef<HTMLDivElement>(null);
  const group = useRef<HTMLDivElement>(null);
  const bob = useRef<HTMLDivElement>(null);
  const aura = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLSpanElement>(null);
  const leanRef = useRef(lean);
  const apply = useRef<() => void>(() => {});

  useEffect(() => {
    leanRef.current = lean;
    apply.current();
  }, [lean]);

  useEffect(() => {
    const el = group.current;
    const root = stage.current;
    if (!el || !root) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = gsap.context(() => {
      // Each source of rotation is kept separately and summed, so they blend.
      const look = { x: 0, y: 0 }; // where the pointer is, -1..1
      const drag = { rx: 0, ry: 0 };
      const spin = { ry: 0 };
      const idle = { ry: 0, weight: 1 };
      const toX = gsap.quickTo(el, "rotationX", { duration: 0.7, ease: "power3.out" });
      const toY = gsap.quickTo(el, "rotationY", { duration: 0.7, ease: "power3.out" });
      apply.current = () => {
        toY(look.x * 24 + leanRef.current * 16 + drag.ry + spin.ry + idle.ry * idle.weight);
        toX(-look.y * 14 + drag.rx);
      };

      gsap.fromTo(el, { opacity: 0, scale: 0.55, rotationY: -70, filter: "blur(16px)" },
        { opacity: 1, scale: 1, rotationY: 0, filter: "blur(0px)", duration: 1.8, ease: "expo.out", onComplete: () => apply.current() });
      if (!calm) {
        gsap.to(bob.current, { y: -14, duration: 3.4, ease: "sine.inOut", yoyo: true, repeat: -1 });
        gsap.to(aura.current, { scale: 1.12, opacity: 0.9, duration: 2.6, ease: "sine.inOut", yoyo: true, repeat: -1 });
        gsap.to(idle, { ry: 9, duration: 4.5, ease: "sine.inOut", yoyo: true, repeat: -1, onUpdate: () => apply.current() }).progress(0.5);
      }

      let wake: gsap.core.Tween | undefined;
      const onMove = (event: PointerEvent) => {
        const box = root.getBoundingClientRect();
        look.x = gsap.utils.clamp(-1, 1, (event.clientX - (box.left + box.width / 2)) / (window.innerWidth / 2));
        look.y = gsap.utils.clamp(-1, 1, (event.clientY - (box.top + box.height / 2)) / (window.innerHeight / 2));
        // While the pointer is active the idle sway fades out, then returns.
        gsap.to(idle, { weight: 0, duration: 0.4, overwrite: true });
        wake?.kill();
        wake = gsap.to(idle, { weight: 1, duration: 2, delay: 3.5 });
        apply.current();
      };
      window.addEventListener("pointermove", onMove);

      const pulse = () => {
        gsap.fromTo(ring.current, { scale: 0.35, opacity: 0.95 }, { scale: 1.9, opacity: 0, duration: 1.1, ease: "power2.out" });
        gsap.fromTo(el, { scale: 1.09 }, { scale: 1, duration: 0.9, ease: "elastic.out(1, 0.4)" });
        gsap.fromTo(aura.current, { filter: "brightness(2.2)" }, { filter: "brightness(1)", duration: 0.9 });
      };
      const whirl = (direction: number) => {
        gsap.to(spin, {
          ry: 360 * direction, duration: 1.5, ease: "power3.inOut", onUpdate: () => apply.current(),
          onComplete: () => {
            spin.ry = 0;
            gsap.set(el, { rotationY: (gsap.getProperty(el, "rotationY") as number) % 360 });
            apply.current();
          },
        });
      };

      let start: { x: number; y: number; t: number } | null = null;
      let moved = 0;
      const onDown = (event: PointerEvent) => {
        start = { x: event.clientX, y: event.clientY, t: performance.now() };
        moved = 0;
        el.setPointerCapture(event.pointerId);
        gsap.killTweensOf(drag);
      };
      const onDrag = (event: PointerEvent) => {
        if (!start) return;
        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;
        moved = Math.max(moved, Math.hypot(dx, dy));
        drag.ry = gsap.utils.clamp(-80, 80, dx * 0.45);
        drag.rx = gsap.utils.clamp(-32, 32, -dy * 0.28);
        apply.current();
      };
      const onUp = (event: PointerEvent) => {
        if (!start) return;
        const dx = event.clientX - start.x;
        const speed = Math.abs(dx) / Math.max(1, performance.now() - start.t); // px per ms
        start = null;
        if (moved < 6) pulse();
        else if (speed > 1.1) whirl(Math.sign(dx));
        gsap.to(drag, { rx: 0, ry: 0, duration: 1.5, ease: "elastic.out(1, 0.45)", onUpdate: () => apply.current() });
      };
      el.addEventListener("pointerdown", onDown);
      el.addEventListener("pointermove", onDrag);
      el.addEventListener("pointerup", onUp);
      el.addEventListener("pointercancel", onUp);
      const onDouble = () => whirl(1);
      el.addEventListener("dblclick", onDouble);

      return () => {
        window.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerdown", onDown);
        el.removeEventListener("pointermove", onDrag);
        el.removeEventListener("pointerup", onUp);
        el.removeEventListener("pointercancel", onUp);
        el.removeEventListener("dblclick", onDouble);
      };
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={stage} className="relative h-full w-full select-none" style={{ perspective: 1500 }}>
      <div ref={aura} className="absolute left-1/2 top-[43%] h-[74%] w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(255_60_190/0.55),rgb(138_60_255/0.28)_55%,transparent)] opacity-70 blur-2xl" />
      <span ref={ring} className="pointer-events-none absolute left-1/2 top-[43%] aspect-square h-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-pink opacity-0 shadow-[0_0_40px_rgb(255_47_208/0.9)]" />

      {/* the pedestal: neon rings lying flat under the logo */}
      <div className="pointer-events-none absolute left-1/2 top-[86%] aspect-square h-[88%] -translate-x-1/2 -translate-y-1/2" style={{ transform: "rotateX(77deg)" }}>
        <div className="pedestal-ring absolute inset-0" />
        <div className="pedestal-ring pedestal-ring--back absolute inset-[13%]" />
        <div className="absolute inset-[24%] rounded-full bg-[radial-gradient(closest-side,rgb(255_47_208/0.75),rgb(138_60_255/0.25)_60%,transparent)] blur-md" />
      </div>

      {/* sized by the stage's height so it never spills over what is above or below */}
      <div ref={bob} className="absolute left-1/2 top-[43%] aspect-[570/510] h-[72%] max-w-[94%] -translate-x-1/2 -translate-y-1/2">
        <div
          ref={group} role="img" aria-label="Grand Theft Auto VI logo. Drag to turn it, double-click to spin it."
          className="relative h-full w-full cursor-grab touch-none active:cursor-grabbing"
          style={{ transformStyle: "preserve-3d" }}
        >
          {Array.from({ length: SLICES }, (_, i) => {
            const slice = SLICES - 1 - i; // back to front, so the face is painted last
            const shade = slice === 0 ? undefined : `brightness(${Math.max(0.22, 0.62 - slice * 0.025)}) saturate(1.5)`;
            return (
              <img
                key={slice} src={SRC} alt="" draggable={false}
                className="absolute inset-0 h-full w-full object-contain"
                style={{ transform: `translateZ(${-slice * DEPTH}px)`, filter: shade }}
              />
            );
          })}
          <div
            className="logo-sweep pointer-events-none absolute inset-0 overflow-hidden mix-blend-overlay"
            style={{ WebkitMaskImage: `url(${SRC})`, maskImage: `url(${SRC})`, transform: "translateZ(1px)" }}
          />
        </div>
      </div>
    </div>
  );
}
