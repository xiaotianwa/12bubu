from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
FRAMES_ROOT = ROOT / "public" / "pet" / "frames"
SHEET_ROOT = ROOT / "assets" / "generated-state-sheets"
SCALE = 4
CELL = 256


@dataclass(frozen=True)
class Bear:
    x: int
    y: int
    body: str
    cheek: str
    ear: str
    scale: float = 1.0


STATES = ("softIdle", "note", "focus", "reminder", "shortcut", "settings")


def s(value: float) -> int:
    return round(value * SCALE)


def canvas() -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGBA", (CELL * SCALE, CELL * SCALE), (0, 0, 0, 0))
    return image, ImageDraw.Draw(image)


def ellipse(draw: ImageDraw.ImageDraw, box: tuple[float, float, float, float], fill: str, outline: str = "#5b382f", width: int = 4) -> None:
    draw.ellipse(tuple(s(v) for v in box), fill=fill, outline=outline, width=s(width))


def line(draw: ImageDraw.ImageDraw, points: list[tuple[float, float]], fill: str = "#5b382f", width: int = 4) -> None:
    draw.line([(s(x), s(y)) for x, y in points], fill=fill, width=s(width), joint="curve")


def rounded(draw: ImageDraw.ImageDraw, box: tuple[float, float, float, float], radius: float, fill: str, outline: str = "#5b382f", width: int = 4) -> None:
    draw.rounded_rectangle(tuple(s(v) for v in box), radius=s(radius), fill=fill, outline=outline, width=s(width))


def mouth(draw: ImageDraw.ImageDraw, x: float, y: float, happy: float = 1.0) -> None:
    line(draw, [(x - 4, y), (x, y + 4 * happy), (x + 4, y)], width=3)
    line(draw, [(x, y + 4 * happy), (x, y + 8 * happy)], fill="#f47f88", width=2)


def draw_bear(draw: ImageDraw.ImageDraw, bear: Bear, frame: int, mood: str) -> None:
    bob = [0, 1.5, 0, -1][frame]
    wave = [-2, 0, 2, 0][frame]
    x = bear.x
    y = bear.y + bob
    k = bear.scale
    outline = "#5b382f"

    # Feet and body.
    ellipse(draw, (x - 31 * k, y + 66 * k, x - 8 * k, y + 81 * k), bear.ear, outline, 3)
    ellipse(draw, (x + 8 * k, y + 66 * k, x + 31 * k, y + 81 * k), bear.ear, outline, 3)
    ellipse(draw, (x - 34 * k, y + 22 * k, x + 34 * k, y + 78 * k), bear.body, outline, 4)

    # Head and ears.
    ellipse(draw, (x - 42 * k, y - 48 * k, x + 42 * k, y + 36 * k), bear.body, outline, 4)
    ellipse(draw, (x - 42 * k, y - 52 * k, x - 20 * k, y - 30 * k), bear.ear, outline, 4)
    ellipse(draw, (x + 20 * k, y - 52 * k, x + 42 * k, y - 30 * k), bear.ear, outline, 4)

    # Arms.
    if mood in {"note", "shortcut", "settings"}:
        line(draw, [(x - 30 * k, y + 24 * k), (x - 48 * k, y + (35 + wave) * k)], outline, 5)
        line(draw, [(x + 30 * k, y + 24 * k), (x + 45 * k, y + (30 - wave) * k)], outline, 5)
    elif mood == "reminder":
        line(draw, [(x - 31 * k, y + 25 * k), (x - 46 * k, y + (16 - wave) * k)], outline, 5)
        line(draw, [(x + 31 * k, y + 25 * k), (x + 43 * k, y + 34 * k)], outline, 5)
    else:
        line(draw, [(x - 31 * k, y + 25 * k), (x - 45 * k, y + 36 * k)], outline, 5)
        line(draw, [(x + 31 * k, y + 25 * k), (x + 45 * k, y + (34 + wave) * k)], outline, 5)

    # Face.
    if mood == "focus" and frame in (1, 2):
        line(draw, [(x - 21 * k, y - 7 * k), (x - 12 * k, y - 5 * k)], outline, 3)
        line(draw, [(x + 12 * k, y - 5 * k), (x + 21 * k, y - 7 * k)], outline, 3)
    else:
        ellipse(draw, (x - 22 * k, y - 10 * k, x - 13 * k, y - 1 * k), outline, outline, 1)
        ellipse(draw, (x + 13 * k, y - 10 * k, x + 22 * k, y - 1 * k), outline, outline, 1)
    ellipse(draw, (x - 36 * k, y + 2 * k, x - 17 * k, y + 22 * k), bear.cheek, bear.cheek, 1)
    ellipse(draw, (x + 17 * k, y + 2 * k, x + 36 * k, y + 22 * k), bear.cheek, bear.cheek, 1)
    mouth(draw, x, y + 7 * k, 0.9)


def draw_prop(draw: ImageDraw.ImageDraw, state: str, frame: int) -> None:
    pulse = [-1, 1, 2, 0][frame]
    if state == "note":
        rounded(draw, (103, 126 + pulse, 152, 165 + pulse), 8, "#fff0a8", width=4)
        line(draw, [(113, 139 + pulse), (141, 139 + pulse)], width=3)
        line(draw, [(113, 151 + pulse), (134, 151 + pulse)], width=3)
        line(draw, [(162, 143 - pulse), (183, 124 - pulse)], fill="#5b382f", width=5)
        line(draw, [(180, 126 - pulse), (188, 118 - pulse)], fill="#f4a261", width=5)
    elif state == "focus":
        ellipse(draw, (101, 121, 155, 175), "#fffdf8", width=5)
        line(draw, [(128, 130), (128 + pulse * 2, 148), (139, 154)], width=4)
        line(draw, [(112, 111), (105, 102)], width=4)
        line(draw, [(144, 111), (151, 102)], width=4)
    elif state == "reminder":
        rounded(draw, (103, 126 + pulse, 132, 173 + pulse), 9, "#dff3ff", width=4)
        line(draw, [(108, 142 + pulse), (126, 142 + pulse)], width=3)
        line(draw, [(108, 155 + pulse), (124, 155 + pulse)], width=3)
        ellipse(draw, (144, 124 - pulse, 175, 154 - pulse), "#fff1a9", width=4)
        line(draw, [(159, 154 - pulse), (159, 164 - pulse)], width=4)
    elif state == "shortcut":
        rounded(draw, (100, 131 + pulse, 160, 171 + pulse), 11, "#dff2c7", width=4)
        line(draw, [(116, 131 + pulse), (116, 120 + pulse), (144, 120 + pulse), (144, 131 + pulse)], width=4)
        ellipse(draw, (124, 143 + pulse, 136, 155 + pulse), "#f7bbb7", width=3)
    elif state == "settings":
        ellipse(draw, (107, 127, 151, 171), "#dff3ff", width=5)
        ellipse(draw, (121, 141, 137, 157), "#fffdf8", width=4)
        for dx, dy in [(0, -27), (0, 27), (-27, 0), (27, 0)]:
            line(draw, [(129, 149), (129 + dx * 0.55, 149 + dy * 0.55)], width=5)
        line(draw, [(158, 163 - pulse), (184, 137 - pulse)], width=5)
    else:
        # A tiny shared breath mark attached to the pair, kept subtle.
        ellipse(draw, (118, 144 + pulse, 138, 164 + pulse), "#fff1a9", width=4)


def make_frame(state: str, frame: int) -> Image.Image:
    image, draw = canvas()
    brown = Bear(82, 102, "#d8a080", "#ffd28a", "#4a3029", 0.82)
    white = Bear(171, 103, "#fffdf8", "#f7bbb7", "#4a3029", 0.82)
    draw_bear(draw, brown, frame, state)
    draw_bear(draw, white, frame, state)
    draw_prop(draw, state, frame)
    return image.resize((CELL, CELL), Image.Resampling.LANCZOS)


def write_state(state: str) -> None:
    state_dir = FRAMES_ROOT / state
    state_dir.mkdir(parents=True, exist_ok=True)
    frames = []
    for frame in range(4):
        image = make_frame(state, frame)
        png = state_dir / f"{state}_{frame:03}.png"
        webp = state_dir / f"{state}_{frame:03}.webp"
        image.save(png)
        image.save(webp, "WEBP", quality=88, method=6, lossless=False)
        frames.append(image)

    SHEET_ROOT.mkdir(parents=True, exist_ok=True)
    sheet = Image.new("RGBA", (CELL * 4, CELL), (0, 255, 0, 255))
    for index, frame in enumerate(frames):
        sheet.alpha_composite(frame, (index * CELL, 0))
    sheet.save(SHEET_ROOT / f"{state}-sheet.png")


def main() -> None:
    for state in STATES:
        write_state(state)
    print(f"generated={len(STATES)} states")


if __name__ == "__main__":
    main()
