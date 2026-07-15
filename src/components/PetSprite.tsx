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

interface OfficialAnimation {
  src: string;
  alt: string;
  badge?: string;
  assetClass?: string;
}

interface FrameAnimation {
  frames: string[];
  alt: string;
  frameMs: number;
  assetClass?: string;
}

function frames(dir: string, prefix: string, count: number) {
  return Array.from(
    { length: count },
    (_, index) => `pet/frames/${dir}/${prefix}_${index.toString().padStart(3, "0")}.png`
  );
}

function frameSequence(
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

const idleFrames = frameSequence("idle", "idle", 28, 80, "一二布布 GIF 抽帧待机", "asset-home");
const happyFrames = frameSequence("happy", "happy", 16, 76, "一二布布 GIF 抽帧开心");
const biteFrames = frameSequence("bite", "bite", 17, 129, "一二咬布布 GIF 抽帧互动");
const eyeRollFrames = frameSequence("eyeRoll", "eyeRoll", 3, 60, "一二白眼 GIF 抽帧表情");
const sleepFrames = frameSequence("sleep", "sleep", 5, 178, "一二舒服睡觉 WebP 抽帧");
const walkDogFrames = frameSequence("walkDog", "walkDog", 16, 100, "一二遛狗 GIF 抽帧巡逻");
const rideFrames = frameSequence("ride", "ride", 5, 98, "一二骑着布布车 WebP 抽帧");
const spinFrames = frameSequence("spin", "spin", 8, 108, "布布一二转圈 WebP 抽帧", "asset-tiny-source");
const sillyFrames = frameSequence("silly", "silly", 3, 100, "鬼脸 GIF 抽帧表情");

const frameAnimations: Partial<Record<PetMood, FrameAnimation>> = {
  idle: idleFrames,
  blink: idleFrames,
  buddy: idleFrames,
  work: idleFrames,
  slack: idleFrames,
  note: idleFrames,
  focus: idleFrames,
  reminder: idleFrames,
  settings: idleFrames,
  drag: idleFrames,
  happy: happyFrames,
  dance: happyFrames,
  celebrate: happyFrames,
  bite: biteFrames,
  feed: biteFrames,
  eyeRoll: eyeRollFrames,
  angry: eyeRollFrames,
  sleep: sleepFrames,
  comfySleep: sleepFrames,
  recharge: sleepFrames,
  walk: walkDogFrames,
  walkDog: walkDogFrames,
  patrol: walkDogFrames,
  ride: rideFrames,
  shortcut: rideFrames,
  spin: spinFrames,
  silly: sillyFrames,
  shy: sillyFrames
};

const officialAnimations: Partial<Record<PetMood, OfficialAnimation>> = {
  idle: { src: "pet/idle-pair.png", alt: "一二布布待机", assetClass: "asset-pair" },
  blink: { src: "pet/idle-pair.png", alt: "一二布布眨眨眼", badge: "眨", assetClass: "asset-pair" },
  walk: { src: "pet/buddy.gif", alt: "一二布布一起散步", badge: "巡逻", assetClass: "asset-pair" },
  sleep: { src: "pet/comfy-sleep.webp", alt: "一二布布舒服睡觉", assetClass: "asset-square" },
  drag: { src: "pet/idle-bear.png", alt: "布布被拖住啦", badge: "抓住啦", assetClass: "asset-single" },
  happy: { src: "pet/dance.gif", alt: "一二布布开心跳舞", assetClass: "asset-wide" },
  note: { src: "pet/idle-pair.png", alt: "布布拿出小便签", badge: "便签", assetClass: "asset-pair" },
  focus: { src: "pet/idle-bubu.png", alt: "一二陪你专注", badge: "25", assetClass: "asset-single" },
  reminder: { src: "pet/idle-pair.png", alt: "一二布布温柔提醒", badge: "喝水", assetClass: "asset-pair" },
  shortcut: { src: "pet/ride.webp", alt: "一二骑着布布车出发", badge: "启动", assetClass: "asset-square" },
  settings: { src: "pet/idle-bear.png", alt: "布布设置小抽屉", badge: "设置", assetClass: "asset-single" },
  feed: { src: "pet/bite.gif", alt: "一二咬布布", assetClass: "asset-wide" },
  buddy: { src: "pet/buddy.gif", alt: "一二布布最最好", assetClass: "asset-pair" },
  angry: { src: "pet/eye-roll.gif", alt: "一二布布不开心", badge: "哼", assetClass: "asset-square" },
  shy: { src: "pet/silly.gif", alt: "一二布布被捏脸", badge: "捏捏", assetClass: "asset-square" },
  bite: { src: "pet/bite.gif", alt: "一二咬布布", assetClass: "asset-wide" },
  dance: { src: "pet/dance.gif", alt: "一二布布跳舞", assetClass: "asset-wide" },
  eyeRoll: { src: "pet/eye-roll.gif", alt: "一二白眼", assetClass: "asset-square" },
  comfySleep: { src: "pet/comfy-sleep.webp", alt: "一二舒服睡觉", assetClass: "asset-square" },
  walkDog: { src: "pet/walk-dog.gif", alt: "一二遛狗", assetClass: "asset-square" },
  ride: { src: "pet/ride.webp", alt: "一二骑着布布车", assetClass: "asset-square" },
  spin: { src: "pet/spin.webp", alt: "布布一二转圈", assetClass: "asset-square asset-tiny-source" },
  silly: { src: "pet/silly.gif", alt: "鬼脸", assetClass: "asset-square" }
};

Object.assign(officialAnimations, {
  idle: { src: "pet/idle-pair.png", alt: "一二布布待机", assetClass: "asset-pair asset-home" },
  blink: { src: "pet/idle-pair.png", alt: "一二布布眨眨眼", badge: "眨", assetClass: "asset-pair asset-home" },
  drag: { src: "pet/idle-pair.png", alt: "一二布布被拖住啦", badge: "抓住啦", assetClass: "asset-pair asset-drag" },
  note: { src: "pet/idle-pair.png", alt: "一二布布便签", badge: "便签", assetClass: "asset-pair" },
  focus: { src: "pet/idle-pair.png", alt: "一二布布陪你专注", badge: "专注", assetClass: "asset-pair asset-work" },
  reminder: { src: "pet/idle-pair.png", alt: "一二布布温柔提醒", badge: "提醒", assetClass: "asset-pair" },
  settings: { src: "pet/idle-bear.png", alt: "布布设置小抽屉", badge: "设置", assetClass: "asset-single asset-bear" },
  work: { src: "pet/idle-pair.png", alt: "一二布布工作模式", badge: "工作", assetClass: "asset-pair asset-work" },
  slack: { src: "pet/buddy.gif", alt: "一二布布摸鱼贴贴", badge: "摸鱼", assetClass: "asset-pair asset-slack" },
  recharge: { src: "pet/comfy-sleep.webp", alt: "一二布布充电休息", badge: "充电", assetClass: "asset-square asset-recharge" },
  patrol: { src: "pet/side-bear.png", alt: "布布小熊巡逻", badge: "巡逻", assetClass: "asset-square asset-patrol asset-bear" },
  celebrate: { src: "pet/dance.gif", alt: "一二布布庆祝", badge: "好耶", assetClass: "asset-wide asset-celebrate" }
});

function AnimatedPetAsset({ src, alt, assetKey }: { src: string; alt: string; assetKey: string }) {
  const [previousSrc, setPreviousSrc] = useState<string | null>(null);
  const currentSrcRef = useRef(src);

  useEffect(() => {
    if (src === currentSrcRef.current) return;
    setPreviousSrc(currentSrcRef.current);
    currentSrcRef.current = src;
    const timeout = window.setTimeout(() => setPreviousSrc(null), 240);
    return () => window.clearTimeout(timeout);
  }, [src]);

  return (
    <span className="pet-asset-frame">
      {previousSrc ? <img className="pet-official-asset is-leaving" src={previousSrc} alt="" draggable={false} /> : null}
      <img key={assetKey} className="pet-official-asset is-entering" src={src} alt={alt} draggable={false} />
    </span>
  );
}

function FrameSequenceAsset({ animation, assetKey }: { animation: FrameAnimation; assetKey: string }) {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    setFrameIndex(0);
    const timer = window.setInterval(() => {
      setFrameIndex((value) => (value + 1) % animation.frames.length);
    }, animation.frameMs);
    return () => window.clearInterval(timer);
  }, [animation.frameMs, animation.frames.length, assetKey]);

  return (
    <span className="pet-asset-frame">
      <img
        className="pet-official-asset pet-frame-asset"
        src={animation.frames[frameIndex]}
        alt={animation.alt}
        draggable={false}
      />
    </span>
  );
}

function Accessory({ mood }: { mood: PetMood }) {
  if (mood === "note") {
    return (
      <g className="pet-accessory note-accessory">
        <rect x="135" y="124" width="42" height="36" rx="8" />
        <path d="M145 137h21M145 148h15" />
        <path className="pencil" d="M126 165l29-30 9 9-30 29-13 5 5-13Z" />
      </g>
    );
  }

  if (mood === "focus") {
    return (
      <g className="pet-accessory focus-accessory">
        <circle cx="166" cy="122" r="23" />
        <path d="M166 109v15l10 7" />
        <path d="M153 97l-8-9M179 97l8-9" />
      </g>
    );
  }

  if (mood === "reminder") {
    return (
      <g className="pet-accessory bottle-accessory">
        <path d="M145 120h29v48c0 8-6 14-14 14s-15-6-15-14v-48Z" />
        <path d="M150 109h20v13h-20z" />
        <path d="M154 138h11M154 150h11M154 162h11" />
        <path className="water-drop" d="M81 70c7 9 11 16 11 23 0 8-6 13-13 13s-13-5-13-13c0-7 7-15 15-23Z" />
      </g>
    );
  }

  if (mood === "shortcut") {
    return (
      <g className="pet-accessory toolbox-accessory">
        <rect x="121" y="140" width="64" height="42" rx="10" />
        <path d="M139 140v-10h28v10M121 155h64M151 153v9" />
      </g>
    );
  }

  if (mood === "settings") {
    return (
      <g className="pet-accessory gear-accessory">
        <path d="M168 113l6 6 9-1 4 10-7 6v8l7 6-4 10-9-1-6 6-10-4-1-9-6-5v-9l6-5 1-9 10-5Z" />
        <circle cx="168" cy="138" r="10" />
      </g>
    );
  }

  if (mood === "feed") {
    return (
      <g className="pet-accessory feed-accessory">
        <circle cx="160" cy="135" r="21" />
        <path d="M147 135c6-9 20-9 26 0-6 9-20 9-26 0Z" />
        <path d="M160 156v25" />
      </g>
    );
  }

  if (mood === "walkDog") {
    return (
      <g className="pet-accessory dog-accessory">
        <path d="M53 154c19-16 41-4 39 17-2 17-22 24-37 12-12 10-28 4-30-10-2-13 11-24 28-19Z" />
        <circle cx="41" cy="151" r="8" />
        <circle cx="74" cy="151" r="8" />
        <path d="M88 163c18-14 34-17 50-8" />
        <path d="M41 181v15M72 181v15" />
      </g>
    );
  }

  if (mood === "ride") {
    return (
      <g className="pet-accessory ride-accessory">
        <path d="M55 153c8-24 91-25 103 0 10 21-4 42-52 42-45 0-58-20-51-42Z" />
        <circle cx="75" cy="190" r="10" />
        <circle cx="140" cy="190" r="10" />
        <circle cx="82" cy="160" r="5" />
        <circle cx="130" cy="160" r="5" />
        <path d="M99 170c4 5 12 5 16 0" />
      </g>
    );
  }

  if (mood === "comfySleep") {
    return (
      <g className="pet-accessory blanket-accessory">
        <path d="M44 137c21-23 105-23 132 2 6 29-12 53-66 53-48 0-75-20-66-55Z" />
        <path d="M57 147c24 10 75 10 107 0" />
      </g>
    );
  }

  return null;
}

function BuddyBear() {
  return (
    <g className="buddy-bear" aria-hidden="true">
      <circle cx="151" cy="48" r="13" />
      <circle cx="196" cy="56" r="13" />
      <path d="M147 50c20-22 62-13 70 22 9 38-7 78-39 84-33 6-57-21-58-52-1-23 9-43 27-54Z" />
      <circle className="buddy-cheek" cx="145" cy="103" r="11" />
      <circle className="buddy-cheek" cx="199" cy="105" r="11" />
      <circle className="buddy-eye" cx="161" cy="91" r="5" />
      <circle className="buddy-eye" cx="190" cy="94" r="5" />
      <path className="buddy-mouth" d="M173 105c3 4 7 4 9 0 3 4 7 4 9 0" />
      <path className="buddy-arm" d="M133 127c-17 10-22 28-9 41" />
    </g>
  );
}

function SideBubu({ mood, compact }: PetSpriteProps) {
  return (
    <svg className={`pet-sprite side-sprite ${moodClass[mood]} ${compact ? "is-compact" : ""}`} viewBox="0 0 220 220" role="img" aria-label="一二布布侧面">
      <filter id="bubuSideShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="9" stdDeviation="7" floodColor="#6b483a" floodOpacity="0.16" />
      </filter>
      <g filter="url(#bubuSideShadow)">
        <circle className="bubu-ear" cx="105" cy="43" r="16" />
        <path className="bubu-head" d="M55 61c19-28 82-31 111-7 27 23 25 74 5 99-21 27-78 31-112 9-29-19-29-63-4-101Z" />
        <path className="bubu-body" d="M76 137c9-13 51-13 65 2 14 15 13 45-5 56-19 12-52 10-65-7-11-15-8-36 5-51Z" />
        <path className="bubu-arm" d="M96 153c-1 15 2 24 10 31" />
        <circle className="bubu-tail" cx="60" cy="168" r="9" />
        <ellipse className="bubu-foot" cx="103" cy="196" rx="11" ry="8" />
        <circle className="bubu-cheek" cx="153" cy="108" r="15" />
        {mood === "sleep" ? (
          <path className="bubu-closed-eye" d="M166 93c5 4 11 4 16 0" />
        ) : (
          <circle className="bubu-eye" cx="171" cy="94" r="6" />
        )}
        <path className="bubu-mouth" d="M177 109c3 5 8 5 11 0" />
      </g>
      {mood === "sleep" ? (
        <g className="sleep-marks">
          <text x="154" y="48" className="z-mark">Z</text>
          <text x="175" y="32" className="z-mark small">z</text>
        </g>
      ) : null}
    </svg>
  );
}

export function PetSprite({ mood, compact = false }: PetSpriteProps) {
  const frameAnimation = frameAnimations[mood];
  if (frameAnimation) {
    const { assetClass = "" } = frameAnimation;
    return (
      <span
        className={`pet-sprite pet-official-wrap ${assetClass} ${moodClass[mood]} ${compact ? "is-compact" : ""}`}
        role="img"
        aria-label={frameAnimation.alt}
      >
        <span className="pet-ground-shadow" aria-hidden="true" />
        <FrameSequenceAsset animation={frameAnimation} assetKey={mood} />
      </span>
    );
  }

  const officialAnimation = officialAnimations[mood];

  if (officialAnimation) {
    const { assetClass = "", badge, src, alt } = officialAnimation;
    return (
      <span
        className={`pet-sprite pet-official-wrap ${assetClass} ${moodClass[mood]} ${compact ? "is-compact" : ""}`}
        role="img"
        aria-label={alt}
      >
        <span className="pet-ground-shadow" aria-hidden="true" />
        <AnimatedPetAsset src={src} alt={alt} assetKey={mood} />
        {badge ? (
          <span className="pet-state-badge" aria-hidden="true">
            {badge}
          </span>
        ) : null}
      </span>
    );
  }

  if (mood === "walk") {
    return <SideBubu mood={mood} compact={compact} />;
  }

  const eyes =
    mood === "blink" || mood === "sleep" || mood === "focus" || mood === "shy" || mood === "comfySleep"
      ? "closed"
      : "open";
  const mouth =
    mood === "happy" || mood === "feed" || mood === "dance"
      ? "happy"
      : mood === "drag" || mood === "angry" || mood === "bite"
        ? "worry"
        : "tiny";

  return (
    <svg className={`pet-sprite ${moodClass[mood]} ${compact ? "is-compact" : ""}`} viewBox="0 0 220 220" role="img" aria-label="一二布布">
      <filter id="bubuSoftShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="10" stdDeviation="7" floodColor="#6b483a" floodOpacity="0.18" />
      </filter>
      {mood === "sleep" ? (
        <g className="sleep-marks">
          <text x="148" y="46" className="z-mark">Z</text>
          <text x="168" y="30" className="z-mark small">z</text>
        </g>
      ) : null}
      {mood === "happy" ? (
        <g className="happy-sparkles">
          <path d="M35 72l6 12 12 6-12 6-6 12-6-12-12-6 12-6 6-12Z" />
          <path d="M186 68l4 8 8 4-8 4-4 8-4-8-8-4 8-4 4-8Z" />
        </g>
      ) : null}
      {mood === "dance" ? (
        <g className="music-notes">
          <path d="M42 58v-28l22-5v28" />
          <circle cx="40" cy="64" r="8" />
          <circle cx="63" cy="58" r="8" />
          <path d="M180 54v-25l17 5v23" />
          <circle cx="178" cy="61" r="7" />
          <circle cx="197" cy="63" r="7" />
        </g>
      ) : null}
      {mood === "spin" ? (
        <g className="spin-lines">
          <path d="M38 104c21-39 84-59 132-35" />
          <path d="M184 115c-25 44-94 54-137 25" />
          <path d="M168 59l17 9-15 12" />
          <path d="M55 151l-18-9 15-13" />
        </g>
      ) : null}
      {mood === "buddy" || mood === "bite" || mood === "dance" || mood === "spin" ? <BuddyBear /> : null}
      <g filter="url(#bubuSoftShadow)">
        <circle className="bubu-ear" cx="60" cy="39" r="18" />
        <circle className="bubu-ear" cx="160" cy="39" r="18" />
        <path className="bubu-body" d="M74 133c10-15 61-16 73 1 13 17 12 51-9 63-19 11-55 9-69-8-12-15-9-40 5-56Z" />
        <path className="bubu-arm left-arm" d="M70 144c-11 6-16 16-13 27" />
        <path className="bubu-arm right-arm" d="M151 144c11 6 16 16 13 27" />
        <ellipse className="bubu-foot" cx="84" cy="196" rx="13" ry="9" />
        <ellipse className="bubu-foot" cx="137" cy="196" rx="13" ry="9" />
        <path className="bubu-head" d="M43 58c20-34 93-36 131-8 32 24 34 78 12 108-24 32-96 35-132 9-31-23-33-75-11-109Z" />
        <circle className="bubu-cheek" cx="69" cy="115" r="16" />
        <circle className="bubu-cheek" cx="151" cy="115" r="16" />
        {mood === "eyeRoll" ? (
          <>
            <circle className="eye-white" cx="87" cy="102" r="10" />
            <circle className="eye-white" cx="132" cy="102" r="10" />
            <circle className="bubu-eye" cx="90" cy="98" r="4" />
            <circle className="bubu-eye" cx="135" cy="98" r="4" />
          </>
        ) : mood === "angry" ? (
          <>
            <path className="bubu-angry-eye" d="M79 96l17 8" />
            <path className="bubu-angry-eye" d="M139 96l-17 8" />
          </>
        ) : eyes === "open" ? (
          <>
            <circle className="bubu-eye" cx="87" cy="102" r="7" />
            <circle className="bubu-eye" cx="132" cy="102" r="7" />
          </>
        ) : (
          <>
            <path className="bubu-closed-eye" d="M78 101c5 5 12 5 17 0" />
            <path className="bubu-closed-eye" d="M123 101c5 5 12 5 17 0" />
          </>
        )}
        {mood === "silly" ? (
          <>
            <path className="bubu-mouth" d="M97 121c8 14 24 14 32 0" />
            <path className="silly-tongue" d="M108 127c5 14 17 14 22 0" />
          </>
        ) : mouth === "happy" ? (
          <path className="bubu-mouth" d="M101 122c6 9 18 9 24 0" />
        ) : mouth === "worry" ? (
          <ellipse className="bubu-open-mouth" cx="112" cy="121" rx="8" ry="11" />
        ) : (
          <path className="bubu-mouth" d="M103 120c3 6 8 6 10 0 3 6 8 6 11 0" />
        )}
        <path className={mood === "angry" ? "bubu-cross-arm" : "bubu-bow"} d={mood === "angry" ? "M88 151c15 14 32 15 49 0M137 151c-16 14-33 15-49 0" : "M95 143c8-10 17-8 18 3 3-11 13-13 22-3-6 13-16 15-22 6-6 9-16 7-18-6Z"} />
        <circle className="bubu-tail front-tail" cx="111" cy="184" r="7" />
      </g>
      {mood === "drag" ? <path className="drag-sweat" d="M73 59c8 9 12 16 12 23 0 8-6 13-13 13s-13-5-13-13c0-7 6-15 14-23Z" /> : null}
      {mood === "angry" ? <path className="anger-mark" d="M48 67l10-10M58 67L48 57M47 77h14M53 51v14" /> : null}
      {mood === "shy" ? <path className="shy-heart" d="M168 66c10-16 34 1 6 22-30-18-10-40-6-22Z" /> : null}
      {mood === "bite" ? <path className="bite-mark" d="M168 92l8-12 7 13 11-7-4 14 14 2-13 8 7 12-15-4-7 13-5-15-15 1 10-11-10-10 14-4Z" /> : null}
      <Accessory mood={mood} />
    </svg>
  );
}
