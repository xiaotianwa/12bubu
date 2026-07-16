import { useEffect, useMemo } from "react";
import type { CSSProperties } from "react";
import { useAppData } from "../../hooks/useAppData";

const focusSeconds = 25 * 60;
const breakSeconds = 5 * 60;

function formatTime(value: number) {
  const minutes = Math.floor(value / 60).toString().padStart(2, "0");
  const seconds = Math.floor(value % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function TimerWidget() {
  const { data, loading, patch, setData } = useAppData();

  useEffect(() => {
    return window.bubu.onTimerUpdate((timer) => {
      setData((current) => (current ? { ...current, timer } : current));
    });
  }, [setData]);

  const progress = useMemo(() => {
    if (!data) return 0;
    const total = data.timer.mode === "focus" ? focusSeconds : breakSeconds;
    return Math.max(0, Math.min(1, 1 - data.timer.remainingSeconds / total));
  }, [data]);

  if (loading || !data) return <main className="widget-window timer-widget app-drag">一二正在摆小闹钟...</main>;

  const modeLabel = data.timer.mode === "focus" ? "专注" : "休息";

  const setRunning = (running: boolean) => {
    void patch((current) => ({ ...current, timer: { ...current.timer, running } }));
    void window.bubu.setPetMood({
      mood: running ? (data.timer.mode === "focus" ? "focus" : "recharge") : "idle",
      bubble: running ? `${modeLabel}开始，一二陪你。` : "番茄钟暂停啦。",
      durationMs: running ? 0 : 2_400
    });
  };

  return (
    <main className={`widget-window timer-widget ${data.timer.running ? "is-running" : ""} app-drag`} aria-label="桌面番茄钟">
      <header>
        <span>{modeLabel}番茄钟</span>
        <button className="widget-close no-drag" type="button" onClick={() => window.bubu.closeTimerWidget()}>
          x
        </button>
      </header>
      <section>
        <div className="mini-timer-ring" style={{ "--progress": `${progress * 360}deg` } as CSSProperties}>
          <strong>{formatTime(data.timer.remainingSeconds)}</strong>
        </div>
        <div>
          <span className={`timer-status-pill ${data.timer.running ? "is-live" : ""}`}>
            {data.timer.running ? "计时中" : "已暂停"}
          </span>
          <button className="primary-button no-drag" type="button" onClick={() => setRunning(!data.timer.running)}>
            {data.timer.running ? "暂停" : "开始"}
          </button>
        </div>
      </section>
    </main>
  );
}
