import { useState } from "react";
import { useAppData } from "../../hooks/useAppData";
import type { ShortcutItem } from "../../types";

function shortcutNameFromPath(appPath: string) {
  return appPath.split(/[\\/]/).pop()?.replace(/\.(exe|bat|cmd|lnk)$/i, "") || "快捷启动";
}

export function ShortcutsPanel() {
  const { data, loading, patch } = useAppData();
  const [error, setError] = useState("");
  const [launchingId, setLaunchingId] = useState<string | null>(null);

  if (loading || !data) return <div className="empty-state">布布正在找工具箱……</div>;

  const addShortcut = async () => {
    const appPath = await window.bubu.pickShortcut();
    if (!appPath) return;
    const shortcut: ShortcutItem = {
      id: crypto.randomUUID(),
      name: shortcutNameFromPath(appPath),
      appPath
    };
    void patch((current) => ({ ...current, shortcuts: [...current.shortcuts, shortcut] }));
  };

  const launch = async (appPath: string) => {
    const target = data.shortcuts.find((shortcut) => shortcut.appPath === appPath);
    setLaunchingId(target?.id ?? null);
    try {
      const result = await window.bubu.launchShortcut(appPath);
      setError(result.ok ? "" : result.error ?? "启动失败");
    } catch {
      setError("启动失败，请确认程序路径还存在。");
    } finally {
      setLaunchingId(null);
    }
  };

  const remove = (id: string) => {
    void patch((current) => ({ ...current, shortcuts: current.shortcuts.filter((item) => item.id !== id) }));
  };

  return (
    <div className="stack">
      <div className="panel-toolbar">
        <button className="primary-button" type="button" onClick={addShortcut}>
          添加常用程序
        </button>
        <span className="count-pill">{data.shortcuts.length} 个入口</span>
      </div>
      {error ? <p className="error-text">{error}</p> : null}
      <div className="shortcut-list">
        {data.shortcuts.length === 0 ? <div className="empty-state">还没有快捷启动，布布的小工具箱空空的。</div> : null}
        {data.shortcuts.map((shortcut) => (
          <article className="shortcut-row" key={shortcut.id}>
            <button
              type="button"
              onClick={() => launch(shortcut.appPath)}
              disabled={launchingId === shortcut.id}
              title={shortcut.appPath}
            >
              <span aria-hidden="true">启</span>
              <strong>{shortcut.name}</strong>
              <small>{launchingId === shortcut.id ? "正在启动..." : shortcut.appPath}</small>
            </button>
            <button type="button" onClick={() => remove(shortcut.id)} disabled={launchingId === shortcut.id}>
              删除
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
