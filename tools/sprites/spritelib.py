"""Sprite compiler library — the character counterpart of treat_bg.py.

Characters are HAND-PIXELED: every visible pixel is typed by hand in a
grid (a multiline string, one character per pixel) inside a character
module under chars/. This library only assembles what the artist typed:
it parses grids, layers parts onto frames, mirrors side views, and packs
frames into PNG sheets. It never invents pixels.

Grid format:
  - one character per pixel, '.' (or space) = transparent
  - every other character must appear in the module's KEY table, which
    maps it to a master-palette color name (see chars/_master_palette.py)
    or a raw (r, g, b[, a]) tuple
  - rows may be ragged; short rows are padded with transparency

Frames are painter-ordered lists of (grid, x, y [, recolor]) placements.
`recolor` maps palette color names to other color names — used to draw
far-side limbs in ramp shadow tones without hand-typing a second grid.
"""

from PIL import Image

from chars._master_palette import PALETTE


def parse_grid(text, key):
    """Multiline pixel string -> {(x, y): rgba} using the module KEY."""
    rows = [line for line in text.splitlines() if line.strip("\n") != ""]
    # Leading/trailing all-dot lines are meaningful (artists align parts
    # vertically), so only drop lines that are entirely empty strings.
    pixels = {}
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch in (".", " "):
                continue
            if ch not in key:
                raise KeyError(f"grid uses unmapped char {ch!r} at {x},{y}")
            pixels[(x, y)] = key[ch]
    w = max((x for x, _ in pixels), default=-1) + 1
    h = max((y for _, y in pixels), default=-1) + 1
    return {"px": pixels, "w": w, "h": h}


def resolve_color(name_or_rgb, recolor=None):
    """Palette name (or raw tuple) -> rgba tuple."""
    v = name_or_rgb
    if recolor and isinstance(v, str) and v in recolor:
        v = recolor[v]
    if isinstance(v, str):
        v = PALETTE[v]
    if len(v) == 3:
        v = (*v, 255)
    return v


def compose(frame_w, frame_h, placements):
    """Layer parts onto a transparent frame. placements: iterable of
    (grid, x, y) or (grid, x, y, recolor) — painter order, later wins."""
    img = Image.new("RGBA", (frame_w, frame_h), (0, 0, 0, 0))
    for placement in placements:
        grid, ox, oy = placement[0], placement[1], placement[2]
        recolor = placement[3] if len(placement) > 3 else None
        for (x, y), color in grid["px"].items():
            px, py = ox + x, oy + y
            if 0 <= px < frame_w and 0 <= py < frame_h:
                img.putpixel((px, py), resolve_color(color, recolor))
    return img


def mirror(frame):
    """Right-facing frame -> left-facing frame."""
    return frame.transpose(Image.FLIP_LEFT_RIGHT)


def sheet(rows):
    """rows: list of lists of equal-size RGBA frames -> packed sheet."""
    fw, fh = rows[0][0].size
    out = Image.new("RGBA", (fw * max(len(r) for r in rows), fh * len(rows)),
                    (0, 0, 0, 0))
    for ry, row in enumerate(rows):
        for cx, frame in enumerate(row):
            if frame.size != (fw, fh):
                raise ValueError("all frames in a sheet must share one size")
            out.paste(frame, (cx * fw, ry * fh))
    return out


def upscale(img, factor=4, bg=None):
    """Nearest-neighbor preview enlargement, optionally on a flat bg."""
    if bg is not None:
        base = Image.new("RGBA", img.size, (*bg, 255))
        base.alpha_composite(img)
        img = base
    return img.resize((img.width * factor, img.height * factor),
                      Image.NEAREST)
