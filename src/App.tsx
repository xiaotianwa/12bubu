import { useEffect, useState } from "react";
import { PanelShell } from "./components/PanelShell";
import { PetHome } from "./components/PetHome";

function getPanelFromHash(): string | null {
  const value = window.location.hash.replace(/^#\/?/, "");
  if (!value.startsWith("panel/")) return null;
  return value.split("/")[1] ?? null;
}

export function App() {
  const [panel, setPanel] = useState(getPanelFromHash);

  useEffect(() => {
    const onHashChange = () => setPanel(getPanelFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  if (panel) {
    return <PanelShell panel={panel} />;
  }

  return <PetHome />;
}
