// The way in. Every time this page loads it plays the same short film: a line
// of neon opens the dark like a shutter, the 3D logo flies out of the city and
// settles, and the sign-in card slides in beside it. The logo then watches the
// pointer, turns to the form while you type and answers each try: a shake of
// the head for a wrong password, a rush towards you for the right one.

import gsap from "gsap";
import { ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Wordmark } from "../components/Shell";
import { ApiError, signIn } from "../lib/api";
import { useStore } from "../lib/store";
import { canUseWebGL } from "../lib/webgl";
import type { LogoScene } from "../three/logoScene";

const RAD = Math.PI / 180;
const HERO = `${import.meta.env.BASE_URL}hero/hero-wide.jpg`;
const FLAT_LOGO = `${import.meta.env.BASE_URL}hero/logo.webp`;

const FIT = 0.56; // how much of the view the logo fills at scale 1

/** Where the logo rests once the card is in: beside it on wide screens, in the space above it on narrow ones. */
function restingPlace(card: HTMLElement | null) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  if (width >= 1024) return { x: -0.2, y: 0.03, scale: 1.02 };
  const free = Math.max(140, card?.getBoundingClientRect().top ?? height * 0.4);
  const tall = Math.min(FIT * height, FIT * width * 0.92); // the logo's height in pixels at scale 1
  return { x: 0, y: 0.5 - (free / 2 + 4) / height, scale: Math.min(0.86 / FIT, (0.8 * free) / tall) };
}

type Stage = {
  attend: (on: boolean) => void;
  keystroke: () => void;
  thinking: () => void;
  refuse: () => void;
  welcome: (done: () => void) => void;
};

export default function Login() {
  const { enter, ready } = useStore();
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const card = useRef<HTMLFormElement>(null);
  const stage = useRef<Stage | null>(null);
  const [flat] = useState(() => !canUseWebGL());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const host = root.current;
    if (!host) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let scene: LogoScene | null = null;
    let cancelled = false;

    // Every source of the logo's movement, blended each frame.
    const place = calm ? { ...restingPlace(card.current), z: 0, yaw: 0, pitch: 0, opacity: 1 } : { x: 0, y: 0, z: -26, scale: 0.6, yaw: -560 * RAD, pitch: 28 * RAD, opacity: 0 };
    const look = { x: 0, y: 0, tx: 0, ty: 0 };
    const attend = { v: 0, target: 0 };
    const extra = { yaw: 0, glow: 1, scale: 1, sweep: 0, light: 0, pulse: 0 };

    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(host);

      // ---- the shutter and the card: these do not wait for the 3D model
      const film = gsap.timeline({ defaults: { ease: "expo.inOut" } });
      if (calm) {
        gsap.set(q("[data-shutter], [data-slit]"), { display: "none" });
      } else {
        film
          .fromTo(q("[data-slit]"), { scaleX: 0, opacity: 1 }, { scaleX: 1, duration: 0.55, ease: "power3.inOut" })
          .to(q("[data-shutter='top']"), { yPercent: -101, duration: 1 }, ">-0.05")
          .to(q("[data-shutter='bottom']"), { yPercent: 101, duration: 1 }, "<")
          .to(q("[data-slit]"), { scaleY: 60, opacity: 0, duration: 0.7, ease: "power2.out" }, "<")
          .fromTo(q("[data-city]"), { scale: 1.42, filter: "blur(30px) saturate(1.7) brightness(1.7)" }, { scale: 1.2, filter: "blur(16px) saturate(1.6) brightness(1)", duration: 2.6, ease: "power2.out" }, "<")
          .fromTo(q("[data-floor]"), { opacity: 0, yPercent: 12 }, { opacity: 1, yPercent: 0, duration: 1.6, ease: "power3.out" }, "<0.2")
          .fromTo(q("[data-flat]"), { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 1.4, ease: "expo.out" }, 0.9);
        gsap.to(q("[data-city]"), { xPercent: -1.5, duration: 14, ease: "sine.inOut", yoyo: true, repeat: -1, delay: 3 });
        gsap.set(card.current, { opacity: 0 });
      }

      // The card comes in as the logo moves aside for it, or after a few
      // seconds if the 3D model is slow to arrive (or cannot be drawn at all).
      let cardShown = calm;
      const showCard = () => {
        if (cardShown) return;
        cardShown = true;
        gsap.timeline()
          .fromTo(card.current, { opacity: 0, x: 70, rotateY: -16, filter: "blur(16px)" }, { opacity: 1, x: 0, rotateY: 0, filter: "blur(0px)", duration: 1.1, ease: "expo.out" })
          .fromTo(q("[data-in]"), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.55, stagger: 0.07, ease: "power3.out" }, 0.25)
          .call(() => { if (window.innerWidth >= 1024) host.querySelector<HTMLInputElement>("input[name='email']")?.focus({ preventScroll: true }); }, [], 1.1);
      };
      gsap.delayedCall(flat ? 1.75 : 4.5, showCard);

      // ---- what the form asks of the logo
      const shakeCard = () => gsap.fromTo(card.current, { x: -14 }, { x: 0, duration: 0.7, ease: "elastic.out(1.2, 0.25)" });
      stage.current = {
        attend: (on) => { attend.target = on ? 1 : 0; },
        keystroke: () => {
          gsap.fromTo(extra, { glow: 2.1, scale: 1.025 }, { glow: 1, scale: 1, duration: 0.5, ease: "power2.out", overwrite: "auto" });
        },
        thinking: () => {
          gsap.fromTo(extra, { yaw: 0 }, { yaw: Math.PI * 2, duration: 1.25, ease: "power3.inOut", overwrite: "auto" });
          gsap.fromTo(extra, { pulse: 0 }, { pulse: 1, duration: 1.1, ease: "power2.out" });
        },
        refuse: () => {
          shakeCard();
          gsap.killTweensOf(extra, "yaw");
          gsap.fromTo(extra, { yaw: 0 }, { keyframes: { yaw: [0, 0.42, -0.36, 0.24, -0.14, 0] }, duration: 0.9, ease: "power2.out" });
          gsap.fromTo(q("[data-alarm]"), { opacity: 0.55 }, { opacity: 0, duration: 0.9, ease: "power2.out" });
        },
        welcome: (done) => {
          if (calm || !scene) {
            gsap.to(host, { opacity: 0, duration: 0.3, onComplete: done });
            return;
          }
          gsap.killTweensOf([extra, place]);
          gsap.timeline({ onComplete: done })
            .to(card.current, { opacity: 0, x: 60, filter: "blur(14px)", duration: 0.45, ease: "power2.in" })
            .to(place, { x: 0, y: 0, duration: 0.75, ease: "power3.inOut" }, 0)
            .to(extra, { yaw: Math.PI * 2, duration: 1.25, ease: "power2.in" }, 0)
            .to(extra, { glow: 4, sweep: 1, duration: 1.1, ease: "power2.in" }, 0.1)
            .fromTo(extra, { pulse: 0 }, { pulse: 1, duration: 0.9, ease: "power2.out" }, 0.1)
            .to(place, { z: 6.6, scale: 1.25, duration: 0.85, ease: "power4.in" }, 0.45)
            .to(q("[data-flash]"), { opacity: 1, duration: 0.4, ease: "power2.in" }, 0.9);
        },
      };

      // ---- the logo itself
      if (flat || !canvas.current) return;
      import("../three/logoScene").then(({ LogoScene }) => {
        if (cancelled || !canvas.current) return;
        try {
          scene = new LogoScene(canvas.current, { particles: true, pedestal: true, halo: true, fit: FIT });
        } catch {
          showCard();
          return;
        }
        const live = scene;
        live.onFrame = (t) => {
          look.x += (look.tx - look.x) * 0.06;
          look.y += (look.ty - look.y) * 0.06;
          attend.v += (attend.target - attend.v) * 0.07;
          const wide = window.innerWidth >= 1024;
          const sway = calm ? 0 : Math.sin(t * 0.6) * 6 * RAD;
          live.pose.x = place.x;
          live.pose.y = place.y + (calm ? 0 : Math.sin(t * 0.9) * 0.008);
          live.pose.z = place.z;
          live.pose.scale = place.scale * extra.scale;
          live.pose.opacity = place.opacity;
          live.pose.yaw = place.yaw + extra.yaw + sway * (1 - attend.v) + look.x * 20 * RAD + attend.v * (wide ? 24 : 0) * RAD;
          live.pose.pitch = place.pitch + look.y * 10 * RAD + attend.v * (wide ? 0 : 12) * RAD;
          live.pose.glow = extra.glow;
          live.pose.sweep = extra.sweep;
          live.pose.light = extra.light;
          live.pose.pulse = extra.pulse;
        };
        live.load().then(() => {
          if (cancelled) return;
          live.start();
          if (calm) return;
          const rest = restingPlace(card.current);
          // Wait for the shutter if the model arrived first, then fly in.
          gsap.timeline({ delay: Math.max(0, 0.75 - film.time()) })
            .to(place, { opacity: 1, duration: 0.5, ease: "power2.out" }, 0)
            .to(place, { z: 0, yaw: 0, pitch: 0, scale: 1.3, duration: 2.1, ease: "expo.out" }, 0)
            .fromTo(extra, { sweep: 0, light: -2.4 }, { sweep: 1, light: 2.6, duration: 1.9, ease: "power2.inOut" }, 0.25)
            .to(extra, { sweep: 0, duration: 0.6 }, ">-0.3")
            .fromTo(extra, { glow: 3.2 }, { glow: 1, duration: 1.6, ease: "power2.out" }, 0.5)
            .fromTo(extra, { pulse: 0 }, { pulse: 1, duration: 1.3, ease: "power2.out" }, 1.0)
            .to(place, { x: rest.x, y: rest.y, scale: rest.scale, duration: 1.3, ease: "power3.inOut" }, 1.15)
            .call(showCard, [], 1.45);
        }).catch(showCard);
      });

      const onMove = (event: PointerEvent) => {
        look.tx = (event.clientX / window.innerWidth - 0.5) * 2;
        look.ty = (event.clientY / window.innerHeight - 0.5) * 2;
      };
      const onResize = () => {
        // Once the film has played, keep the logo where this screen size wants it.
        if (place.z === 0 && !gsap.isTweening(place)) Object.assign(place, restingPlace(card.current));
      };
      const onVisible = () => (document.hidden ? scene?.stop() : scene?.start());
      window.addEventListener("pointermove", onMove);
      window.addEventListener("resize", onResize);
      document.addEventListener("visibilitychange", onVisible);
      return () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("resize", onResize);
        document.removeEventListener("visibilitychange", onVisible);
      };
    }, host);

    return () => {
      cancelled = true;
      stage.current = null;
      ctx.revert();
      scene?.dispose();
    };
  }, [flat]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    stage.current?.thinking();
    try {
      const who = await signIn(email.trim(), password);
      const done = () => enter(who.email);
      if (stage.current) stage.current.welcome(done);
      else done();
    } catch (problem) {
      setBusy(false);
      setError(problem instanceof ApiError ? problem.message : "Could not sign in. Try again.");
      stage.current?.refuse();
    }
  }

  return (
    <div ref={root} className="fixed inset-0 overflow-hidden bg-night text-snow">
      <img data-city src={HERO} alt="" className="absolute inset-0 h-full w-full scale-[1.2] object-cover opacity-60 blur-[16px] saturate-150" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_32%_44%,transparent_0%,rgb(7_3_13/0.5)_42%,rgb(7_3_13/0.95)_100%)] lg:bg-[radial-gradient(ellipse_at_30%_46%,transparent_0%,rgb(7_3_13/0.45)_40%,rgb(7_3_13/0.96)_100%)]" />
      <div data-floor className="absolute inset-0" aria-hidden><div className="login-floor" /></div>
      <div className="login-scan" aria-hidden />

      {flat ? (
        <img data-flat src={FLAT_LOGO} alt="Grand Theft Auto VI" className="absolute left-1/2 top-[24%] w-[min(70vw,460px)] -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_0_60px_rgb(255_47_208/0.6)] lg:left-[30%] lg:top-1/2" />
      ) : (
        <canvas ref={canvas} role="img" aria-label="Grand Theft Auto VI logo in 3D" className="pointer-events-none absolute inset-0 h-full w-full" />
      )}
      <div data-alarm className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgb(255_40_90/0.7)_100%)] opacity-0" />

      <header className="absolute left-8 top-7 z-10 hidden lg:block"><Wordmark /></header>

      <div className="relative z-10 flex h-full items-end justify-center px-4 pb-6 sm:pb-10 lg:items-center lg:justify-end lg:pb-0 lg:pr-[7vw]" style={{ perspective: 1400 }}>
        <form ref={card} onSubmit={submit} className="login-card w-[min(100%,430px)] p-5 sm:p-8" noValidate>
          <span className="login-corner left-3 top-3 border-l-2 border-t-2" aria-hidden />
          <span className="login-corner right-3 top-3 border-r-2 border-t-2" aria-hidden />
          <span className="login-corner bottom-3 left-3 border-b-2 border-l-2" aria-hidden />
          <span className="login-corner bottom-3 right-3 border-b-2 border-r-2" aria-hidden />

          <p data-in className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-pink neon-text">
            <ShieldCheck className="h-4 w-4" aria-hidden /> Owner access
          </p>
          <h1 data-in className="mt-2 font-display text-4xl uppercase leading-[0.95] tracking-wide sunset-text sm:mt-3 sm:text-6xl">Welcome <br className="max-sm:hidden" />back</h1>
          <p data-in className="mt-3 text-sm leading-relaxed text-mist max-sm:hidden">Sign in to run the clipping agent, tune its settings and see what it has learned.</p>

          <label data-in className="mt-4 block text-[11px] sm:mt-6 font-semibold uppercase tracking-[0.22em] text-mist">
            Email
            <span className="login-field mt-2">
              <Mail className="h-4 w-4 shrink-0 text-pink" aria-hidden />
              <input
                type="email" name="email" autoComplete="username" inputMode="email" required spellCheck={false}
                placeholder="you@example.com" value={email} disabled={busy}
                onChange={(e) => { setEmail(e.target.value); stage.current?.keystroke(); }}
                onFocus={() => stage.current?.attend(true)} onBlur={() => stage.current?.attend(false)}
              />
            </span>
          </label>

          <label data-in className="mt-4 block text-[11px] font-semibold uppercase tracking-[0.22em] text-mist">
            Password
            <span className="login-field mt-2">
              <Lock className="h-4 w-4 shrink-0 text-pink" aria-hidden />
              <input
                type={show ? "text" : "password"} name="password" autoComplete="current-password" required
                placeholder="••••••••" value={password} disabled={busy}
                onChange={(e) => { setPassword(e.target.value); stage.current?.keystroke(); }}
                onFocus={() => stage.current?.attend(true)} onBlur={() => stage.current?.attend(false)}
              />
              <button type="button" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-mist hover:text-snow" aria-label={show ? "Hide the password" : "Show the password"} onClick={() => setShow(!show)}>
                {show ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
              </button>
            </span>
          </label>

          <p role="alert" aria-live="assertive" className={`mt-3 min-h-5 text-sm text-rose transition-opacity ${error ? "opacity-100" : "opacity-0"}`}>{error || " "}</p>
          {!ready && <p className="mb-2 text-sm text-gold">Signing in has not been set up on the server yet.</p>}

          <button data-in type="submit" className="login-go btn btn-primary mt-1 w-full !py-3.5 text-[15px]" disabled={busy || !email.trim() || !password}>
            {busy ? "Opening the doors…" : "Enter Vice City"}
            {!busy && <ArrowRight className="h-4 w-4" aria-hidden />}
          </button>
          <p data-in className="mt-4 text-center text-[10px] uppercase tracking-[0.25em] text-mist/70 sm:mt-5 sm:text-[11px]">Private dashboard · GTA6Fied Control</p>
        </form>
      </div>

      <div data-shutter="top" className="absolute inset-x-0 top-0 z-30 h-1/2 bg-black" aria-hidden />
      <div data-shutter="bottom" className="absolute inset-x-0 bottom-0 z-30 h-1/2 bg-black" aria-hidden />
      <div data-slit className="login-slit" aria-hidden />
      <div data-flash className="login-flash" aria-hidden />
    </div>
  );
}
