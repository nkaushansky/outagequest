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

Act 1's five rooms graduated to real art in the M3 art pass — their
painters were removed from ROOMS so this script can never overwrite
canon backgrounds. Act 2 lives here until its art lands.
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

def salon(im, d):
    # Kim's Nails: warm pink interior. Back wall L->R: curtained staff
    # doorway (far left edge), polish wall, service counter with the pod
    # coffee machine + rotary phone, Kim's manicure table (mirror behind),
    # Dot's bonnet dryer chair, window to the dusk lot, front door right.
    vgrad(im, 0, 116, (214, 168, 168), (232, 192, 186))       # rose wall
    vgrad(im, 116, 180, (176, 150, 142), (140, 116, 110))     # tile floor
    d.rectangle(box(0, 112, 320, 117), fill=(190, 150, 146))
    # staff curtain (left edge, to the service corridor)
    rect(d, (0, 26, 18, 112), (110, 70, 84))
    for cx_ in (3, 8, 13):
        d.line(sc((cx_, 30), (cx_, 110)), fill=(90, 56, 70), width=2)
    # polish wall: shelves of tiny bottles
    rect(d, (22, 22, 70, 84), (150, 110, 104))
    for row in (34, 48, 62, 76):
        d.rectangle(box(24, row - 3, 68, row), fill=(120, 86, 84))
        for i in range(9):
            x = 25 + i * 5
            d.rectangle(box(x, row - 9, x + 3, row - 3),
                        fill=rng.choice([(214, 60, 90), (240, 140, 160), (150, 40, 60),
                                         (240, 200, 120), (120, 60, 140), (230, 230, 220)]))
    # service counter: pod machine + rotary phone
    rect(d, (74, 62, 122, 108), (166, 128, 108))
    rect(d, (78, 40, 100, 62), (60, 62, 70))                  # pod machine
    d.rectangle(box(82, 44, 96, 50), fill=(120, 200, 190))    # smug lit screen
    rect(d, (104, 48, 120, 62), (190, 60, 60))                # rotary phone
    d.ellipse(box(107, 50, 117, 60), fill=(230, 220, 210))
    # Kim's manicure table, mirror behind
    rect(d, (136, 20, 196, 62), (200, 210, 214))              # mirror
    rect(d, (130, 76, 196, 104), (222, 214, 206))             # table
    rect(d, (134, 66, 154, 76), (240, 236, 228))              # gel lamp
    d.rectangle(box(138, 70, 150, 74), fill=(150, 190, 240))
    # Dot's dryer chair (bonnet)
    shadow(d, 206, 252, 122)
    rect(d, (210, 78, 248, 118), (170, 120, 130))             # chair
    d.ellipse(box(214, 40, 244, 72), fill=(200, 204, 212))    # bonnet hood
    # window to the lot + front door (right)
    rect(d, (254, 22, 288, 68), (150, 110, 104))
    rect(d, (257, 25, 285, 65), (238, 186, 138))              # dusk outside
    rect(d, (292, 20, 318, 108), (170, 120, 116))             # door
    rect(d, (296, 26, 314, 70), (238, 186, 138))
    # pedicure thrones (front left floor)
    for tx in (30, 58):
        shadow(d, tx - 6, tx + 22, 136)
        rect(d, (tx - 4, 108, tx + 20, 134), (140, 90, 100))
        rect(d, (tx - 2, 100, tx + 18, 112), (160, 104, 112))


def backlot(im, d):
    # Behind the plaza: cinderblock service wall. L->R: salon back door
    # (generator cable under it), Kim's generator on a pad, corridor
    # delivery door, gas meter bank with the contractor KEY BOX, staging
    # unit's painted-shut door, the fiber conduit riser + junction box,
    # pallet stack. Dusk, one floodlight.
    vgrad(im, 0, 24, (196, 150, 120), (222, 180, 140))        # dusk sliver
    vgrad(im, 24, 104, (146, 140, 134), (168, 160, 152))      # cinderblock
    for yy in range(30, 100, 10):
        d.line(sc((0, yy), (320, yy)), fill=(130, 124, 118), width=1)
    vgrad(im, 104, 180, (110, 104, 102), (84, 80, 80))        # cracked pad
    d.rectangle(box(0, 100, 320, 105), fill=(126, 120, 114))
    # floodlight
    rect(d, (150, 6, 162, 16), (90, 90, 96))
    d.ellipse(box(146, 10, 166, 22), fill=(240, 224, 170))
    # salon back door + cable
    rect(d, (34, 40, 64, 100), (120, 96, 104))
    d.rectangle(box(36, 44, 62, 98), outline=(96, 74, 84), width=3)
    d.line(sc((60, 98), (92, 88)), fill=(40, 40, 44), width=4)  # genny cable
    # Kim's generator on its pad
    shadow(d, 74, 126, 106, 6)
    rect(d, (76, 70, 124, 102), (190, 120, 60))
    rect(d, (80, 62, 100, 70), (60, 56, 52))
    d.ellipse(box(108, 74, 120, 86), fill=(90, 84, 78))
    # corridor delivery door
    rect(d, (138, 36, 172, 102), (110, 112, 118))
    d.rectangle(box(141, 40, 169, 99), outline=(88, 90, 96), width=3)
    d.rectangle(box(144, 64, 150, 72), fill=(80, 82, 88))
    # gas meters + KEY BOX
    for mx in (182, 198, 214):
        rect(d, (mx, 58, mx + 12, 84), (160, 158, 150))
        d.ellipse(box(mx + 1, 52, mx + 11, 62), fill=(178, 176, 166))
    d.rectangle(box(180, 84, 228, 92), fill=(130, 128, 120))   # pipe run
    rect(d, (196, 64, 210, 80), (70, 74, 82))                  # the key box
    d.rectangle(box(199, 68, 207, 74), fill=(100, 104, 114))
    # staging back door: painted shut
    rect(d, (238, 40, 266, 100), (150, 144, 136))
    d.rectangle(box(240, 44, 264, 98), outline=(134, 128, 120), width=2)
    # conduit riser + junction box
    rect(d, (280, 0, 290, 100), (120, 118, 124))
    rect(d, (272, 62, 298, 90), (100, 102, 110))
    d.rectangle(box(276, 68, 294, 84), outline=(80, 82, 90), width=2)
    # pallets + weeds
    for py in (96, 88, 80):
        rect(d, (300, py, 319, py + 8), (140, 108, 74))
    for wx in (8, 16, 24, 250):
        d.line(sc((wx, 108), (wx - 3, 84)), fill=(96, 118, 66), width=3)
        d.line(sc((wx, 108), (wx + 4, 90)), fill=(110, 130, 76), width=3)


def corridor(im, d):
    # Shared service corridor: fluorescent hum, concrete floor. L->R:
    # salon curtain (left edge), Dale's laminated SOP sheet, the breaker
    # panel (cover ajar, one scorched slot), mop sink, water heater,
    # delivery door to the back lot, staging unit door, and the closet's
    # old inner door — painted over, sealed, a door in denial.
    vgrad(im, 0, 112, (168, 166, 156), (188, 186, 176))       # scuffed wall
    vgrad(im, 112, 180, (128, 126, 122), (104, 102, 100))     # concrete
    d.rectangle(box(0, 108, 320, 113), fill=(150, 148, 140))
    d.rectangle(box(0, 4, 320, 10), fill=(210, 212, 206))     # tube light
    d.rectangle(box(120, 4, 150, 10), fill=(238, 240, 228))   # the flickery bit
    # salon curtain (left edge)
    rect(d, (0, 28, 16, 108), (110, 70, 84))
    # Dale's laminate
    rect(d, (26, 34, 52, 62), (232, 232, 224))
    d.rectangle(box(29, 38, 49, 42), fill=(120, 120, 130))
    d.rectangle(box(29, 46, 49, 49), fill=(160, 160, 168))
    d.rectangle(box(29, 52, 49, 55), fill=(160, 160, 168))
    # breaker panel, cover ajar, one scorched slot
    rect(d, (64, 26, 96, 78), (140, 142, 148))
    d.rectangle(box(67, 30, 93, 74), fill=(110, 112, 120))
    for i in range(6):
        yy = 33 + i * 7
        d.rectangle(box(70, yy, 78, yy + 4), fill=(60, 62, 70))
        d.rectangle(box(82, yy, 90, yy + 4), fill=(60, 62, 70))
    d.rectangle(box(82, 47, 90, 51), fill=(30, 26, 26))       # the scorched one
    d.polygon(sc((96, 30), (104, 40), (96, 74)), fill=(150, 152, 158))  # ajar cover
    # mop sink + mop
    rect(d, (112, 74, 140, 106), (150, 150, 146))
    d.rectangle(box(115, 78, 137, 102), fill=(120, 122, 120))
    d.line(sc((136, 40), (128, 78)), fill=(140, 110, 80), width=3)
    d.ellipse(box(122, 34, 138, 46), fill=(190, 186, 176))
    # water heater
    rect(d, (152, 18, 186, 104), (188, 184, 174))
    d.ellipse(box(152, 12, 186, 26), fill=(196, 192, 182))
    d.rectangle(box(162, 60, 176, 70), fill=(150, 146, 138))
    # delivery door to back lot
    rect(d, (196, 28, 228, 106), (110, 112, 118))
    d.rectangle(box(199, 32, 225, 103), outline=(88, 90, 96), width=3)
    # staging unit door
    rect(d, (238, 28, 268, 106), (140, 116, 92))
    d.rectangle(box(241, 32, 265, 103), outline=(112, 92, 72), width=3)
    # the sealed closet door: painted wall-color, hinges betraying it
    rect(d, (282, 28, 312, 106), (172, 170, 160))
    d.rectangle(box(284, 32, 310, 103), outline=(158, 156, 146), width=2)
    for hy in (40, 66, 92):
        d.rectangle(box(283, hy, 287, hy + 8), fill=(140, 138, 128))
    # floor drain
    d.ellipse(box(160, 140, 180, 150), fill=(88, 86, 84))


def staging(im, d):
    # Dale's old base camp: the dead PagePro Wireless storefront. L->R:
    # corridor door (left edge), wall of bolted demo phones, dusty glass
    # counter (the RUNBOOK binder on it), Dale's leftovers — cable spool,
    # rail boxes — the energy-drink shrine, and the papered front window
    # glowing with parking-lot dusk.
    vgrad(im, 0, 112, (140, 136, 146), (160, 156, 162))       # dim retail wall
    vgrad(im, 112, 180, (120, 112, 108), (96, 90, 88))        # worn carpet
    d.rectangle(box(0, 108, 320, 113), fill=(126, 122, 128))
    # corridor door (left edge)
    rect(d, (0, 26, 18, 108), (140, 116, 92))
    # ghost sign
    d.rectangle(box(60, 12, 200, 26), fill=(150, 146, 154))
    d.rectangle(box(66, 15, 130, 23), fill=(132, 128, 138))
    # demo phone wall: brick phones bolted to a board
    rect(d, (28, 30, 96, 92), (110, 106, 116))
    for i in range(6):
        px_ = 34 + (i % 3) * 21
        py_ = 38 + (i // 3) * 26
        rect(d, (px_, py_, px_ + 13, py_ + 20), (52, 52, 58))
        d.rectangle(box(px_ + 3, py_ + 3, px_ + 10, py_ + 8), fill=(90, 110, 90))
    # glass counter + the runbook binder
    rect(d, (108, 62, 176, 104), (170, 172, 176))
    d.rectangle(box(112, 66, 172, 84), fill=(140, 144, 150))
    rect(d, (126, 50, 158, 62), (210, 210, 216))              # binder
    d.rectangle(box(130, 53, 154, 58), fill=(90, 110, 170))
    # cable spool + rail boxes
    shadow(d, 186, 226, 126)
    d.ellipse(box(186, 78, 226, 118), fill=(150, 118, 80))
    d.ellipse(box(198, 90, 214, 106), fill=(120, 92, 62))
    for i, bx in enumerate((234, 246, 240)):
        rect(d, (bx, 90 - i * 14, bx + 26, 104 - i * 14), (168, 140, 104))
    # the energy-drink shrine
    for row in range(4):
        for i in range(4 - row):
            x = 282 + row * 4 + i * 8
            y = 100 - row * 12
            rect(d, (x, y, x + 6, y + 12), rng.choice([(60, 180, 140), (40, 140, 180), (80, 200, 90)]))
    # papered front window, dusk through paper
    rect(d, (258, 20, 318, 76), (150, 110, 104))
    rect(d, (261, 23, 315, 73), (216, 186, 156))
    d.rectangle(box(261, 23, 315, 73), outline=(190, 160, 130), width=2)


def closet(im, d):
    # THE EDGE NODE. A closet. One rack, one box fan, the hum. L->R:
    # the WAN conduit punching through the left wall, an open shipping
    # box (packing slip), THE RACK (router / 48-port switch / patch
    # spaghetti / UPS), extension-cord daisy chain, Dale's sign-off
    # clipboard, and the gray door with the box fan in the transom.
    vgrad(im, 0, 112, (96, 94, 104), (118, 116, 124))         # closet gloom
    vgrad(im, 112, 180, (90, 86, 88), (70, 68, 70))           # concrete
    d.rectangle(box(0, 108, 320, 113), fill=(106, 104, 110))
    # WAN conduit in from the left wall
    rect(d, (0, 52, 26, 64), (130, 128, 134))
    d.ellipse(box(20, 50, 34, 66), fill=(110, 108, 116))
    d.line(sc((30, 58), (120, 74)), fill=(240, 190, 60), width=3)  # fiber loop
    # open shipping box + packing slip
    rect(d, (36, 84, 82, 110), (168, 140, 104))
    d.polygon(sc((36, 84), (54, 74), (82, 84)), fill=(150, 122, 88))
    rect(d, (52, 88, 70, 100), (232, 232, 224))               # the slip
    # THE RACK
    shadow(d, 126, 208, 116, 6)
    rect(d, (128, 16, 206, 112), (56, 58, 66))
    # router: uplink LED dark
    rect(d, (134, 24, 200, 42), (74, 78, 88))
    for i in range(5):
        d.ellipse(box(140 + i * 8, 28, 144 + i * 8, 32), fill=(70, 170, 90) if i < 4 else (60, 52, 52))
    # 48-port switch
    rect(d, (134, 46, 200, 60), (80, 84, 94))
    for i in range(12):
        d.rectangle(box(138 + i * 5, 50, 141 + i * 5, 56), fill=(40, 42, 48))
    # patch spaghetti
    rect(d, (134, 64, 200, 80), (70, 72, 82))
    for i in range(8):
        x0 = 136 + i * 8
        d.arc(box(x0, 62, x0 + 14, 84), 300, 60, fill=rng.choice([(200, 80, 70), (80, 140, 200), (230, 200, 90), (110, 180, 110)]), width=2)
    # UPS, one amber eye
    rect(d, (134, 86, 200, 108), (66, 68, 76))
    d.ellipse(box(188, 92, 194, 98), fill=(230, 170, 60))
    # extension-cord daisy chain to the fan
    d.line(sc((204, 104), (250, 96), (268, 40)), fill=(220, 130, 60), width=3)
    rect(d, (214, 94, 246, 104), (200, 196, 186))             # power strips
    rect(d, (222, 84, 238, 94), (200, 196, 186))
    # Dale's clipboard
    rect(d, (246, 46, 266, 74), (150, 122, 88))
    d.rectangle(box(249, 50, 263, 70), fill=(228, 228, 218))
    # the gray door + box fan transom (interior side)
    rect(d, (276, 30, 318, 110), (120, 122, 128))
    d.rectangle(box(279, 34, 315, 107), outline=(96, 98, 104), width=3)
    rect(d, (280, 8, 314, 28), (90, 92, 98))
    d.ellipse(box(287, 10, 307, 26), fill=(130, 132, 138))
    for ang in range(0, 360, 60):
        d.arc(box(289, 12, 305, 24), ang, ang + 40, fill=(70, 72, 78), width=2)


def roadside(im, d):
    # The county road east of the plaza, last light. The pylon sign from
    # behind (blank gray), a mile marker, the buried-fiber marker posts
    # marching west, and MERLE'S TRUCK idling on the shoulder, headlights
    # on, windshield full of dusk glare.
    vgrad(im, 0, 90, (110, 80, 110), (240, 170, 110))         # deep dusk
    d.ellipse(box(20, 60, 34, 74), fill=(250, 240, 210))      # first star? venus? argue
    vgrad(im, 90, 128, (90, 84, 90), (110, 100, 96))          # far fields
    vgrad(im, 128, 156, (78, 76, 80), (94, 90, 92))           # shoulder gravel
    vgrad(im, 156, 180, (70, 68, 74), (56, 54, 60))           # asphalt
    d.line(sc((0, 166), (320, 168)), fill=(180, 170, 120), width=2)  # paint line
    # plaza pylon from behind (left)
    rect(d, (36, 8, 58, 120), (96, 92, 98))
    rect(d, (39, 14, 55, 60), (76, 74, 80))                   # blank back panel
    # mile marker
    rect(d, (86, 96, 92, 126), (110, 112, 108))
    rect(d, (84, 88, 94, 100), (60, 120, 70))
    # buried-fiber marker posts, marching west
    for i, mx in enumerate((116, 138, 158, 175)):
        h = 26 - i * 4
        rect(d, (mx, 124 - h, mx + 4, 128), (200, 120, 50))
        d.rectangle(box(mx - 1, 122 - h, mx + 5, 128 - h), fill=(230, 140, 50))
    # MERLE'S TRUCK, idling, lights on
    shadow(d, 190, 306, 152, 8)
    rect(d, (196, 96, 240, 138), (100, 60, 50))               # cab
    d.rectangle(box(202, 102, 234, 118), fill=(210, 190, 160))  # windshield glare
    d.rectangle(box(206, 104, 218, 112), fill=(80, 70, 64))   # cap silhouette
    rect(d, (240, 108, 302, 140), (110, 66, 54))              # bed
    d.rectangle(box(240, 108, 302, 116), fill=(90, 54, 46))
    d.ellipse(box(200, 132, 220, 152), fill=(40, 40, 44))
    d.ellipse(box(272, 132, 292, 152), fill=(40, 40, 44))
    d.ellipse(box(190, 112, 198, 122), fill=(250, 236, 180))  # headlight
    d.polygon(sc((190, 112), (150, 128), (150, 140), (190, 122)), fill=(240, 220, 160))
    # exhaust idle
    for ex in range(3):
        d.ellipse(box(300 + ex * 5, 128 - ex * 6, 308 + ex * 5, 134 - ex * 6), fill=(120, 116, 120))


# ---- Act 3: the cloud, physically -----------------------------------------

def perimeter(im, d):
    # THE CAMPUS PERIMETER. A building that is deliberately a giant beige
    # nothing, and one human-sized door in it. L->R: Merle's truck parked
    # in the visitor row, the monument sign, the lobby door, a camera
    # pole, and an unstaffed gatehouse. Asphalt lot as the open stage.
    vgrad(im, 0, 26, (176, 190, 206), (206, 208, 200))        # washed sky
    vgrad(im, 22, 118, (206, 196, 172), (188, 176, 152))      # THE BEIGE
    d.rectangle(box(0, 22, 320, 25), fill=(164, 152, 130))    # roofline
    # expansion joints: the only feature the wall is allowed
    for x in range(12, 320, 34):
        d.line(sc((x, 26), (x, 116)), fill=(196, 185, 162), width=1)
    vgrad(im, 116, 180, (104, 102, 106), (84, 82, 86))        # asphalt
    d.rectangle(box(0, 114, 320, 118), fill=(150, 146, 140))  # curb
    for x in range(20, 300, 46):                              # parking stripes
        d.line(sc((x, 130), (x - 8, 176)), fill=(196, 190, 150), width=2)
    # MERLE'S TRUCK, parked in the visitor row, nose east
    shadow(d, 8, 90, 132, 8)
    rect(d, (14, 96, 56, 124), (108, 62, 52))                 # cab
    d.rectangle(box(20, 100, 50, 112), fill=(206, 198, 172))  # glass
    rect(d, (54, 100, 88, 126), (118, 68, 56))                # bed
    d.ellipse(box(18, 118, 34, 134), fill=(40, 40, 44))
    d.ellipse(box(66, 118, 82, 134), fill=(40, 40, 44))
    # monument sign: a slab of stone with nothing readable on it
    shadow(d, 94, 148, 120, 5)
    rect(d, (96, 80, 146, 118), (150, 146, 142))
    d.rectangle(box(101, 86, 141, 104), fill=(120, 118, 116))
    # THE DOOR. One. Human-sized. In all of that.
    rect(d, (186, 84, 222, 118), (128, 140, 146))
    d.rectangle(box(190, 88, 218, 116), fill=(158, 176, 182))
    d.line(sc((204, 88), (204, 116)), fill=(108, 120, 128), width=2)
    rect(d, (182, 78, 226, 85), (170, 160, 138))              # awning
    # camera pole, four cameras, all aimed at the door
    d.line(sc((233, 32), (233, 96)), fill=(112, 110, 112), width=3)
    for i, y in enumerate((36, 46, 56, 66)):
        rect(d, (226 + (i % 2) * 10, y, 234 + (i % 2) * 10, y + 6), (92, 92, 96))
    # gatehouse, unstaffed, arm up
    shadow(d, 246, 312, 120, 5)
    rect(d, (250, 70, 306, 118), (162, 158, 150))
    d.rectangle(box(256, 78, 300, 100), fill=(112, 126, 132))
    d.line(sc((248, 100), (238, 74)), fill=(220, 96, 80), width=3)   # boom, raised


def lobby(im, d):
    # THE VISITOR LOBBY. Scaled for a company that never has visitors.
    # L->R: the front doors (left edge), a dead video wall, the badge
    # pedestals with paper taped over them, BEV'S DESK, her Mr. Coffee on
    # the credenza, and the inner door to badging. Terrazzo as the stage.
    vgrad(im, 0, 30, (214, 210, 200), (198, 194, 186))        # high ceiling
    vgrad(im, 26, 126, (186, 180, 172), (166, 160, 154))      # back wall
    vgrad(im, 124, 180, (176, 172, 168), (146, 142, 140))     # terrazzo
    d.rectangle(box(0, 122, 320, 126), fill=(126, 122, 120))
    for x in range(10, 320, 40):                              # terrazzo grid
        d.line(sc((x, 128), (x - 14, 178)), fill=(160, 156, 152), width=1)
    # front doors, left edge
    rect(d, (0, 60, 18, 140), (120, 134, 140))
    d.rectangle(box(3, 66, 15, 134), fill=(176, 192, 196))
    # dead video wall: a login error the size of a garage door
    rect(d, (24, 28, 92, 84), (44, 44, 52))
    d.rectangle(box(30, 34, 86, 78), fill=(30, 32, 40))
    d.rectangle(box(40, 50, 76, 60), fill=(58, 60, 70))
    # badge pedestals + turnstile bank, paper taped over every reader
    for i in range(3):
        x0 = 98 + i * 18
        shadow(d, x0 - 2, x0 + 14, 124, 4)
        rect(d, (x0, 92, x0 + 12, 124), (140, 142, 146))
        d.rectangle(box(x0 + 2, 96, x0 + 10, 104), fill=(226, 224, 214))
    # BEV'S DESK — the far edge at y=88 is where her waist-cut tucks
    shadow(d, 150, 238, 128, 6)
    rect(d, (154, 88, 236, 126), (128, 100, 72))
    d.rectangle(box(154, 88, 236, 94), fill=(158, 128, 94))   # desk top, far edge
    d.rectangle(box(196, 96, 220, 110), fill=(228, 226, 216))  # the paper log
    rect(d, (162, 96, 186, 112), (96, 98, 104))               # badge printer
    rect(d, (150, 110, 172, 128), (108, 92, 76))              # lost-and-found bin
    # the Mr. Coffee: the only unmetered appliance in the building
    rect(d, (240, 100, 268, 122), (120, 116, 118))            # credenza
    rect(d, (246, 88, 262, 102), (60, 58, 62))
    d.rectangle(box(249, 94, 259, 101), fill=(120, 70, 44))   # the carafe
    d.ellipse(box(257, 90, 261, 94), fill=(220, 90, 70))      # the warm light
    # inner door to badging
    rect(d, (272, 58, 316, 126), (150, 146, 140))
    d.rectangle(box(277, 64, 311, 122), fill=(122, 132, 138))
    d.rectangle(box(300, 88, 308, 96), fill=(210, 208, 198))  # taped-over reader


def compliance(im, d):
    # THE BADGING CORRIDOR. A corridor of controls. L->R: back to the
    # lobby (left edge), the laminated policy wall, THE MANTRAP (two
    # doors, one interlock), Corinne's spot, the COMPLIANCE HOLD door
    # under seal, and the door to the dock.
    vgrad(im, 0, 34, (206, 204, 196), (188, 186, 180))
    vgrad(im, 30, 126, (176, 176, 172), (156, 156, 154))
    vgrad(im, 124, 180, (150, 150, 152), (124, 124, 128))     # sealed concrete
    d.rectangle(box(0, 122, 320, 126), fill=(112, 112, 116))
    d.line(sc((0, 152), (320, 152)), fill=(138, 138, 142), width=1)
    # the laminated policy wall: controls, in plastic, forever
    for i in range(8):
        x0 = 30 + (i % 4) * 17
        y0 = 44 + (i // 4) * 34
        rect(d, (x0, y0, x0 + 14, y0 + 28), (232, 230, 220), 0.86)
        for r in range(4):
            d.line(sc((x0 + 2, y0 + 5 + r * 6), (x0 + 12, y0 + 5 + r * 6)),
                   fill=(168, 166, 160), width=1)
    # THE MANTRAP: a glass vestibule with two doors and a sign
    rect(d, (104, 50, 168, 126), (128, 134, 138))
    d.rectangle(box(110, 58, 132, 122), fill=(176, 194, 198))
    d.rectangle(box(140, 58, 162, 122), fill=(176, 194, 198))
    d.rectangle(box(112, 40, 160, 50), fill=(226, 224, 212))  # the sign
    # COMPLIANCE HOLD: steel, crash bar, and a paper seal across the seam
    rect(d, (220, 56, 262, 126), (118, 120, 126))
    d.rectangle(box(224, 60, 258, 122), fill=(98, 100, 106))
    d.rectangle(box(226, 96, 256, 100), fill=(180, 180, 176))  # crash bar
    d.rectangle(box(222, 76, 260, 86), fill=(236, 226, 190))   # the seal
    d.line(sc((222, 81), (260, 81)), fill=(190, 80, 66), width=2)
    # door to the dock
    rect(d, (270, 56, 318, 126), (146, 142, 136))
    d.rectangle(box(275, 62, 313, 122), fill=(126, 122, 118))
    d.rectangle(box(280, 66, 308, 76), fill=(214, 200, 120))   # DOCK placard
    # back to the lobby
    rect(d, (0, 56, 22, 126), (146, 142, 136))
    d.rectangle(box(2, 62, 18, 122), fill=(126, 122, 118))


def dock(im, d):
    # THE LOADING DOCK. Where assets are real and people are not. L->R:
    # back to the corridor, the receiving terminal (a dead port, and your
    # cable), a shrink-wrapped pallet of new racks, the spares cage of
    # dead trays, the SCAN LANE under its gantry, and the freight doors.
    vgrad(im, 0, 30, (146, 144, 140), (128, 126, 124))        # deck ceiling
    vgrad(im, 26, 128, (152, 148, 140), (132, 128, 122))
    vgrad(im, 126, 180, (118, 116, 116), (96, 94, 96))        # sealed deck
    d.rectangle(box(0, 124, 320, 128), fill=(86, 84, 86))
    # safety-yellow deck edge stripe: the only tidy thing here
    d.rectangle(box(0, 168, 320, 174), fill=(206, 174, 62))
    for x in range(0, 320, 16):
        d.line(sc((x, 174), (x + 8, 168)), fill=(60, 58, 56), width=2)
    # back to the corridor
    rect(d, (0, 54, 24, 126), (138, 134, 128))
    d.rectangle(box(2, 60, 20, 122), fill=(118, 114, 110))
    # the receiving terminal: a screen on a stand, and one dark port
    shadow(d, 28, 78, 126, 5)
    rect(d, (44, 96, 62, 126), (108, 106, 108))               # stand
    rect(d, (32, 76, 76, 100), (78, 80, 86))                  # head
    d.rectangle(box(36, 80, 72, 96), fill=(38, 46, 54))
    d.ellipse(box(66, 100, 72, 106), fill=(62, 58, 56))       # the dead port
    # pallet of new racks, still wrapped
    shadow(d, 82, 142, 128, 5)
    rect(d, (84, 70, 140, 126), (150, 158, 164), 0.8)
    d.rectangle(box(88, 74, 136, 122), fill=(168, 176, 182))
    d.rectangle(box(84, 118, 140, 126), fill=(120, 96, 66))   # the pallet
    # spares cage: dead trays, live asset tags
    rect(d, (148, 84, 196, 126), (104, 106, 112))
    for i in range(4):
        d.line(sc((152 + i * 12, 86), (152 + i * 12, 124)), fill=(140, 142, 148), width=2)
    for i in range(3):
        rect(d, (152, 92 + i * 11, 192, 100 + i * 11), (86, 88, 94))
        d.rectangle(box(184, 94 + i * 11, 190, 98 + i * 11), fill=(226, 224, 210))
    # THE SCAN LANE: a gantry arch over a painted lane
    rect(d, (204, 40, 212, 126), (128, 130, 136))
    rect(d, (244, 40, 252, 126), (128, 130, 136))
    rect(d, (204, 40, 252, 50), (140, 142, 148))
    d.rectangle(box(210, 44, 246, 48), fill=(118, 214, 232))  # the reading band
    d.rectangle(box(206, 130, 250, 176), fill=(126, 122, 112))
    for x in range(208, 250, 10):
        d.line(sc((x, 130), (x - 4, 176)), fill=(206, 174, 62), width=2)
    # freight doors, closed, corrugated
    rect(d, (258, 30, 318, 126), (134, 132, 128))
    for y in range(34, 124, 8):
        d.line(sc((260, y), (316, y)), fill=(112, 110, 108), width=2)


def cold_aisle(im, d):
    # COLD AISLE 4. Everything here is fine, which is the problem. Rack
    # rows down both side edges, all LEDs green; the containment door at
    # the far end; the crash cart; the Clean Agent pull station; and one
    # floor tile lifted at the right, breathing cold.
    vgrad(im, 0, 24, (150, 156, 164), (128, 134, 142))        # containment roof
    vgrad(im, 20, 128, (120, 126, 136), (104, 110, 120))
    vgrad(im, 126, 180, (128, 132, 138), (108, 112, 118))     # perforated tiles
    d.rectangle(box(0, 124, 320, 128), fill=(84, 88, 96))
    for x in range(80, 250, 22):                              # tile seams
        d.line(sc((x, 128), (x - 10, 178)), fill=(146, 150, 156), width=1)
    for y in range(134, 178, 12):
        d.line(sc((70, y), (250, y)), fill=(146, 150, 156), width=1)
    # RACK ROWS, both side edges, receding. All green. All fine.
    for side, (x0, x1) in enumerate(((0, 72), (248, 320))):
        rect(d, (x0, 20, x1, 130), (52, 54, 62))
        for i in range(9):
            y0 = 24 + i * 11
            rect(d, (x0 + 4, y0, x1 - 4, y0 + 9), (68, 72, 80))
            for j in range(6):
                cx = x0 + 8 + j * ((x1 - x0 - 16) // 6)
                d.ellipse(box(cx, y0 + 3, cx + 3, y0 + 6), fill=(78, 196, 104))
    # the containment door at the aisle's far end
    rect(d, (130, 48, 192, 128), (140, 148, 156))
    d.rectangle(box(136, 56, 186, 122), fill=(178, 198, 206))
    d.rectangle(box(154, 84, 168, 94), fill=(226, 224, 212))
    # the crash cart: a monitor and a keyboard on wheels, the last honest
    # diagnostic surface in the building
    shadow(d, 82, 124, 132, 5)
    rect(d, (86, 104, 120, 130), (96, 98, 104))
    rect(d, (88, 86, 118, 106), (60, 62, 70))
    d.rectangle(box(91, 89, 115, 102), fill=(36, 52, 44))
    d.rectangle(box(94, 92, 112, 94), fill=(120, 220, 140))
    d.ellipse(box(88, 126, 96, 134), fill=(38, 38, 42))
    d.ellipse(box(110, 126, 118, 134), fill=(38, 38, 42))
    # Clean Agent: a nozzle, a cylinder gauge, and a pull station
    d.ellipse(box(198, 30, 216, 44), fill=(180, 176, 168))
    rect(d, (200, 44, 214, 52), (150, 146, 140))
    rect(d, (218, 56, 236, 84), (188, 72, 60))                # pull station
    d.rectangle(box(221, 62, 233, 72), fill=(232, 226, 212))
    # THE LIFTED TILE, right of the aisle: a rectangle of cold dark
    rect(d, (250, 138, 292, 172), (46, 50, 58))
    d.polygon(sc((250, 138), (258, 130), (296, 130), (292, 138)), fill=(96, 100, 108))
    d.rectangle(box(254, 144, 288, 168), fill=(30, 34, 42))


def plenum(im, d):
    # THE RAISED-FLOOR PLENUM. The cathedral's crypt: a forest of
    # pedestals, cable trays overhead, a river of cold air, and the
    # westbound county fiber arriving lit and fine.
    vgrad(im, 0, 40, (72, 74, 84), (92, 94, 104))             # tile underside
    vgrad(im, 36, 118, (96, 98, 108), (84, 86, 96))
    vgrad(im, 116, 180, (104, 100, 96), (78, 76, 74))         # slab
    d.rectangle(box(0, 0, 320, 8), fill=(58, 60, 68))
    for x in range(0, 320, 24):                               # tile grid above
        d.line(sc((x, 0), (x, 36)), fill=(78, 80, 88), width=1)
    # pedestal forest: short posts holding the world up
    for i in range(9):
        x0 = 8 + i * 36
        y0 = 96 + (i % 3) * 6
        rect(d, (x0, y0 - 56, x0 + 7, y0), (118, 116, 112))
        d.rectangle(box(x0 - 3, y0, x0 + 10, y0 + 4), fill=(96, 94, 92))
        d.rectangle(box(x0 - 2, y0 - 60, x0 + 9, y0 - 56), fill=(134, 132, 128))
    # cable trays running the length, overhead
    for lane, y in enumerate((16, 26)):
        d.rectangle(box(0, y, 320, y + 7), fill=(112, 114, 120))
        for i in range(20):
            d.line(sc((i * 16, y + 1), (i * 16, y + 6)), fill=(92, 94, 100), width=1)
    # THE COUNTY FIBER: one yellow strand out of ten thousand, and it is lit
    d.line(sc((0, 62), (90, 68), (180, 64), (320, 70)), fill=(238, 196, 70), width=3)
    rect(d, (150, 56, 186, 78), (78, 80, 88))                 # the splice tray
    d.ellipse(box(178, 64, 184, 70), fill=(120, 240, 150))    # lit. fine. green.
    # the CRAC intake: where the cold comes from, at volume
    rect(d, (272, 44, 318, 116), (120, 124, 130))
    for y in range(48, 114, 7):
        d.line(sc((276, y), (314, y)), fill=(96, 100, 106), width=2)
    # one work light, clamped to a tray mid-run, doing its best
    d.ellipse(box(206, 30, 220, 42), fill=(240, 226, 170))
    d.polygon(sc((206, 42), (194, 96), (232, 96), (220, 42)), fill=(140, 134, 114))
    # the way back up: the open tile at the left, cold light spilling down
    d.polygon(sc((22, 112), (52, 112), (48, 176), (18, 176)), fill=(146, 152, 158))
    d.polygon(sc((27, 116), (47, 116), (43, 170), (23, 170)), fill=(198, 204, 208))
    d.line(sc((30, 122), (30, 166)), fill=(120, 126, 132), width=2)   # the ladder
    d.line(sc((40, 122), (40, 166)), fill=(120, 126, 132), width=2)
    for y in range(126, 168, 8):
        d.line(sc((30, y), (40, y)), fill=(120, 126, 132), width=2)


ROOMS = {
    "act2_salon": salon,
    "act2_backlot": backlot,
    "act2_corridor": corridor,
    "act2_staging": staging,
    "act2_closet": closet,
    "act2_roadside": roadside,
    "act3_perimeter": perimeter,
    "act3_lobby": lobby,
    "act3_compliance": compliance,
    "act3_dock": dock,
    "act3_cold_aisle": cold_aisle,
    "act3_plenum": plenum,
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
