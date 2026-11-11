# Mines & Goblins v1.0.0 — Release Notes

**Released:** 2026-11-03  
**Play:** [mariodod.github.io/minesNgoblins](https://mariodod.github.io/minesNgoblins/)  
**Tag:** `v1.0.0`  
**License:** [MIT](../LICENSE)

Mines & Goblins is a browser-first, retro action platformer about a stubborn miner, an unlimited supply of rocks, and one very large worm. Four handcrafted levels, four difficulties, four challenge badges, twelve achievements, and nine cosmetic skins.

## Highlights

- **Four handcrafted levels** with a multi-phase boss arena.
- **Unlimited rocks** with arcing throws and a cooldown, plus limited Knife, Flintlock, Rune Scroll, and Healing Salve pickups.
- **Four difficulties:** Normal, Hard, Impossible, and Crazy. Crazy gives the player one heart and requires every standard enemy to die before the exit opens.
- **Challenge badges:** Pacifist, Primitive, Untouchable, and Legend, tracked automatically and explained on the Results screen when they fail.
- **12 achievements and 9 skins**, saved locally.
- **Accessibility:** rebindable keys, volume and mute controls, screen-shake and flash intensity, fullscreen, integer-scaled bitmap text, and WCAG AA contrast.
- **Desktop browser release** with keyboard controls and no install.

## Controls

| Action       | Default input             |
| ------------ | ------------------------- |
| Move         | `A` / `D` or Left / Right |
| Jump         | `Space` or `Z`            |
| Throw rock   | `X` or `J`                |
| Use item     | `C` or `K`                |
| Interact     | `E`                       |
| Aim up/down  | `W` / `S` or Up / Down    |
| Drop through | `Down` + `Jump`           |
| Pause        | `Esc` or `P`              |

Every action can be rebound in **Options → Controls**. The title screen lists the core bindings.

## Screenshots

| Title screen                  | Shaft Entrance                    |
| ----------------------------- | --------------------------------- |
| ![Title screen][title-screen] | ![Shaft Entrance][shaft-entrance] |
| **The Great Worm**            | **Run results**                   |
| ![The Great Worm boss][boss]  | ![Run results screen][results]    |

_Captured at 1920×1080 from an automated QA pass, so the Results stats come from a scripted run._

[title-screen]: media/release/title.png
[shaft-entrance]: media/release/level.png
[boss]: media/release/boss.png
[results]: media/release/results.png

## What changed in v1.0.0

- The project moved from `UNLICENSED` to the **MIT License**, including the original generated art, audio, and font.
- Version and build label updated to `v1.0.0` / `v1.0 RELEASE`.
- The in-game Credits screen gained a **LICENSE** section naming MIT and the copyright holder.
- The README now targets players: play link, features, controls, credits, known issues, and license.
- Release media added at 1920×1080 for the title, a level, the boss, and Results.
- `tools/qa/smoke.mjs` gained `--browser` so the live build can be checked in Chromium, Edge, Firefox, and WebKit.
- `tools/qa/screenshots.mjs` now captures the boss fight, Results, and Credits screens.
- No gameplay, balance, or save-format changes from `v0.7.0`.

## Verification

| Check                 | Result                                                                  |
| --------------------- | ----------------------------------------------------------------------- |
| Unit tests            | 167 passed in 19 files                                                  |
| Chromium E2E          | 61 passed                                                               |
| Browser matrix        | 112 passed, 3 WebKit audio skips (115 total)                            |
| Lint / typecheck      | clean                                                                   |
| Formatting            | Prettier clean                                                          |
| Production build      | 1,564.12 kB, 407.59 kB gzip                                             |
| Debug hooks in bundle | 0 occurrences of all test/debug globals and query shortcuts             |
| Performance           | 60.1–60.2 FPS at 1920×1080 and 2560×1440 on hardware                    |
| Load                  | canvas ready 0.44–1.52 s warm; first post-deploy request may cold-start |
| Live smoke            | pass in Chromium, Edge, Firefox, and WebKit (see below)                 |

The three WebKit skips are the audio spec: Playwright's WebKit build ships without Web Audio, so the game boots silent there by design. Real Safari has Web Audio.

### Post-deploy smoke

`node tools/qa/smoke.mjs --url https://mariodod.github.io/minesNgoblins/ --browser <engine>` was run against the live deployment on 2026-11-03, after the final `v1.0.0` deploy. Every run loads the title screen, waits for the canvas, reloads `?boss=1` and `?spawn=exit`, and fails on any console error, page error, exposed debug hook, or a canvas that misses the 3-second budget.

| Engine              | Canvas ready | Errors | Debug hooks | Result |
| ------------------- | ------------ | ------ | ----------- | ------ |
| Chromium (headless) | 864 ms       | 0      | none        | pass   |
| Edge (installed)    | 1090 ms      | 0      | none        | pass   |
| Firefox             | 1768 ms      | 0      | none        | pass   |
| WebKit              | 715 ms       | 0      | none        | pass   |

All four engines loaded the warm GitHub Pages edge on the final run. Earlier deploys of the same bundle hit a cold edge on the first request, up to 3711 ms; that behaviour is recorded as a P3 known issue rather than a release blocker. Firefox is consistently the slowest engine, still inside the 3-second budget. No engine reported an error or exposed a development hook.

## Credits

Created by [mariodod](https://github.com/mariodod). All art, audio, the bitmap font, level data, and code are original work generated or authored for this project.

- **Phaser 4.2** — MIT
- **Vite** — MIT
- **Playwright** — Apache-2.0
- **Vitest** — MIT

The in-game **Credits** screen and [Asset and Dependency Licenses](asset-licenses.md) list every asset and third-party tool.

## Known issues

- **No external human playtest (P2).** Route pacing, per-difficulty fairness, and first-time onboarding are backed by scripted complete runs, automated checks, and headed browser sessions, not by watching a new player. The fresh-player acceptance check therefore remains unvalidated.
- **Cold CDN start (P3).** The first request after a fresh GitHub Pages deployment can exceed the 3-second budget while the edge warms. Warm loads are under 1.5 seconds.
- **Quit → new-run report (P4).** The reported hang was root-caused to a destroyed `warningText` in `RunSetupScene` and fixed in `v0.7.0` with a regression test, but the reporter's exact steps were never captured.
- **Headless WebKit has no Web Audio**, so CI cannot verify the audio asset pack there. Chromium, Edge, and Firefox cover it.

No P0 or P1 issues are open.

## Rollback

`v1.0.0` is tagged from the deployed commit. To roll back:

1. Re-run the **Deploy to GitHub Pages** workflow from an earlier tag (for example `v0.7.0`), or
2. `git revert` the offending commit on `main` and let the normal deploy workflow publish the fix.

GitHub Actions keeps the previous Pages deployment in its history, and the GitHub Release keeps the tagged source and `dist` archive available.

## Links

- [README](../README.md)
- [M7 QA Notes](m7-qa.md)
- [Roadmap](roadmap.md)
- [Asset and Dependency Licenses](asset-licenses.md)
