import { useCallback, useEffect, useRef, useState } from "react";
import type { AppData, PanelName, PetMood } from "../types";
import { PetSprite } from "./PetSprite";
import { FunctionWheel, type WheelAction } from "./FunctionWheel";

const inactiveSleepMs = 90_000;
const ambientActionMinMs = 6_500;
const ambientActionMaxMs = 13_500;
const longPressMs = 620;
const interactionMoodMs = 5_200;
const dragStartThresholdPx = 5;
const defaultBubble = "";

const panelMood: Record<PanelName, PetMood> = {
  notes: "note",
  timer: "focus",
  reminders: "reminder",
  shortcuts: "shortcut",
  settings: "settings"
};

const panelBubble: Record<PanelName, string> = {
  notes: "便签打开啦，一二帮你记着。",
  timer: "番茄钟打开啦，一二进入专注状态。",
  reminders: "提醒打开啦，一二会轻轻举牌。",
  shortcuts: "启动工具箱打开啦，布布小车待命。",
  settings: "设置小抽屉打开咯。"
};

interface AmbientAction {
  mood: PetMood;
  bubble: string;
  durationMs: number;
  roam?: boolean;
  pace?: number;
}

const ambientActions: AmbientAction[] = [
  { mood: "blink", bubble: "", durationMs: 1_200 },
  { mood: "walk", bubble: "", durationMs: 3_800, roam: true, pace: 340 },
  { mood: "patrol", bubble: "一二去桌面边上巡一圈。", durationMs: 4_200, roam: true, pace: 380 },
  { mood: "ride", bubble: "布布小车出发。", durationMs: 3_600, roam: true, pace: 560 },
  { mood: "buddy", bubble: "一二和布布贴贴待机。", durationMs: 2_400 },
  { mood: "slack", bubble: "休息一下也没关系。", durationMs: 2_200 },
  { mood: "silly", bubble: "一二做个小表情。", durationMs: 1_600 },
  { mood: "comfySleep", bubble: "偷偷打个小盹。", durationMs: 2_600 }
];

interface LockedMood {
  mood: PetMood;
  bubble: string;
}

function formatTimer(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60).toString().padStart(2, "0");
  const restSeconds = (safeSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${restSeconds}`;
}

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function randomAmbientDelay() {
  return ambientActionMinMs + Math.round(Math.random() * (ambientActionMaxMs - ambientActionMinMs));
}

function isInteractiveElement(target: Element | null) {
  return Boolean(
    target?.closest(
      [
        ".pet-button",
        ".onboarding-card",
        ".wheel-dismiss-layer",
        ".function-wheel .wheel-center-button",
        ".function-wheel.is-open .wheel-button"
      ].join(",")
    )
  );
}

export function PetHome() {
  const [wheelOpen, setWheelOpen] = useState(false);
  const [mood, setMood] = useState<PetMood>("idle");
  const [bubble, setBubble] = useState(defaultBubble);
  const [isDragging, setIsDragging] = useState(false);
  const [quietMode, setQuietMode] = useState(false);
  const [onboardingSeen, setOnboardingSeen] = useState(true);
  const [timerState, setTimerState] = useState<AppData["timer"] | null>(null);
  const inactivityRef = useRef<number | null>(null);
  const moodTimerRef = useRef<number | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const timerMoodRef = useRef<PetMood | null>(null);
  const timerMinuteNudgeRef = useRef<string | null>(null);
  const timerFinalNudgeRef = useRef<string | null>(null);
  const lockedMoodRef = useRef<LockedMood | null>(null);
  const lastAmbientMoodRef = useRef<PetMood | null>(null);
  const moodRef = useRef<PetMood>("idle");
  const wheelOpenRef = useRef(false);
  const quietModeRef = useRef(false);
  const isDraggingRef = useRef(false);
  const clickThroughRef = useRef(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    screenX: number;
    screenY: number;
    lastAt: number;
    velocityX: number;
    velocityY: number;
    moved: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);

  useEffect(() => {
    moodRef.current = mood;
  }, [mood]);

  useEffect(() => {
    wheelOpenRef.current = wheelOpen;
  }, [wheelOpen]);

  useEffect(() => {
    quietModeRef.current = quietMode;
  }, [quietMode]);

  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);

  useEffect(() => {
    let alive = true;
    const syncSettings = async () => {
      const data = await window.bubu.getData();
      if (!alive) return;
      setQuietMode(data.settings.quietMode);
      setOnboardingSeen(true);
    };

    void syncSettings();
    const id = window.setInterval(() => void syncSettings(), 5_000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

  const setClickThrough = useCallback((value: boolean) => {
    if (clickThroughRef.current === value) return;
    clickThroughRef.current = value;
    void window.bubu.setClickThrough(value);
  }, []);

  useEffect(() => {
    const updateClickThrough = (event: PointerEvent) => {
      if (isDraggingRef.current || wheelOpenRef.current) {
        setClickThrough(false);
        return;
      }

      const target = document.elementFromPoint(event.clientX, event.clientY);
      setClickThrough(!isInteractiveElement(target));
    };

    const enableClickThrough = () => setClickThrough(true);

    window.addEventListener("pointermove", updateClickThrough, { passive: true });
    window.addEventListener("pointerleave", enableClickThrough, { passive: true });
    setClickThrough(false);

    return () => {
      window.removeEventListener("pointermove", updateClickThrough);
      window.removeEventListener("pointerleave", enableClickThrough);
      setClickThrough(false);
    };
  }, [setClickThrough]);

  const clearMoodTimer = useCallback(() => {
    if (moodTimerRef.current) {
      window.clearTimeout(moodTimerRef.current);
      moodTimerRef.current = null;
    }
  }, []);

  const restoreBaseMood = useCallback(() => {
    const locked = lockedMoodRef.current;
    const nextMood = locked?.mood ?? "idle";
    const nextBubble = locked?.bubble ?? defaultBubble;
    moodRef.current = nextMood;
    setMood(nextMood);
    setBubble(nextBubble);
  }, []);

  const showMood = useCallback(
    (nextMood: PetMood, nextBubble: string, durationMs = interactionMoodMs, lock = false) => {
      clearMoodTimer();
      if (lock) lockedMoodRef.current = { mood: nextMood, bubble: nextBubble };
      moodRef.current = nextMood;
      setMood(nextMood);
      setBubble(nextBubble);

      if (durationMs > 0) {
        moodTimerRef.current = window.setTimeout(() => {
          restoreBaseMood();
        }, durationMs);
      }
    },
    [clearMoodTimer, restoreBaseMood]
  );

  const unlockMood = useCallback(
    (expectedMood?: PetMood) => {
      if (!lockedMoodRef.current) return;
      if (expectedMood && lockedMoodRef.current.mood !== expectedMood) return;
      lockedMoodRef.current = null;
      restoreBaseMood();
    },
    [restoreBaseMood]
  );

  const startRoam = useCallback((pace = 420) => {
    setClickThrough(false);
    void window.bubu.roamPet(pace);
  }, [setClickThrough]);

  const resetInactivity = useCallback(() => {
    if (inactivityRef.current) window.clearTimeout(inactivityRef.current);
    if (moodRef.current === "sleep") {
      lockedMoodRef.current = null;
      showMood("idle", "醒啦，继续陪你。", 1_600);
    }
    inactivityRef.current = window.setTimeout(() => {
      if (lockedMoodRef.current || moodRef.current !== "idle") return;
      showMood("sleep", "一二进入省电睡觉模式。", 0, true);
    }, inactiveSleepMs);
  }, [showMood]);

  useEffect(() => {
    resetInactivity();
    const events = ["mousemove", "mousedown", "keydown"];
    events.forEach((event) => window.addEventListener(event, resetInactivity, { passive: true }));
    return () => {
      events.forEach((event) => window.removeEventListener(event, resetInactivity));
      if (inactivityRef.current) window.clearTimeout(inactivityRef.current);
    };
  }, [resetInactivity]);

  useEffect(() => {
    return window.bubu.onPetMood(({ mood: nextMood, bubble: nextBubble, durationMs }) => {
      resetInactivity();
      if (nextMood === "idle") lockedMoodRef.current = null;
      showMood(nextMood, nextBubble, durationMs ?? 5_200, durationMs === 0 && nextMood !== "idle");
    });
  }, [resetInactivity, showMood]);

  useEffect(() => {
    const applyTimerMood = (timer: AppData["timer"]) => {
      setTimerState(timer);
      if (timer.running) {
        const nextMood: PetMood = timer.mode === "focus" ? "focus" : "recharge";
        timerMoodRef.current = nextMood;
        if (lockedMoodRef.current?.mood !== nextMood || moodRef.current !== nextMood) showMood(nextMood, "", 0, true);
        if (timer.remainingSeconds <= 60 && timer.remainingSeconds > 10 && timerMinuteNudgeRef.current !== timer.mode) {
          timerMinuteNudgeRef.current = timer.mode;
          showMood(nextMood, "还剩 1 分钟，一二陪你收尾。", 2_600);
        } else if (timer.remainingSeconds <= 10 && timerFinalNudgeRef.current !== timer.mode) {
          timerFinalNudgeRef.current = timer.mode;
          showMood(nextMood, "马上结束啦。", 1_400);
        }
        return;
      }

      const previousTimerMood = timerMoodRef.current;
      timerMoodRef.current = null;
      timerMinuteNudgeRef.current = null;
      timerFinalNudgeRef.current = null;
      if (previousTimerMood) unlockMood(previousTimerMood);
    };

    void window.bubu.getData().then((data) => applyTimerMood(data.timer));
    return window.bubu.onTimerUpdate(applyTimerMood);
  }, [showMood, unlockMood]);

  useEffect(() => {
    let ambientTimer: number | null = null;

    const queueNextAmbient = () => {
      ambientTimer = window.setTimeout(playAmbientAction, randomAmbientDelay());
    };

    const playAmbientAction = () => {
      if (quietModeRef.current || wheelOpenRef.current || isDraggingRef.current || lockedMoodRef.current) {
        queueNextAmbient();
        return;
      }
      if (moodRef.current !== "idle") {
        queueNextAmbient();
        return;
      }

      let action = randomItem(ambientActions);
      if (ambientActions.length > 1 && action.mood === lastAmbientMoodRef.current) {
        action = randomItem(ambientActions.filter((item) => item.mood !== lastAmbientMoodRef.current));
      }
      lastAmbientMoodRef.current = action.mood;
      showMood(action.mood, action.bubble, action.durationMs);
      if (action.roam) startRoam(action.pace);
      window.setTimeout(queueNextAmbient, Math.max(900, action.durationMs + 400));
    };

    queueNextAmbient();

    return () => {
      if (ambientTimer) window.clearTimeout(ambientTimer);
    };
  }, [showMood, startRoam]);

  useEffect(() => {
    return window.bubu.onGentleReminder(({ message }) => {
      resetInactivity();
      showMood("reminder", message, 5_200);
    });
  }, [resetInactivity, showMood]);

  useEffect(() => {
    return window.bubu.onTimerComplete(({ completedMode, message }) => {
      resetInactivity();
      unlockMood(completedMode === "focus" ? "focus" : "recharge");
      showMood(completedMode === "focus" ? "celebrate" : "recharge", message, 4_200);
    });
  }, [resetInactivity, showMood, unlockMood]);

  useEffect(() => {
    const closeWheel = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setWheelOpen(false);
    };
    window.addEventListener("keydown", closeWheel);
    return () => window.removeEventListener("keydown", closeWheel);
  }, []);

  const playHappy = () => {
    resetInactivity();
    showMood("happy", "戳到一二啦，跳一下！", 1_900);
  };

  const openPanel = async (panel: PanelName) => {
    resetInactivity();
    setClickThrough(false);
    setWheelOpen(false);
    showMood(panelMood[panel], panelBubble[panel], panel === "timer" ? 3_200 : 2_600);
    await window.bubu.openPanel(panel);
  };

  const playAction = (action: WheelAction) => {
    resetInactivity();
    setClickThrough(false);
    setWheelOpen(false);
    if (action === "roam") {
      const nextMood: PetMood = Math.random() > 0.65 ? "ride" : "walk";
      showMood(nextMood, nextMood === "ride" ? "布布小车出发。" : "一二出去散步，换个位置。", 3_800);
      startRoam(nextMood === "ride" ? 560 : 380);
    }
  };

  const toggleWheel = () => {
    resetInactivity();
    setClickThrough(false);
    setWheelOpen((value) => !value);
    if (!wheelOpen) showMood("idle", "", 900);
  };

  const dismissWheel = () => {
    resetInactivity();
    setWheelOpen(false);
    showMood("idle", "", 1_000);
  };

  const completeOnboarding = async (openSettings = false) => {
    setOnboardingSeen(true);
    const data = await window.bubu.updateSettings({ onboardingSeen: true });
    setQuietMode(data.settings.quietMode);
    if (openSettings) await window.bubu.openPanel("settings");
  };

  const handleLongPressStart = () => {
    resetInactivity();
    clearLongPressTimer();
    longPressTimerRef.current = window.setTimeout(() => {
      setClickThrough(false);
      setWheelOpen(true);
      showMood("idle", "小工具展开，选一个吧。", 1_800);
      longPressTimerRef.current = null;
    }, longPressMs);
  };

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    setClickThrough(false);
    resetInactivity();
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.screenX,
      startY: event.screenY,
      screenX: event.screenX,
      screenY: event.screenY,
      lastAt: performance.now(),
      velocityX: 0,
      velocityY: 0,
      moved: false
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.screenX - drag.screenX;
    const dy = event.screenY - drag.screenY;
    const totalDx = event.screenX - drag.startX;
    const totalDy = event.screenY - drag.startY;
    if (!drag.moved && Math.hypot(totalDx, totalDy) < dragStartThresholdPx) return;

    const now = performance.now();
    const dt = Math.max(8, now - drag.lastAt);
    drag.velocityX = dx / dt;
    drag.velocityY = dy / dt;
    drag.lastAt = now;
    drag.moved = true;
    drag.screenX = event.screenX;
    drag.screenY = event.screenY;
    suppressClickRef.current = true;
    clearLongPressTimer();
    setIsDragging(true);
    if (moodRef.current !== "drag") showMood("drag", "拎起一二啦。", 0);
    void window.bubu.movePet(dx, dy);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    clearLongPressTimer();
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (drag.moved) {
      showMood("happy", "一二站稳啦。", 1_200);
      void window.bubu.throwPet(drag.velocityX, drag.velocityY);
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    }
  };

  const handlePointerCancel = (event: React.PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    clearLongPressTimer();
    setIsDragging(false);
    suppressClickRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    void window.bubu.savePetPosition();
  };

  const hasBubble = bubble.trim().length > 0 && !wheelOpen;
  const showCountdown = Boolean(timerState?.running && !wheelOpen);
  const timerModeLabel = timerState?.mode === "break" ? "休息" : "专注";

  return (
    <main className={`pet-stage ${wheelOpen ? "has-wheel" : ""} ${quietMode ? "is-quiet-mode" : ""}`}>
      <button
        className="wheel-dismiss-layer no-drag"
        type="button"
        aria-label="收起功能栏"
        tabIndex={wheelOpen ? 0 : -1}
        onClick={dismissWheel}
      />
      <section
        className={`pet-hitbox ${isDragging ? "is-dragging" : ""}`}
        onPointerEnter={() => setClickThrough(false)}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onDoubleClick={toggleWheel}
        onContextMenu={(event) => {
          event.preventDefault();
          void window.bubu.showPetMenu();
        }}
      >
        {hasBubble ? <div className="speech-bubble no-drag">{bubble}</div> : null}
        {showCountdown ? (
          <div className={`pet-countdown no-drag mode-${timerState?.mode ?? "focus"}`} aria-live="polite">
            <span>{timerModeLabel}</span>
            <strong>{formatTimer(timerState?.remainingSeconds ?? 0)}</strong>
          </div>
        ) : null}
        <button
          className="pet-button no-drag"
          aria-label="一二"
          onPointerEnter={() => setClickThrough(false)}
          onPointerDown={(event) => {
            event.stopPropagation();
            handleLongPressStart();
            handlePointerDown(event);
          }}
          onPointerMove={(event) => {
            event.stopPropagation();
            handlePointerMove(event);
          }}
          onPointerUp={(event) => {
            event.stopPropagation();
            clearLongPressTimer();
            handlePointerUp(event);
          }}
          onPointerCancel={(event) => {
            event.stopPropagation();
            handlePointerCancel(event);
          }}
          onPointerLeave={(event) => {
            event.stopPropagation();
            clearLongPressTimer();
          }}
          onDoubleClick={(event) => {
            event.stopPropagation();
            toggleWheel();
          }}
          onContextMenu={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void window.bubu.showPetMenu();
          }}
          onClick={(event) => {
            event.stopPropagation();
            clearLongPressTimer();
            if (wheelOpen) {
              dismissWheel();
              return;
            }
            if (suppressClickRef.current) {
              suppressClickRef.current = false;
              return;
            }
            playHappy();
          }}
        >
          <PetSprite mood={mood} />
        </button>
      </section>
      <FunctionWheel
        open={wheelOpen}
        onOpenPanel={openPanel}
        onAction={playAction}
        onToggle={toggleWheel}
        onDismiss={dismissWheel}
        onQuit={() => window.bubu.quit()}
      />
      {!onboardingSeen ? (
        <aside className="onboarding-card no-drag" aria-label="一二和布布首次启动">
          <strong>一二和布布到桌面啦</strong>
          <p>一二会陪你待机、走动和提醒；布布会在部分动画里一起出现。</p>
          <div>
            <button type="button" onClick={() => void completeOnboarding()}>
              开始
            </button>
            <button type="button" onClick={() => void completeOnboarding(true)}>
              设置
            </button>
          </div>
        </aside>
      ) : null}
    </main>
  );
}
