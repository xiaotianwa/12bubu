import { NotesPanel } from "./panels/NotesPanel";
import { RemindersPanel } from "./panels/RemindersPanel";
import { SettingsPanel } from "./panels/SettingsPanel";
import { ShortcutsPanel } from "./panels/ShortcutsPanel";
import { TimerPanel } from "./panels/TimerPanel";
import { PetSprite } from "./PetSprite";
import type { PetMood } from "../types";

const panelTitles: Record<string, string> = {
  notes: "便签",
  timer: "番茄钟",
  reminders: "提醒",
  shortcuts: "快捷启动",
  settings: "设置"
};

const panelDescriptions: Record<string, string> = {
  notes: "随手记下桌面上的小事，下一步会支持贴到桌面。",
  timer: "专注和休息会在后台继续计时，一二会保持对应状态。",
  reminders: "喝水和休息提醒会温柔冒泡，不抢走你的窗口焦点。",
  shortcuts: "把常用程序放进布布的小工具箱，一点就启动。",
  settings: "调整置顶、透明度和开机启动，让一二更贴合你的桌面。"
};

const panelStatus: Record<string, string> = {
  notes: "自动保存",
  timer: "后台运行",
  reminders: "静音通知",
  shortcuts: "本机启动",
  settings: "即时生效"
};

const panelMood: Record<string, PetMood> = {
  notes: "note",
  timer: "focus",
  reminders: "reminder",
  shortcuts: "shortcut",
  settings: "settings"
};

export function PanelShell({ panel }: { panel: string }) {
  const title = panelTitles[panel] ?? "小工具";

  return (
    <main className="panel-window" aria-labelledby="panel-title">
      <header className="panel-titlebar app-drag">
        <div className="panel-heading">
          <span className="panel-kicker">一二 · 布布</span>
          <h1 id="panel-title">{title}</h1>
          <p>{panelDescriptions[panel] ?? "挑一个小工具，让一二陪你处理。"}</p>
          <div className="panel-status-strip" aria-label="面板状态">
            <span>{panelStatus[panel] ?? "准备好了"}</span>
            <span>本地数据</span>
          </div>
        </div>
        <div className="panel-pet-preview" aria-hidden="true">
          <PetSprite mood={panelMood[panel] ?? "idle"} compact />
        </div>
        <button className="icon-button no-drag" type="button" onClick={() => window.bubu.closePanel()} aria-label="关闭">
          x
        </button>
      </header>
      <section className="panel-content no-drag">
        {panel === "notes" ? <NotesPanel /> : null}
        {panel === "timer" ? <TimerPanel /> : null}
        {panel === "reminders" ? <RemindersPanel /> : null}
        {panel === "shortcuts" ? <ShortcutsPanel /> : null}
        {panel === "settings" ? <SettingsPanel /> : null}
      </section>
    </main>
  );
}
