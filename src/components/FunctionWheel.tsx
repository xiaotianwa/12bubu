import type { PanelName } from "../types";
import type { CSSProperties } from "react";

export type WheelAction = "roam";
type WheelIcon =
  | "note"
  | "timer"
  | "reminder"
  | "launch"
  | "walk"
  | "quit";

interface WheelItem {
  label: string;
  icon: WheelIcon;
  panel?: PanelName;
  action?: WheelAction;
  danger?: boolean;
  tone: "cream" | "pink" | "mint" | "blue" | "brown";
}

const toolItems: WheelItem[] = [
  { label: "便签", icon: "note", panel: "notes", tone: "cream" },
  { label: "番茄钟", icon: "timer", panel: "timer", tone: "pink" },
  { label: "提醒", icon: "reminder", panel: "reminders", tone: "blue" },
  { label: "启动", icon: "launch", panel: "shortcuts", tone: "mint" },
  { label: "散步", icon: "walk", action: "roam", tone: "pink" }
];

interface FunctionWheelProps {
  open: boolean;
  onOpenPanel: (panel: PanelName) => void;
  onAction: (action: WheelAction) => void;
  onToggle: () => void;
  onDismiss: () => void;
  onQuit: () => void;
}

function WheelSymbol({ icon }: { icon: WheelIcon }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const
  };

  return (
    <svg className="wheel-symbol" viewBox="0 0 24 24" aria-hidden="true">
      {icon === "note" ? (
        <>
          <path {...common} d="M7 4h8l3 3v13H7z" />
          <path {...common} d="M15 4v4h4M10 12h6M10 16h4" />
        </>
      ) : null}
      {icon === "timer" ? (
        <>
          <circle {...common} cx="12" cy="13" r="7" />
          <path {...common} d="M9 3h6M12 7v6l4 2" />
        </>
      ) : null}
      {icon === "reminder" ? (
        <>
          <path {...common} d="M6 10a6 6 0 0 1 12 0v4l2 3H4l2-3z" />
          <path {...common} d="M10 20h4" />
        </>
      ) : null}
      {icon === "launch" ? (
        <>
          <path {...common} d="M5 19h14M7 16l5-11 5 11" />
          <path {...common} d="M9 13h6" />
        </>
      ) : null}
      {icon === "walk" ? (
        <>
          <path {...common} d="M5 17c3-1 5-3 7-6 2-3 4-5 7-5" />
          <path {...common} d="M15 6h4v4" />
          <circle {...common} cx="7" cy="8" r="2" />
          <circle {...common} cx="17" cy="16" r="2" />
        </>
      ) : null}
      {icon === "quit" ? (
        <>
          <path {...common} d="M10 6H6v12h4M14 8l4 4-4 4M8 12h10" />
        </>
      ) : null}
    </svg>
  );
}

export function FunctionWheel({ open, onOpenPanel, onAction, onToggle, onDismiss, onQuit }: FunctionWheelProps) {
  const renderItem = (item: WheelItem, index: number) => {
    const style = {
      "--delay": `${index * 18}ms`
    } as CSSProperties;

    return (
      <button
        key={item.label}
        className={`wheel-button no-drag tone-${item.tone} ${item.danger ? "is-danger" : ""}`}
        style={style}
        type="button"
        title={item.label}
        aria-label={item.label}
        tabIndex={open ? 0 : -1}
        onClick={() => {
          if (item.panel) onOpenPanel(item.panel);
          else if (item.action) onAction(item.action);
          else onQuit();
        }}
      >
        <span className="wheel-icon" aria-hidden="true">
          <WheelSymbol icon={item.icon} />
        </span>
        <span className="wheel-label">{item.label}</span>
      </button>
    );
  };

  return (
    <nav className={`function-wheel ${open ? "is-open" : ""}`} aria-label="布布快捷功能">
      <span className="wheel-action-dock" aria-hidden="true" />
      <div className="wheel-side-list" aria-hidden={!open}>
        {toolItems.map((item, index) => renderItem(item, index))}
      </div>
      <button
        className="wheel-center-button no-drag"
        type="button"
        aria-label={open ? "收起侧边功能" : "展开侧边功能"}
        aria-expanded={open}
        onClick={() => {
          if (open) onDismiss();
          else onToggle();
        }}
      >
        <span className="wheel-handle-icon" aria-hidden="true">
          {open ? (
            <svg className="wheel-symbol" viewBox="0 0 24 24">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          ) : (
            <svg className="wheel-symbol" viewBox="0 0 24 24">
              <circle cx="5" cy="12" r="1.6" />
              <circle cx="12" cy="12" r="1.6" />
              <circle cx="19" cy="12" r="1.6" />
            </svg>
          )}
        </span>
      </button>
    </nav>
  );
}
