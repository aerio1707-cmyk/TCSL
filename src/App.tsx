import { useState } from "react";
import "./App.css";
import { ControllerTrackerPage } from "./pages/ControllerTrackerPage";
import { FaultAuditorPage } from "./pages/FaultAuditorPage";

type Tab = "tracker" | "audit";

const TABS: { id: Tab; label: string }[] = [
  { id: "tracker", label: "控制器異動追蹤" },
  { id: "audit", label: "異常暨工單比對稽核" },
];

function App() {
  const [tab, setTab] = useState<Tab>("tracker");

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>智慧路燈分析工具</h1>
        <nav className="tab-bar">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`tab-button${tab === t.id ? " active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      {tab === "tracker" ? <ControllerTrackerPage /> : <FaultAuditorPage />}
    </div>
  );
}

export default App;
