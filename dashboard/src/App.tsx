import type { ReactNode } from "react";
import { Route, Routes } from "react-router-dom";
import { Shell } from "./components/Shell";
import { ShellShowroom } from "./components/ShellShowroom";
import { useStore } from "./lib/store";
import Analytics from "./pages/Analytics";
import Clips from "./pages/Clips";
import Dashboard from "./pages/Dashboard";
import Learning from "./pages/Learning";
import Settings from "./pages/Settings";
import Showroom from "./pages/Showroom";

export default function App() {
  const { layout } = useStore();
  const showroom = layout === "showroom";
  const Frame: (props: { children: ReactNode }) => ReactNode = showroom ? ShellShowroom : Shell;
  const Home = showroom ? Showroom : Dashboard;
  return (
    <Frame>
      <Routes>
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
