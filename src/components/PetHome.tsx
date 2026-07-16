import { useCallback, useEffect, useRef, useState } from "react";
import type { AppData, PanelName, PetMood } from "../types";
import { PetSprite } from "./PetSprite";
import { FunctionWheel, type WheelAction } from "./FunctionWheel";

const inactiveSleepMs = 90_000;
const ambientActionMs = 30_000;
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
  reminders: "提醒打开啦，布布会轻轻举牌。",
  shortcuts: "启动工具箱打开啦。",
  settings: "设置小抽屉打开咯。"
};

interface AmbientAction {
  mood: PetMood;
  bubble: string;
  durationMs: number;
  roam?: boolean;
}

const ambientActions: AmbientAction[] = [
  { mood: "blink", bubble: "", durationMs: 1_300 },
  { mood: "buddy", bubble: "一二和布布贴贴待机。", durationMs: 2_400 },
  { mood: "slack", bubble: "休息一下也没关系。", durationMs: 2_200 },
  { mood: "comfySleep", bubble: "偷偷打个小盹。", durationMs: 2_600 }
];

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function PetHome() {
  const [wheelOpen, setWheelOpen] = useState(false);
  const [mood, setMood] = useState<PetMood>("idle");
  const [bubble, setBubble] = useState(defaultBubble);
  const [isDragging, setIsDragging] = useState(false);
  const [quietMode, setQuietMode] = useState(false);
  const [onboardingSeen, setOnboardingSeen] = useState(true);
  const inactivityRef = useRef<number | null>(null);
  const moodTimerRef = useRef<number | null>(null);
  const roamTimerRef = useRef<number | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const timerMoodRef = useRef<PetMood | null>(null);
  const moodRef = useRef<PetMood>("idle");
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

  const clearMoodTimer = useCallback(() => {
    if (moodTimerRef.current) {
      window.clearTimeout(moodTimerRef.current);
      moodTimerRef.current = null;
    }
  }, []);

  const clearRoamTimer = useCallback(() => {
    if (roamTimerRef.current) {
      window.clearInterval(roamTimerRef.current);
      roamTimerRef.current = null;
    }
  }, []);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const showMood = useCallback(
    (nextMood: PetMood, nextBubble: string, durationMs = interactionMoodMs) => {
      clearMoodTimer();
      moodRef.current = nextMood;
      setMood(nextMood);
      setBubble(nextBubble);

      if (durationMs > 0) {
        moodTimerRef.current = window.setTimeout(() => {
          moodRef.current = "idle";
          setMood("idle");
          setBubble(defaultBubble);
        }, durationMs);
      }
    },
    [clearMoodTimer]
  );

  const startRoam = useCallback(
    (pace = 420) => {
      clearRoamTimer();
      void window.bubu.roamPet(pace);
    },
    [clearRoamTimer]
  );

  const resetInactivity = useCallback(() => {
    if (inactivityRef.current) window.clearTimeout(inactivityRef.current);
    if (moodRef.current === "sleep") {
      showMood("idle", "醒啦，继续陪你。", 1_600);
    }
    inactivityRef.current = window.setTimeout(() => {
      if (moodRef.current !== "idle") return;
      showMood("sleep", "进入省电睡觉模式。", 0);
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
      showMood(nextMood, nextBubble, durationMs ?? 5_200);
    });
  }, [resetInactivity, showMood]);

  useEffect(() => {
    const applyTimerMood = (timer: AppData["timer"]) => {
      if (timer.running) {
        const nextMood: PetMood = timer.mode === "focus" ? "focus" : "recharge";
        timerMoodRef.current = nextMood;
        if (moodRef.current !== nextMood) showMood(nextMood, "", 0);
        return;
      }

      const previousTimerMood = timerMoodRef.current;
      timerMoodRef.current = null;
      if (previousTimerMood && moodRef.current === previousTimerMood) showMood("idle", defaultBubble, 0);
    };

    void window.bubu.getData().then((data) => applyTimerMood(data.timer));
    return window.bubu.onTimerUpdate(applyTimerMood);
  }, [showMood]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (quietMode) return;
      if (moodRef.current !== "idle" || wheelOpen) return;
      const action = randomItem(ambientActions);
      showMood(action.mood, action.bubble, action.durationMs);
      if (action.roam) startRoam(action.mood === "ride" ? 520 : 380);
    }, ambientActionMs);
    return () => {
      window.clearInterval(id);
      clearRoamTimer();
    };
  }, [clearRoamTimer, quietMode, showMood, startRoam, wheelOpen]);

  useEffect(() => {
    return window.bubu.onGentleReminder(({ message }) => {
      resetInactivity();
      showMood("reminder", message, 5_200);
    });
  }, [resetInactivity, showMood]);

  useEffect(() => {
    return window.bubu.onTimerComplete(({ completedMode, message }) => {
      resetInactivity();
      showMood(completedMode === "focus" ? "celebrate" : "recharge", message, 4_200);
    });
  }, [resetInactivity, showMood]);

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
    setWheelOpen(false);
    showMood(panelMood[panel], panelBubble[panel], interactionMoodMs);
    await window.bubu.openPanel(panel);
  };

  const playAction = (action: WheelAction) => {
    resetInactivity();
    setWheelOpen(false);
    if (action === "roam") {
      const nextMood: PetMood = Math.random() > 0.72 ? "ride" : "walkDog";
      showMood(nextMood, nextMood === "ride" ? "布布小车去远一点。" : "出去散步，换个位置。", 3_400);
      startRoam(nextMood === "ride" ? 560 : 400);
    }
  };

  const toggleWheel = () => {
    resetInactivity();
    setWheelOpen((value) => !value);
    showMood("idle", wheelOpen ? "" : "小工具展开，选一个吧。", 1_800);
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
      setWheelOpen(true);
      showMood("idle", "小工具展开，选一个吧。", 1_800);
      longPressTimerRef.current = null;
    }, longPressMs);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
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
    if (moodRef.current !== "drag") showMood("drag", "", 0);
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
      showMood("idle", "", 1_100);
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

  return (
    <main className={`pet-stage ${wheelOpen ? "has-wheel" : ""} ${quietMode ? "is-quiet-mode" : ""}`}>
      <button
        className="wheel-dismiss-layer no-drag"
        type="button"
        aria-label="收起功能轮"
        tabIndex={wheelOpen ? 0 : -1}
        onClick={dismissWheel}
      />
      <section
        className={`pet-hitbox ${isDragging ? "is-dragging" : ""}`}
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
        <button
          className="pet-button no-drag"
          aria-label="一二布布"
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
        <aside className="onboarding-card no-drag" aria-label="一二布布首次启动">
          <strong>一二和布布到桌面啦</strong>
          <p>先按你的节奏来。</p>
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
