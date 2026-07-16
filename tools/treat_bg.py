#!/usr/bin/env python3
"""
SPOF background treatment: source art -> canonical 320x180 game asset.

Pipeline: center-crop to 16:9 -> Lanczos downscale to 320x180 ->
quantize to 128 colors (median cut) with Floyd-Steinberg dithering.
The engine upscales at runtime with nearest-neighbor (image-rendering:
pixelated), so assets are stored at true internal resolution.

Usage:
    python3 tools/treat_bg.py <source.png> <out.png> [--colors 128] [--no-dither]

Requires: Pillow (pip install pillow)
"""
import argparse
from PIL import Image

INTERNAL = (320, 180)

def crop_16_9(im: Image.Image) -> Image.Image:
    w, h = im.size
    target = 16 / 9
    if w / h > target:
        nw = int(h * target)
        x = (w - nw) // 2
        return im.crop((x, 0, x + nw, h))
    nh = int(w / target)
    y = (h - nh) // 2
    return im.crop((0, y, w, y + nh))

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("source")
    ap.add_argument("out")
    ap.add_argument("--colors", type=int, default=128)
    ap.add_argument("--no-dither", action="store_true")
    args = ap.parse_args()

    im = crop_16_9(Image.open(args.source).convert("RGB"))
    small = im.resize(INTERNAL, Image.LANCZOS)
    q = small.quantize(
        colors=args.colors,
        method=Image.Quantize.MEDIANCUT,
        dither=Image.Dither.NONE if args.no_dither else Image.Dither.FLOYDSTEINBERG,
    )
    q.convert("RGB").save(args.out, optimize=True)
    print(f"wrote {args.out} ({INTERNAL[0]}x{INTERNAL[1]}, {args.colors} colors)")

if __name__ == "__main__":
    main()
