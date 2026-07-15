import { contextBridge, ipcRenderer } from "electron";
import type { AppData, AppSettings, GentleReminderEvent, NoteItem, ReminderRule, ShortcutItem, TimerState } from "./types.js";

const api = {
  getData: (): Promise<AppData> => ipcRenderer.invoke("data:get"),
  saveData: (data: AppData): Promise<AppData> => ipcRenderer.invoke("data:save", data),
  updateSettings: (settings: Partial<AppSettings>): Promise<AppData> => ipcRenderer.invoke("settings:update", settings),
  setAlwaysOnTop: (value: boolean): Promise<AppData> => ipcRenderer.invoke("window:always-on-top", value),
  setOpacity: (value: number): Promise<AppData> => ipcRenderer.invoke("window:opacity", value),
  savePetPosition: (): Promise<AppData> => ipcRenderer.invoke("window:save-position"),
  openPanel: (panel: "notes" | "timer" | "reminders" | "shortcuts" | "settings"): Promise<void> =>
    ipcRenderer.invoke("panel:open", panel),
  closePanel: (): Promise<void> => ipcRenderer.invoke("panel:close"),
  quit: (): Promise<void> => ipcRenderer.invoke("app:quit"),
  pickShortcut: (): Promise<string | null> => ipcRenderer.invoke("shortcut:pick"),
  launchShortcut: (appPath: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke("shortcut:launch", appPath),
  nudgePet: (dx: number, dy: number): Promise<void> => ipcRenderer.invoke("window:nudge", dx, dy),
  roamPet: (pace?: number): Promise<void> => ipcRenderer.invoke("window:roam", pace),
  movePet: (dx: number, dy: number): Promise<void> => ipcRenderer.invoke("window:move-by", dx, dy),
  throwPet: (velocityX: number, velocityY: number): Promise<void> => ipcRenderer.invoke("window:throw", velocityX, velocityY),
  setStartup: (value: boolean): Promise<AppData> => ipcRenderer.invoke("startup:set", value),
  notify: (message: string): Promise<void> => ipcRenderer.invoke("notify", message),
  onGentleReminder: (callback: (event: GentleReminderEvent) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: GentleReminderEvent) => callback(payload);
    ipcRenderer.on("reminder:gentle", listener);
    return () => ipcRenderer.removeListener("reminder:gentle", listener);
  },
  onTimerUpdate: (callback: (timer: TimerState) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, timer: TimerState) => callback(timer);
    ipcRenderer.on("timer:updated", listener);
    return () => ipcRenderer.removeListener("timer:updated", listener);
  }
};

contextBridge.exposeInMainWorld("bubu", api);

declare global {
  interface Window {
    bubu: typeof api;
  }
}

export type { AppData, AppSettings, NoteItem, ReminderRule, ShortcutItem, TimerState };
