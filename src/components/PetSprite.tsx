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
  idle: fallbackAnimation("idle", "idle", 28, 80, "一二和布布待机", "asset-home"),
  blink: fallbackAnimation("idle", "idle", 28, 80, "一二和布布眨眼", "asset-home"),
  buddy: fallbackAnimation("idle", "idle", 28, 80, "一二和布布贴贴", "asset-home"),
  work: fallbackAnimation("idle", "idle", 28, 80, "一二和布布陪你工作", "asset-home"),
  slack: fallbackAnimation("idle", "idle", 28, 80, "一二和布布安静待机", "asset-home"),
  note: fallbackAnimation("idle", "idle", 28, 80, "一二和布布便签状态", "asset-home"),
  focus: fallbackAnimation("idle", "idle", 28, 80, "一二和布布专注状态", "asset-home"),
  reminder: fallbackAnimation("idle", "idle", 28, 80, "一二和布布提醒状态", "asset-home"),
  settings: fallbackAnimation("idle", "idle", 28, 80, "一二和布布设置状态", "asset-home"),
  drag: fallbackAnimation("idle", "idle", 28, 80, "一二和布布移动中", "asset-home"),
  happy: fallbackAnimation("happy", "happy", 16, 76, "一二和布布开心跳舞"),
  dance: fallbackAnimation("happy", "happy", 16, 76, "一二和布布跳舞"),
  celebrate: fallbackAnimation("happy", "happy", 16, 76, "一二和布布庆祝"),
  bite: fallbackAnimation("bite", "bite", 17, 129, "一二咬布布互动"),
  feed: fallbackAnimation("bite", "bite", 17, 129, "一二和布布互动"),
  eyeRoll: fallbackAnimation("eyeRoll", "eyeRoll", 3, 60, "一二白眼表情"),
  angry: fallbackAnimation("eyeRoll", "eyeRoll", 3, 60, "一二有点不开心"),
  sleep: fallbackAnimation("sleep", "sleep", 5, 178, "一二舒服睡觉"),
  comfySleep: fallbackAnimation("sleep", "sleep", 5, 178, "一二舒服睡觉"),
  recharge: fallbackAnimation("sleep", "sleep", 5, 178, "一二和布布充电休息"),
  walk: fallbackAnimation("walkDog", "walkDog", 16, 100, "一二遛布布"),
  walkDog: fallbackAnimation("walkDog", "walkDog", 16, 100, "一二遛布布"),
  patrol: fallbackAnimation("walkDog", "walkDog", 16, 100, "一二和布布巡逻"),
  ride: fallbackAnimation("ride", "ride", 5, 98, "一二骑着布布车"),
  shortcut: fallbackAnimation("ride", "ride", 5, 98, "一二和布布启动程序"),
  spin: fallbackAnimation("spin", "spin", 8, 108, "布布和一二转圈", "asset-tiny-source"),
  silly: fallbackAnimation("silly", "silly", 3, 100, "一二和布布鬼脸"),
  shy: fallbackAnimation("silly", "silly", 3, 100, "一二和布布鬼脸")
};

const moodAlt: Partial<Record<PetMood, string>> = {
  idle: "一二和布布待机",
  blink: "一二和布布眨眼",
  buddy: "一二和布布贴贴",
  work: "一二和布布陪你工作",
  slack: "一二和布布安静待机",
  note: "一二和布布便签状态",
  focus: "一二和布布专注状态",
  reminder: "一二和布布提醒状态",
  settings: "一二和布布设置状态",
  drag: "一二和布布移动中",
  happy: "一二和布布开心",
  dance: "一二和布布跳舞",
  celebrate: "一二和布布庆祝",
  bite: "一二咬布布互动",
  feed: "一二和布布互动",
  eyeRoll: "一二白眼表情",
  angry: "一二有点不开心",
  sleep: "一二舒服睡觉",
  comfySleep: "一二舒服睡觉",
  recharge: "一二和布布充电休息",
  walk: "一二遛布布",
  walkDog: "一二遛布布",
  patrol: "一二和布布巡逻",
  ride: "一二骑着布布车",
  shortcut: "一二和布布启动程序",
  spin: "布布和一二转圈",
  silly: "一二和布布鬼脸",
  shy: "一二和布布鬼脸"
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
    alt: moodAlt[mood] ?? "一二和布布",
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

  const src = animation.frames[frameIndex];
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
      aria-label={animation?.alt ?? "一二和布布"}
    >
      <span className="pet-ground-shadow" aria-hidden="true" />
      {animation ? <FrameSequenceAsset animation={animation} assetKey={mood} /> : null}
    </span>
  );
}
