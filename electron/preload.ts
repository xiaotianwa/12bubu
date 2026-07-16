import { contextBridge, ipcRenderer } from "electron";
import type {
  AppData,
  AppSettings,
  GentleReminderEvent,
  NoteItem,
  PetMoodEvent,
  ReminderRule,
  ShortcutItem,
  ShortcutPickResult,
  TimerCompleteEvent,
  TimerState
} from "./types.js";

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
  openNoteWidget: (noteId: string): Promise<void> => ipcRenderer.invoke("widget:note:open", noteId),
  closeNoteWidget: (noteId: string): Promise<void> => ipcRenderer.invoke("widget:note:close", noteId),
  openTimerWidget: (): Promise<void> => ipcRenderer.invoke("widget:timer:open"),
  closeTimerWidget: (): Promise<void> => ipcRenderer.invoke("widget:timer:close"),
  quit: (): Promise<void> => ipcRenderer.invoke("app:quit"),
  pickShortcut: (): Promise<ShortcutPickResult | null> => ipcRenderer.invoke("shortcut:pick"),
  launchShortcut: (appPath: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke("shortcut:launch", appPath),
  nudgePet: (dx: number, dy: number): Promise<void> => ipcRenderer.invoke("window:nudge", dx, dy),
  roamPet: (pace?: number): Promise<void> => ipcRenderer.invoke("window:roam", pace),
  movePet: (dx: number, dy: number): Promise<void> => ipcRenderer.invoke("window:move-by", dx, dy),
  throwPet: (velocityX: number, velocityY: number): Promise<void> => ipcRenderer.invoke("window:throw", velocityX, velocityY),
  setClickThrough: (value: boolean): Promise<void> => ipcRenderer.invoke("window:click-through", value),
  setStartup: (value: boolean): Promise<AppData> => ipcRenderer.invoke("startup:set", value),
  notify: (message: string): Promise<void> => ipcRenderer.invoke("notify", message),
  setPetMood: (event: PetMoodEvent): Promise<void> => ipcRenderer.invoke("pet:mood", event),
  showPetMenu: (): Promise<void> => ipcRenderer.invoke("pet:context-menu"),
  checkForUpdates: (): Promise<{ ok: boolean; message: string }> => ipcRenderer.invoke("updates:check"),
  onPetMood: (callback: (event: PetMoodEvent) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: PetMoodEvent) => callback(payload);
    ipcRenderer.on("pet:mood", listener);
    return () => ipcRenderer.removeListener("pet:mood", listener);
  },
  onGentleReminder: (callback: (event: GentleReminderEvent) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: GentleReminderEvent) => callback(payload);
    ipcRenderer.on("reminder:gentle", listener);
    return () => ipcRenderer.removeListener("reminder:gentle", listener);
  },
  onTimerUpdate: (callback: (timer: TimerState) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, timer: TimerState) => callback(timer);
    ipcRenderer.on("timer:updated", listener);
    return () => ipcRenderer.removeListener("timer:updated", listener);
  },
  onTimerComplete: (callback: (event: TimerCompleteEvent) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: TimerCompleteEvent) => callback(payload);
    ipcRenderer.on("timer:complete", listener);
    return () => ipcRenderer.removeListener("timer:complete", listener);
  }
};

contextBridge.exposeInMainWorld("bubu", api);

declare global {
  interface Window {
    bubu: typeof api;
  }
}

export type { AppData, AppSettings, NoteItem, ReminderRule, ShortcutItem, ShortcutPickResult, TimerCompleteEvent, TimerState };
