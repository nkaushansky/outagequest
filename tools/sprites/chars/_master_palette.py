"""THE character style authority (sprite counterpart of the one-background-
generator rule). Every cast member's ramps live here, in one table, so the
whole cast shares one visual language. Rules of the house:

- Flat 3-tone ramps (D dark / M mid / L light) + one shared warm outline.
  No dithering on sprites — flat Sierra figures over painterly rooms.
- Warm-leaning, slightly muted values that sit inside the treated
  128-color rooms; each character still owns one signature color pop
  (Mel slate, Gary salmon, Darlene teal, Merle rust + gold cap).
- New characters pick from these ramps first; add a ramp only when the
  design genuinely needs one, and add it HERE, never inline.
"""

PALETTE = {
    # -- universal ---------------------------------------------------------
    "outline":     (36, 28, 22),        # warm near-black, every silhouette
    "shadow":      (0, 0, 0, 80),       # baked ground shadow (alpha)
    "white":       (238, 234, 224),

    # -- skin --------------------------------------------------------------
    "skin_pale_l": (238, 205, 168), "skin_pale_m": (206, 163, 120), "skin_pale_d": (158, 113, 78),
    "skin_ruddy_l": (235, 182, 148), "skin_ruddy_m": (203, 136, 101), "skin_ruddy_d": (150, 90, 62),
    "skin_tan_l": (222, 178, 132), "skin_tan_m": (184, 134, 90), "skin_tan_d": (134, 90, 56),

    # -- hair --------------------------------------------------------------
    "hair_brown_l": (110, 79, 55), "hair_brown_m": (78, 53, 36), "hair_brown_d": (48, 31, 20),
    "hair_gray_l": (206, 200, 188), "hair_gray_m": (166, 159, 146), "hair_gray_d": (117, 111, 100),
    "hair_sandy_l": (216, 196, 158), "hair_sandy_m": (178, 156, 118), "hair_sandy_d": (128, 109, 80),

    # -- Mel ---------------------------------------------------------------
    "slate_l": (130, 148, 166), "slate_m": (94, 110, 128), "slate_d": (62, 74, 90),
    "jogger_l": (140, 140, 132), "jogger_m": (104, 105, 99), "jogger_d": (70, 71, 66),
    "khaki_l": (196, 172, 128), "khaki_m": (160, 136, 94), "khaki_d": (114, 94, 60),
    "coat_l": (172, 138, 94), "coat_m": (134, 102, 64), "coat_d": (94, 68, 40),
    "phones_teal": (94, 182, 178),      # headphones round the neck: Mel's pop

    # -- Gary --------------------------------------------------------------
    "polo_l": (168, 196, 214), "polo_m": (122, 156, 182), "polo_d": (82, 112, 140),
    "hose_m": (74, 110, 66), "hose_d": (46, 72, 42),
    "brass": (196, 160, 80),
    "water": (170, 210, 228),

    # -- Darlene -----------------------------------------------------------
    "teal_l": (148, 192, 180), "teal_m": (106, 150, 138), "teal_d": (70, 106, 96),
    "apron_l": (240, 234, 220), "apron_m": (210, 200, 182), "apron_d": (170, 158, 138),
    "coffee": (86, 54, 34),
    "glass_hi": (226, 236, 240),
    "pencil": (222, 168, 64),

    # -- Merle -------------------------------------------------------------
    "flannel_l": (188, 92, 64), "flannel_m": (146, 62, 42), "flannel_d": (98, 38, 26),
    "flannel_check": (222, 196, 160),
    "denim_l": (122, 142, 168), "denim_m": (86, 104, 130), "denim_d": (56, 70, 92),
    "cap_gold": (222, 178, 60),
    "cap_green_m": (74, 104, 60), "cap_green_d": (48, 70, 40),
    "saucer": (232, 228, 214),

    # -- Kim ---------------------------------------------------------------
    "rose_l": (224, 150, 160), "rose_m": (188, 108, 122), "rose_d": (140, 70, 86),
    "file_board": (214, 190, 150),      # the emery board, mid-flourish

    # -- Dot ---------------------------------------------------------------
    "lavender_l": (198, 180, 212), "lavender_m": (156, 136, 176), "lavender_d": (110, 92, 130),

    # -- footwear ----------------------------------------------------------
    "sneaker_l": (232, 228, 216), "sneaker_m": (196, 190, 176), "sneaker_d": (150, 144, 130),
    "shoe_brown_m": (92, 62, 38), "shoe_brown_d": (58, 38, 22),
    "shoe_black_m": (62, 58, 56), "shoe_black_d": (34, 32, 30),
}
