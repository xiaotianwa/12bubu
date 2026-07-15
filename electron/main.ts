import { app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, Notification, screen, shell, Tray } from "electron";
import path from "node:path";
import { AppData, AppSettings, PetPosition, ReminderType } from "./types.js";
import { readData, writeData } from "./store.js";

const isDev = process.env.VITE_DEV_SERVER_URL || !app.isPackaged;
const devUrl = process.env.VITE_DEV_SERVER_URL ?? "http://127.0.0.1:5173";
const petWindowSize = { width: 360, height: 360 };
const edgeSnapThreshold = 48;
const reminderMessages: Record<ReminderType, string> = {
  water: "该喝点水啦，布布把杯子递到桌边。",
  rest: "休息一下眼睛吧，看看远处，布布在旁边等你。"
};

let mainWindow: BrowserWindow | null = null;
let panelWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let reminderTimer: NodeJS.Timeout | null = null;
let timerTimer: NodeJS.Timeout | null = null;
let petMotionTimer: NodeJS.Timeout | null = null;

function getPreloadPath(): string {
  return path.join(__dirname, "preload.js");
}

function getRendererUrl(route = "/"): string {
  if (isDev) {
    return `${devUrl}${route}`;
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

function movePetBy(dx: number, dy: number, persist = true): void {
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
  const minDistance = Math.min(280, Math.max(120, Math.min(area.width, area.height) * 0.22));

  let target = { x: bounds.x, y: bounds.y };
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const x = area.x + Math.random() * Math.max(1, maxX - area.x);
    const y = area.y + Math.random() * Math.max(1, maxY - area.y);
    target = clampPetBounds(bounds, x, y);
    if (Math.hypot(target.x - bounds.x, target.y - bounds.y) >= minDistance) break;
  }

  return target;
}

function roamPet(pace = 420): void {
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

function broadcastTimer(): void {
  const timer = readData().timer;
  mainWindow?.webContents.send("timer:updated", timer);
  panelWindow?.webContents.send("timer:updated", timer);
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

function refreshTray(): void {
  const data = readData();
  const icon = nativeImage.createFromPath(getResourcePath("assets", "icons", "icon.png"));
  tray ??= new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
  tray.setToolTip("一二布布桌宠");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: mainWindow?.isVisible() ? "隐藏布布" : "显示布布",
        click: () => {
          if (!mainWindow) return;
          if (mainWindow.isVisible()) mainWindow.hide();
          else mainWindow.show();
          refreshTray();
        }
      },
      {
        label: data.settings.alwaysOnTop ? "取消置顶" : "置顶布布",
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
  ipcMain.handle("panel:open", (_event, panel: string) => createPanelWindow(panel));
  ipcMain.handle("panel:close", () => panelWindow?.close());
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
    return result.canceled ? null : result.filePaths[0];
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
});

app.on("window-all-closed", () => {
  // Keep the tray process alive unless the user explicitly quits.
});

app.on("before-quit", () => {
  if (reminderTimer) clearInterval(reminderTimer);
  if (timerTimer) clearInterval(timerTimer);
  clearPetMotion();
  panelWindow?.destroy();
  mainWindow?.destroy();
});
