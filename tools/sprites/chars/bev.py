"""Bev Tolliver — Site Security, the visitor desk in the flagship lobby.
Hand-pixeled, single view, idle + 2 talk frames. Minted M5 per
CHARACTERS.md.

Visual reference (her LOOK line): thirty-one years of this lobby, silver
waves, reading glasses on a beaded chain, and the hand-knit MUSTARD
cardigan she wears over the uniform because facilities keeps the lobby at
sixty-four degrees and has since the building opened. The paper visitor
log lives on a clipboard in her hands today, because every badge reader in
a trillion-dollar building is a brick.

WAIST-UP (the Darlene trick): the security desk is the rest of her, and
per the amended bible rule she anchors to the desk top's FAR edge, not the
near one. Signature pop: mustard — the cast's only yellow garment.

Arms are PARTS, never baked in: every frame composes the clipboard plus
exactly two arms. Talk frames tap the pen at the signature line, then push
the whole clipboard at you, which is how this conversation was always
going to end.

Frame 32x32, anchor (15, 29) = the waist-cut row (the desk's FAR edge).
"""

from spritelib import compose, parse_grid

KEY = {
    "o": "outline",
    "R": "hair_gray_m", "r": "hair_gray_d", "E": "hair_gray_l",
    "S": "skin_pale_m", "s": "skin_pale_d", "T": "skin_pale_l",
    "G": "outline",             # reading glasses
    "b": "brass",               # the beaded chain
    "W": "white",               # uniform shirt + collar
    "M": "mustard_m", "m": "mustard_d", "L": "mustard_l",
    "F": "file_board",          # the paper visitor log
    "n": "outline",             # ruled lines, pen
}

# Head + silver waves + glasses + chain, then the collar and the cardigan
# with a white placket. Armless through the sleeve rows so the arm parts
# have clean edges to sit on.
BODY = """
............ooooooo
..........ooEEEEEEEoo
.........oEEEEEEEEEEEo
.........oRREEEEEEERRo
........oRRRRRRRRRRRRRo
........oRRoTTTTTTToRRo
........oRRoTTTTTTToRRo
.......boRRoGTGoGTGoRRob
.......boRRoTTTTTTToRRob
........oRRoTTTTTTToRRo
.........oRoTTsssTToRo
...........oTTTTTTTo
............oTTTTTo
.............oTTTo
.............oTTTo
..........oooWWWWWooo
......ooMMMMMoWWWoMMMMMoo
.....oMMMMMMMoWWWoMMMMMMMo
.....oMMMMMMMoWWWoMMMMMMMo
.....oMMMMMMMoWWWoMMMMMMMo
.....omMMMMMMoWWWoMMMMMMmo
.....omMMMMMMoWWWoMMMMMMmo
.....omMMMMMMoWWWoMMMMMMmo
.....omMMMMMMoWWWoMMMMMMmo
.....ommMMMMMoWWWoMMMMMmmo
.....ommMMMMMoWWWoMMMMMmmo
.....ommmMMMMoWWWoMMMMmmmo
.....ommmMMMMoWWWoMMMMmmmo
.....ooooooooooooooooooooo
"""

# The paper visitor log, clipped to a board — small, held low, angled the
# way a thing gets held rather than presented. The cardigan is the pop and
# needs the chest; the log only needs to be legible as ruled paper.
CLIPBOARD = """
ooooooooo
oFFooFFFo
oFnnnnnFo
oFFFFFFFo
oFnnnnnFo
oFFFFFFFo
oFnnnFFFo
ooooooooo
"""

# Left arm: cardigan sleeve down and in, hand under the board's edge.
ARM_BOARD = """
oMMo
oMMMo
.oMMo
.oSTo
.oSSo
..oo
"""

# Right arm resting, pen at the signature line (idle + talk 1 raised).
ARM_PEN = """
..oMMo
.oMMMo
.oMMo
.oSSo
.oSTo
..ono
"""

ARM_PEN_UP = """
....n
...on
..oSTo
.oSSo
.oMMMo
.oMMo
..oo
"""

FRAME_W, FRAME_H = 32, 32

_body = parse_grid(BODY, KEY)
_board = parse_grid(CLIPBOARD, KEY)
_arm_board = parse_grid(ARM_BOARD, KEY)
_arm_pen = parse_grid(ARM_PEN, KEY)
_arm_pen_up = parse_grid(ARM_PEN_UP, KEY)

BOARD_X, BOARD_Y = 11, 22
LEFT_X, LEFT_Y = 6, 19
RIGHT_X, RIGHT_Y = 20, 20


def _frame(board_dy=0, pen_up=False):
    parts = [
        (_body, 0, 0),
        (_arm_board, LEFT_X, LEFT_Y + board_dy),
        (_board, BOARD_X, BOARD_Y + board_dy),
    ]
    if pen_up:
        parts.append((_arm_pen_up, RIGHT_X, RIGHT_Y - 4))
    else:
        parts.append((_arm_pen, RIGHT_X, RIGHT_Y + board_dy))
    return compose(FRAME_W, FRAME_H, parts)


def build():
    return {
        "bev": [[
            _frame(),
            _frame(pen_up=True),      # the pen taps the signature line
            _frame(board_dy=-2),      # ...and then the log comes at you
        ]]
    }
