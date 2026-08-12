#!/usr/bin/env python3
"""
DEV PLACEHOLDER backgrounds — NOT the art pipeline.

Canon art comes from the one ChatGPT generator (see GDD.md + PROMPTS.md),
saved to assets/source/, then treated with tools/treat_bg.py. This script
paints stage-set stand-ins so rooms are playable before that art lands.
Geometry matches the hotspot/walkable polygons in data/rooms/*.json — when
real art arrives, re-fit polygons with ?dev=1 and delete the matching
assets/source/<room>_placeholder.png.

Usage:
    python3 tools/placeholder_bg.py             # all placeholder-era rooms
    python3 tools/placeholder_bg.py act2_salon  # one room

SAFETY RULE: a room is registered in ROOMS only while it is waiting for
the generator. The moment its real background lands, its painter comes
OUT — otherwise a bare run of this script regenerates stand-ins over canon
art. Acts 1, 2 and 3 have all graduated, so ROOMS is currently empty and
the script is inert by design. (Act 2's painters outlived its art pass by
a milestone and were removed at the M5 close-out; don't repeat that.)
"""
import random
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
S = 4  # render scale: 320x180 * 4 = 1280x720
W, H = 320 * S, 180 * S
rng = random.Random(1961)


def sc(*pts):
    return [(x * S, y * S) for x, y in pts]


def box(x0, y0, x1, y1):
    return (x0 * S, y0 * S, x1 * S, y1 * S)


def vgrad(im, y0, y1, top, bottom):
    d = ImageDraw.Draw(im)
    for y in range(y0 * S, y1 * S):
        t = (y - y0 * S) / max(1, (y1 - y0) * S)
        c = tuple(int(a + (b - a) * t) for a, b in zip(top, bottom))
        d.line([(0, y), (W, y)], fill=c)


def shade(color, f):
    return tuple(max(0, min(255, int(c * f))) for c in color)


def rect(d, b, color, outline_f=0.72, width=2):
    d.rectangle(box(*b), fill=color, outline=shade(color, outline_f), width=width)


def shadow(d, x0, x1, y, h=4):
    d.ellipse(box(x0, y - h // 2, x1, y + h // 2), fill=(28, 22, 30))


def figure(d, cx, feet, h, shirt, skin=(214, 172, 138), hair=(72, 58, 48)):
    """Blocky placeholder person, feet at (cx, feet), height h."""
    w = h * 0.42
    legs_h = h * 0.42
    torso_h = h * 0.38
    head = h * 0.2
    shadow(d, cx - w * 0.7, cx + w * 0.7, feet)
    rect(d, (cx - w * 0.45, feet - legs_h, cx + w * 0.45, feet), shade(shirt, 0.55))
    rect(d, (cx - w * 0.55, feet - legs_h - torso_h, cx + w * 0.55, feet - legs_h), shirt)
    rect(d, (cx - head * 0.42, feet - h, cx + head * 0.42, feet - h + head), skin)
    rect(d, (cx - head * 0.42, feet - h, cx + head * 0.42, feet - h + head * 0.38), hair)


def texture(im, amount=9):
    px = im.load()
    for _ in range(W * H // 6):
        x = rng.randrange(W)
        y = rng.randrange(H)
        r, g, b = px[x, y][:3]
        n = rng.randint(-amount, amount)
        px[x, y] = (max(0, min(255, r + n)), max(0, min(255, g + n)), max(0, min(255, b + n)))
    return im.filter(ImageFilter.GaussianBlur(1.1))


# ---- rooms ----------------------------------------------------------------

ROOMS = {
    # Empty on purpose: every shipped room now has real art. A room is
    # registered here only while it is waiting for the generator, and is
    # deregistered the moment its real background lands — otherwise a bare
    # `python3 tools/placeholder_bg.py` regenerates stand-ins straight over
    # canon backgrounds. Act 4 adds its painters here, then removes them.
}


def build(room_id):
    im = Image.new("RGB", (W, H), (20, 20, 24))
    d = ImageDraw.Draw(im)
    ROOMS[room_id](im, d)
    im = texture(im)
    src = ROOT / "assets" / "source" / f"{room_id}_placeholder.png"
    out = ROOT / "assets" / "backgrounds" / f"{room_id}.png"
    src.parent.mkdir(parents=True, exist_ok=True)
    im.save(src)
    subprocess.run(
        [sys.executable, str(ROOT / "tools" / "treat_bg.py"), str(src), str(out)],
        check=True,
    )


if __name__ == "__main__":
    targets = sys.argv[1:] or list(ROOMS)
    for room_id in targets:
        build(room_id)
