# 一二布布桌宠

一二布布多功能 Windows 桌宠项目。当前仓库保留两个并行版本：

- `Electron + React + TypeScript`：原多功能 MVP，包含便签、番茄钟、提醒、快捷启动、设置等功能面板。
- `wpf/YierBubuDesktopPet`：新增 .NET 8 WPF 迁移版，更贴近老版 QQ 企鹅桌面宠物，重点是透明悬浮、拖拽、点击互动、睡眠、托盘和右键菜单。

## 已实现

- 透明无边框桌宠主窗口
- 桌宠状态：idle、blink、sleep、drag、tap happy
- 双击 / 右键展开快捷功能轮盘
- 独立功能浮窗：便签、番茄钟、提醒、快捷启动、设置
- 本地 JSON 数据存储到 Electron 用户数据目录
- 托盘菜单：显示/隐藏、置顶、设置、退出
- 设置：置顶、透明度、音效开关、开机启动、全屏静默预留、检查更新预留
- Windows 安装包配置：`electron-builder` + NSIS
- 正式动图状态资源：`public/pet/`
- 官方同框待机形象：`public/pet/idle-pair.png`
- QQ 企鹅式轻交互：随机动作、点击跳舞、散步/骑车轻微移动窗口

## 开发命令

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd run typecheck
npm.cmd run build
npm.cmd run dist
```

PowerShell 5 不支持 `&&`，建议像上面这样分开执行命令。若 npm.ps1 被执行策略拦截，请使用 `npm.cmd`。

## 当前打包状态

Electron 版 `npm.cmd run build` / `npm.cmd run dist` 已配置。

WPF 迁移版需要本机安装 .NET 8 SDK 后运行：

```powershell
cd .\wpf\YierBubuDesktopPet
dotnet run --project .\YierBubuDesktopPet.csproj
.\build-release.ps1
```

若已安装 Inno Setup 6，`build-release.ps1` 会额外生成 Windows 安装包。

## 数据位置

运行后本地数据保存到：

```text
%APPDATA%\yier-bubu-desktop-pet\bubu-data.json
```

## 素材说明

正式动图素材位于 `public/pet/` 和 `img/`。WPF 迁移版已经将这些素材转换为内嵌 PNG 帧，位于：

```text
wpf/YierBubuDesktopPet/PetRes/Animations
```
