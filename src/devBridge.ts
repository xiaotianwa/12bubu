import type { AppData, AppSettings, PanelName } from "./types";

const now = new Date().toISOString();
const fallbackData: AppData = {
  settings: {
    alwaysOnTop: true,
    opacity: 1,
    soundEnabled: true,
    launchAtStartup: false,
    reminderIntervalMinutes: 45,
    quietWhenFullscreen: true,
    petPosition: null
  },
  notes: [
    {
      id: "preview-note",
      content: "浏览器预览模式：Electron 里会保存到用户数据目录。",
      createdAt: now,
      updatedAt: now,
      pinned: true
    }
  ],
  reminders: [
    { id: "water", type: "water", intervalMinutes: 45, enabled: true, lastTriggeredAt: null },
    { id: "rest", type: "rest", intervalMinutes: 60, enabled: true, lastTriggeredAt: null }
  ],
  shortcuts: [],
  timer: { mode: "focus", remainingSeconds: 25 * 60, running: false }
};

function readFallbackData(): AppData {
  const raw = localStorage.getItem("bubu-preview-data");
  if (!raw) return fallbackData;
  try {
    return { ...fallbackData, ...(JSON.parse(raw) as Partial<AppData>) };
  } catch {
    return fallbackData;
  }
}

function saveFallbackData(data: AppData): AppData {
  localStorage.setItem("bubu-preview-data", JSON.stringify(data));
  return data;
}

export function installDevBridge() {
  if (window.bubu) return;

  window.bubu = {
    getData: async () => readFallbackData(),
    saveData: async (data: AppData) => saveFallbackData(data),
    updateSettings: async (settings: Partial<AppSettings>) => {
      const current = readFallbackData();
      return saveFallbackData({ ...current, settings: { ...current.settings, ...settings } });
    },
    setAlwaysOnTop: async (value: boolean) => {
      const current = readFallbackData();
      return saveFallbackData({ ...current, settings: { ...current.settings, alwaysOnTop: value } });
    },
    setOpacity: async (value: number) => {
      const current = readFallbackData();
      return saveFallbackData({ ...current, settings: { ...current.settings, opacity: value } });
    },
    savePetPosition: async () => readFallbackData(),
    openPanel: async (panel: PanelName) => {
      window.location.hash = `/panel/${panel}`;
    },
    closePanel: async () => {
      window.location.hash = "/";
    },
    quit: async () => undefined,
    pickShortcut: async () => "C:\\Windows\\System32\\notepad.exe",
    launchShortcut: async () => ({ ok: true }),
    nudgePet: async () => undefined,
    roamPet: async () => undefined,
    movePet: async () => undefined,
    throwPet: async () => undefined,
    setStartup: async (value: boolean) => {
      const current = readFallbackData();
      return saveFallbackData({ ...current, settings: { ...current.settings, launchAtStartup: value } });
    },
    notify: async (message: string) => {
      console.info(`[一二布布提醒] ${message}`);
    },
    onGentleReminder: () => () => undefined,
    onTimerUpdate: () => () => undefined
  };
}
