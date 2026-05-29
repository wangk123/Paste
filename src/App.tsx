import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";
import { ImagePreviewApp } from "./components/ImagePreviewApp";
import { MainApp } from "./components/MainApp";
import { SettingsApp } from "./components/SettingsApp";
import { Toast } from "./components/Toast";

export default function App() {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    setLabel(getCurrentWindow().label);
  }, []);

  if (!label) return null;
  if (label === "settings") return <SettingsApp />;
  if (label === "preview")
    return (
      <>
        <ImagePreviewApp />
        <Toast />
      </>
    );
  return <MainApp />;
}
