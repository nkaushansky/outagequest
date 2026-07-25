"""The inventory scanner — US-CENTRAL-1's autonomous asset auditor, and
the game's first MOVING NPC. Hand-pixeled, WALKER sheet (4 rows in the
engine's fixed order down/left/right/up, col 0 idle + 4 cycle frames).
Minted M5 per CHARACTERS.md; the patrol route itself is room data
(schema.md → Sprites → Patrolling NPCs).

Visual reference (its LOOK line): a wheeled cargo chassis with two open
bays, a short mast, a sensor head with a cyan reading band where a face
would be if anyone had thought a face would help, and an amber strobe on
top that means AN ASSET IS MOVING, LEGALLY. No provision whatsoever for a
person standing in front of it. It cannot perceive Mel because Mel is not
in the asset database. This is not a malfunction. This is the spec.

Silhouette law: wheels -> chassis -> mast -> head -> strobe, read bottom to
top, so it is legible as a machine in one glance and never confusable with
a person. Deliberately SHORT (~30 px against the cast's 48-50) — it comes
up to about the hip of the people who ignore it.

Its cycle is a wheel-spoke shift plus the strobe alternating. There are no
talk frames: walker sheets spend their columns on the gait, and it has
nothing to say to something that isn't an asset.

Frame 28x32, anchor (14, 30) = the shadow's last row, under the wheels.
"""

from spritelib import compose, mirror, parse_grid

KEY = {
    "o": "outline",
    "L": "bot_l", "M": "bot_m", "D": "bot_d",
    "C": "scan_cyan",
    "A": "beacon_lit", "a": "beacon_dim",
    "B": "shoe_black_m", "b": "shoe_black_d",
    "x": "shadow",
}

# ---- the strobe and the mast (shared by every view) -----------------------

BEACON_LIT = """
.oAo.
oAAAo
.ooo.
"""

BEACON_DIM = """
.oao.
oaaao
.ooo.
"""

MAST = """
oDDDo
oDDDo
oDDDo
oDDDo
"""

# ---- sensor heads: the reading band faces where it is going ---------------

HEAD_FRONT = """
..ooooooooooo..
.oLLLLLLLLLLLo.
oMoCCCCCCCCCoMo
oMoCCCCCCCCCoMo
oMoCCCCCCCCCoMo
oMoooooooooooMo
oMMMMMMMMMMMMMo
.ooooooooooooo.
"""

HEAD_SIDE = """
..oooooooo..
.oLLLLLLLLo.
oMMMMMMMoCCo
oMMMMMMMoCCo
oMMMMMMMoCCo
oMMMMMMMoooo
oMMMMMMMMMMo
.oooooooooo.
"""

HEAD_BACK = """
..ooooooooooo..
.oLLLLLLLLLLLo.
oMoDoDoDoDoDoMo
oMoDoDoDoDoDoMo
oMoDoDoDoDoDoMo
oMoooooooooooMo
oMMMMMMMMMMMMMo
.ooooooooooooo.
"""

# ---- chassis: the two open cargo bays are the whole joke ------------------

CHASSIS_FLAT = """
ooooooooooooooooooooooo
oLLLLLLLLLLLLLLLLLLLLLo
oMMMMMMMMMMMMMMMMMMMMMo
oMoooooooooMoooooooooMo
oMoDDDDDDDoMoDDDDDDDoMo
oMoDDDDDDDoMoDDDDDDDoMo
oMoDDDDDDDoMoDDDDDDDoMo
oMoooooooooMoooooooooMo
oMMMMMMMMMMMMMMMMMMMMMo
oMMMMMMMMMMMMMMMMMMMMMo
oDDDDDDDDDDDDDDDDDDDDDo
oDDDDDDDDDDDDDDDDDDDDDo
ooooooooooooooooooooooo
"""

CHASSIS_SIDE = """
ooooooooooooooooooo
oLLLLLLLLLLLLLLLLLo
oMMMMMMMMMMMMMMMMMo
oMoooooooooooooooMo
oMoDDDDDDDDDDDDDoMo
oMoDDDDDDDDDDDDDoMo
oMoDDDDDDDDDDDDDoMo
oMoooooooooooooooMo
oMMMMMMMMMMMMMMMMMo
oMMMMMMMMMMMMMMMMMo
oDDDDDDDDDDDDDDDDDo
oDDDDDDDDDDDDDDDDDo
ooooooooooooooooooo
"""

# ---- wheels: two spoke phases, so rolling reads at 1x --------------------

WHEEL_A = """
.oBBo.
oBBBBo
oBbbBo
oBBBBo
.oBBo.
"""

WHEEL_B = """
.oBBo.
oBbBBo
oBBBBo
oBBbBo
.oBBo.
"""

SHADOW = """
..xxxxxxxxxxxxxxxx..
xxxxxxxxxxxxxxxxxxxx
..xxxxxxxxxxxxxxxx..
"""

FRAME_W, FRAME_H = 28, 32

_beacon = {True: parse_grid(BEACON_LIT, KEY), False: parse_grid(BEACON_DIM, KEY)}
_mast = parse_grid(MAST, KEY)
_heads = {
    "front": parse_grid(HEAD_FRONT, KEY),
    "side": parse_grid(HEAD_SIDE, KEY),
    "back": parse_grid(HEAD_BACK, KEY),
}
_chassis = {
    "front": parse_grid(CHASSIS_FLAT, KEY),
    "back": parse_grid(CHASSIS_FLAT, KEY),
    "side": parse_grid(CHASSIS_SIDE, KEY),
}
_wheel = {0: parse_grid(WHEEL_A, KEY), 1: parse_grid(WHEEL_B, KEY)}
_shadow = parse_grid(SHADOW, KEY)

BEACON_Y, MAST_Y, HEAD_Y, CHASSIS_Y, WHEEL_Y = 0, 11, 3, 14, 25
BEACON_X = MAST_X = 12
# Everything odd-width centers on the anchor column (x = 14).
HEAD_X = {"front": 7, "back": 7, "side": 9}      # the profile head sits forward
CHASSIS_X = {"front": 3, "back": 3, "side": 5}
WHEELS = {"front": (5, 18), "back": (5, 18), "side": (7, 16)}


def _frame(view, spoke, lit):
    parts = [(_shadow, 4, 28)]
    for wx in WHEELS[view]:
        parts.append((_wheel[spoke], wx, WHEEL_Y))
    parts += [
        (_chassis[view], CHASSIS_X[view], CHASSIS_Y),
        (_mast, MAST_X, MAST_Y),
        (_heads[view], HEAD_X[view], HEAD_Y),
        (_beacon[lit], BEACON_X, BEACON_Y),
    ]
    return compose(FRAME_W, FRAME_H, parts)


def _row(view):
    """Idle (strobe dark, wheels parked) + a 4-frame roll."""
    return [
        _frame(view, 0, False),
        _frame(view, 0, True),
        _frame(view, 1, True),
        _frame(view, 1, False),
        _frame(view, 0, False),
    ]


def build():
    right = _row("side")
    return {
        "scanner": [
            _row("front"),                  # down
            [mirror(f) for f in right],     # left
            right,                          # right
            _row("back"),                   # up
        ]
    }
