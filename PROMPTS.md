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

## Act 3 — The Cloud, Physically (currently placeholder art)

US-CENTRAL-1 FLAGSHIP CAMPUS, 1 Cumulonimbus Way, Bunker Flats. The act's
running visual joke is SCALE against BLANKNESS: a cathedral that spent its
whole budget on the inside and none of it on looking like anything. Every
interior is spotless, lit, powered and working — the building is fine, and
that is the problem. Nothing in these rooms may look broken.

### act3_perimeter — The Campus Perimeter

> Scene: the visitor parking lot of an enormous windowless data center on
> flat empty farmland at midday. The back of the frame is one immense
> featureless beige concrete wall running the full width, filling the upper
> half, broken only by faint vertical expansion joints and a single small
> human-sized glass entrance door with a narrow metal awning, right of
> center. Left to right along the wall: an old faded-red farm pickup truck
> parked nose-out in the first visitor space; a low blank polished stone
> monument slab on a concrete base; the small glass door; a tall steel pole
> carrying four security cameras all aimed at that door; and at the right a
> small empty guard booth with its striped boom gate raised. Wide cracked
> asphalt lot with faded painted parking stripes as the open stage, one
> long shadow line at the base of the wall, pale washed sky above the
> roofline, heat shimmer, no landscaping whatsoever.

### act3_lobby — The Visitor Lobby

> Scene: the interior of a vast corporate data-center lobby scaled for
> crowds that never come, warm and immaculate. Along the back wall, left to
> right: tall glass entrance doors at the far left edge; an enormous dark
> switched-off video wall in a black frame; a bank of three waist-high
> steel badge pedestals with sheets of paper taped over their readers; a
> long wooden security reception desk with a paper logbook, a boxy beige
> label printer, and a plastic bin of abandoned jackets tucked at its near
> end; a low credenza holding a small household drip coffee maker with a
> glowing orange warmer light and a half-full glass carafe; and at the
> right a heavy interior door with another taped-over card reader beside
> it. Polished terrazzo floor filling the lower 40% as the open stage,
> enormous empty ceiling above, framed motivational prints too small for
> the wall they are on.

### act3_compliance — The Badging Corridor

> Scene: a long clean interior corridor of institutional procedure, evenly
> lit, sealed concrete floor. Along the back wall, left to right: a plain
> door at the far left edge; a grid of eight laminated policy sheets
> mounted in plastic sleeves; a glass security vestibule with two separate
> glass doors and a small placard sign above it; then a heavy gray steel
> door with a horizontal crash bar and a printed paper seal pasted across
> its seam and frame; and at the far right a wide industrial door with a
> yellow placard above it. Utilitarian grays and beiges, one long scuff
> line along the wall at hand height, everything spotless and nothing
> welcoming. Empty sealed concrete floor as the open stage.

### act3_dock — The Loading Dock

> Scene: the interior of a spotless data-center receiving dock, lit by high
> bays. Along the back wall, left to right: a plain door at the far left
> edge; a small computer terminal on a gray pedestal stand with a dark
> screen; a shrink-wrapped pallet of tall new equipment in milky plastic on
> a wooden pallet; a steel mesh spares cage holding stacked dark equipment
> trays with small white labels; a freestanding metal scanning gantry — two
> uprights and a crossbar carrying a pale cyan light strip — over a lane
> painted on the floor in yellow hatching; and at the right a wide closed
> corrugated roll-up freight door. A bold safety-yellow and black striped
> edge stripe runs across the very front of the deck. Sealed gray concrete
> as the open stage, industrial and orderly, nothing damaged.

### act3_cold_aisle — Cold Aisle 4

> Scene: the inside of a contained data-center cold aisle, cool blue-gray
> and immaculate. Tall black four-post server racks fill the entire left
> and right edges of the frame in receding rows, every rack face dense with
> small steady GREEN indicator lights — nothing red, nothing dark. Across
> the back of the aisle: a glass containment door with a small placard,
> centered. Left of center a wheeled crash cart carrying a small monitor
> and keyboard. Right of center, high on the wall, a round white fire
> suppression discharge nozzle and a red pull-station box. At the lower
> right one perforated white floor tile has been lifted out and propped,
> leaving a dark rectangular opening. Perforated raised-floor tiles in a
> visible grid fill the lower 40% as the open stage. Cold clean light,
> everything working, uncanny order.

### act3_plenum — The Raised-Floor Plenum

> Scene: a tall walkable service level underneath a data-center raised
> floor, seen along its length, lit by one clamped work light. Overhead: the
> dark underside of floor tiles and two long steel cable trays running the
> width of the frame. Standing across the middle distance: a forest of tall
> slender steel floor pedestals holding the floor up like columns. Threaded horizontally through
> the pedestals: a thick bundle of dark cables with one bright yellow fiber
> strand and a small gray splice tray with a single green indicator light.
> At the right, a large louvered air-handler intake grille. At the left, an
> open square floor hatch with a short steel ladder and cold pale light
> spilling down through it. Bare concrete slab as the open stage, dust-free
> and cold, deep shadows lifted enough to read.

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
