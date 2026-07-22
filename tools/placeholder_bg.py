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


ROOMS = {
    "act2_salon": salon,
    "act2_backlot": backlot,
    "act2_corridor": corridor,
    "act2_staging": staging,
    "act2_closet": closet,
    "act2_roadside": roadside,
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
