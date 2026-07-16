from __future__ import annotations

import shutil
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageSequence


ROOT = Path(__file__).resolve().parents[1]
IMG_ROOT = ROOT / "img"
FRAMES_ROOT = ROOT / "public" / "pet" / "frames"
SHEET_ROOT = ROOT / "assets" / "generated-state-sheets"
CELL = 256


@dataclass(frozen=True)
class StateSource:
    filename: str
    max_size: int = 210
    bottom_padding: int = 18


STATE_SOURCES: dict[str, StateSource] = {
    "idle": StateSource("安静一二（待机）.gif", 202, 20),
    "softIdle": StateSource("安静一二（待机）.gif", 202, 20),
    "note": StateSource("记录一二.gif", 198, 18),
    "focus": StateSource("看书一二.gif", 198, 18),
    "reminder": StateSource("举牌一二.gif", 196, 18),
    "shortcut": StateSource("开车一二宝.gif", 202, 18),
    "settings": StateSource("打扫卫生一二.gif", 204, 18),
    "happy": StateSource("开心一二.gif", 194, 18),
    "bite": StateSource("一二咬布布.gif", 214, 16),
    "eyeRoll": StateSource("一二白眼.gif", 202, 18),
    "sleep": StateSource("睡觉觉一二.gif", 204, 20),
    "walkDog": StateSource("一二遛狗.gif", 204, 18),
    "ride": StateSource("开车一二宝.gif", 202, 18),
    "spin": StateSource("一二布布最最好.gif", 208, 18),
    "silly": StateSource("鬼脸.gif", 202, 18),
    "buddy": StateSource("一二贴贴布布.gif", 202, 18),
    "dance": StateSource("一二布布跳舞.gif", 218, 18),
    "feed": StateSource("吃汉堡一二.gif", 202, 18),
    "angry": StateSource("生气一二.gif", 198, 18),
    "shy": StateSource("化妆一二.gif", 196, 18),
    "walk": StateSource("一二走路.gif", 202, 18),
    "patrol": StateSource("一二走路.gif", 202, 18),
    "slack": StateSource("无聊一二.gif", 210, 18),
    "work": StateSource("看书一二.gif", 198, 18),
    "comfySleep": StateSource("睡觉觉一二.gif", 204, 20),
    "recharge": StateSource("睡觉觉一二.gif", 204, 20),
    "celebrate": StateSource("一二布布最最好.gif", 208, 18),
    "blink": StateSource("安静一二（待机）.gif", 202, 20),
}


CORE_PREVIEW_STATES = ("softIdle", "note", "focus", "reminder", "shortcut", "settings")


def strip_border_background(frame: Image.Image, tolerance: int = 24) -> Image.Image:
    frame = frame.convert("RGBA")
    alpha = frame.getchannel("A")
    if alpha.getextrema() != (255, 255):
        return frame

    width, height = frame.size
    pixels = frame.load()
    corners = [
        pixels[0, 0],
        pixels[width - 1, 0],
        pixels[0, height - 1],
        pixels[width - 1, height - 1],
    ]

    def close_to_corner(pixel: tuple[int, int, int, int]) -> bool:
        return any(
            sum(abs(pixel[channel] - corner[channel]) for channel in range(3)) <= tolerance
            for corner in corners
        )

    seen: set[tuple[int, int]] = set()
    stack: list[tuple[int, int]] = []
    for x in range(width):
        stack.append((x, 0))
        stack.append((x, height - 1))
    for y in range(height):
        stack.append((0, y))
        stack.append((width - 1, y))

    while stack:
        x, y = stack.pop()
        if (x, y) in seen or not (0 <= x < width and 0 <= y < height):
            continue
        if not close_to_corner(pixels[x, y]):
            continue
        seen.add((x, y))
        r, g, b, _ = pixels[x, y]
        pixels[x, y] = (r, g, b, 0)
        stack.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))

    return frame


def load_frames(source: Path) -> list[Image.Image]:
    with Image.open(source) as image:
        frames = [strip_border_background(frame.copy()) for frame in ImageSequence.Iterator(image)]
    if not frames:
        raise RuntimeError(f"No frames found in {source}")
    return frames


def union_alpha_bbox(frames: list[Image.Image]) -> tuple[int, int, int, int]:
    left = top = 10_000
    right = bottom = 0
    for frame in frames:
        bbox = frame.getchannel("A").getbbox()
        if not bbox:
            continue
        left = min(left, bbox[0])
        top = min(top, bbox[1])
        right = max(right, bbox[2])
        bottom = max(bottom, bbox[3])
    if right <= left or bottom <= top:
        width, height = frames[0].size
        return (0, 0, width, height)
    return (left, top, right, bottom)


def fit_frame(frame: Image.Image, bbox: tuple[int, int, int, int], config: StateSource) -> Image.Image:
    cropped = frame.crop(bbox)
    width, height = cropped.size
    scale = min(config.max_size / width, config.max_size / height)
    target_width = max(1, round(width * scale))
    target_height = max(1, round(height * scale))
    resized = cropped.resize((target_width, target_height), Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
    x = (CELL - target_width) // 2
    y = max(0, CELL - config.bottom_padding - target_height)
    canvas.alpha_composite(resized, (x, y))
    return canvas


def write_state(state: str, config: StateSource) -> list[Path]:
    source = IMG_ROOT / config.filename
    if not source.exists():
        raise FileNotFoundError(f"Missing source GIF for {state}: {source}")

    frames = load_frames(source)
    bbox = union_alpha_bbox(frames)
    state_dir = FRAMES_ROOT / state
    if state_dir.exists():
        shutil.rmtree(state_dir)
    state_dir.mkdir(parents=True, exist_ok=True)

    written: list[Path] = []
    for index, frame in enumerate(frames):
        output = fit_frame(frame, bbox, config)
        path = state_dir / f"{state}_{index:03}.png"
        output.save(path)
        written.append(path)
    return written


def write_contact_sheet(name: str, states: tuple[str, ...]) -> None:
    SHEET_ROOT.mkdir(parents=True, exist_ok=True)
    label_h = 28
    columns = 6
    rows: list[Image.Image] = []

    for state in states:
        frame_paths = sorted((FRAMES_ROOT / state).glob("*.png"))[:columns]
        row = Image.new("RGBA", (CELL * columns, CELL + label_h), (255, 253, 248, 255))
        for index, path in enumerate(frame_paths):
            checker = Image.new("RGBA", (CELL, CELL), (239, 247, 236, 255))
            frame = Image.open(path).convert("RGBA")
            checker.alpha_composite(frame)
            row.alpha_composite(checker, (CELL * index, label_h))
        rows.append(row)

    sheet = Image.new("RGBA", (CELL * columns, (CELL + label_h) * len(rows)), (255, 253, 248, 255))
    for index, row in enumerate(rows):
        sheet.alpha_composite(row, (0, index * (CELL + label_h)))
    sheet.save(SHEET_ROOT / name)


def main() -> None:
    for state, config in STATE_SOURCES.items():
        written = write_state(state, config)
        print(f"{state}: {config.filename} -> {len(written)} png frames")
    write_contact_sheet("all-functional-states-preview.png", CORE_PREVIEW_STATES)
    write_contact_sheet("all-gif-states-preview.png", tuple(STATE_SOURCES))


if __name__ == "__main__":
    main()
