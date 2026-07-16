import { useEffect, useRef, useState } from "react";
import type { PetMood } from "../types";

const moodClass: Record<PetMood, string> = {
  idle: "pet-idle",
  blink: "pet-blink",
  walk: "pet-walk",
  sleep: "pet-sleep",
  drag: "pet-drag",
  happy: "pet-happy",
  note: "pet-note",
  focus: "pet-focus",
  reminder: "pet-reminder",
  shortcut: "pet-shortcut",
  settings: "pet-settings",
  feed: "pet-feed",
  buddy: "pet-buddy",
  angry: "pet-angry",
  shy: "pet-shy",
  bite: "pet-bite",
  dance: "pet-dance",
  eyeRoll: "pet-eye-roll",
  comfySleep: "pet-comfy-sleep",
  walkDog: "pet-walk-dog",
  ride: "pet-ride",
  spin: "pet-spin",
  silly: "pet-silly",
  work: "pet-work",
  slack: "pet-slack",
  recharge: "pet-recharge",
  patrol: "pet-patrol",
  celebrate: "pet-celebrate"
};

interface PetSpriteProps {
  mood: PetMood;
  compact?: boolean;
}

interface FrameAnimation {
  frames: string[];
  alt: string;
  frameMs: number;
  assetClass?: string;
}

interface FrameManifestAnimation {
  frames: string[];
  frameMs: number;
  aliasOf?: string;
}

interface FrameManifest {
  animations: Partial<Record<PetMood, FrameManifestAnimation>>;
}

function frames(dir: string, prefix: string, count: number, ext = "png") {
  return Array.from(
    { length: count },
    (_, index) => `pet/frames/${dir}/${prefix}_${index.toString().padStart(3, "0")}.${ext}`
  );
}

function fallbackAnimation(
  dir: string,
  prefix: string,
  count: number,
  frameMs: number,
  alt: string,
  assetClass = ""
): FrameAnimation {
  return {
    alt,
    frameMs,
    assetClass: `asset-frame-sequence ${assetClass}`.trim(),
    frames: frames(dir, prefix, count)
  };
}

const fallbackAnimations: Partial<Record<PetMood, FrameAnimation>> = {
  idle: fallbackAnimation("softIdle", "softIdle", 18, 160, "一二待机"),
  blink: fallbackAnimation("blink", "blink", 18, 160, "一二眨眼待机"),
  buddy: fallbackAnimation("buddy", "buddy", 8, 130, "一二和布布贴贴"),
  work: fallbackAnimation("work", "work", 2, 360, "一二专注工作"),
  slack: fallbackAnimation("slack", "slack", 6, 180, "一二放空休息"),
  note: fallbackAnimation("note", "note", 20, 140, "一二记录便签"),
  focus: fallbackAnimation("focus", "focus", 2, 360, "一二看书专注"),
  reminder: fallbackAnimation("reminder", "reminder", 6, 140, "一二举牌提醒"),
  settings: fallbackAnimation("settings", "settings", 6, 150, "一二整理设置"),
  drag: fallbackAnimation("walkDog", "walkDog", 16, 100, "一二移动中"),
  happy: fallbackAnimation("happy", "happy", 4, 76, "一二开心"),
  dance: fallbackAnimation("dance", "dance", 16, 76, "一二和布布跳舞"),
  celebrate: fallbackAnimation("celebrate", "celebrate", 28, 108, "一二和布布庆祝"),
  bite: fallbackAnimation("bite", "bite", 17, 129, "一二咬布布"),
  feed: fallbackAnimation("feed", "feed", 26, 110, "一二吃东西"),
  eyeRoll: fallbackAnimation("eyeRoll", "eyeRoll", 3, 60, "一二白眼"),
  angry: fallbackAnimation("angry", "angry", 2, 160, "一二生气"),
  sleep: fallbackAnimation("sleep", "sleep", 6, 178, "一二睡觉"),
  comfySleep: fallbackAnimation("comfySleep", "comfySleep", 6, 178, "一二舒服睡觉"),
  recharge: fallbackAnimation("recharge", "recharge", 6, 178, "一二休息充电"),
  walk: fallbackAnimation("walk", "walk", 8, 120, "一二走路"),
  walkDog: fallbackAnimation("walkDog", "walkDog", 16, 100, "一二遛布布"),
  patrol: fallbackAnimation("patrol", "patrol", 8, 120, "一二巡逻"),
  ride: fallbackAnimation("ride", "ride", 4, 98, "一二开车"),
  shortcut: fallbackAnimation("shortcut", "shortcut", 4, 140, "一二快捷启动"),
  spin: fallbackAnimation("spin", "spin", 28, 108, "一二和布布转圈"),
  silly: fallbackAnimation("silly", "silly", 3, 100, "一二做鬼脸"),
  shy: fallbackAnimation("shy", "shy", 24, 120, "一二害羞")
};

const moodAlt: Partial<Record<PetMood, string>> = {
  idle: "一二待机",
  blink: "一二眨眼待机",
  buddy: "一二和布布贴贴",
  work: "一二专注工作",
  slack: "一二放空休息",
  note: "一二记录便签",
  focus: "一二看书专注",
  reminder: "一二举牌提醒",
  settings: "一二整理设置",
  drag: "一二移动中",
  happy: "一二开心",
  dance: "一二和布布跳舞",
  celebrate: "一二和布布庆祝",
  bite: "一二咬布布",
  feed: "一二吃东西",
  eyeRoll: "一二白眼",
  angry: "一二生气",
  sleep: "一二睡觉",
  comfySleep: "一二舒服睡觉",
  recharge: "一二休息充电",
  walk: "一二走路",
  walkDog: "一二遛布布",
  patrol: "一二巡逻",
  ride: "一二开车",
  shortcut: "一二快捷启动",
  spin: "一二和布布转圈",
  silly: "一二做鬼脸",
  shy: "一二害羞"
};

let manifestCache: FrameManifest | null = null;
let manifestPromise: Promise<FrameManifest | null> | null = null;

async function loadManifest() {
  if (manifestCache) return manifestCache;
  manifestPromise ??= fetch("pet/frames/manifest.json", { cache: "force-cache" })
    .then((response) => (response.ok ? response.json() : null))
    .then((manifest: FrameManifest | null) => {
      manifestCache = manifest;
      return manifest;
    })
    .catch(() => null);

  return manifestPromise;
}

function fromManifest(mood: PetMood, manifest: FrameManifest | null): FrameAnimation | null {
  const item = manifest?.animations[mood];
  if (!item?.frames?.length) return null;

  return {
    alt: moodAlt[mood] ?? "一二布布",
    frameMs: item.frameMs,
    assetClass: "asset-frame-sequence",
    frames: item.frames
  };
}

function FrameSequenceAsset({ animation, assetKey }: { animation: FrameAnimation; assetKey: string }) {
  const [frameIndex, setFrameIndex] = useState(0);
  const [usePngFallback, setUsePngFallback] = useState(false);

  useEffect(() => {
    setFrameIndex(0);
    setUsePngFallback(false);
    const timer = window.setInterval(() => {
      setFrameIndex((value) => (value + 1) % animation.frames.length);
    }, animation.frameMs);
    return () => window.clearInterval(timer);
  }, [animation.frameMs, animation.frames.length, assetKey]);

  const src = animation.frames[frameIndex % animation.frames.length];
  const fallbackSrc = src.endsWith(".webp") ? src.replace(/\.webp$/u, ".png") : src;

  return (
    <span className="pet-asset-frame">
      <img
        className="pet-official-asset pet-frame-asset"
        src={usePngFallback ? fallbackSrc : src}
        alt={animation.alt}
        draggable={false}
        onError={() => {
          if (!usePngFallback && fallbackSrc !== src) setUsePngFallback(true);
        }}
      />
    </span>
  );
}

export function PetSprite({ mood, compact = false }: PetSpriteProps) {
  const [manifest, setManifest] = useState<FrameManifest | null>(manifestCache);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    void loadManifest().then((value) => {
      if (mountedRef.current) setManifest(value);
    });
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const animation = fromManifest(mood, manifest) ?? fallbackAnimations[mood] ?? fallbackAnimations.idle;
  const assetClass = animation?.assetClass ?? "asset-frame-sequence";

  return (
    <span
      className={`pet-sprite pet-official-wrap ${assetClass} ${moodClass[mood]} ${compact ? "is-compact" : ""}`}
      role="img"
      aria-label={animation?.alt ?? "一二布布"}
    >
      <span className="pet-ground-shadow" aria-hidden="true" />
      {animation ? <FrameSequenceAsset animation={animation} assetKey={mood} /> : null}
    </span>
  );
}
