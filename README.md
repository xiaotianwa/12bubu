# 一二布布桌宠

一二布布是一个 Windows 桌面宠物 MVP。白熊是一二，棕熊是布布。当前版本使用用户提供的 GIF/WebP 抽帧作为角色表现，不再使用重绘形象。

## 当前能力

- 透明无边框桌宠主窗口
- 右侧展开式工具栏，不覆盖角色本体
- 桌宠拖拽、惯性移动、屏幕边界限制、边缘吸附
- 轻量待机动作、安静模式、置顶、透明度、开机自启
- 独立功能面板：便签、番茄钟、提醒、快捷启动、设置
- 本地 JSON 持久化：便签、提醒、快捷启动、番茄钟、设置
- 系统托盘：显示/隐藏、置顶、安静模式、设置、退出
- WebP 优化帧资源，发布包排除 PNG 开发帧
- Windows 打包：NSIS 安装包和 portable 便携版

## 开发命令

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd run typecheck
npm.cmd run build
npm.cmd run dist
```

PowerShell 5 不支持 `&&` 时，请分开执行命令。若 `npm.ps1` 被执行策略拦截，请使用 `npm.cmd`。

## 资源流程

原始动态表情包保留在 `img/`。运行时使用 `public/pet/frames/manifest.json` 中声明的 WebP 帧资源。

重新抽帧或替换 PNG 后，可执行：

```powershell
python scripts/optimize-frames.py
```

该脚本会从 `public/pet/frames/*/*.png` 生成 `.webp`，并刷新 manifest。PNG 用于开发回溯，打包时会被排除。

## 数据位置

运行后本地数据保存到：

```text
%APPDATA%\yier-bubu-desktop-pet\bubu-data.json
```

## 打包产物

执行 `npm.cmd run dist` 后，安装包和便携版会输出到：

```text
release/
```
