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
    python3 tools/placeholder_bg.py            # all rooms
    python3 tools/placeholder_bg.py act1_diner # one room
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

def living_room(im, d):
    # Architecture: interior doors cluster LEFT (office on the left wall,
    # bedroom doorway far-left of the back wall, deeper into the house);
    # the RIGHT rear corner is the exterior corner (window, then front
    # door on the right wall). Keep the real-art prompt in sync.
    vgrad(im, 0, 120, (188, 148, 112), (214, 176, 138))     # warm wall
    vgrad(im, 120, 180, (128, 88, 62), (96, 64, 46))        # wood floor
    d.rectangle(box(0, 116, 320, 121), fill=(150, 108, 78)) # baseboard
    # office door (left wall, warm glow within)
    rect(d, (2, 26, 28, 120), (64, 48, 44))
    rect(d, (6, 32, 24, 118), (196, 150, 96))
    # bedroom doorway (back wall far left, dark — deeper into the house)
    rect(d, (34, 20, 64, 112), (70, 52, 46))
    rect(d, (38, 26, 60, 112), (44, 34, 34))
    # photos
    for px, py in [(69, 24), (86, 24), (69, 42), (86, 42)]:
        rect(d, (px, py, px + 13, py + 14), (108, 84, 64))
        rect(d, (px + 2, py + 2, px + 11, py + 12), (222, 210, 188))
    # thermostat
    d.ellipse(box(104, 41, 118, 57), fill=(236, 234, 230), outline=(120, 120, 124), width=3)
    d.ellipse(box(108, 45, 114, 53), fill=(180, 190, 200))
    # TV + console
    rect(d, (122, 28, 186, 78), (34, 34, 44))
    d.ellipse(box(144, 42, 164, 58), fill=(70, 76, 96))     # cloud logo blob
    rect(d, (120, 78, 188, 96), (122, 88, 60))
    rect(d, (166, 80, 184, 94), (46, 60, 66))               # mesh node
    d.ellipse(box(172, 84, 176, 88), fill=(96, 210, 200))
    # speaker on shelf
    rect(d, (188, 68, 208, 72), (122, 88, 60))
    rect(d, (192, 48, 204, 68), (58, 58, 64))
    # window near the exterior corner (side yard + fence)
    rect(d, (210, 16, 252, 62), (110, 86, 66))
    rect(d, (213, 19, 249, 59), (170, 200, 220))
    d.rectangle(box(213, 44, 249, 59), fill=(128, 142, 96))
    d.rectangle(box(213, 38, 249, 46), fill=(150, 128, 96))  # fence
    # doorbell chime beside the door frame
    rect(d, (240, 68, 252, 86), (236, 232, 226))
    d.ellipse(box(243, 73, 249, 81), fill=(150, 160, 176))
    # DVD shelf + bike parked in front (right side)
    rect(d, (256, 16, 284, 70), (112, 80, 56))
    for row in (26, 42, 58):
        d.rectangle(box(259, row - 8, 281, row), fill=(90, 64, 46))
        for i in range(5):
            x = 260 + i * 4
            d.rectangle(box(x, row - 8, x + 3, row), fill=rng.choice([(160, 60, 50), (60, 100, 140), (196, 170, 90), (80, 130, 90)]))
    shadow(d, 254, 290, 130)
    rect(d, (258, 98, 288, 110), (70, 70, 80))              # bike frame
    rect(d, (266, 76, 284, 98), (40, 40, 48))               # tablet
    d.ellipse(box(256, 110, 270, 130), outline=(50, 50, 58), width=6)
    d.ellipse(box(276, 110, 290, 130), outline=(50, 50, 58), width=6)
    # front door (right wall — the exterior corner)
    rect(d, (292, 10, 318, 118), (128, 74, 52))
    rect(d, (296, 18, 314, 62), (108, 60, 42))
    rect(d, (296, 68, 314, 110), (108, 60, 42))
    d.ellipse(box(293, 62, 298, 68), fill=(210, 180, 90))
    # couch + plant
    shadow(d, 64, 158, 134)
    rect(d, (66, 96, 156, 128), (150, 96, 84))
    rect(d, (66, 118, 156, 134), (128, 80, 70))
    for cx in (88, 111, 134):
        rect(d, (cx - 10, 100, cx + 10, 118), (162, 106, 92))
    shadow(d, 2, 28, 124)
    rect(d, (10, 108, 22, 124), (150, 92, 60))
    d.ellipse(box(2, 86, 30, 112), fill=(78, 122, 66))


def bedroom(im, d):
    vgrad(im, 0, 120, (150, 138, 158), (182, 168, 182))     # dim lavender wall
    vgrad(im, 120, 180, (110, 92, 96), (86, 70, 76))        # carpet
    d.rectangle(box(0, 116, 320, 121), fill=(130, 116, 130))
    # closet + shelf of boxes/CRTs
    rect(d, (28, 2, 90, 18), (120, 100, 84))
    for bx in (30, 46, 62):
        rect(d, (bx, 5, bx + 14, 18), (168, 136, 96))
    for cx in (76, 84):
        rect(d, (cx - 4, 4, cx + 4, 18), (92, 92, 100))
    rect(d, (28, 18, 90, 112), (86, 70, 62))
    for i in range(6):                                       # hoodie rack
        x = 33 + i * 9
        rect(d, (x, 30, x + 7, 74), rng.choice([(90, 100, 120), (70, 80, 90), (100, 90, 110), (60, 70, 84)]))
    d.rectangle(box(28, 24, 90, 27), fill=(60, 48, 44))
    # window: blackout curtains
    rect(d, (96, 14, 140, 58), (70, 62, 84))
    d.rectangle(box(116, 16, 120, 56), fill=(240, 226, 180))  # light slit
    # diploma + nightstand
    rect(d, (98, 64, 116, 82), (120, 96, 60))
    rect(d, (101, 67, 113, 79), (238, 232, 214))
    shadow(d, 118, 142, 120)
    rect(d, (118, 76, 142, 120), (110, 84, 60))
    d.rectangle(box(118, 90, 142, 93), fill=(90, 66, 48))
    # bed + under-bed dark
    shadow(d, 142, 236, 138, 6)
    rect(d, (144, 118, 234, 136), (40, 32, 40))              # under-bed void
    rect(d, (144, 52, 234, 118), (150, 150, 170))            # mattress/duvet
    d.rectangle(box(144, 52, 234, 70), fill=(120, 120, 146)) # folded top
    for px_ in (152, 176):
        rect(d, (px_, 44, px_ + 22, 58), (222, 220, 226))    # pillows
    rect(d, (140, 36, 238, 52), (96, 74, 56))                # headboard
    # dresser + clock
    rect(d, (240, 40, 292, 120), (118, 90, 66))
    for yy in (58, 80, 102):
        d.rectangle(box(244, yy - 12, 288, yy), outline=(86, 64, 48), width=3)
        d.rectangle(box(262, yy - 7, 270, yy - 4), fill=(70, 52, 40))
    rect(d, (246, 26, 264, 40), (46, 46, 52))
    d.rectangle(box(249, 30, 261, 36), fill=(180, 60, 60))   # 12:00 glow
    # the chair (clothes pile)
    rect(d, (296, 84, 318, 124), (104, 84, 72))
    for i in range(7):
        x0 = 296 + rng.randint(0, 10)
        y0 = 60 + i * 7
        rect(d, (x0, y0, x0 + rng.randint(10, 20), y0 + 8), rng.choice([(140, 120, 110), (110, 120, 140), (150, 140, 110), (120, 100, 120)]))
    # doorway back
    rect(d, (2, 30, 26, 120), (70, 56, 50))
    rect(d, (6, 36, 22, 118), (150, 128, 108))


def main_street(im, d):
    vgrad(im, 0, 60, (150, 196, 228), (196, 220, 234))       # sky
    for cx, cy, wd in [(90, 8, 34), (190, 5, 26), (270, 10, 30)]:
        d.ellipse(box(cx, cy, cx + wd, cy + 9), fill=(240, 244, 246))
    vgrad(im, 60, 118, (196, 178, 158), (210, 192, 170))     # far facade tone
    vgrad(im, 118, 164, (176, 166, 158), (150, 140, 132))    # sidewalk
    vgrad(im, 164, 180, (92, 90, 94), (70, 68, 72))          # road
    for x in range(8, 320, 26):                               # crosswalk-ish dashes
        d.rectangle(box(x, 170, x + 12, 173), fill=(180, 178, 172))
    d.rectangle(box(0, 114, 320, 119), fill=(120, 112, 106)) # curbline
    # your house (left)
    rect(d, (0, 8, 46, 118), (176, 188, 196))                # vinyl siding
    for yy in range(16, 112, 8):
        d.line(sc((0, yy), (46, yy)), fill=(150, 162, 172), width=2)
    rect(d, (2, 28, 30, 118), (120, 70, 50))                 # front door
    d.ellipse(box(24, 70, 28, 75), fill=(210, 180, 90))
    rect(d, (32, 40, 44, 58), (240, 214, 150))               # lit office window
    # storefront strip
    rect(d, (46, 14, 300, 118), (188, 158, 128))
    d.rectangle(box(46, 14, 300, 24), fill=(150, 118, 92))   # cornice
    # candle shop
    rect(d, (100, 26, 150, 114), (166, 128, 96))
    rect(d, (104, 40, 146, 106), (244, 222, 168))
    for cxx in (112, 124, 136):
        rect(d, (cxx - 2, 66, cxx + 2, 84), (238, 232, 210))
    # for-lease ghosts
    rect(d, (152, 26, 196, 114), (150, 140, 130))
    rect(d, (156, 40, 192, 106), (108, 104, 100))
    rect(d, (162, 56, 186, 70), (218, 214, 202))             # FOR LEASE card
    # notice board
    rect(d, (198, 22, 224, 106), (110, 82, 56))
    rect(d, (201, 26, 221, 100), (196, 168, 120))
    for _ in range(7):
        x0 = 202 + rng.randint(0, 12)
        y0 = 28 + rng.randint(0, 60)
        rect(d, (x0, y0, x0 + 7, y0 + 9), rng.choice([(240, 240, 230), (230, 220, 170), (200, 220, 230)]))
    # diner
    rect(d, (226, 14, 280, 118), (170, 60, 54))
    rect(d, (228, 30, 278, 44), (240, 234, 210))             # sign band
    rect(d, (228, 48, 234, 112), (196, 190, 178))
    rect(d, (270, 48, 278, 112), (196, 190, 178))
    rect(d, (236, 46, 268, 118), (120, 140, 150))            # glass door bay
    d.rectangle(box(248, 70, 258, 118), fill=(96, 116, 128))
    # newspaper box + traffic light
    rect(d, (284, 88, 302, 122), (60, 90, 150))
    rect(d, (287, 92, 299, 104), (200, 208, 214))
    rect(d, (308, 8, 314, 118), (70, 72, 76))
    rect(d, (302, 8, 318, 44), (52, 54, 58))
    for i, yy in enumerate((14, 24, 34)):
        d.ellipse(box(306, yy, 314, yy + 8), fill=(70, 66, 64))
    # planter + bench + Gary
    rect(d, (88, 100, 112, 122), (128, 100, 76))
    d.ellipse(box(90, 92, 110, 104), fill=(130, 110, 130))
    shadow(d, 128, 174, 122)
    rect(d, (130, 100, 172, 106), (140, 104, 70))
    rect(d, (130, 108, 172, 122), (120, 88, 60))
    figure(d, 70, 126, 62, (150, 110, 70))
    d.line(sc((76, 108), (96, 118)), fill=(80, 110, 70), width=4)  # hose


def diner(im, d):
    vgrad(im, 0, 120, (208, 196, 168), (226, 214, 184))      # cream wall
    d.rectangle(box(0, 100, 320, 120), fill=(120, 150, 140)) # wainscot band
    for y0 in range(120, 180, 12):                            # checker floor
        for x0 in range(0, 320, 12):
            if ((x0 + y0) // 12) % 2 == 0:
                d.rectangle(box(x0, y0, x0 + 12, y0 + 12), fill=(210, 204, 190))
            else:
                d.rectangle(box(x0, y0, x0 + 12, y0 + 12), fill=(140, 60, 56))
    # door + corkboard
    rect(d, (2, 26, 28, 118), (150, 160, 168))
    rect(d, (6, 32, 24, 90), (190, 210, 220))
    rect(d, (32, 30, 58, 74), (110, 82, 56))
    for _ in range(6):
        x0 = 34 + rng.randint(0, 16)
        y0 = 33 + rng.randint(0, 32)
        rect(d, (x0, y0, x0 + 7, y0 + 8), (238, 234, 220))
    # specials board + TV
    rect(d, (126, 8, 176, 40), (40, 48, 44))
    for yy in (16, 24, 32):
        d.line(sc((131, yy), (171, yy)), fill=(220, 220, 200), width=3)
    rect(d, (214, 6, 258, 36), (50, 50, 58))
    d.ellipse(box(228, 14, 244, 28), fill=(84, 92, 112))
    # back counter + urn + pie case + POS + napkins
    d.rectangle(box(96, 42, 264, 92), fill=(196, 180, 150))
    rect(d, (160, 48, 184, 88), (170, 172, 178))             # urn
    d.ellipse(box(166, 44, 178, 52), fill=(150, 152, 158))
    rect(d, (100, 60, 124, 88), (200, 214, 220))             # pie case
    d.rectangle(box(103, 74, 121, 86), fill=(190, 130, 80))
    rect(d, (190, 56, 212, 90), (60, 60, 70))                # POS tablet
    rect(d, (193, 62, 209, 78), (120, 130, 150))
    rect(d, (216, 74, 230, 90), (188, 190, 196))             # napkins
    # counter + stools
    rect(d, (100, 88, 260, 112), (216, 208, 190))
    d.rectangle(box(100, 88, 260, 94), fill=(232, 226, 208))
    rect(d, (100, 112, 260, 126), (150, 120, 90))
    for cx in (116, 148, 180, 212, 246):
        rect(d, (cx - 5, 126, cx + 5, 130), (170, 60, 56))
        rect(d, (cx - 2, 130, cx + 2, 142), (120, 122, 128))
    # booths
    for bx in (30, 64):
        rect(d, (bx, 92, bx + 30, 140), (94, 130, 106))
        rect(d, (bx + 4, 84, bx + 26, 92), (114, 150, 122))
    # jukebox
    shadow(d, 284, 320, 124)
    rect(d, (286, 48, 318, 124), (150, 90, 60))
    d.ellipse(box(292, 52, 312, 72), fill=(240, 190, 110))
    rect(d, (292, 84, 312, 108), (90, 60, 46))
    # people
    figure(d, 136, 92, 52, (120, 150, 180))                   # Darlene
    figure(d, 249, 128, 80, (150, 80, 70), hair=(190, 190, 190))  # Merle on stool
    rect(d, (240, 100, 258, 104), (120, 122, 128))


def edge_of_town(im, d):
    vgrad(im, 0, 100, (232, 176, 128), (244, 210, 160))      # warm dusk sky
    vgrad(im, 100, 180, (128, 120, 118), (96, 90, 90))       # asphalt
    d.rectangle(box(0, 118, 320, 122), fill=(150, 142, 138))
    # plaza
    rect(d, (40, 10, 280, 102), (196, 186, 172))
    d.rectangle(box(40, 10, 280, 22), fill=(150, 140, 128))
    # units: tanning, tax, vacancy, nails, vacancy, gray door
    rect(d, (44, 26, 58, 98), (150, 148, 140))
    # nail salon: warm glow
    rect(d, (60, 24, 140, 98), (160, 120, 120))
    rect(d, (64, 30, 136, 94), (248, 190, 170))
    figure(d, 100, 92, 34, (200, 120, 140))
    rect(d, (66, 26, 134, 34), (230, 100, 130))              # sign band
    # vacancies
    rect(d, (144, 26, 176, 98), (140, 136, 130))
    rect(d, (228, 26, 258, 98), (140, 136, 130))
    # the gray door + fan
    rect(d, (180, 30, 224, 104), (134, 136, 140))
    d.rectangle(box(184, 34, 220, 100), outline=(110, 112, 118), width=3)
    rect(d, (188, 10, 216, 28), (90, 92, 98))
    for i in range(4):
        d.line(sc((190, 13 + i * 4), (214, 13 + i * 4)), fill=(130, 132, 138), width=2)
    d.rectangle(box(198, 62, 204, 70), fill=(90, 92, 98))    # lock plate
    rect(d, (196, 44, 208, 52), (176, 178, 184))             # the sticker
    # dumpster + weeds + pylon
    shadow(d, 238, 302, 128, 6)
    rect(d, (240, 78, 300, 122), (70, 110, 90))
    d.rectangle(box(240, 78, 300, 88), fill=(60, 96, 78))
    rect(d, (246, 66, 268, 80), (170, 150, 120))             # switch box
    for wx in (12, 20, 28):
        d.line(sc((wx, 124), (wx - 3, 92)), fill=(96, 128, 70), width=3)
        d.line(sc((wx, 124), (wx + 4, 98)), fill=(110, 140, 80), width=3)
    rect(d, (298, 6, 318, 100), (110, 106, 112))
    rect(d, (301, 12, 315, 40), (200, 196, 186))             # sign panel
    rect(d, (301, 44, 315, 58), (244, 200, 190))             # lit salon panel
    rect(d, (301, 62, 315, 76), (236, 236, 232))             # the blank panel


ROOMS = {
    "act1_living_room": living_room,
    "act1_bedroom": bedroom,
    "act1_main_street": main_street,
    "act1_diner": diner,
    "act1_edge_of_town": edge_of_town,
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
