export type ReminderType = "water" | "rest";
export type PanelName = "notes" | "timer" | "reminders" | "shortcuts" | "settings";
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

export interface BubuApi {
  getData: () => Promise<AppData>;
  saveData: (data: AppData) => Promise<AppData>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<AppData>;
  setAlwaysOnTop: (value: boolean) => Promise<AppData>;
  setOpacity: (value: number) => Promise<AppData>;
  savePetPosition: () => Promise<AppData>;
  openPanel: (panel: PanelName) => Promise<void>;
  closePanel: () => Promise<void>;
  openNoteWidget: (noteId: string) => Promise<void>;
  closeNoteWidget: (noteId: string) => Promise<void>;
  openTimerWidget: () => Promise<void>;
  closeTimerWidget: () => Promise<void>;
  quit: () => Promise<void>;
  pickShortcut: () => Promise<ShortcutPickResult | null>;
  launchShortcut: (appPath: string) => Promise<{ ok: boolean; error?: string }>;
  nudgePet: (dx: number, dy: number) => Promise<void>;
  roamPet: (pace?: number) => Promise<void>;
  movePet: (dx: number, dy: number) => Promise<void>;
  throwPet: (velocityX: number, velocityY: number) => Promise<void>;
  setClickThrough: (value: boolean) => Promise<void>;
  setStartup: (value: boolean) => Promise<AppData>;
  notify: (message: string) => Promise<void>;
  setPetMood: (event: PetMoodEvent) => Promise<void>;
  showPetMenu: () => Promise<void>;
  checkForUpdates: () => Promise<{ ok: boolean; message: string }>;
  onPetMood: (callback: (event: PetMoodEvent) => void) => () => void;
  onGentleReminder: (callback: (event: GentleReminderEvent) => void) => () => void;
  onTimerUpdate: (callback: (timer: TimerState) => void) => () => void;
  onTimerComplete: (callback: (event: TimerCompleteEvent) => void) => () => void;
}

declare global {
  interface Window {
    bubu: BubuApi;
  }
}
