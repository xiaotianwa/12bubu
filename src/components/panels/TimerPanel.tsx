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

export function TimerPanel() {
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

  if (loading || !data) return <div className="empty-state">一二正在摆好小闹钟...</div>;

  const modeLabel = data.timer.mode === "focus" ? "专注" : "休息";
  const totalSeconds = data.timer.mode === "focus" ? focusSeconds : breakSeconds;
  const elapsedSeconds = Math.max(0, totalSeconds - data.timer.remainingSeconds);

  const setRunning = (running: boolean) => {
    void patch((current) => ({ ...current, timer: { ...current.timer, running } }));
    void window.bubu.setPetMood({
      mood: running ? (data.timer.mode === "focus" ? "focus" : "recharge") : "idle",
      bubble: running ? `${modeLabel}开始，一二陪你。` : "番茄钟暂停啦。",
      durationMs: running ? 0 : 2_400
    });
  };

  const reset = () => {
    void patch((current) => ({
      ...current,
      timer: { mode: "focus", remainingSeconds: focusSeconds, running: false }
    }));
    void window.bubu.setPetMood({ mood: "idle", bubble: "番茄钟已重置。", durationMs: 2_400 });
  };

  const switchMode = () => {
    const nextMode = data.timer.mode === "focus" ? "break" : "focus";
    void patch((current) => ({
      ...current,
      timer: {
        mode: nextMode,
        remainingSeconds: nextMode === "focus" ? focusSeconds : breakSeconds,
        running: false
      }
    }));
    void window.bubu.setPetMood({
      mood: nextMode === "focus" ? "focus" : "recharge",
      bubble: nextMode === "focus" ? "切到专注模式。" : "切到休息模式。",
      durationMs: 3_200
    });
  };

  const adjustMinutes = (minutes: number) => {
    void patch((current) => {
      const total = current.timer.mode === "focus" ? focusSeconds : breakSeconds;
      const remainingSeconds = Math.max(60, Math.min(total, current.timer.remainingSeconds + minutes * 60));
      return { ...current, timer: { ...current.timer, remainingSeconds } };
    });
  };

  const showOnDesktop = () => {
    void window.bubu.openTimerWidget();
    void window.bubu.setPetMood({
      mood: data.timer.mode === "focus" ? "focus" : "recharge",
      bubble: "番茄钟贴到桌面啦。",
      durationMs: 0
    });
  };

  return (
    <div className={`timer-panel ${data.timer.running ? "is-running" : ""}`}>
      <section className="timer-hero" aria-live="polite">
        <div className="timer-ring" style={{ "--progress": `${progress * 360}deg` } as CSSProperties}>
          <div>
            <span>{data.timer.running ? `${modeLabel}中` : `${modeLabel}待机`}</span>
            <strong>{formatTime(data.timer.remainingSeconds)}</strong>
          </div>
        </div>
        <div className="timer-side">
          <span className={`timer-status-pill ${data.timer.running ? "is-live" : ""}`}>
            {data.timer.running ? "正在计时" : "已暂停"}
          </span>
          <strong>{modeLabel} {data.timer.mode === "focus" ? "25" : "5"} 分钟</strong>
          <p>已进行 {formatTime(elapsedSeconds)}</p>
          <div className="button-row timer-actions">
            <button className="primary-button" type="button" onClick={() => setRunning(!data.timer.running)}>
              {data.timer.running ? "暂停" : "开始"}
            </button>
            <button type="button" onClick={reset}>
              重置
            </button>
          </div>
        </div>
      </section>
      <div className="button-row button-row-subtle" aria-label="调整剩余时间">
        <button type="button" onClick={() => adjustMinutes(-5)} disabled={data.timer.remainingSeconds <= 5 * 60}>
          -5 分钟
        </button>
        <button type="button" onClick={() => adjustMinutes(5)} disabled={data.timer.remainingSeconds >= totalSeconds}>
          +5 分钟
        </button>
        <button type="button" onClick={switchMode}>
          切换模式
        </button>
        <button type="button" onClick={showOnDesktop}>
          桌面显示
        </button>
      </div>
      <p className="hint">关闭面板后也会继续计时；开始、暂停和切换模式都会同步桌宠动画。</p>
    </div>
  );
}
