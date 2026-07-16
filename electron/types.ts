export type ReminderType = "water" | "rest";
export type PetMood =
  | "idle"
  | "blink"
  | "walk"
  | "sleep"
  | "drag"
  | "happy"
  | "note"
  | "focus"
  | "reminder"
  | "shortcut"
  | "settings"
  | "feed"
  | "buddy"
  | "angry"
  | "shy"
  | "bite"
  | "dance"
  | "eyeRoll"
  | "comfySleep"
  | "walkDog"
  | "ride"
  | "spin"
  | "silly"
  | "work"
  | "slack"
  | "recharge"
  | "patrol"
  | "celebrate";

export interface PetPosition {
  x: number;
  y: number;
}

export interface AppSettings {
  alwaysOnTop: boolean;
  opacity: number;
  soundEnabled: boolean;
  quietMode: boolean;
  edgeSnapEnabled: boolean;
  onboardingSeen: boolean;
  launchAtStartup: boolean;
  reminderIntervalMinutes: number;
  quietWhenFullscreen: boolean;
  petPosition: PetPosition | null;
}

export interface NoteItem {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  pinned: boolean;
}

export interface ReminderRule {
  id: string;
  type: ReminderType;
  intervalMinutes: number;
  enabled: boolean;
  lastTriggeredAt: string | null;
}

export interface ShortcutItem {
  id: string;
  name: string;
  appPath: string;
  iconDataUrl?: string;
  iconPath?: string;
}

export interface TimerState {
  mode: "focus" | "break";
  remainingSeconds: number;
  running: boolean;
}

export interface GentleReminderEvent {
  type: ReminderType;
  message: string;
}

export interface TimerCompleteEvent {
  completedMode: TimerState["mode"];
  nextMode: TimerState["mode"];
  message: string;
}

export interface PetMoodEvent {
  mood: PetMood;
  bubble: string;
  durationMs?: number;
}

export interface ShortcutPickResult {
  appPath: string;
  name: string;
  iconDataUrl?: string;
}

export interface AppData {
  settings: AppSettings;
  notes: NoteItem[];
  reminders: ReminderRule[];
  shortcuts: ShortcutItem[];
  timer: TimerState;
}

export const defaultData: AppData = {
  settings: {
    alwaysOnTop: true,
    opacity: 1,
    soundEnabled: true,
    quietMode: false,
    edgeSnapEnabled: true,
    onboardingSeen: false,
    launchAtStartup: false,
    reminderIntervalMinutes: 45,
    quietWhenFullscreen: true,
    petPosition: null
  },
  notes: [
    {
      id: "welcome-note",
      content: "今天也要慢慢来呀。\n点一二可以打开功能泡泡。",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pinned: true
    }
  ],
  reminders: [
    {
      id: "water",
      type: "water",
      intervalMinutes: 45,
      enabled: true,
      lastTriggeredAt: null
    },
    {
      id: "rest",
      type: "rest",
      intervalMinutes: 60,
      enabled: true,
      lastTriggeredAt: null
    }
  ],
  shortcuts: [],
  timer: {
    mode: "focus",
    remainingSeconds: 25 * 60,
    running: false
  }
};
