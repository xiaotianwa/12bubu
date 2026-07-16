# 一二布布桌宠

一二布布是一个 Windows 桌面宠物 MVP。白熊叫「一二」，棕熊叫「布布」。当前版本回到用户提供的 GIF/WebP 抽帧素材，不再使用自动抠图生成的母版 PNG。

## MVP 功能

- 透明无边框桌宠窗口，支持置顶、透明度、托盘菜单和边缘吸附。
- 单击互动，双击展开侧边功能栏，右键打开系统菜单。
- 待机时会轻量随机走动、眨眼、休息或和布布互动。
- 拖动桌宠会切换拖动状态，松手后有惯性和站稳反馈。
- 便签、番茄钟、提醒、快捷启动、设置五个功能面板。
- 便签可以贴到桌面，贴出后桌宠保持便签状态。
- 番茄钟可以后台运行，也可以显示桌面小组件。
- 番茄钟运行时桌宠保持专注/休息状态，并在桌宠旁显示倒计时。
- 番茄钟临近结束会轻提示，完成后触发庆祝或休息反馈。
- 提醒只短暂播放提醒状态，结束后回到当前主状态。
- 本地 JSON 保存便签、提醒、快捷启动、番茄钟和设置。

## 使用方式

- 单击一二：互动。
- 双击一二：展开/收起侧边功能栏。
- 右键一二：打开桌宠菜单。
- 拖动一二：移动桌宠位置。
- 长按一二：展开侧边功能栏。

## 开发命令

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd run typecheck
npm.cmd run build
npm.cmd run dist
```

如果 PowerShell 执行策略拦截 `npm.ps1`，请使用 `npm.cmd`。

## 素材流程

原始动态表情包保留在 `img/`。运行时素材由 `public/pet/frames/manifest.json` 指向 WebP 抽帧资源。

重新优化现有帧资源：

```powershell
python scripts/optimize-frames.py
```

发布包默认排除开发用 PNG 帧，仅保留 WebP 运行素材。

## 数据位置

```text
%APPDATA%\yier-bubu-desktop-pet\bubu-data.json
```

## 发布产物

执行 `npm.cmd run dist` 后会输出：

```text
release/一二布布桌宠-<version>-setup.exe
release/一二布布桌宠-<version>-portable.exe
```

## 当前限制

- 当前 MVP 以本地功能为主，尚未接入自动更新服务。
- 角色表现依赖现有 GIF/WebP 素材，新增动作需要补充原始动态表情包。
- Windows 之外的平台暂未验证。
