# Background art prompts — Act 1

The five new Act 1 rooms currently ship with **programmatic placeholder
backgrounds** (`tools/placeholder_bg.py`). Real art comes from the one
ChatGPT image generator per GDD.md. For each room below:

1. Generate with the prompt (style prefix + scene line, one message).
2. Save the raw output to `assets/source/<room_id>_source.png`.
3. Treat it: `python3 tools/treat_bg.py assets/source/<room_id>_source.png assets/backgrounds/<room_id>.png`
4. Re-fit walkable/hotspot/exit polygons in `data/rooms/<room_id>.json`
   with the `?dev=1` overlay (clicks log coordinates to the console).
5. Delete `assets/source/<room_id>_placeholder.png`.

The placeholder layouts already match the room JSONs, so the scene lines
below describe the same furniture arrangement — if the generator respects
them, polygon re-fitting should be minor nudges, not redesigns.

Note on people: the style prefix forbids people in backgrounds — NPCs
(Gary, Darlene, Merle) are separate static sprites with 2–3 talk frames,
added later. The placeholders bake in blocky stand-in figures; real
backgrounds must leave those spots empty.

## Style prefix (every prompt starts with this, verbatim)

> Painted background art for a 1991 point-and-click adventure game, gouache
> concept-painting style, clean readable shapes. Camera: wide theater-stage
> view from a slightly raised angle looking gently down into the room, back
> wall parallel to the frame, open flat floor filling the lower 40% of the
> frame as a walkable stage, furniture and points of interest arranged along
> the back wall and side edges, nothing blocking the foreground floor.
> Saturated but limited palette, warm ambient lighting with gently lifted
> shadows, no photorealism, no visible text, no people. 16:9.

## act1_living_room — The Rest of the House

Architecture note: interior doors cluster on the LEFT (deeper into the
house); the RIGHT rear corner is the exterior corner of the building
(window, then front door) — a bedroom cannot fit on that side.

> Scene: a modest American living room abandoned to smart gadgets. The left
> side of the room is the interior side of the house: on the left wall, an
> open interior door spilling warm light from a home office, and at the far
> left of the back wall a dark open doorway leading deeper into the house
> toward a bedroom. Continuing right along the back wall: a cluster of
> framed family photos, a small round wall thermostat, a large dark
> wall-mounted flat TV over a low media console holding a small router, a
> smart speaker on a little wall shelf, and near the right corner a bright
> window showing a side yard and wooden fence. The right side is the
> exterior corner of the house: a tall shelf of DVDs beside a sturdy front
> door with a deadbolt on the right wall, with a modern exercise bike with a
> tablet screen parked in front of the shelf. A worn couch against the wall
> left of center, a leafy houseplant in the front left corner. Cozy but
> slightly stale, warm afternoon light.

## act1_bedroom — Mel's Bedroom

> Scene: a dim, lived-in bedroom. Along the back wall, left to right: a
> doorway to the hall, an open closet packed with a row of nearly identical
> hooded sweatshirts, with a sagging top shelf overloaded with cardboard
> boxes and old bulky CRT computer monitors; a window covered by heavy
> blackout curtains leaking one bright slit of daylight; a small framed
> diploma; a nightstand tangled with charging cables; a neatly made queen
> bed with a dark shadowed gap beneath it; a wooden dresser with an old
> digital alarm clock on top; and in the right corner an armchair buried
> under a heap of folded clothes. Muted lavender-gray walls, one slice of
> sunlight, soft warm shadows.

## act1_main_street — Main Street

> Scene: the main street of a fading small American town, seen from across
> the street. Left edge: a modest vinyl-sided house with a front door and
> one warmly lit window. Then a continuous row of old brick storefronts: a
> cozy candle shop with a glowing window display, two empty storefronts with
> papered windows, a wooden community notice board on the sidewalk, a
> classic small-town diner with a red facade and glass door, a blue
> coin-operated newspaper box, and a dark unlit traffic light on a pole at
> the right edge. Wide empty sidewalk as the open stage in the foreground,
> with a narrow strip of patched asphalt road at the very bottom edge. Clear
> blue sky with a few puffy white clouds, bright honest daylight.

## act1_diner — The Bottomless Cup

> Scene: the interior of a beloved 1960s small-town diner. Left: the entry
> door with a bell, a cluttered cork bulletin board, and a row of green
> vinyl booths. Along the back: a long Formica lunch counter with chrome
> stools, a glass pie case, a big stainless coffee urn, a chalkboard menu
> high on the wall, a small dark tablet propped by the register, and a
> ceiling-mounted television. Right wall: a glowing amber 1970s jukebox.
> Checkered floor as the open stage. Warm greasy-spoon light, steam,
> sixty years of comfortable wear.

## act1_edge_of_town — The Edge of Town

> Scene: a tired strip-mall plaza at the edge of a small town, late golden
> afternoon. A low flat-roofed row of storefronts: one warmly glowing nail
> salon window with a pink sign band, two vacant units, and — set apart — a
> plain gray steel utility door with no sign, a cheap box fan wedged into
> the transom vent above it. A battered green dumpster on the right, weeds
> cracking through the asphalt on the left, a tall roadside pylon sign with
> mostly blank tenant panels. Wide empty parking lot as the open stage.
> Warm dusk sky, long soft shadows, a faint sense of electrical hum.
