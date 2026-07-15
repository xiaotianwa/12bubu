import { app } from "electron";
import fs from "node:fs";
import path from "node:path";
import { AppData, defaultData } from "./types.js";

const fileName = "bubu-data.json";

function dataPath(): string {
  return path.join(app.getPath("userData"), fileName);
}

function mergeData(value: Partial<AppData>): AppData {
  return {
    ...defaultData,
    ...value,
    settings: { ...defaultData.settings, ...value.settings },
    notes: Array.isArray(value.notes) ? value.notes : defaultData.notes,
    reminders: Array.isArray(value.reminders) ? value.reminders : defaultData.reminders,
    shortcuts: Array.isArray(value.shortcuts) ? value.shortcuts : defaultData.shortcuts,
    timer: { ...defaultData.timer, ...value.timer }
  };
}

export function readData(): AppData {
  const target = dataPath();
  if (!fs.existsSync(target)) {
    writeData(defaultData);
    return defaultData;
  }

  try {
    const raw = fs.readFileSync(target, "utf8");
    return mergeData(JSON.parse(raw) as Partial<AppData>);
  } catch {
    const backup = `${target}.broken-${Date.now()}`;
    fs.copyFileSync(target, backup);
    writeData(defaultData);
    return defaultData;
  }
}

export function writeData(data: AppData): AppData {
  const target = dataPath();
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(data, null, 2), "utf8");
  return data;
}

