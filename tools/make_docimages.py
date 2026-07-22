#!/usr/bin/env python3
"""
SPOF document images: treated crops of existing background art.

Document close-ups (schema.md `document` action) may carry a photo, and
the canon trick is that those photos ARE the game's own backgrounds —
cropped and re-treated (sepia for an aged clipping, halftone-gray for
fresh newsprint). Free continuity: the Gazette's plaza photo is the
edge-of-town art the player is standing in.

Deterministic: every image is declared in DERIVATIONS below and rebuilt
from the canonical treated backgrounds. Re-run after any background
regeneration:

    python3 tools/make_docimages.py

Requires: Pillow (pip install pillow)
"""
from pathlib import Path
from PIL import Image, ImageEnhance, ImageOps

ROOT = Path(__file__).resolve().parent.parent
BG = ROOT / "assets" / "backgrounds"
OUT = ROOT / "assets" / "documents"


def sepia(im: Image.Image) -> Image.Image:
    """Aged-clipping treatment: warm duotone, faded blacks, sun-bleached."""
    g = ImageOps.autocontrast(im.convert("L"), cutoff=2)
    toned = ImageOps.colorize(g, black=(72, 54, 30), white=(228, 208, 160))
    return ImageEnhance.Contrast(toned).enhance(0.9)


def newsprint(im: Image.Image) -> Image.Image:
    """Fresh-paper photo: gray halftone feel — desaturated, lifted, coarse."""
    g = ImageOps.autocontrast(im.convert("L"), cutoff=1)
    toned = ImageOps.colorize(g, black=(40, 38, 34), white=(226, 220, 202))
    return ImageEnhance.Contrast(toned).enhance(0.92)


# name -> (source background, crop box in 320x180 space, treatment)
DERIVATIONS = {
    # The Gazette install-story photo on the diner corkboard: the plaza,
    # years younger, same door. (Caption text carries the lockbox clue.)
    "gazette_plaza.png": ("act1_edge_of_town.png", (56, 22, 312, 150), sepia),
    # This week's front page: Main Street, reporting the sky still up.
    "gazette_main_street.png": ("act1_main_street.png", (58, 30, 314, 158), newsprint),
}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, (src, box, treat) in DERIVATIONS.items():
        im = Image.open(BG / src).convert("RGB").crop(box)
        treated = treat(im)
        # Quantize hard like everything else in this game — the photo has
        # to read as the same 128-color world it was cut from.
        q = treated.quantize(colors=48, method=Image.Quantize.MEDIANCUT,
                             dither=Image.Dither.FLOYDSTEINBERG)
        q.convert("RGB").save(OUT / name, optimize=True)
        print(f"wrote assets/documents/{name} ({box[2]-box[0]}x{box[3]-box[1]})")


if __name__ == "__main__":
    main()
