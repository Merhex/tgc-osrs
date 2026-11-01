# Gielinor: Legends & Loot

An installable, offline-capable collectible card **pack-opening prototype** themed around Old School RuneScape.

> **Unofficial fan project; not affiliated with Jagex.** Card rarities, odds and abilities are prototype
> settings for this fan game and say nothing about OSRS drop rates, value or lore.

Set: **Legends of Gielinor — Volume I** (10 cards: Great Olm, Verzik Vitur, The Wardens, TzKal-Zuk,
Infernal cape, Elysian spirit shield, Twisted bow, Scythe of Vitur, Tumeken’s shadow, 3rd age pickaxe).

## Features

- **3D sealed pack** (React Three Fiber): pillow-shaped foil wrapper with real thickness, crimped seams,
  wrinkles, metallic clear-coat, studio lighting and contact shadows. Drag/swipe for full horizontal and
  limited vertical rotation with damping; Reset View; arrow-key rotation.
- **Visible foil opening** (~4.3 s, GSAP timeline over CPU-deformed segmented meshes): settle → seam
  stretch → travelling tear → top strip flies off → front foil curls down → side folds flare → card stack
  slides up → wrapper drops away → stack settles. **Skip Animation** jumps the same timeline to its end.
- **Card reveal**: face-down stack, automatic first flip, “Card N of 10”, tap/Enter to advance (input is
  locked while a card animates), NEW/Duplicate and owned counts. **Legendary** cards get a dimmed
  scene, anticipation shake, glowing edges, slow flip and holofoil in a subject-specific accent.
- **Summary grid** of all ten pulls (duplicates included) → Open Another Pack / View Collection.
- **Collection Log** (OSRS-style): collected/uncollected entries, owned quantities, unique completion,
  total copies, packs opened, rarity and category filters, and a 3D **inspection view** (front/back,
  tilt/turn, per-card shader effects) with an accessible HTML details panel. Development reset with
  confirmation.
- **Persistence & interruption safety** (IndexedDB): each opening is an atomic, idempotent transaction.
- **PWA**: manifest, icons, Workbox service worker precaching all assets; works offline after first load.
- **Accessibility**: semantic HTML controls, visible focus, keyboard support, text rarity labels, live
  regions, reduced-motion mode (system/forced), persistent mute, no sound before interaction, and a 2D
  fallback when WebGL is unavailable (`?nowebgl` forces it for testing).

## Setup

Requires Node.js 20+ (tested with Node 22).

```bash
npm install
```

```bash
npm run dev
```

Open the printed URL (default http://localhost:5173).

### Tests, type checks and production build

```bash
npm test
```

```bash
npm run typecheck
```

```bash
npm run build
```

```bash
npm run preview
```

The service worker is only registered in production builds, so check installation and offline
behaviour with `npm run build && npm run preview` (http://localhost:4173), then use the browser’s
install button, or DevTools → Application → Service Workers → *Offline*, and reload.

Development aids: `?debug&freeze=2.2` pauses the opening animation at 2.2 s (for visual review);
`?nowebgl` forces the 2D fallback.

## Deployment (GitHub Pages)

`.github/workflows/deploy.yml` runs the tests, type check and production build, then publishes `dist/`
to GitHub Pages on every push to `main` (or the current development branch) and on manual dispatch.

One-time setup: in the repository go to **Settings → Pages → Build and deployment → Source** and
choose **GitHub Actions**. The site is served from `https://<owner>.github.io/<repo>/`; asset paths
are relative (`base: './'`), so no extra configuration is needed for the sub-path.

## Architecture

| Concern | Location |
|---|---|
| Card definitions | `src/data/cards.ts` |
| Pack configuration & generation (weights, showcase, duplicate feasibility via bipartite matching) | `src/domain/packConfig.ts`, `src/domain/packGenerator.ts` |
| Persistence (IndexedDB, atomic awards, reveal progress, settings) | `src/persistence/` |
| Opening state machine (`loading → sealed → preparing → opening → revealing → summary`) | `src/opening/machine.ts` |
| Controller hook wiring state ↔ persistence | `src/opening/useOpeningController.ts` |
| Artwork (procedural low-poly SVG) | `src/art/` |
| Card/pack texture composition (canvas) | `src/render/` |
| 3D: pack, opening timeline, card reveal, inspection, shaders | `src/three/` |
| Collection interface & HTML UI | `src/ui/` |
| Sound (Web Audio synthesis) | `src/audio/sound.ts` |

### Pack modes

- **Prototype Booster** (default): slots 1–9 roll Rare 35% / Epic 65%, then a uniform card of that
  rarity (duplicates allowed); slot 10 is a uniformly chosen Legendary. Legendaries only appear in slot 10.
- **Development Showcase**: all ten cards once — six non-Legendaries shuffled into slots 1–6, three
  Legendaries shuffled into 7–9, the last Legendary in slot 10. Clearly labelled in the UI.
- `allowDuplicatesWithinPack` is configurable. When `false`, packs are sampled without replacement while
  respecting slot rules; feasibility is validated first and an explicit `PackConfigError` is thrown
  (e.g. the default booster needs 9 non-Legendary slots but only 6 unique definitions exist).

### Opening transactions

1. Open Pack generates the contents **once** (with unique instance IDs) and mirrors the draft to
   `localStorage`.
2. A single IndexedDB `readwrite` transaction checks that the opening ID is new, snapshots the
   pre-pack collection, computes NEW flags, writes the opening, all ten card instances, quantities and
   stats, and marks it active. Re-committing the same ID returns the stored record (no double award).
3. Only after the commit succeeds does the animation start. A failed commit shows an error with
   **Retry**, which re-commits the *same* draft (no reroll). A draft left uncommitted by a refresh is
   committed on next load.
4. Reveal progress (`revealIndex`) is saved per card and never moves backwards; refreshing resumes the
   same pack at the same card. Cosmetic animation state is never persisted.

## Remaining limitations

- Artwork is original procedural low-poly SVG rather than true 3D model renders; likenesses are
  stylised interpretations.
- Card text is baked into textures at a fixed resolution (reduced on touch devices); the HTML panels
  carry the authoritative readable text.
- The foil opening uses CPU vertex deformation of segmented sheets (no cloth simulation or true
  tearing geometry); the tear edge is a growing jagged strip.
- A refresh during the wrapper animation resumes directly at the card reveal (the wrapper animation is
  not replayed).
- Persistence is per browser/device; there is no export/import or sync.
- Sound effects are simple synthesized cues.
- Headless/software-rendered WebGL was used for automated browser checks; real-device GPU performance
  has not been profiled.
