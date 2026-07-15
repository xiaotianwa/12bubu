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

  const totalSeconds = data.timer.mode === "focus" ? focusSeconds : breakSeconds;
  const elapsedSeconds = Math.max(0, totalSeconds - data.timer.remainingSeconds);

  const setRunning = (running: boolean) => {
    void patch((current) => ({ ...current, timer: { ...current.timer, running } }));
  };

  const reset = () => {
    void patch((current) => ({
      ...current,
      timer: { mode: "focus", remainingSeconds: focusSeconds, running: false }
    }));
  };

  const switchMode = () => {
    void patch((current) => {
      const mode = current.timer.mode === "focus" ? "break" : "focus";
      return {
        ...current,
        timer: { mode, remainingSeconds: mode === "focus" ? focusSeconds : breakSeconds, running: false }
      };
    });
  };

  const adjustMinutes = (minutes: number) => {
    void patch((current) => {
      const total = current.timer.mode === "focus" ? focusSeconds : breakSeconds;
      const remainingSeconds = Math.max(60, Math.min(total, current.timer.remainingSeconds + minutes * 60));
      return { ...current, timer: { ...current.timer, remainingSeconds } };
    });
  };

  return (
    <div className="timer-panel">
      <div className="timer-summary" aria-live="polite">
        <span>{data.timer.running ? "正在计时" : "已暂停"}</span>
        <strong>{data.timer.mode === "focus" ? "专注 25 分钟" : "休息 5 分钟"}</strong>
        <span>已进行 {formatTime(elapsedSeconds)}</span>
      </div>
      <div className="timer-ring" style={{ "--progress": `${progress * 360}deg` } as CSSProperties}>
        <div>
          <span>{data.timer.mode === "focus" ? "专注中" : "休息中"}</span>
          <strong>{formatTime(data.timer.remainingSeconds)}</strong>
        </div>
      </div>
      <div className="button-row">
        <button className="primary-button" type="button" onClick={() => setRunning(!data.timer.running)}>
          {data.timer.running ? "暂停" : "开始"}
        </button>
        <button type="button" onClick={reset}>重置</button>
        <button type="button" onClick={switchMode}>切换模式</button>
      </div>
      <div className="button-row button-row-subtle" aria-label="调整剩余时间">
        <button type="button" onClick={() => adjustMinutes(-5)} disabled={data.timer.remainingSeconds <= 5 * 60}>
          -5 分钟
        </button>
        <button type="button" onClick={() => adjustMinutes(5)} disabled={data.timer.remainingSeconds >= totalSeconds}>
          +5 分钟
        </button>
      </div>
      <p className="hint">计时由桌宠在后台持续维护，关闭此面板后也不会暂停。</p>
    </div>
  );
}
