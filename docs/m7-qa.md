# M7 QA Notes

**Build:** `v0.7.0`  
**Date:** 2026-11-02  
**Scope:** Balance pass, Crazy tuning, bug and edge-case hardening, performance profiling at 1080p and 1440p, browser matrix, save migration and regression tests, accessibility review, the full manual checklist, and the release-candidate notes.

This file records what was verified, how it was verified, and what remains a known risk. Automated coverage lives in Vitest and Playwright. Anything that needed eyes on a running build was done in a headed Chromium session against the production bundle or the dev server, as stated per item. Where a check could not be performed at all, it says so instead of implying it passed.

## Balance

### Difficulty curve

| Difficulty | Player HP | Enemy HP |  Enemy damage | Boss HP | Exit rule                           |
| ---------- | --------: | -------: | ------------: | ------: | ----------------------------------- |
| Normal     |         5 |       ×1 |            ×1 |      48 | Reach the elevator                  |
| Hard       |         5 |       ×2 |            ×2 |      72 | Reach the elevator                  |
| Impossible |         4 |       ×3 |            ×2 |      96 | Reach the elevator                  |
| Crazy      |         1 |       ×3 | Any hit kills |     120 | Kill every enemy, then the elevator |

Enemy HP is `ceil((base HP + level bonus) × difficulty multiplier)`. Enemy damage scales with difficulty; hazard damage and pits do not. Boss HP uses its own multiplier so the Crazy fight keeps its designed 120 HP.

### Enemy HP budget

Totals below are the sum of effective HP for every spawned enemy in the level, per difficulty, computed from the shipped maps by `tests/unit/balance.test.ts`.

| Level           | Enemies | Composition                               |  Normal |    Hard | Impossible |   Crazy |
| --------------- | ------: | ----------------------------------------- | ------: | ------: | ---------: | ------: |
| Shaft Entrance  |       5 | dummy, bat, goblin, skeleton, beetle      |      11 |      22 |         33 |      33 |
| Goblin Tunnels  |       7 | 3 goblins, 2 skeletons, 2 beetles         |      23 |      46 |         69 |      69 |
| Crystal Caverns |       9 | 5 bats, 4 beetles                         |      26 |      52 |         78 |      78 |
| Deep Vein       |      11 | 3 goblins, 3 bats, 3 skeletons, 2 beetles |      43 |      86 |        129 |     129 |
| **Full run**    |  **32** |                                           | **103** | **206** |    **309** | **309** |

Enemy base HP: bat 1, goblin 2, skeleton 2, beetle 3, wormling 3, practice dummy 3.

### Crazy tuning decision

Crazy shipped through M6 with a ×5 enemy HP multiplier. Measured against the actual maps, that produced:

| Case                       | ×5 (through M6) | ×3 (v0.7.0) |
| -------------------------- | --------------: | ----------: |
| Deep Vein goblin           |           20 HP |       12 HP |
| Heaviest single enemy      |           25 HP |       15 HP |
| Rock hits for a full clear |             515 |         309 |
| Time on the heaviest enemy |         ~10.0 s |      ~6.0 s |

Rocks deal 1 damage on a 400 ms cooldown, so 25 hits is ten seconds of uninterrupted perfect aim on one enemy while dodging everything else. Combined with one-hit death, that turned Crazy into a war of attrition against single enemies rather than a precision challenge. ×3 makes Crazy enemies exactly as durable as Impossible enemies, which is the intended reading of the mode: the danger comes from 1 player HP and the mandatory all-kill gate, not from inflated health bars.

The ×5 enemy damage multiplier is unchanged, so any contact is still lethal. The boss is unchanged at 120 HP.

`tests/unit/balance.test.ts` locks the new budget: totals of 103/206/309/309, the heaviest Crazy enemy at 15 HP, a full clear inside 320 rock hits, and the heaviest enemy under six seconds of perfect throwing. The test fails if a map edit adds enemies or the multiplier moves.

### Item economy

Supply is authored per map, not per difficulty: every level contains one Knife, one Flintlock, one Rune Scroll, one Healing Salve, and one ore node (two in Deep Vein). Because the secondary slot holds only one item, that is a choice, not a stockpile.

| Item          | Damage | Uses on pickup | Max uses | Cooldown | Notes                      |
| ------------- | -----: | -------------: | -------: | -------: | -------------------------- |
| Rock          |      1 |      unlimited |        — |   400 ms | Arcing throw, bounces      |
| Knife         |      3 |              5 |        8 |   260 ms | Flat trajectory, fast      |
| Flintlock     |      2 |              6 |       12 |   320 ms | Fastest projectile         |
| Rune Scroll   |      4 |              2 |        3 |   700 ms | Arc, 28 px blast, 1 s stun |
| Healing Salve |      — |          +2 HP |        — |        — | Consumed on pickup         |

All three weapons kill the heaviest Normal enemy in one or two hits and the heaviest Crazy enemy in four to six. Ammo is scarce enough that weapons read as burst damage, not a replacement for rocks, which keeps Primitive (rocks only) a real restriction.

### Boss

48/72/96/120 HP across the four difficulties, three phases split at 66% and 33%, phase supplies that restore health, and a retry that restarts the fight. M4 measured a scripted rock-only Normal kill at 2:01 with imperfect aim; at that rate Crazy lands inside the 5–8 minute band the design document targets for a full boss fight.

## Complete-run evidence

### Scripted runs

`tests/e2e/full-run.spec.ts` plays two complete runs end to end and reads the real Results state.

| Run    | Path                                 | Result                                                                                                                                    |
| ------ | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Normal | Start → four levels → boss → Results | Pacifist, Primitive, Untouchable, and Legend complete; `pacifist`, `primitive`, and `untouchable` achievements unlock; best time recorded |
| Crazy  | Start → four levels → boss → Results | Pacifist and Legend unavailable; Primitive and Untouchable complete; `crazy_clear` unlocks; boss max HP 120                               |

Separately, `tests/e2e/levels.spec.ts` verifies the Crazy all-kill gate on all four levels: the elevator refuses to advance with enemies alive, and advances once the level is empty. On Deep Vein, clearing the level moves the run into the boss arena with `runLevelsCompleted` at 4 and 120 boss HP.

### Method caveat

These runs use development hooks for two steps: `F4` skips the current level, and `__MINES_DEBUG__.defeatBoss()` finishes the arena. Everything that the badges, achievements, and Results screen read is produced by the shipping code path — kills, damage taken, item uses, levels completed, boss attempts, run duration — because the hooks still route through the normal level-complete and boss-victory handlers.

What the scripted runs therefore prove: the rules, counters, exclusions, and Results copy are correct for a run with those statistics. What they do not prove: that a human can physically produce those statistics. That is pacing and difficulty feel, which is covered below as an explicit gap.

The level-skip hook is required for the challenge checks because a full 32-enemy, 309-hit Crazy clear is a fifteen-minute automated input sequence that would still only test the bot.

### External playtests (descoped)

The M7 deliverable list asks for at least three external playtest sessions. **No external human playtest sessions were run for v0.7.0.** This is a recorded descope decision, not an oversight:

- The project has no external testers available, and the agent-driven workflow cannot recruit or observe a human player.
- Self-play evidence is scripted: headed browser sessions with real input, the profiler samples in [Performance](#performance), and the visual captures in [Manual checklist](#manual-checklist).
- The substitute evidence answers "is this correct and stable", not "is this fun and fair to a newcomer". Those are different questions, and the second one stays open.

Consequences carried into the release-candidate notes and [Known issues](#known-issues): route pacing and per-difficulty fairness are unvalidated by a human, and level 1 onboarding is unvalidated for a player who has never seen the game.

## Hardening

### Save migration and corruption

`tests/unit/save-service.test.ts` now covers:

| Case                                    | Expected behavior                                                                              |
| --------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Complete v1 save round trip             | Every settings, achievement, skin, and stat field survives unchanged                           |
| Unsupported future version              | Original payload copied to `minesNgoblins.save.backup.<timestamp>`, defaults installed         |
| Non-object JSON payload (`["not","a"]`) | Treated as corrupt, original kept in the backup, defaults installed                            |
| Malformed field types and ranges        | Volumes clamp to 0–1, enums fall back, keybinds restore defaults, negative/NaN stats fall back |
| `localStorage.setItem` throwing         | The service keeps working in memory; no exception reaches the caller                           |

The clamp behavior matters for hand-edited saves: `masterVolume: 4` becomes 1, `musicVolume: -2` becomes 0, `sfxVolume: "loud"` falls back to 0.8, and an unknown `screenShake` value falls back to `full` rather than leaving the game with no shake policy.

### Quit then start a new run

This began as an unconfirmed user report ("after starting a run, quitting and trying to start a new one the game hangs"). It was root-caused and fixed during M7.

**Root cause.** Phaser reuses scene instances across `scene.start()`, so fields left on `RunSetupScene` survive a shutdown while the objects they point at do not. `cardsContainer` and `warningText` kept pointing at the destroyed container and text from the previous visit. When the previous setup had shown a difficulty warning (Crazy or Impossible), the next `create()` called `renderCards()` → `updateWarning()` → `PixelText.setText()` on that destroyed text. Phaser threw `Cannot read properties of null (reading 'chars')` from `GetBitmapTextSize`, which aborted `create()` before the scene finished booting and left it in `CREATING`. The title scene was already paused and waiting for RunSetup, so the game looked frozen.

**Fix.** `src/scenes/run-setup-scene.ts` now clears `cardsContainer` and `warningText` at the top of `create()`, and creates `warningText` before the first `renderCards()` call so the initial warning refresh has a live target.

**Coverage.** `tests/e2e/pause.spec.ts` covers both shapes: quit → new run → quit → new run, and the original trigger — start Crazy (which shows the warning band), quit, reopen RunSetup, confirm the warning renders for Normal and Crazy, then start the new run. `tools/qa/screenshots.mjs` repeats quit → new run at 1366×768, 1920×1080, and 2560×1440.

The exact user steps were never captured, so the original repro cannot be replayed verbatim. The mechanism above is the only path found that produces the symptom, and it no longer throws. If the reporter still sees a hang, their steps are still needed.

### Edge cases exercised

- Restart from the pause menu during a level and during the boss fight.
- Quit during a level and during the boss fight, then start a new run.
- Pause during a boss telegraph, a camera flash, and mid-jump.
- Death by contact, projectile, spike, falling rock, and pit.
- Feared enemy behavior when the player dies mid-throw.
- Crazy gate with one enemy left, with zero enemies, and on the final level transition into the boss.
- Run Setup with each difficulty, including the Crazy warning band.
- Achievement toasts firing during a boss phase transition.
- Save load with a corrupt payload, a future version, and blocked storage.

## Accessibility

### Settings

| Setting          | Options          | Persistence  | Coverage                                        |
| ---------------- | ---------------- | ------------ | ----------------------------------------------- |
| Master/music/SFX | 0–100%           | Save v1      | `settings.spec.ts`, `audio.spec.ts`             |
| Mute             | On/off           | Save v1      | `settings.spec.ts`, `audio.spec.ts`             |
| Screen shake     | Full/reduced/off | Save v1      | `accessibility.spec.ts` (cycle plus reload)     |
| Flash intensity  | Full/reduced/off | Save v1      | `accessibility.spec.ts`, `camera-flash.test.ts` |
| Fullscreen       | On/off           | Session only | `accessibility.spec.ts`                         |
| Key rebinding    | Seven actions    | Save v1      | `accessibility.spec.ts`, `keybinds.test.ts`     |

Text is rendered by the 5×7 bitmap font at whole multiples only, so glyphs land on physical pixels. The canvas is keyboard-focusable, carries `role="application"`, and has an `aria-label` describing the controls.

### Contrast

Relative luminance ratios were computed for every text color against the surfaces it actually renders on. AA for normal text needs 4.5:1; AA for large text needs 3:1.

| Foreground | On `#0b0c10` | On `#11161b` | On `#252d36` (selected row) | Use                 |
| ---------- | -----------: | -----------: | --------------------------: | ------------------- |
| `#f4f1de`  |        17.21 |        16.01 |                       12.26 | Primary text        |
| `#f4d35e`  |        13.34 |        12.41 |                        9.50 | Headings, selection |
| `#cfd2d6`  |        12.89 |        11.99 |                        9.18 | Body text           |
| `#9fd8cb`  |        12.25 |        11.40 |                        8.73 | Positive accent     |
| `#6fe3c4`  |        12.53 |        11.66 |                        8.93 | Unlocked accent     |
| `#ff9a8a`  |         9.53 |         8.87 |                        6.79 | Warning             |
| `#9aa0a6`  |         7.40 |         6.89 |                        5.28 | Secondary text      |
| `#8b959d`  |         6.41 |         5.96 |                        4.57 | Muted/locked text   |
| `#d16262`  |         5.24 |         4.88 |                        3.74 | Danger text         |

Two colors changed in M7 because they failed AA:

- Muted and locked text was `#5f6b73`, which measured 3.57:1 on `#0b0c10`, 3.32:1 on `#11161b`, and 3.64:1 on `#08090d`. At 6–7 px that is genuinely hard to read, and it carried information ("why is this locked"), not just decoration. It is now `#8b959d`, the lightest step that still reads as muted against `#9aa0a6` secondary text.
- Danger text was `#c85c5c`, which measured 4.45:1 on its `#11161b` plate — just under AA. It is now `#d16262` at 4.88:1, which is the smallest hue-preserving step that clears the bar.

Danger text on a selected row (`3.74:1`) is the one remaining sub-4.5 pair. That combination does not occur: the boss danger labels and the level warning draw on `#11161b` or directly on dark arena art, never on the `#252d36` selection tint.

## Performance

### Method

`tools/qa/profile.mjs` drives the real build from the title screen into the sampled scene, then records a five-second `requestAnimationFrame` sample while holding right, plus Navigation Timing and Paint Timing entries. Both headless software rendering (SwiftShader) and headed hardware rendering were measured, because headless Chromium on this machine has no GPU and cannot answer the 60 FPS question on its own.

### Results

Production bundle, 1920×1080 and 2560×1440:

| Target  | Mode               | Viewport  |   FPS |     p50 |     p95 |    Heap | Canvas ready |    Load |
| ------- | ------------------ | --------- | ----: | ------: | ------: | ------: | -----------: | ------: |
| Level 1 | Headless, software | 1920×1080 | 59.95 | 16.7 ms | 16.7 ms | 18.4 MB |      1096 ms |  683 ms |
| Level 1 | Headed, hardware   | 1920×1080 | 60.19 | 16.7 ms | 16.8 ms | 18.4 MB |      1827 ms | 1586 ms |
| Level 1 | Headless, software | 2560×1440 | 56.39 | 16.7 ms | 33.3 ms | 19.6 MB |       776 ms |  451 ms |
| Level 1 | Headed, hardware   | 2560×1440 | 60.17 | 16.7 ms | 16.9 ms | 19.3 MB |      1665 ms | 1246 ms |

Development server, heaviest level and the boss arena, headed hardware:

| Target    | Viewport  |   FPS |     p50 |     p95 |    Heap |
| --------- | --------- | ----: | ------: | ------: | ------: |
| Deep Vein | 1920×1080 | 60.13 | 16.7 ms | 16.9 ms | 55.8 MB |
| Deep Vein | 2560×1440 | 60.17 | 16.7 ms | 16.8 ms | 55.5 MB |
| Boss      | 1920×1080 | 60.14 | 16.7 ms | 17.0 ms | 56.0 MB |
| Boss      | 2560×1440 | 60.11 | 16.7 ms | 16.8 ms | 55.9 MB |

### Interpretation

- On hardware, every sampled scene holds 60 FPS at both resolutions, with p95 frame time within 0.3 ms of the 16.7 ms budget. This is the number that answers "does it hit 60 FPS".
- The headless 1440p sample reports 56.39 FPS with p95 at 33.3 ms — 282 frames instead of 301. That is SwiftShader rasterizing 3.7 megapixels of canvas with no GPU, not a game-side regression: the same scene is a clean 60.17 FPS at the same resolution when headed. It is recorded rather than hidden because CI runs headless, and a future p95 failure there needs this baseline to be read correctly.
- Heap stays under 20 MB in the production bundle. The ~56 MB figures are the dev server with unminified modules and source maps, not a production cost.
- Canvas-ready and load times are well inside the 3-second budget on local production builds. The slowest observed first paint of the game canvas is 1.83 s on the production bundle at 1080p, including a cold module fetch. The deployed first request after a fresh Pages deploy measured 3.63 s once while the CDN edge warmed; see [Deployed smoke test](#deployed-smoke-test).

## Browser matrix

Playwright runs Chromium by default. `BROWSER_MATRIX=1` adds Edge, Firefox, and WebKit projects that run the six smoke specs (title, movement, pause, settings, audio, accessibility). The full matrix was run on 2026-11-02 against the release-candidate tree:

| Browser             | Engine |   Tests | Result                    |
| ------------------- | ------ | ------: | ------------------------- |
| Chromium (headless) | Blink  |      59 | 59 passed                 |
| Edge                | Blink  |      18 | 18 passed                 |
| Firefox             | Gecko  |      18 | 18 passed                 |
| WebKit              | WebKit |      18 | 15 passed, 3 skipped      |
| **Total**           |        | **113** | **110 passed, 3 skipped** |

The three WebKit skips are the audio spec: Playwright's WebKit build ships without Web Audio, so Phaser's HTML5 fallback cannot decode the WAV pack and the game boots silent by design. Real Safari has Web Audio. WebKit also forces `deviceScaleFactor: 1` because headless software rendering at 2× DPR drops below real-time and breaks input-timing checks for reasons that do not occur on Safari with a GPU; DPR scaling stays covered by Chromium.

`BROWSER_MATRIX=1 npx playwright test` reproduces the run.

## Production build scan

`npm run build` on the release-candidate tree produced `dist/assets/index-CQoF9a2V.js` (1,563.90 kB, 407.52 kB gzip) plus the CSS and HTML assets. A byte scan of the bundle found:

| Token                   | Occurrences |
| ----------------------- | ----------: |
| `__MINES_TEST__`        |           0 |
| `__MINES_DEBUG__`       |           0 |
| `__MINES_GAME__`        |           0 |
| `__MINES_LEVEL_DEBUG__` |           0 |
| `?boss=1`               |           0 |
| `?spawn=exit`           |           0 |
| `URLSearchParams`       |           0 |

The only `difficulty=` matches are JavaScript class fields (`difficulty=...`), not query-string reads. Internal method names such as `debugDefeatBoss` and `debugDefeatAllEnemies` remain in the class method tables, but every call site and the global hook installation sit behind `import.meta.env.DEV`, so production cannot reach them.

`tools/qa/smoke.mjs --url <deployment>` is the repeatable production check. It fails on any console or page error, requires the canvas within 3 seconds, asserts that `__MINES_TEST__`, `__MINES_DEBUG__`, `__MINES_LEVEL_DEBUG__`, and `__MINES_GAME__` are undefined, and loads `?boss=1` and `?spawn=exit` to confirm the app still boots to the title instead of acting on them. Local preview against this build: **PASS**, canvas ready in 1521 ms, zero errors.

### Deployed smoke test

`tools/qa/smoke.mjs` was run against the live [mariodod.github.io/minesNgoblins](https://mariodod.github.io/minesNgoblins/) deployment:

| Check                                    | Result                             |
| ---------------------------------------- | ---------------------------------- |
| Runtime errors                           | 0                                  |
| Debug hooks exposed                      | none                               |
| `?boss=1` / `?spawn=exit` inert          | pass                               |
| Canvas ready, warm                       | 436–952 ms over fresh-browser runs |
| Canvas ready, first request after deploy | 3629 ms                            |

The first request after deployment hit a cold GitHub Pages edge and took 3.63 s. The next three fresh-browser runs took 0.44–0.51 s, and later redeploys of the same bundle measured 0.95–1.40 s on their first request. That outlier is CDN cache warm-up, not a bundle change: the same artifact measured 1.52 s on local preview. It is recorded here, and as a P3 known issue, so a later cold-start report is read correctly.

## Manual checklist

Items that need a human eye were run in a headed Chromium session against the production bundle and the dev server, with screenshots captured by `tools/qa/screenshots.mjs` at 1366×768, 1920×1080, and 2560×1440.

| #   | Check                                                                     | Evidence                                                                                | Result           |
| --- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------- |
| 1   | Walk every level from spawn to elevator; confirm platforms are reachable  | `level-reachability.test.ts` walks the discrete jump arc; exit-transition E2E per level | Pass (automated) |
| 2   | Pause mid-jump, mid-flash, and during boss telegraphs                     | `pause.spec.ts` plus headed session                                                     | Pass             |
| 3   | Start a run, quit, start a new run; repeat twice                          | `pause.spec.ts` regression test; repeated in the screenshot pass                        | Pass             |
| 4   | Complete a Normal run with only rocks and read every Results line         | Scripted run in `full-run.spec.ts`; Results captured at 3 sizes                         | Pass (scripted)  |
| 5   | Win with each badge broken and confirm Results explains the reason        | `m5.spec.ts` badge-failure cases                                                        | Pass             |
| 6   | Cycle flash and shake to off, take boss damage, confirm pause is readable | `accessibility.spec.ts` plus headed session                                             | Pass             |
| 7   | Toggle fullscreen in and out, then reload                                 | `accessibility.spec.ts`                                                                 | Pass             |
| 8   | Mute during the boss fight, reload, confirm the setting stuck             | `audio.spec.ts`, `settings.spec.ts`                                                     | Pass             |
| 9   | Rebind jump, finish a level, confirm the HUD hint matches                 | `accessibility.spec.ts`                                                                 | Pass             |
| 10  | Corrupt the save and confirm the backup and Title notice                  | `save-service.test.ts`, corrupt-save E2E                                                | Pass             |
| 11  | Check 1366×768, 1920×1080, 2560×1440 for letterboxing and readable text   | Screenshot pass at all three sizes                                                      | Pass             |
| 12  | Empty inventory, zero ammo, and item-swap prompts                         | `combat.spec.ts`, `items.test.ts`, `inventory.test.ts`                                  | Pass             |
| 13  | Crazy HUD counter and locked-elevator prompt                              | `m5.spec.ts`, `levels.spec.ts`                                                          | Pass             |
| 14  | Results best-time row on a first run and on a later run                   | `full-run.spec.ts` (`runBestTimeMs`), Results capture                                   | Pass             |

## Known issues

| Severity | Issue                                                                                                                                                                                                                     | Status                                                                |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| P2       | No external human playtest. Route pacing and per-difficulty fairness are unvalidated by a real player.                                                                                                                    | Accepted for v0.7.0; needs a human pass before or shortly after v1.0. |
| P2       | Newcomer onboarding for level 1 is unvalidated; the game explains controls on the title screen and in Options, but no first-time player has been observed.                                                                | Accepted; same human pass.                                            |
| P3       | Boss and level route timings come from scripted runs and arithmetic, not from watching a player.                                                                                                                          | Documented above.                                                     |
| P3       | The four-track music target was cut to three; the boss shares the level track.                                                                                                                                            | Carried from M6.                                                      |
| P3       | UI copy is co-located with scenes; extracting a copy table waits for a second language.                                                                                                                                   | Carried from M6.                                                      |
| P3       | The repository has no public license yet.                                                                                                                                                                                 | Decision needed before v1.0.                                          |
| P3       | The first request to a newly deployed GitHub Pages build can exceed the 3 s load budget while the CDN edge warms: 3.63 s once, then 0.44–0.95 s on fresh-browser runs.                                                    | Infrastructure cache warm-up, not bundle size; recorded above.        |
| P4       | The reporter's exact quit → new-run steps were never captured. The root cause (a destroyed `warningText` in `RunSetupScene`) is fixed and covered by a regression test, but the original repro was not replayed verbatim. | Fixed in v0.7.0; keep the report open until the reporter confirms.    |

No P0 or P1 issues are open.

## Release candidate notes

- Speedrun timer: **descoped**. Results gained a `BEST TIME` row built from the best-run duration the save already records, which delivers the useful part of the feature without a second timing system, a split UI, or new save fields. A live timer during play remains a post-v1 candidate.
- Version: `v0.7.0`, deployed from `main` to GitHub Pages.
- Test hooks in the shipped bundle: none. See the production build scan.
- The Crazy multiplier change is the only behavioral balance change in this build. Everything else is UI contrast, tests, tooling, and documentation.
