"""Corinne Mabry — Continuous Compliance, Tier 2. Standing in the badging
corridor with the binder. Hand-pixeled, single view, idle + 2 talk frames.
Minted M5 per CHARACTERS.md.

Visual reference (her LOOK line): flown in from somewhere with an airport,
tight dark ponytail, corporate black, and a hi-viz vest worn INDOORS on a
floor cleaner than an operating theater — because the vest is a control,
and controls do not get skipped for being ridiculous. The three-ring
binder is hugged to her chest at all times; it is the same binder stock
the game's `binder` documents render on, which is not a coincidence.

STANDING (feet anchored, baked shadow) — Kim's pose family, but the
silhouette is entirely different: Kim is a narrow rose taper, Corinne is a
boxy chartreuse block with a slab of binder across the middle.

Signature pop: hi-viz chartreuse. Nobody else in the cast is remotely
this color, which is the point of hi-viz.

Talk: the binder opens (a wall of tabs), then one finger comes up to mark
a finding. She never raises her voice and she never stops writing.

Frame 30x50, anchor (14, 45) = the shadow's last row, feet 2 px above
(Kim's convention).
"""

from spritelib import compose, parse_grid

KEY = {
    "o": "outline",
    "K": "hair_brown_d", "k": "hair_brown_m",
    "S": "skin_tan_m", "s": "skin_tan_d", "T": "skin_tan_l",
    "V": "hiviz_m", "v": "hiviz_d", "L": "hiviz_l",
    "B": "shoe_black_m", "n": "shoe_black_d",
    "W": "white",              # blouse collar under the vest
    "F": "file_board",         # binder pages
    "b": "brass",              # the lanyard's badge fan
    "x": "shadow",
}

# Head + ponytail + collar, black slacks, and the vest as the widest part
# of the silhouette. Armless through the sleeve rows.
BODY = """
..........oooooo
.........oKKKKKKo
........oKKKKKKKKo
........oKKKKKKKKo
........oKoTTTTToKo
........oKoTTTTToKKo
........oKoTsTTsToKKKo
........oKoTTTTTToKKKKo
........oKKoTsssToKKKKo
........oKKooTTToKKKKo
.........oKo.oo.oKKKo
.........ooo.oTo.oKo
.............oTo..o
...........ooWWWoo
..........oVWWWWWVo
.........oVVVWWWVVVo
........oLVVVWWVVVVLo
........oLVVVVWVVVVLo
........oLVVVVbVVVVLo
........oLVVVVVVVVVLo
........ovVVVVVVVVVvo
........ovVVVVVVVVVvo
........ovVVVVVVVVVvo
........ovVVVVVVVVVvo
........ovvVVVVVVVvvo
........ovvVVVVVVVvvo
.........ovvvVVVvvvo
.........oBBBBBBBBo
.........oBBBBBBBBo
.........oBBBBBBBBo
.........oBBBBBBBBo
.........oBBBBBBBBo
.........oBBBoBBBBo
.........oBBBoBBBBo
.........oBBBoBBBBo
.........oBBBoBBBBo
.........onBBoBBBno
.........oBBBoBBBBo
.........oBBBoBBBBo
.........oBBBooBBBo
.........onBBooBBno
.........oBBBooBBBo
........oBBBBooBBBBo
.........ooooooooo
"""

SHADOW = """
..xxxxxxxxxxxx..
xxxxxxxxxxxxxxxx
..xxxxxxxxxxxx..
"""

# The binder, closed: hugged to the chest, three rings on the spine.
BINDER = """
oooooooooooo
oFFFFFFFFFFo
oFFFFFFFFFFo
oFoFFFFFFFFo
oFFFFFFFFFFo
oFoFFFFFFFFo
oFFFFFFFFFFo
oFoFFFFFFFFo
oFFFFFFFFFFo
oooooooooooo
"""

# The binder, open: a wall of tabs, which is the actual weapon.
BINDER_OPEN = """
oooooooooooooooo
oFFFFFFooFFFFFFo
oFFFFFFooFFFFFFo
oFoFFFFooFFFFoFo
oFFFFFFooFFFFFFo
oFoFFFFooFFFFoFo
oFFFFFFooFFFFFFo
oFoFFFFooFFFFoFo
oFFFFFFooFFFFFFo
oooooooooooooooo
"""

# Left arm under the binder (always). Right arm: around the binder, or up
# with the finding finger.
ARM_UNDER = """
oVVo
oVVVo
oVVVo
.oVVo
.oSSo
.oSTo
..oo
"""

ARM_HOLD = """
.oVVo
oVVVo
oVVVo
oVVo.
oSSo.
oSTo.
.oo..
"""

ARM_POINT = """
...oTo
...oTo
...oTo
..oSTo
.oSSo
.oVVo
oVVVo
oVVo.
.oo..
"""

FRAME_W, FRAME_H = 30, 50

_body = parse_grid(BODY, KEY)
_shadow = parse_grid(SHADOW, KEY)
_binder = parse_grid(BINDER, KEY)
_binder_open = parse_grid(BINDER_OPEN, KEY)
_arm_under = parse_grid(ARM_UNDER, KEY)
_arm_hold = parse_grid(ARM_HOLD, KEY)
_arm_point = parse_grid(ARM_POINT, KEY)


def _frame(open_binder=False, point=False):
    grid = _binder_open if open_binder else _binder
    bx = 7 if open_binder else 9
    parts = [
        (_shadow, 6, 43),
        (_body, 0, 0),
        (_arm_under, 5, 17),
        (grid, bx, 18),
    ]
    if point:
        parts.append((_arm_point, 18, 10))
    else:
        parts.append((_arm_hold, 19, 17))
    return compose(FRAME_W, FRAME_H, parts)


def build():
    return {
        "corinne": [[
            _frame(),
            _frame(open_binder=True),
            _frame(point=True),
        ]]
    }
