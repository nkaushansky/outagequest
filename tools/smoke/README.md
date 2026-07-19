# Smoke harness

Headless-Chromium regression suite for the REVIEW.md checklists. Dev
tooling only — the game itself keeps zero runtime dependencies.

    npm run build
    npm run preview &          # serves dist/ on :4173
    npm run smoke              # full M1+M2+M3 suite (162 checks) ->
                               # PASS/FAIL lines, screenshots in ./smoke-shots/

Extras:

    node tools/smoke/devshot.mjs    # ?dev=1 polygon overlay, 4x PNG
    node tools/smoke/deathshot.mjs  # death-screen capture (fresh profile)

All scripts take `[baseURL] [outDir|outPath]` args; defaults target
`http://localhost:4173/`.

Browser resolution order: `SPOF_CHROMIUM` env var, the preinstalled
`/opt/pw-browsers` Chromium (Claude Code cloud environments), then the
system Chrome (`channel: "chrome"`).

Per-milestone rule: keep this suite green, and extend it with checks for
each new milestone's REVIEW.md items.
