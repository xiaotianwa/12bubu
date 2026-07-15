import { useState } from "react";
import { useAppData } from "../../hooks/useAppData";

export function SettingsPanel() {
  const { data, loading, setData } = useAppData();
  const [updateMessage, setUpdateMessage] = useState("");

  if (loading || !data) return <div className="empty-state">布布正在整理设置……</div>;

  const updateAlwaysOnTop = async (alwaysOnTop: boolean) => {
    setData(await window.bubu.setAlwaysOnTop(alwaysOnTop));
  };

  const updateOpacity = async (opacity: number) => {
    setData(await window.bubu.setOpacity(opacity));
  };

  const updateStartup = async (launchAtStartup: boolean) => {
    setData(await window.bubu.setStartup(launchAtStartup));
  };

  const updateSetting = async <K extends keyof typeof data.settings>(key: K, value: (typeof data.settings)[K]) => {
    setData(await window.bubu.updateSettings({ [key]: value }));
  };

  const checkForUpdates = async () => {
    const result = await window.bubu.checkForUpdates();
    setUpdateMessage(result.message);
  };

  return (
    <div className="stack">
      <div className="info-strip">
        <strong>桌宠显示偏好</strong>
        <span>大部分设置保存后会立刻应用到当前窗口。</span>
      </div>
      <article className="setting-card">
        <div>
          <strong>窗口置顶</strong>
          <p>让布布一直趴在桌面上。</p>
        </div>
        <label className="switch">
          <input
            type="checkbox"
            checked={data.settings.alwaysOnTop}
            onChange={(event) => void updateAlwaysOnTop(event.target.checked)}
          />
          <span />
        </label>
      </article>
      <article className="setting-card">
        <div>
          <strong>透明度</strong>
          <p>{Math.round(data.settings.opacity * 100)}%</p>
        </div>
        <div className="range-wrap">
          <input
            className="range"
            type="range"
            min={0.35}
            max={1}
            step={0.05}
            value={data.settings.opacity}
            aria-label="桌宠透明度"
            onChange={(event) => void updateOpacity(Number(event.target.value))}
          />
          <span className="opacity-preview" style={{ opacity: data.settings.opacity }} />
        </div>
      </article>
      <article className="setting-card">
        <div>
          <strong>音效</strong>
          <p>第一版预留开关，默认只做静音提醒。</p>
        </div>
        <label className="switch">
          <input
            type="checkbox"
            checked={data.settings.soundEnabled}
            onChange={(event) => void updateSetting("soundEnabled", event.target.checked)}
          />
          <span />
        </label>
      </article>
      <article className="setting-card">
        <div>
          <strong>安静模式</strong>
          <p>暂停气泡提醒和系统通知，只保留手动互动。</p>
        </div>
        <label className="switch">
          <input
            type="checkbox"
            checked={data.settings.quietMode}
            onChange={(event) => void updateSetting("quietMode", event.target.checked)}
          />
          <span />
        </label>
      </article>
      <article className="setting-card">
        <div>
          <strong>边缘吸附</strong>
          <p>拖到屏幕边缘时自动贴齐，桌面更干净。</p>
        </div>
        <label className="switch">
          <input
            type="checkbox"
            checked={data.settings.edgeSnapEnabled}
            onChange={(event) => void updateSetting("edgeSnapEnabled", event.target.checked)}
          />
          <span />
        </label>
      </article>
      <article className="setting-card">
        <div>
          <strong>开机启动</strong>
          <p>登录 Windows 后自动召唤布布。</p>
        </div>
        <label className="switch">
          <input
            type="checkbox"
            checked={data.settings.launchAtStartup}
            onChange={(event) => void updateStartup(event.target.checked)}
          />
          <span />
        </label>
      </article>
      <article className="setting-card">
        <div>
          <strong>全屏时温柔静默</strong>
          <p>玩游戏或演示时不打扰。</p>
        </div>
        <label className="switch">
          <input
            type="checkbox"
            checked={data.settings.quietWhenFullscreen}
            onChange={(event) => void updateSetting("quietWhenFullscreen", event.target.checked)}
          />
          <span />
        </label>
      </article>
      <div className="button-row">
        <button className="secondary-button" type="button" onClick={() => void window.bubu.notify("布布提醒测试成功。")}>
          测试提醒
        </button>
        <button className="secondary-button" type="button" onClick={() => void checkForUpdates()}>
          检查更新
        </button>
      </div>
      {updateMessage ? <p className="hint">{updateMessage}</p> : null}
    </div>
  );
}
