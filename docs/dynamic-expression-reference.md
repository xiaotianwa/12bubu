# 一二布布动态表情包参考记录

用户提供的百度图片搜索地址：

```text
https://image.baidu.com/search/index?tn=baiduimage&ct=201326592&lm=-1&cl=2&ie=utf8&sa=vs_ala_img&fr=ala&ala=1&alatpl=normal&pos=3&dyTabStr=MCwzLDEsMiwxMyw3LDYsNSwxMiw5&word=%E4%B8%80%E4%BA%8C%E5%B8%83%E5%B8%83%E5%8A%A8%E6%80%81%E8%A1%A8%E6%83%85%E5%8C%85&lid=f2475623007a137a&topic=%E4%B8%80%E4%BA%8C%E5%B8%83%E5%B8%83%E5%8A%A8%E6%80%81%E8%A1%A8%E6%83%85%E5%8C%85
```

访问时百度图片搜索可能出现验证码，因此不把搜索结果直接作为产品素材抓取。

## 可转化为桌宠的动作母题

- 生气 / 跺脚：适合提醒被忽略、久坐太久时的彩蛋。
- 投喂 / 吃糖：适合陪伴互动，不打开功能面板。
- 办公 / 专注：适合番茄钟状态。
- 伙伴抱住 / 别拦我：适合棕色伙伴互动状态。
- 害羞 / 小心心：适合随机情绪小动作。

## 本地 GIF / WebP 参考素材目录

预览拼图：

```text
assets/references/gif-previews/all-gif-reference-preview.jpg
```

元数据：

```text
assets/references/gif-previews/gif-reference-metadata.json
```

| 文件 | 尺寸 | 帧数 | 时长 | 推荐状态 |
| --- | --- | ---: | ---: | --- |
| `一二咬布布.gif` | 640x491 | 17 | 2200ms | `bite` |
| `一二布布最最好.gif` | 240x240 | 28 | 2240ms | `buddy` |
| `一二布布跳舞.gif` | 378x240 | 16 | 1220ms | `dance` |
| `一二白眼.gif` | 481x480 | 3 | 180ms | `eyeRoll` |
| `一二舒服睡觉.webp` | 300x300 | 5 | 2000ms | `comfySleep` |
| `一二遛狗.gif` | 260x260 | 16 | 1600ms | `walkDog` |
| `一二骑着布布车.webp` | 300x300 | 5 | 500ms | `ride` |
| `布布一二转圈.webp` | 155x155 | 8 | 880ms | `spin` |
| `鬼脸.gif` | 497x497 | 3 | 300ms | `silly` |

## 使用原则

- 用户已确认 `img/` 中这批 GIF / WebP 可作为正式产品素材。
- 正式运行资源已复制到 `public/pet/`，使用英文稳定文件名，便于 Vite / Electron 打包。
- 若用户提供 GIF、APNG、MP4 或透明 PNG 序列帧，可拆帧整理为桌宠动作包。

## 正式资源路径

```text
public/pet/bite.gif
public/pet/buddy.gif
public/pet/dance.gif
public/pet/eye-roll.gif
public/pet/comfy-sleep.webp
public/pet/walk-dog.gif
public/pet/ride.webp
public/pet/spin.webp
public/pet/silly.gif
public/pet/idle-pair.png
public/pet/idle-bubu.png
public/pet/idle-bear.png
public/pet/side-bubu.png
public/pet/manifest.json
```

这些资源在 `PetSprite` 中会优先于 SVG 兜底形象渲染。
