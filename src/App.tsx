import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";
import { MainApp } from "./components/MainApp";
import { SettingsApp } from "./components/SettingsApp";

export default function App() {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    setLabel(getCurrentWindow().label);
  }, []);

  if (!label) return null;
  if (label === "settings") return <SettingsApp />;
  return <MainApp />;
}
