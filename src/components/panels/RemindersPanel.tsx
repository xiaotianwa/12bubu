import { useAppData } from "../../hooks/useAppData";
import type { ReminderType } from "../../types";

const labels: Record<ReminderType, string> = {
  water: "喝水提醒",
  rest: "休息眼睛"
};

const messages: Record<ReminderType, string> = {
  water: "该喝点水啦，布布举起小奶瓶。",
  rest: "休息一下眼睛吧，看看远处。"
};

export function RemindersPanel() {
  const { data, loading, patch } = useAppData();

  if (loading || !data) return <div className="empty-state">布布正在调提醒铃...</div>;

  const enabledCount = data.reminders.filter((rule) => rule.enabled).length;

  return (
    <div className="stack">
      <div className="info-strip">
        <strong>{enabledCount} 个提醒已开启</strong>
        <span>间隔会自动限制在 5-240 分钟。</span>
      </div>
      {data.reminders.map((rule) => (
        <article className="setting-card" key={rule.id}>
          <div>
            <strong>{labels[rule.type]}</strong>
            <p>{rule.enabled ? messages[rule.type] : "暂时关闭，需要时再打开。"}</p>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={rule.enabled}
              onChange={(event) => {
                const enabled = event.target.checked;
                void patch((current) => ({
                  ...current,
                  reminders: current.reminders.map((item) => (item.id === rule.id ? { ...item, enabled } : item))
                }));
                void window.bubu.setPetMood({
                  mood: "reminder",
                  bubble: enabled ? "提醒已开启。" : "提醒先收起来。",
                  durationMs: 3_200
                });
              }}
            />
            <span />
          </label>
          <button
            className="inline-action"
            type="button"
            onClick={() => {
              void window.bubu.notify(messages[rule.type]);
              void window.bubu.setPetMood({ mood: "reminder", bubble: messages[rule.type], durationMs: 5_200 });
            }}
            disabled={!rule.enabled}
          >
            立即提醒
          </button>
          <label className="field">
            <span>间隔分钟</span>
            <input
              type="number"
              min={5}
              max={240}
              value={rule.intervalMinutes}
              onChange={(event) => {
                const intervalMinutes = Number(event.target.value);
                if (!Number.isFinite(intervalMinutes)) return;
                const clampedInterval = Math.min(240, Math.max(5, Math.round(intervalMinutes)));
                void patch((current) => ({
                  ...current,
                  reminders: current.reminders.map((item) =>
                    item.id === rule.id ? { ...item, intervalMinutes: clampedInterval } : item
                  )
                }));
              }}
            />
          </label>
        </article>
      ))}
      <p className="hint">提醒会在后台运行：布布先冒温和气泡，再发静音系统通知，不抢焦点。</p>
    </div>
  );
}
