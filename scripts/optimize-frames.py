from __future__ import annotations

import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
FRAMES_ROOT = ROOT / "public" / "pet" / "frames"

FRAME_MS = {
    "softIdle": 160,
    "note": 140,
    "focus": 160,
    "reminder": 140,
    "shortcut": 140,
    "settings": 150,
    "idle": 80,
    "happy": 76,
    "bite": 129,
    "eyeRoll": 60,
    "sleep": 178,
    "walkDog": 100,
    "ride": 98,
    "spin": 108,
    "silly": 100,
}

ALIASES = {
    "idle": "softIdle",
    "blink": "softIdle",
    "buddy": "softIdle",
    "slack": "softIdle",
    "work": "focus",
    "drag": "softIdle",
    "feed": "bite",
    "angry": "eyeRoll",
    "comfySleep": "sleep",
    "recharge": "sleep",
    "patrol": "walkDog",
    "dance": "happy",
    "celebrate": "happy",
    "walk": "walkDog",
    "shy": "silly",
}


def public_path(path: Path) -> str:
    return path.relative_to(ROOT / "public").as_posix()


def main() -> None:
    converted = 0
    saved_bytes = 0

    for png in FRAMES_ROOT.glob("*/*.png"):
        webp = png.with_suffix(".webp")
        with Image.open(png) as image:
            image.save(webp, "WEBP", quality=86, method=6, lossless=False)
        converted += 1
        saved_bytes += png.stat().st_size - webp.stat().st_size

    animations: dict[str, dict[str, object]] = {}
    for folder in sorted(path for path in FRAMES_ROOT.iterdir() if path.is_dir()):
        files = sorted(folder.glob("*.webp"))
        if not files:
            continue

        name = folder.name
        animations[name] = {
            "name": f"{name} optimized WebP frames",
            "frameMs": FRAME_MS.get(name, 100),
            "loop": True,
            "format": "webp",
            "frames": [public_path(path) for path in files],
        }

    for alias, target in ALIASES.items():
        if target not in animations:
            continue
        item = dict(animations[target])
        item["name"] = f"{alias} alias of {target}"
        item["aliasOf"] = target
        animations[alias] = item

    manifest = {
        "version": 2,
        "cell": {"width": 256, "height": 256},
        "preferredFormat": "webp",
        "fallbackFormat": "png",
        "notes": "Optimized WebP frames generated from retained PNG extracts. PNG frames remain for development fallback and source review.",
        "animations": animations,
    }

    (FRAMES_ROOT / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(f"converted={converted}")
    print(f"estimated_saved_bytes={saved_bytes}")


if __name__ == "__main__":
    main()
