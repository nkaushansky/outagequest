# Background art prompts

Real art comes from the one ChatGPT image generator per GDD.md. For each
room below:

1. Generate with the prompt (style prefix + scene line, one message).
2. Save the raw output to `assets/source/<room_id>_source.png`.
3. Treat it: `python3 tools/treat_bg.py assets/source/<room_id>_source.png assets/backgrounds/<room_id>.png`
4. Re-fit walkable/hotspot/exit polygons in `data/rooms/<room_id>.json`
   with the `?dev=1` overlay (clicks log coordinates to the console).
5. Delete `assets/source/<room_id>_placeholder.png`, and regenerate the
   derived document photos: `python3 tools/make_docimages.py`.

Note on people: the style prefix forbids people in backgrounds — NPCs are
separate hand-pixeled sprites (CHARACTERS.md). Placeholder backgrounds may
bake in blocky stand-in figures; real backgrounds must leave those spots
empty.

## Style prefix (every prompt starts with this, verbatim)

> Painted background art for a 1991 point-and-click adventure game, gouache
> concept-painting style, clean readable shapes. Camera: wide theater-stage
> view from a slightly raised angle looking gently down into the room, back
> wall parallel to the frame, open flat floor filling the lower 40% of the
> frame as a walkable stage, furniture and points of interest arranged along
> the back wall and side edges, nothing blocking the foreground floor.
> Saturated but limited palette, warm ambient lighting with gently lifted
> shadows, no photorealism, no visible text, no people. 16:9.

## Act 1 — DONE (real art shipped in the M3 art pass)

The five Act 1 prompts that produced the shipped backgrounds are preserved
in git history (this file, before the M4 revision). Do not regenerate Act 1
rooms casually — polygons are fit to the shipped art.

## Act 2 — the Edge Node (currently placeholder art)

### act2_salon — Kim's Nails

> Scene: the warm interior of a small working nail salon. Along the back
> wall, left to right: a curtained staff doorway at the far left edge; a
> wall of shelves crowded with hundreds of tiny colorful nail polish
> bottles; a service counter holding a sleek modern pod coffee machine with
> a glowing screen and a bright red vintage rotary telephone; a large wall
> mirror over a tidy manicure table with a small UV gel lamp; a vintage
> salon chair under a big dome bonnet hair dryer; a window showing warm
> dusk light over a parking lot; and a glass front door at the right. Two
> cushioned pedicure chairs with footbaths in the front left, leaving the
> center floor open. Rose-pink walls, cozy tungsten warmth, everything
> clean and cared-for.

### act2_backlot — Behind the Plaza

> Scene: the service strip behind a small-town strip mall at dusk. A long
> cinderblock back wall runs parallel across the frame, lit by one amber
> sodium floodlight. Left to right along the wall: a weathered back door
> with a thick black power cable snaking under it; a sturdy orange portable
> generator running on a small concrete pad; a dented steel delivery door;
> a bank of three gray gas meters on a horizontal pipe with a small dark
> combination key box clipped to the pipe; an old door painted over the
> same color as the wall; a gray electrical conduit riser climbing the wall
> with a utility junction box; a stack of wooden shipping pallets at the
> right corner. Cracked concrete apron as the open stage, weeds in the
> seams, deep warm dusk sky in a narrow band above the roofline.

### act2_corridor — Service Corridor

> Scene: a long interior service corridor behind strip-mall shops, lit by
> one fluorescent tube. Along the back wall, left to right: a fabric
> curtain doorway at the far left edge; a small laminated sheet zip-tied to
> a conduit; a gray electrical breaker panel with its cover hanging ajar
> and one scorched black breaker slot; a floor-mounted mop sink with an old
> mop leaning beside it; a tall commercial water heater; a steel delivery
> door with a push bar; a plain tenant door with papers taped to it; and at
> the far right a doorway that has been painted over the same color as the
> wall, its hinges still visible. Scuffed concrete floor with a central
> drain as the open stage. Utilitarian grays and beiges, one warm note from
> the curtain.

### act2_staging — The Old PagePro

> Scene: the dim interior of a long-dead small-town cell phone and pager
> store. Along the back wall, left to right: a door at the far left edge;
> a display board with six chunky 1990s demonstration mobile phones and
> pagers bolted to it; a dusty glass sales counter with a blue three-ring
> binder on top; a large wooden cable spool and a stack of cardboard boxes
> left by an installer; a neat pyramid of empty energy drink cans in the
> corner; and a big front window covered in butcher paper glowing amber
> with evening light. Ghost lettering shadows above the display board where
> a sign was removed. Worn carpet as the open stage, dust motes, melancholy
> retail twilight.

### act2_closet — The Edge Node

> Scene: the cramped interior of a utility closet housing telecom
> equipment, warm and dim with one bare bulb. Center back: a tall dark
> four-post server rack holding a router with small indicator lights, a
> long network switch, a patch panel bursting with tangled colorful cables,
> and a heavy battery unit at the bottom with one amber light. Left wall: a
> gray conduit entering low with a single yellow fiber cable looping up to
> the rack; an open cardboard shipping box on the floor with a paper slip
> inside. Right side: a daisy-chain of orange extension cords and power
> strips leading up to a cheap box fan wedged in the transom vent above a
> gray steel door. A small clipboard hanging on a nail by the door.
> Concrete floor as the open stage, warm amber gloom, dust in the air.

### act2_roadside — The County Road

> Scene: a two-lane county road leaving a small town at last light, seen
> from the shoulder. Left: the tall back of a roadside pylon sign, plain
> gray unmarked panels. Along the far shoulder: a small green mile marker
> sign and a receding line of short orange buried-cable marker posts
> following the road west toward the horizon. Right: an old faded-red
> farm pickup truck idling on the gravel shoulder, headlights on, facing
> west, windshield full of dusk glare, gentle exhaust curl. Behind, flat
> soybean fields to the horizon under a deep purple-and-amber dusk sky
> with one bright evening star. The gravel shoulder and road edge as the
> open stage, long soft shadows, elegiac warmth.
