import { useEffect, useState } from "react";
import { PanelShell } from "./components/PanelShell";
import { PetHome } from "./components/PetHome";
import { NoteWidget } from "./components/widgets/NoteWidget";
import { TimerWidget } from "./components/widgets/TimerWidget";

type AppRoute =
  | { type: "home" }
  | { type: "panel"; panel: string }
  | { type: "note-widget"; noteId: string }
  | { type: "timer-widget" };

function getRouteFromHash(): AppRoute {
  const value = window.location.hash.replace(/^#\/?/, "");
  if (value.startsWith("panel/")) return { type: "panel", panel: value.split("/")[1] ?? "" };
  if (value.startsWith("widget/note/")) return { type: "note-widget", noteId: decodeURIComponent(value.split("/")[2] ?? "") };
  if (value === "widget/timer") return { type: "timer-widget" };
  return { type: "home" };
}

export function App() {
  const [route, setRoute] = useState(getRouteFromHash);

  useEffect(() => {
    const onHashChange = () => setRoute(getRouteFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  if (route.type === "panel") return <PanelShell panel={route.panel} />;
  if (route.type === "note-widget") return <NoteWidget noteId={route.noteId} />;
  if (route.type === "timer-widget") return <TimerWidget />;

  return <PetHome />;
}
