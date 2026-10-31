# Mines & Goblins

**A retro mine-crawling action platformer. One rock. Many problems.**

> **Status:** M6 complete at `v0.6.0` - final generated art, audio, pixel text, accessibility settings, credits, and QA notes are in. M7 balance, external playtests, and release-candidate work are next.
>
> The repository was empty when work began, so the documents below define the direction for a new game.

![Animated preview of Shaft Entrance in Mines & Goblins](docs/media/m3-run.gif)

_Shaft Entrance, the opening level of the four-level descent into the Great Worm's arena._

## Concept

Mines & Goblins is a browser-first, retro action platformer inspired by the punishing readability of _Ghosts 'n Goblins_ and the run-based scavenging of _Spelunky_. A stubborn miner descends into a cursed mine with an unlimited supply of rocks, a handful of scavenged weapons, and one very large worm waiting at the bottom.

The game is built around short, replayable runs. Players dodge or defeat enemies, scrounge limited stronger items, and try to finish the mine under self-imposed challenge rules: never kill, use only rocks, or never take a hit.

## Planned v1 features

- **Four handcrafted mine levels plus a boss arena.**
- **Unlimited rocks** that deal 1 damage, with arcing throws and a cooldown.
- **Limited scavenged items** such as knives, a flintlock with bullets, and rune magic. Stronger damage, useful effects, limited ammo.
- **Progressive enemy health** across levels, with a roster built around clear counterplay.
- **A final boss:** a giant worm with multi-phase, telegraphed burrow attacks.
- **Four difficulties:** Normal, Hard, Impossible, and Crazy, each with distinct survival and enemy-health rules.
- **Four challenge badges:** Pacifist, Primitive, Untouchable, and Legend, plus 12 achievements and 9 cosmetic skins.
- **Desktop browser release**, keyboard controls, local save data, and GitHub Pages deployment.

## Documentation

- [Game Design Document](docs/game-design.md) — mechanics, content, balance, runs, and progression.
- [Technical Plan](docs/technical-plan.md) — technology choices, architecture, testing, and deployment.
- [Roadmap](docs/roadmap.md) — milestones, estimates, acceptance criteria, and risks.
- [M1 Playtest Notes](docs/m1-playtest.md) — movement/combat checks, tuning values, and known limitations.
- [M2 Playtest Notes](docs/m2-playtest.md) — enemy, item, difficulty, and feedback checks.
- [M3 Level Design Notes](docs/m3-level-design.md) — run order, level intent, exit flow, and QA checklist.
- [M3 Playtest Notes](docs/m3-playtest.md) — route, pause, settings, and full-run checks.
- [M4 Playtest Notes](docs/m4-playtest.md) — boss pacing, visual QA, retry checks, and test coverage.
- [M5 Test Matrix](docs/m5-test-matrix.md) — difficulty × challenge coverage, Results rules, achievements, skins, and save recovery.
- [M6 QA Notes](docs/m6-qa.md) — asset/audio inventory, text and accessibility checks, browser matrix, performance, and the manual release checklist.
- [Asset and Dependency Licenses](docs/asset-licenses.md) — original-asset inventory and third-party tool licenses.

## Technology at a glance

| Area         | Choice                                                             |
| ------------ | ------------------------------------------------------------------ |
| Language     | TypeScript (strict)                                                |
| Game engine  | Phaser 4.2.x                                                       |
| Build tool   | Vite                                                               |
| Level editor | Tiled (JSON maps)                                                  |
| Art          | Generated pixel-art pack, 16×16 tiles, 480×270 internal resolution |
| Audio        | Generated WAV pack + Phaser Web Audio                              |
| Tests        | Vitest + Playwright                                                |
| CI / hosting | GitHub Actions + GitHub Pages                                      |
| Persistence  | Versioned `localStorage` save                                      |

See [docs/technical-plan.md](docs/technical-plan.md) for the rationale and alternatives considered.

## Roadmap at a glance

| Milestone | Outcome                                                             |
| --------- | ------------------------------------------------------------------- |
| M0 ✅     | Repository scaffold, tooling, CI, deployable title screen           |
| M1 ✅     | Responsive movement, jumping, rock throwing, damage, retry loop     |
| M2 ✅     | Enemy roster, item arsenal, crates, HUD, combat feedback            |
| M3 ✅     | Four levels, transitions, pause/options, boss placeholder           |
| M4 ✅     | Giant worm boss with phases, supplies, victory, and results screen  |
| M5 ✅     | Difficulties, challenge runs, achievements, skins, Results, save v1 |
| M6 ✅     | Final art, audio, UI, accessibility, credits, and QA notes          |
| M7        | Balance, external playtests, QA, performance, release candidate     |
| M8        | v1.0 release and deployment                                         |

Full details and acceptance criteria are in [docs/roadmap.md](docs/roadmap.md).

## Getting started

Requires **Node.js 24 or newer**.

```bash
npm install
npm run dev
```

The dev server runs at `http://127.0.0.1:5173/`. Choose **Start Run**, pick a difficulty, then descend from Shaft Entrance to the Great Worm's arena. Challenge badges are tracked automatically, and Results explains any badge that failed.

### Controls

| Action          | Input                                 |
| --------------- | ------------------------------------- |
| Move            | `A` / `D` or Left / Right             |
| Jump            | `Space` or `Z`                        |
| Throw rock      | `X` or `J`                            |
| Use item        | `C` or `K`                            |
| Interact        | `E`                                   |
| Aim up/down     | `W` / `S` or Up / Down                |
| Drop through    | `Down` + `Jump`                       |
| Pause           | `Esc` or `P`                          |
| Debug overlay   | `F3` (development builds)             |
| Skip level      | `F4` (development builds)             |
| Skip boss phase | `F4` (development builds, boss arena) |
| Defeat boss     | `F6` (development builds, boss arena) |

Rocks are unlimited and deal 1 damage. The one-slot secondary item holds a limited-use Knife, Flintlock, or Rune Scroll; picking up the same item adds ammo up to its cap, while a different item replaces it. Crates contain authored ore, salves, or items, and pedestals hold items that require `E` to collect. Falling into a gap or losing all hearts restarts the level after a short death overlay.

Development builds accept `?difficulty=normal|hard|impossible|crazy` to preselect a difficulty. `?level=<id>` preselects the starting level, while `?spawn=exit` and `?boss=1` bypass the difficulty screen for direct QA. Production builds ignore these queries. The boss test API exposes `hitBoss`, `skipBossPhase`, `defeatBoss`, `defeatPlayer`, `damagePlayer`, and `healPlayer` on `window.__MINES_DEBUG__`.

### Scripts

| Command             | Purpose                                               |
| ------------------- | ----------------------------------------------------- |
| `npm run dev`       | Start the Vite dev server                             |
| `npm run build`     | Typecheck and create the production bundle in `dist/` |
| `npm run preview`   | Preview the production bundle at `/minesNgoblins/`    |
| `npm run lint`      | Run ESLint                                            |
| `npm run assets`    | Regenerate the committed art, animations, and font    |
| `npm run format`    | Format the repository with Prettier                   |
| `npm run typecheck` | Run TypeScript without emitting files                 |
| `npm run test`      | Run Vitest unit tests                                 |
| `npm run test:e2e`  | Run Playwright browser tests                          |

Install the Playwright browser once before running E2E tests locally:

```bash
npx playwright install chromium
```

## Deployment

The `Deploy to GitHub Pages` workflow builds and publishes the game on every push to `main`. Enable **Settings → Pages → Source → GitHub Actions** in the GitHub repository before the first deploy.

The production base path defaults to `/minesNgoblins/`. If the site moves to a custom domain or a different repository path, set `VITE_BASE_PATH` (for example, `/` or `/new-repo/`) for the build.

## Project conventions

- All documentation, source code, comments, commit messages, and project discussion are in **English**.
- Game UI text is English for v1, with the text layer kept ready for localization.
- Assets must be original, commissioned, or clearly licensed. The generated art and audio packs are original work; the full inventory is in [`docs/asset-licenses.md`](docs/asset-licenses.md).
- Manual QA notes live in `docs/m1-playtest.md`, `docs/m2-playtest.md`, `docs/m3-playtest.md`, `docs/m4-playtest.md`, `docs/m5-test-matrix.md`, and `docs/m6-qa.md`.

## License

The repository is currently `UNLICENSED` (all rights reserved) until a public
license is chosen. All bundled art, audio, and font files are original works;
see [`docs/asset-licenses.md`](docs/asset-licenses.md) for the inventory and
third-party tool licenses.
