import { motion } from "framer-motion";
import { lazy, Suspense, type ReactNode } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { Shell, Wordmark } from "./components/Shell";
import { ShellShowroom } from "./components/ShellShowroom";
import { useStore } from "./lib/store";
import Analytics from "./pages/Analytics";
import Clips from "./pages/Clips";
import Dashboard from "./pages/Dashboard";
import Learning from "./pages/Learning";
import Settings from "./pages/Settings";
import Showroom from "./pages/Showroom";

const Login = lazy(() => import("./pages/Login"));

function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center bg-night">
      <div className="animate-pulse"><Wordmark /></div>
    </div>
  );
}

function Rooms() {
  const { layout } = useStore();
  // Each page is drawn for the address it was opened with, so the page that is
  // fading out stays itself instead of briefly turning into the next one.
  const location = useLocation();
  const showroom = layout === "showroom";
  const Frame: (props: { children: ReactNode }) => ReactNode = showroom ? ShellShowroom : Shell;
  const Home = showroom ? Showroom : Dashboard;
  return (
    <Frame>
      <Routes location={location}>
        <Route path="/" element={<Home />} />
        <Route path="/clips" element={<Clips />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/learning" element={<Learning />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </Frame>
  );
}

export default function App() {
  const { auth, arrived } = useStore();
  if (auth === "checking") return <Splash />;
  if (auth === "out") return <Suspense fallback={<Splash />}><Login /></Suspense>;
  return (
    <>
      <Rooms />
      {/* Arriving from the sign-in page: its flash of light fades over the dashboard. */}
      {arrived && <motion.div className="arrival" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 1.2, ease: "easeOut" }} />}
    </>
  );
}
