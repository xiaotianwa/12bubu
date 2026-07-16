import { app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, Notification, screen, shell, Tray } from "electron";
import path from "node:path";
import { AppData, AppSettings, PetMoodEvent, PetPosition, ReminderType, ShortcutPickResult, TimerCompleteEvent } from "./types.js";
import { readData, writeData } from "./store.js";

const isDev = process.env.VITE_DEV_SERVER_URL || !app.isPackaged;
const devUrl = process.env.VITE_DEV_SERVER_URL ?? "http://127.0.0.1:5173";
const petWindowSize = { width: 360, height: 360 };
const edgeSnapThreshold = 48;
const reminderMessages: Record<ReminderType, string> = {
  water: "该喝点水啦，一二把杯子递到桌边。",
  rest: "休息一下眼睛吧，看看远处，一二在旁边等你。"
};

let mainWindow: BrowserWindow | null = null;
let panelWindow: BrowserWindow | null = null;
let timerWidgetWindow: BrowserWindow | null = null;
const noteWidgetWindows = new Map<string, BrowserWindow>();
let tray: Tray | null = null;
let reminderTimer: NodeJS.Timeout | null = null;
let timerTimer: NodeJS.Timeout | null = null;
let petMotionTimer: NodeJS.Timeout | null = null;
let petClickThrough = false;

function getPreloadPath(): string {
  return path.join(__dirname, "preload.js");
}

function getRendererUrl(route = "/"): string {
  if (isDev) {
    return route === "/" ? `${devUrl}/#/` : `${devUrl}/#${route}`;
  }
  return `file://${path.join(__dirname, "../dist/index.html")}${route === "/" ? "" : `#${route}`}`;
}

function getResourcePath(...segments: string[]): string {
  const base = app.isPackaged ? process.resourcesPath : app.getAppPath();
  return path.join(base, ...segments);
}

function resolvePetPosition(position: PetPosition | null): PetPosition {
  const displays = screen.getAllDisplays();
  const visibleMargin = 48;

  if (position) {
    const isVisible = displays.some(({ workArea }) => {
      const right = position.x + petWindowSize.width;
      const bottom = position.y + petWindowSize.height;
      return (
        right > workArea.x + visibleMargin &&
        bottom > workArea.y + visibleMargin &&
        position.x < workArea.x + workArea.width - visibleMargin &&
        position.y < workArea.y + workArea.height - visibleMargin
      );
    });
    if (isVisible) return position;
  }

  const area = screen.getPrimaryDisplay().workArea;
  return {
    x: area.x + area.width - petWindowSize.width - 56,
    y: area.y + area.height - petWindowSize.height - 56
  };
}

function createMainWindow(): void {
  const data = readData();
  const position = resolvePetPosition(data.settings.petPosition);

  mainWindow = new BrowserWindow({
    width: petWindowSize.width,
    height: petWindowSize.height,
    x: position.x,
    y: position.y,
    frame: false,
    transparent: true,
    resizable: false,
    hasShadow: false,
    skipTaskbar: true,
    alwaysOnTop: data.settings.alwaysOnTop,
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.setOpacity(data.settings.opacity);
  mainWindow.loadURL(getRendererUrl("/"));
  mainWindow.on("blur", () => {
    if (petClickThrough) mainWindow?.setIgnoreMouseEvents(true, { forward: true });
  });

  mainWindow.on("moved", () => {
    const bounds = mainWindow?.getBounds();
    if (!bounds) return;
    const next = readData();
    next.settings.petPosition = { x: bounds.x, y: bounds.y };
    writeData(next);
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function sendGentleReminder(type: ReminderType, message: string): void {
  if (readData().settings.quietMode) return;
  mainWindow?.webContents.send("reminder:gentle", { type, message });
  if (Notification.isSupported()) {
    new Notification({ title: "一二布布", body: message, silent: true }).show();
  }
}

function clearPetMotion(): void {
  if (!petMotionTimer) return;
  clearInterval(petMotionTimer);
  petMotionTimer = null;
}

function sendTimerComplete(event: TimerCompleteEvent): void {
  mainWindow?.webContents.send("timer:complete", event);
  panelWindow?.webContents.send("timer:complete", event);
  timerWidgetWindow?.webContents.send("timer:complete", event);
}

function clampPetBounds(bounds: Electron.Rectangle, x: number, y: number): PetPosition {
  const area = screen.getDisplayMatching(bounds).workArea;
  return {
    x: Math.max(area.x, Math.min(area.x + area.width - bounds.width, Math.round(x))),
    y: Math.max(area.y, Math.min(area.y + area.height - bounds.height, Math.round(y)))
  };
}

function settlePetBounds(bounds: Electron.Rectangle, x: number, y: number): PetPosition {
  const clamped = clampPetBounds(bounds, x, y);
  if (!readData().settings.edgeSnapEnabled) return clamped;

  const area = screen.getDisplayMatching(bounds).workArea;
  const left = area.x;
  const right = area.x + area.width - bounds.width;
  const top = area.y;
  const bottom = area.y + area.height - bounds.height;

  return {
    x:
      Math.abs(clamped.x - left) <= edgeSnapThreshold
        ? left
        : Math.abs(clamped.x - right) <= edgeSnapThreshold
          ? right
          : clamped.x,
    y:
      Math.abs(clamped.y - top) <= edgeSnapThreshold
        ? top
        : Math.abs(clamped.y - bottom) <= edgeSnapThreshold
          ? bottom
          : clamped.y
  };
}

function settleAndPersistPet(bounds: Electron.Rectangle): void {
  if (!mainWindow) return;
  const next = settlePetBounds(bounds, bounds.x, bounds.y);
  mainWindow.setBounds({ ...bounds, ...next }, true);
  persistPetPosition(next.x, next.y);
}

function persistPetPosition(x: number, y: number): void {
  const next = readData();
  next.settings.petPosition = { x, y };
  writeData(next);
}

function shortcutNameFromPath(appPath: string): string {
  return path.basename(appPath).replace(/\.(exe|bat|cmd|lnk)$/i, "") || "快捷启动";
}

async function createShortcutPickResult(appPath: string): Promise<ShortcutPickResult> {
  try {
    const icon = await app.getFileIcon(appPath, { size: "normal" });
    return {
      appPath,
      name: shortcutNameFromPath(appPath),
      iconDataUrl: icon.isEmpty() ? undefined : icon.toDataURL()
    };
  } catch {
    return {
      appPath,
      name: shortcutNameFromPath(appPath)
    };
  }
}

function movePetBy(dx: number, dy: number, persist = true): void {
  setPetClickThrough(false);
  clearPetMotion();
  const bounds = mainWindow?.getBounds();
  if (!bounds || !mainWindow) return;
  const { x, y } = clampPetBounds(bounds, bounds.x + dx, bounds.y + dy);
  mainWindow.setBounds({ ...bounds, x, y }, true);
  if (persist) persistPetPosition(x, y);
}

function easeInOutCubic(value: number): number {
  return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function randomPetTarget(bounds: Electron.Rectangle): PetPosition {
  const area = screen.getDisplayMatching(bounds).workArea;
  const maxX = Math.max(area.x, area.x + area.width - bounds.width);
  const maxY = Math.max(area.y, area.y + area.height - bounds.height);
  const minDistance = 64;
  const maxDistance = Math.min(180, Math.max(96, Math.min(area.width, area.height) * 0.16));

  let target = { x: bounds.x, y: bounds.y };
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const angle = Math.random() * Math.PI * 2;
    const distance = minDistance + Math.random() * (maxDistance - minDistance);
    const x = bounds.x + Math.cos(angle) * distance;
    const y = bounds.y + Math.sin(angle) * distance * 0.55;
    target = clampPetBounds(bounds, x, y);
    if (Math.hypot(target.x - bounds.x, target.y - bounds.y) >= minDistance * 0.72) break;
  }

  return target;
}

function roamPet(pace = 420): void {
  setPetClickThrough(false);
  clearPetMotion();
  if (!mainWindow) return;

  const startBounds = mainWindow.getBounds();
  const target = randomPetTarget(startBounds);
  const dx = target.x - startBounds.x;
  const dy = target.y - startBounds.y;
  const distance = Math.hypot(dx, dy);

  if (distance < 8) {
    persistPetPosition(startBounds.x, startBounds.y);
    return;
  }

  const pixelsPerSecond = Math.max(180, Math.min(760, Number.isFinite(pace) ? pace : 420));
  const durationMs = Math.max(900, Math.min(4400, (distance / pixelsPerSecond) * 1000));
  const startedAt = Date.now();

  petMotionTimer = setInterval(() => {
    if (!mainWindow) {
      clearPetMotion();
      return;
    }

    const progress = Math.min(1, (Date.now() - startedAt) / durationMs);
    const eased = easeInOutCubic(progress);
    const next = clampPetBounds(startBounds, startBounds.x + dx * eased, startBounds.y + dy * eased);
    mainWindow.setBounds({ ...startBounds, x: next.x, y: next.y }, true);

    if (progress >= 1) {
      clearPetMotion();
      const finalBounds = mainWindow?.getBounds();
      if (finalBounds) settleAndPersistPet(finalBounds);
    }
  }, 16);
}

function throwPet(velocityX: number, velocityY: number): void {
  setPetClickThrough(false);
  clearPetMotion();
  if (!mainWindow) return;

  let vx = Math.max(-1.8, Math.min(1.8, Number.isFinite(velocityX) ? velocityX : 0));
  let vy = Math.max(-1.8, Math.min(1.8, Number.isFinite(velocityY) ? velocityY : 0));

  if (Math.hypot(vx, vy) < 0.08) {
    const bounds = mainWindow.getBounds();
    settleAndPersistPet(bounds);
    return;
  }

  let lastTick = Date.now();
  let elapsed = 0;
  petMotionTimer = setInterval(() => {
    if (!mainWindow) {
      clearPetMotion();
      return;
    }

    const now = Date.now();
    const dt = Math.min(32, now - lastTick);
    lastTick = now;
    elapsed += dt;

    const bounds = mainWindow.getBounds();
    const next = clampPetBounds(bounds, bounds.x + vx * dt, bounds.y + vy * dt);
    const hitX = next.x !== Math.round(bounds.x + vx * dt);
    const hitY = next.y !== Math.round(bounds.y + vy * dt);

    if (hitX) vx *= -0.38;
    if (hitY) vy *= -0.32;

    mainWindow.setBounds({ ...bounds, x: next.x, y: next.y }, true);
    vx *= 0.9;
    vy *= 0.9;

    if (elapsed > 720 || Math.hypot(vx, vy) < 0.035) {
      clearPetMotion();
      const finalBounds = mainWindow?.getBounds();
      if (finalBounds) settleAndPersistPet(finalBounds);
    }
  }, 16);
}

function setPetClickThrough(value: boolean): void {
  if (!mainWindow || petClickThrough === value) return;
  petClickThrough = value;
  mainWindow.setIgnoreMouseEvents(value, value ? { forward: true } : undefined);
}

function broadcastTimer(): void {
  const timer = readData().timer;
  mainWindow?.webContents.send("timer:updated", timer);
  panelWindow?.webContents.send("timer:updated", timer);
  timerWidgetWindow?.webContents.send("timer:updated", timer);
  if (timer.running || (timerWidgetWindow && !timerWidgetWindow.isDestroyed())) syncPetMoodFromWidgets();
}

function syncPetMoodFromWidgets(): void {
  const timer = readData().timer;
  const hasTimerWidget = Boolean(timerWidgetWindow && !timerWidgetWindow.isDestroyed());
  if (timer.running || hasTimerWidget) {
    mainWindow?.webContents.send("pet:mood", {
      mood: timer.mode === "focus" ? "focus" : "recharge",
      bubble: timer.running ? "" : "番茄钟贴在桌面上，一二陪你守着。",
      durationMs: 0
    } satisfies PetMoodEvent);
    return;
  }

  if (noteWidgetWindows.size > 0) {
    mainWindow?.webContents.send("pet:mood", {
      mood: "note",
      bubble: "便签贴在桌面上，一二帮你看着。",
      durationMs: 0
    } satisfies PetMoodEvent);
    return;
  }

  mainWindow?.webContents.send("pet:mood", { mood: "idle", bubble: "", durationMs: 1_200 } satisfies PetMoodEvent);
}

function startTimerScheduler(): void {
  if (timerTimer) return;

  timerTimer = setInterval(() => {
    const data = readData();
    if (!data.timer.running) return;

    const remainingSeconds = Math.max(0, data.timer.remainingSeconds - 1);
    if (remainingSeconds === 0) {
      const completedMode = data.timer.mode;
      data.timer = {
        mode: completedMode === "focus" ? "break" : "focus",
        remainingSeconds: completedMode === "focus" ? 5 * 60 : 25 * 60,
        running: false
      };
      writeData(data);
      broadcastTimer();
      sendTimerComplete({
        completedMode,
        nextMode: data.timer.mode,
        message: completedMode === "focus" ? "专注完成啦，休息一下吧。" : "休息结束，慢慢回来吧。"
      });
      sendGentleReminder("rest", completedMode === "focus" ? "专注完成啦，休息一下吧。" : "休息结束，慢慢回来吧。");
      return;
    }

    data.timer = { ...data.timer, remainingSeconds };
    writeData(data);
    broadcastTimer();
  }, 1_000);
}

function startReminderScheduler(): void {
  if (reminderTimer) return;

  reminderTimer = setInterval(() => {
    const data = readData();
    const now = Date.now();
    let changed = false;

    const reminders = data.reminders.map((rule) => {
      if (!rule.enabled) return rule;

      if (!rule.lastTriggeredAt) {
        changed = true;
        return { ...rule, lastTriggeredAt: new Date(now).toISOString() };
      }

      const last = new Date(rule.lastTriggeredAt).getTime();
      const intervalMinutes = Math.min(240, Math.max(5, Number.isFinite(rule.intervalMinutes) ? rule.intervalMinutes : 45));
      if (now - last < intervalMinutes * 60_000) return rule;

      const message = reminderMessages[rule.type];
      sendGentleReminder(rule.type, message);
      changed = true;
      return { ...rule, lastTriggeredAt: new Date(now).toISOString() };
    });

    if (changed) writeData({ ...data, reminders });
  }, 30_000);
}

function createPanelWindow(panel: string): void {
  if (panelWindow) {
    panelWindow.close();
    panelWindow = null;
  }

  const mainBounds = mainWindow?.getBounds();
  const x = mainBounds ? Math.max(20, mainBounds.x - 420) : undefined;
  const y = mainBounds ? Math.max(20, mainBounds.y - 80) : undefined;

  panelWindow = new BrowserWindow({
    width: 410,
    height: 560,
    x,
    y,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: readData().settings.alwaysOnTop,
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  panelWindow.loadURL(getRendererUrl(`/panel/${panel}`));
  panelWindow.on("closed", () => {
    panelWindow = null;
  });
}

function createNoteWidgetWindow(noteId: string): void {
  const existing = noteWidgetWindows.get(noteId);
  if (existing && !existing.isDestroyed()) {
    existing.show();
    existing.focus();
    syncPetMoodFromWidgets();
    return;
  }

  const mainBounds = mainWindow?.getBounds();
  const offset = noteWidgetWindows.size * 24;
  const x = mainBounds ? Math.max(20, mainBounds.x - 292 - offset) : undefined;
  const y = mainBounds ? Math.max(20, mainBounds.y + 30 + offset) : undefined;

  const widget = new BrowserWindow({
    width: 292,
    height: 230,
    x,
    y,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  noteWidgetWindows.set(noteId, widget);
  widget.loadURL(getRendererUrl(`/widget/note/${encodeURIComponent(noteId)}`));
  widget.on("closed", () => {
    noteWidgetWindows.delete(noteId);
    syncPetMoodFromWidgets();
  });
  syncPetMoodFromWidgets();
}

function closeNoteWidgetWindow(noteId: string): void {
  const widget = noteWidgetWindows.get(noteId);
  if (!widget || widget.isDestroyed()) {
    noteWidgetWindows.delete(noteId);
    syncPetMoodFromWidgets();
    return;
  }
  widget.close();
}

function createTimerWidgetWindow(): void {
  if (timerWidgetWindow && !timerWidgetWindow.isDestroyed()) {
    timerWidgetWindow.show();
    timerWidgetWindow.focus();
    syncPetMoodFromWidgets();
    return;
  }

  const mainBounds = mainWindow?.getBounds();
  const x = mainBounds ? Math.max(20, mainBounds.x - 252) : undefined;
  const y = mainBounds ? Math.max(20, mainBounds.y + 82) : undefined;

  timerWidgetWindow = new BrowserWindow({
    width: 252,
    height: 170,
    x,
    y,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  timerWidgetWindow.loadURL(getRendererUrl("/widget/timer"));
  timerWidgetWindow.on("closed", () => {
    timerWidgetWindow = null;
    syncPetMoodFromWidgets();
  });
  syncPetMoodFromWidgets();
}

function closeTimerWidgetWindow(): void {
  if (!timerWidgetWindow || timerWidgetWindow.isDestroyed()) {
    timerWidgetWindow = null;
    syncPetMoodFromWidgets();
    return;
  }
  timerWidgetWindow.close();
}

function refreshTray(): void {
  const data = readData();
  const icon = nativeImage.createFromPath(getResourcePath("assets", "icons", "icon.png"));
  tray ??= new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
  tray.setToolTip("一二布布桌宠");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: mainWindow?.isVisible() ? "隐藏一二" : "显示一二",
        click: () => {
          if (!mainWindow) return;
          if (mainWindow.isVisible()) mainWindow.hide();
          else mainWindow.show();
          refreshTray();
        }
      },
      {
        label: data.settings.alwaysOnTop ? "取消置顶" : "置顶一二",
        click: () => {
          const next = readData();
          next.settings.alwaysOnTop = !next.settings.alwaysOnTop;
          mainWindow?.setAlwaysOnTop(next.settings.alwaysOnTop);
          panelWindow?.setAlwaysOnTop(next.settings.alwaysOnTop);
          writeData(next);
          refreshTray();
        }
      },
      {
        label: data.settings.quietMode ? "关闭安静模式" : "开启安静模式",
        click: () => {
          const next = readData();
          next.settings.quietMode = !next.settings.quietMode;
          writeData(next);
          refreshTray();
        }
      },
      { label: "设置", click: () => createPanelWindow("settings") },
      { type: "separator" },
      { label: "退出", click: () => app.quit() }
    ])
  );
}

function setMainWindowVisibility(visible: boolean): void {
  if (!mainWindow) return;
  if (visible) mainWindow.show();
  else mainWindow.hide();
  refreshTray();
}

function toggleAlwaysOnTop(): void {
  const next = readData();
  next.settings.alwaysOnTop = !next.settings.alwaysOnTop;
  mainWindow?.setAlwaysOnTop(next.settings.alwaysOnTop);
  panelWindow?.setAlwaysOnTop(next.settings.alwaysOnTop);
  writeData(next);
  refreshTray();
}

function toggleQuietMode(): void {
  const next = readData();
  next.settings.quietMode = !next.settings.quietMode;
  writeData(next);
  refreshTray();
}

function toggleEdgeSnap(): void {
  const next = readData();
  next.settings.edgeSnapEnabled = !next.settings.edgeSnapEnabled;
  writeData(next);
  refreshTray();
}

function showPetContextMenu(): void {
  const data = readData();
  const menu = Menu.buildFromTemplate([
    { label: "便签", click: () => createPanelWindow("notes") },
    { label: "番茄钟", click: () => createPanelWindow("timer") },
    { label: "提醒", click: () => createPanelWindow("reminders") },
    { label: "快捷启动", click: () => createPanelWindow("shortcuts") },
    { type: "separator" },
    { label: data.settings.quietMode ? "关闭安静模式" : "开启安静模式", click: toggleQuietMode },
    { label: data.settings.alwaysOnTop ? "取消置顶" : "窗口置顶", click: toggleAlwaysOnTop },
    { label: data.settings.edgeSnapEnabled ? "关闭边缘吸附" : "开启边缘吸附", click: toggleEdgeSnap },
    { type: "separator" },
    { label: "设置", click: () => createPanelWindow("settings") },
    { label: mainWindow?.isVisible() ? "隐藏一二" : "显示一二", click: () => setMainWindowVisibility(!mainWindow?.isVisible()) },
    { label: "退出", click: () => app.quit() }
  ]);

  menu.popup({ window: mainWindow ?? undefined });
}

function updateSettings(partial: Partial<AppSettings>): AppData {
  const next = readData();
  next.settings = { ...next.settings, ...partial };
  writeData(next);
  refreshTray();
  return next;
}

function saveAppData(data: AppData): AppData {
  const reminders = data.reminders.map((rule) => ({
    ...rule,
    intervalMinutes: Math.min(240, Math.max(5, Number.isFinite(rule.intervalMinutes) ? Math.round(rule.intervalMinutes) : 45))
  }));
  return writeData({ ...data, reminders });
}

app.whenReady().then(() => {
  createMainWindow();
  refreshTray();
  startReminderScheduler();
  startTimerScheduler();

  ipcMain.handle("data:get", () => readData());
  ipcMain.handle("data:save", (_event, data: AppData) => saveAppData(data));
  ipcMain.handle("settings:update", (_event, settings: Partial<AppSettings>) => updateSettings(settings));
  ipcMain.handle("window:always-on-top", (_event, value: boolean) => {
    mainWindow?.setAlwaysOnTop(value);
    panelWindow?.setAlwaysOnTop(value);
    return updateSettings({ alwaysOnTop: value });
  });
  ipcMain.handle("window:opacity", (_event, value: number) => {
    const opacity = Math.min(1, Math.max(0.35, value));
    mainWindow?.setOpacity(opacity);
    return updateSettings({ opacity });
  });
  ipcMain.handle("window:save-position", () => {
    const bounds = mainWindow?.getBounds();
    if (!bounds) return readData();
    const next = settlePetBounds(bounds, bounds.x, bounds.y);
    mainWindow?.setBounds({ ...bounds, ...next }, true);
    return updateSettings({ petPosition: next });
  });
  ipcMain.handle("window:nudge", (_event, dx: number, dy: number) => {
    movePetBy(dx, dy);
  });
  ipcMain.handle("window:roam", (_event, pace?: number) => roamPet(pace));
  ipcMain.handle("window:move-by", (_event, dx: number, dy: number) => movePetBy(dx, dy, false));
  ipcMain.handle("window:throw", (_event, velocityX: number, velocityY: number) => throwPet(velocityX, velocityY));
  ipcMain.handle("window:click-through", (_event, value: boolean) => setPetClickThrough(value));
  ipcMain.handle("pet:mood", (_event, payload: PetMoodEvent) => {
    mainWindow?.webContents.send("pet:mood", payload);
    if (payload.mood === "idle") setTimeout(syncPetMoodFromWidgets, 80);
  });
  ipcMain.handle("pet:context-menu", () => showPetContextMenu());
  ipcMain.handle("panel:open", (_event, panel: string) => createPanelWindow(panel));
  ipcMain.handle("panel:close", () => panelWindow?.close());
  ipcMain.handle("widget:note:open", (_event, noteId: string) => createNoteWidgetWindow(noteId));
  ipcMain.handle("widget:note:close", (_event, noteId: string) => closeNoteWidgetWindow(noteId));
  ipcMain.handle("widget:timer:open", () => createTimerWidgetWindow());
  ipcMain.handle("widget:timer:close", () => closeTimerWidgetWindow());
  ipcMain.handle("app:quit", () => app.quit());
  ipcMain.handle("shortcut:pick", async () => {
    const result = await dialog.showOpenDialog({
      title: "选择要快捷启动的程序",
      properties: ["openFile"],
      filters: [
        { name: "应用程序", extensions: ["exe", "bat", "cmd", "lnk"] },
        { name: "所有文件", extensions: ["*"] }
      ]
    });
    return result.canceled ? null : createShortcutPickResult(result.filePaths[0]);
  });
  ipcMain.handle("shortcut:launch", async (_event, appPath: string) => {
    const error = await shell.openPath(appPath);
    return error ? { ok: false, error } : { ok: true };
  });
  ipcMain.handle("startup:set", (_event, value: boolean) => {
    app.setLoginItemSettings({ openAtLogin: value });
    return updateSettings({ launchAtStartup: value });
  });
  ipcMain.handle("notify", (_event, message: string) => {
    if (Notification.isSupported()) {
      new Notification({ title: "一二布布", body: message, silent: true }).show();
    }
  });
  ipcMain.handle("updates:check", async () => {
    await shell.openExternal("https://github.com/xiaotianwa/12bubu/releases");
    return { ok: true, message: "已打开 GitHub Releases，后续发布版会从这里下载。" };
  });
});

app.on("window-all-closed", () => {
  // Keep the tray process alive unless the user explicitly quits.
});

app.on("before-quit", () => {
  if (reminderTimer) clearInterval(reminderTimer);
  if (timerTimer) clearInterval(timerTimer);
  clearPetMotion();
  for (const widget of noteWidgetWindows.values()) widget.destroy();
  noteWidgetWindows.clear();
  timerWidgetWindow?.destroy();
  panelWindow?.destroy();
  mainWindow?.destroy();
});
