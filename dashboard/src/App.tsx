import { Route, Routes } from "react-router-dom";
import { Shell } from "./components/Shell";
import Analytics from "./pages/Analytics";
import Clips from "./pages/Clips";
import Dashboard from "./pages/Dashboard";
import Learning from "./pages/Learning";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/clips" element={<Clips />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/learning" element={<Learning />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Dashboard />} />
      </Routes>
    </Shell>
  );
}
