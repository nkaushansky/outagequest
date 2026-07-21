#!/usr/bin/env python3
"""Compile the hand-pixeled character grids into sprite sheets.

    python3 tools/sprites/build_sprites.py [--preview DIR]

Reads every character module in chars/ (each exposes build() ->
{sheet_name: rows of RGBA frames}), packs sheets, and writes:

  assets/sprites/<sheet_name>.png     — engine-consumed sheets, true scale
  assets/source/character_reference.png — the cast reference sheet
                                          (CHARACTERS.md points here)

With --preview DIR it also renders 6x contact sheets per character onto
room-floor swatches — the artist's iteration loop, never shipped.
"""

import argparse
import importlib
import pathlib
import sys

from PIL import Image

TOOL_DIR = pathlib.Path(__file__).resolve().parent
REPO = TOOL_DIR.parent.parent
sys.path.insert(0, str(TOOL_DIR))

import spritelib  # noqa: E402

CHAR_MODULES = ["mel", "gary", "darlene", "merle"]

# Floor tones sampled from treated backgrounds — preview + reference
# swatches so palette discipline is checked against real ground colors.
SWATCHES = {
    "office": (150, 108, 60),
    "street": (188, 164, 128),
    "diner": (196, 176, 140),
    "bedroom": (96, 72, 60),
}


def build_all():
    sheets = {}
    for name in CHAR_MODULES:
        mod = importlib.import_module(f"chars.{name}")
        for sheet_name, rows in mod.build().items():
            if sheet_name in sheets:
                raise ValueError(f"duplicate sheet name {sheet_name}")
            sheets[sheet_name] = rows
    return sheets


def write_sheets(sheets, out_dir):
    out_dir.mkdir(parents=True, exist_ok=True)
    for name, rows in sheets.items():
        img = spritelib.sheet(rows)
        img.save(out_dir / f"{name}.png")
        print(f"  {name}.png  {img.width}x{img.height}")


def _strip(frames, pad=6, bg=(58, 50, 44, 255)):
    h = max(f.height for f in frames)
    w = sum(f.width for f in frames) + pad * (len(frames) + 1)
    strip = Image.new("RGBA", (w, h + 2 * pad), bg)
    x = pad
    for f in frames:
        strip.alpha_composite(f, (x, pad + h - f.height))
        x += f.width + pad
    return strip


def reference_sheet(sheets):
    """The style bible's plate (CHARACTERS.md): the whole cast's idles at
    1x and 3x, plus Mel's right-facing walk row at 3x."""
    order = ["mel_base", "mel_pants", "mel_coat", "mel_coat_pants",
             "gary", "darlene", "merle"]
    cast = _strip([sheets[n][0][0] for n in order if n in sheets])
    bands = [cast, cast.resize((cast.width * 3, cast.height * 3),
                               Image.NEAREST)]
    if "mel_base" in sheets:
        walk = _strip(sheets["mel_base"][2])  # right-facing row: idle + 6
        bands.append(walk.resize((walk.width * 3, walk.height * 3),
                                 Image.NEAREST))
    pad = 6
    out = Image.new("RGBA", (max(b.width for b in bands),
                             sum(b.height for b in bands) + pad * (len(bands) - 1)),
                    (58, 50, 44, 255))
    y = 0
    for b in bands:
        out.paste(b, (0, y))
        y += b.height + pad
    return out


def previews(sheets, preview_dir):
    preview_dir.mkdir(parents=True, exist_ok=True)
    for name, rows in sheets.items():
        img = spritelib.sheet(rows)
        for room, tone in SWATCHES.items():
            on = Image.new("RGBA", img.size, (*tone, 255))
            on.alpha_composite(img)
            big = on.resize((img.width * 6, img.height * 6), Image.NEAREST)
            big.save(preview_dir / f"{name}_{room}.png")
    print(f"  previews -> {preview_dir}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--preview", metavar="DIR")
    ap.add_argument("--only", help="build a single character module")
    args = ap.parse_args()

    global CHAR_MODULES
    if args.only:
        CHAR_MODULES = [args.only]

    sheets = build_all()
    print("sheets:")
    write_sheets(sheets, REPO / "assets" / "sprites")
    if not args.only:
        ref = reference_sheet(sheets)
        ref_path = REPO / "assets" / "source" / "character_reference.png"
        ref.save(ref_path)
        print(f"  character_reference.png  {ref.width}x{ref.height}")
    if args.preview:
        previews(sheets, pathlib.Path(args.preview))


if __name__ == "__main__":
    main()
