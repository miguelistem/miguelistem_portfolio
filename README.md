# Portfolio — Miguel Romero

A static two-page portfolio. No build step, no dependencies, no framework: open
`index.html` and it runs.

```
index.html          home — hero, three systems, capabilities, record, contact
work.html           the showcase — four cases, each with a live demo
assets/
  css/site.css      all styling, one file
  js/swarm.js       multi-agent sim: grid A* + RVO avoidance + collision checker
  js/pipeline.js    animated n8n workflow graphs, four trigger modes
  js/coach.js       chess board, eval bar, and the typed coaching explanation
  js/mini.js        the small ambient canvases on the home page
  js/work.js        wires the demos on work.html to their controls
  js/site.js        shared behaviour: sub-nav highlighting, reveals, year
  img/miguel.jpg    hero photo
  miguel-romero-resume.pdf
```

## Running it locally

Anything that serves static files works:

```bash
python -m http.server 8000
# then open http://localhost:8000
```

Opening `index.html` straight off disk also works, though a server is closer to
how it will be deployed.

## Deploying

Drop the folder into any static host — GitHub Pages, Netlify, Cloudflare Pages,
Vercel. There is nothing to build.

For GitHub Pages: push to a repo, then Settings → Pages → deploy from `main`,
root folder.

## Editing the content

Text lives directly in the HTML — no CMS, no templates. The things most likely
to need changing:

| What | Where |
|---|---|
| Headline, bio, contact details | `index.html` |
| Skills chips | `index.html`, the `#capabilities` section |
| Education and jobs | `index.html`, the `#record` section |
| Case-study copy | `work.html`, one `<section class="case">` per project |
| Project status lamps | `work.html` — `<span class="lamp">` is green, `lamp build` is orange |
| Résumé PDF | replace `assets/miguel-romero-resume.pdf` |
| Colours, type scale | the `:root` block at the top of `assets/css/site.css` |

## The demos

All three run entirely client-side.

**Swarm** (`swarm.js`) is a 2D port of the `02-swarm-viz` planning stack: grid
A* for global routes, sampling-based reciprocal velocity obstacle avoidance for
local conflict, and a separate collision checker that audits each frame without
ever steering. Three scenarios, 6–12 agents. Verified headlessly over 225 runs
across every scenario and agent count offered in the UI: zero collisions, no
agent pair ever in contact. Roughly 1% of a 60 Hz frame budget per tick.

Adding a scenario means adding an entry to `SCENARIOS` that returns
`{ boxes, agents, label }` and a button with the matching `data-scen`.

**Pipeline** (`pipeline.js`) replays four workflow graphs from the factory
automation project. Each graph in `GRAPHS` is a set of nodes with fixed
coordinates, a list of edges, and `waves` describing what fires when and what
the run log should print. Adding a fifth trigger type is a new entry in `GRAPHS`
plus a button with the matching `data-mode`.

**Coach** (`coach.js`) steps through a Two Knights Defence into the Fried Liver.
Positions are hard-coded FENs with an evaluation and coaching text per move —
no engine in the browser. Replacing the game means replacing the `LINE` array.

## Accessibility and support

Keyboard focus is visible throughout, `prefers-reduced-motion` freezes every
animation, the layout holds down to 320 px, and the demos pause when scrolled
out of view. Fonts load from Google Fonts and fall back to system faces offline.
Canvas demos are decorative — every claim they illustrate is also written out in
the surrounding text.
