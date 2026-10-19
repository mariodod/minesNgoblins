# Mines & Goblins — Roadmap

**Version:** 0.2 (draft for review)  
**Date:** 2026-10-19  
**Status:** M1 complete; M2 next

---

## 1. How to use this roadmap

- Milestones are ordered by dependency, not by calendar dates.
- Each milestone produces a **playable, testable increment**, not an internal-only refactor.
- Estimates are in focused development days for one developer. They exclude long breaks, asset commissioning lead time, and major scope changes.
- The estimates assume placeholder art/audio through M5 and custom final assets in M6. Art/audio production is the least predictable part of the schedule.
- A milestone is complete only when its acceptance criteria and the project-wide Definition of Done are met.
- Scope can be reduced, but the order of milestones should only change deliberately. See section 8 for the release-critical path.

**Working estimates:**

| Path                              | Estimate                                    |
| --------------------------------- | ------------------------------------------- |
| Playable core (M0–M3)             | 23–30 focused days (~5–6 weeks full-time)   |
| Feature-complete v1 (M0–M5)       | 37–48 focused days (~8–10 weeks full-time)  |
| Full v1 with art/audio/QA (M0–M8) | 59–81 focused days (~12–16 weeks full-time) |
| Part-time (about 20 hours/week)   | Roughly 4–6 months                          |

These numbers are planning aids, not promises. The art/audio pass in M6 can run in parallel with late code work if an artist/composer is available.

---

## 2. Milestone overview

| ID     | Milestone                    | Primary outcome                                                 |    Estimate |
| ------ | ---------------------------- | --------------------------------------------------------------- | ----------: |
| **M0** | Foundations                  | Reproducible project, CI, deployable title screen               | 2–3 days ✅ |
| **M1** | Movement vertical slice      | Player traversal, rock throwing, damage, retry loop             | 5–7 days ✅ |
| **M2** | Combat and items             | Enemy roster, item arsenal, crates, HUD, feedback               |   8–10 days |
| **M3** | Levels and progression       | Four levels, transitions, hazards, Normal playable end to end   |   8–10 days |
| **M4** | Boss                         | Great Worm with phases, arena, victory flow                     |    6–8 days |
| **M5** | Difficulties, runs, and meta | All difficulties, challenge tracking, achievements, skins, save |   8–10 days |
| **M6** | Content and polish           | Final art/audio/UI, accessibility, content complete             |  12–18 days |
| **M7** | Balance and QA               | Playtests, tuning, performance, release candidate               |   8–12 days |
| **M8** | Release                      | v1.0 tag, live deploy, docs, release notes                      |    2–3 days |

**Total:** 59–81 focused development days.

---

## 3. Milestone details

### M0 — Foundations

**Goal:** A clean, reproducible TypeScript game project that builds, tests, and deploys a title screen.

**Deliverables**

- Vite + TypeScript + Phaser 4.2.x scaffold.
- Strict TypeScript configuration, ESLint flat config, Prettier.
- Folder structure from the technical plan.
- Phaser game config: 480×270, pixel-art settings, Arcade Physics, scale behavior.
- Boot, Preload, and Title scenes with placeholder visuals.
- Save service skeleton and settings defaults.
- Vitest configuration and first pure tests.
- Playwright smoke test.
- GitHub Actions CI: install, lint, typecheck, test, build.
- GitHub Pages deployment for `main`.
- README quick-start commands and project status.
- `.gitignore`, lockfile, pinned engine version.
- Initial `CHANGELOG.md`.

**Acceptance criteria**

- `npm ci` works from a clean clone.
- `npm run dev` serves the title screen.
- `npm run build` succeeds and loads correctly from the GitHub Pages base path.
- `npm run lint`, `npm run typecheck`, and `npm run test` pass.
- Playwright smoke test passes in CI.
- A pushed `main` build deploys automatically.
- No browser console errors on load.
- The title screen is keyboard-navigable and shows the current version.

**Dependencies:** None.  
**Risks:** Phaser 4 + Vite configuration; GitHub Pages base path.

---

### M1 — Movement vertical slice

**Goal:** Prove that the core game feel works before building content around it.

**Status:** Complete (2026-10-19). Internal checks are recorded in [M1 Playtest Notes](m1-playtest.md).

**Deliverables**

- Player entity with acceleration, friction, variable jump, coyote time, and jump buffering.
- One-way platforms and drop-through.
- Camera follow with deadzone and level bounds.
- One test level built in Tiled (or a provisional JSON map if Tiled pipeline is not ready).
- Rock throwing: horizontal/angled aim, arc, one bounce, 1 damage, cooldown.
- One practice enemy/dummy with HP and hit reaction.
- Player HP, damage, invulnerability frames, knockback, death, and level restart.
- HUD: hearts, rock icon, level name.
- Debug overlay (FPS, state, hitboxes) gated to dev builds.
- Placeholder pixel art and SFX.
- A short playtest checklist and tuning notes.

**Acceptance criteria**

- Player can traverse the test level without getting stuck.
- Jump feel checklist: no input eat, coyote time works, jump cut works, drop-through works.
- Rock arcs, bounces, hits, and deals exactly 1 damage.
- Dummy can be killed; player can take damage and die.
- Death → retry returns control in under 3 seconds.
- 60 FPS at 1080p on the development machine.
- At least three internal playtest passes; movement notes recorded.
- No console errors or obvious physics tunneling across the test level.

**Dependencies:** M0.  
**Risks:** Game feel; Arcade Physics one-way platform behavior; pixel scaling.

**Exit gate:** Do not start M2 if movement and throwing still feel wrong. Fix the core first.

---

### M2 — Combat and items

**Goal:** Make combat and scavenging satisfying and data-driven.

**Status:** In progress (started 2026-10-19). Implementation is split into M2.1 (enemy framework, four enemies, hazards, damage pipeline), M2.2 (weapons, inventory, pickups, HUD item slot), and M2.3 (feedback polish, difficulty HP scaling integration, playtest notes).

**Deliverables**

- Four standard enemy types: Bat, Goblin, Skeleton, Armored Beetle.
- Enemy state machines, telegraphs, hitboxes, contact damage, projectiles, death effects.
- Enemy HP progression by level (data-driven).
- Knife, Flintlock, and Rune Scroll.
- One secondary item slot; ammo/use caps; same-item ammo stacking; different-item replacement.
- Crates and item pedestals; authored contents.
- Healing salve and ore pickups.
- Spike hazard; basic falling-rock hazard if ready.
- Damage event pipeline with source attribution.
- Hit-stop, flash, knockback, particles, screen shake, placeholder SFX.
- HUD item icon and ammo count.
- Unit tests for damage, item use, enemy HP scaling, and ammo caps.
- Data modules for enemies, items, and tuning.

**Acceptance criteria**

- All four enemies can be defeated with rocks alone.
- Each enemy's dangerous action is telegraphed and avoidable.
- All three secondary weapons work and are limited.
- Picking up the same item adds ammo; a different item replaces it.
- Item use emits the correct source event for run tracking.
- Enemy HP formula applies level bonuses and difficulty multiplier correctly in tests.
- Crates and pedestals cannot duplicate items or soft-lock the player.
- HUD updates immediately and remains readable at internal resolution.
- Visual/audio feedback makes hits, damage, and deaths unambiguous.
- No magic numbers for combat tuning outside data/config.

**Dependencies:** M1.  
**Risks:** Enemy behavior quality; item balance; hit feedback polish.

---

### M3 — Levels and progression

**Goal:** Deliver a complete Normal-mode run through the four standard levels, ending at a boss placeholder.

**Deliverables**

- Four Tiled levels: Shaft Entrance, Goblin Tunnels, Crystal Caverns, The Deep Vein.
- Level-specific decorations, hazards, enemy placement, item placement, exits.
- Level transitions, intro cards, and elevator/exit flow.
- Boss placeholder arena at the end of Level 4 or a separate placeholder scene.
- Level validation test for object IDs, player spawn, exit, and enemy/item references.
- Normal difficulty configuration.
- RunService with level index, timer, kills, damage, deaths, and item uses.
- Pause menu, game over/retry flow, and run quit.
- Camera polish and level bounds.
- At least one no-kill route per level and one rock-only clear per level.
- Checkpoint/retry behavior: restart current level with full HP.
- Settings persistence for volume and basic options.
- Level design notes and a QA checklist.

**Acceptance criteria**

- A player can start a new Normal run and reach the boss placeholder.
- All four levels are completable with rocks only.
- All four levels have a viable Pacifist route (verified manually).
- No soft-locks: exits reachable, no required items, no unreachable enemies in normal progression.
- Level transitions and results placeholder work.
- Death/restart does not corrupt run statistics.
- Level maps validate in CI.
- Frame rate remains 60 FPS with the full enemy/projectile budget.
- A full run takes roughly 15–25 minutes on a first playthrough.

**Dependencies:** M2.  
**Risks:** Level design time; Tiled pipeline friction; pacing and readability.

**Exit gate:** This is the first "game-shaped" build. Record a short playtest video/GIF for the README and use it to validate the core loop before adding meta systems.

---

### M4 — Boss: The Great Worm

**Goal:** Build the final boss and the run-completion flow.

**Deliverables**

- Dedicated boss arena with burrow holes, platforms, ceiling rocks, and camera behavior.
- Great Worm with head weak point, body segments, and three phases.
- Attacks: emerge bite, rock spit, burrow charge, quake, summon Wormlings.
- Boss health bar, phase pips, intro roar, phase transitions, death sequence.
- Arena supply pedestals between phases.
- Boss retry flow; death restarts the encounter.
- Victory flow: slow motion, collapse, exit, results placeholder.
- Boss-specific audio/visual feedback (placeholder assets until M6).
- Unit/integration tests for phase transitions, weak-point damage, and victory.
- Debug tools for phase skipping and hitbox visualization.

**Acceptance criteria**

- Boss can be defeated using rocks only on Normal.
- All attacks are telegraphed and dodgeable.
- Body hits do not damage the boss; head hits do.
- Phase transitions trigger at the intended health thresholds.
- Boss retry restores the arena cleanly with no duplicate entities.
- Victory sets the run as completed and advances to results.
- Crazy/other difficulty HP scaling is configurable and tested at least in a debug scenario.
- No unavoidable damage patterns in repeated playtests.
- Fight length targets: 2–4 minutes Normal; 5–8 minutes Crazy.

**Dependencies:** M1–M3. Boss prototyping can start after M1 to de-risk, but production work lands here.  
**Risks:** Collision/weak-point readability; attack pacing; difficulty scaling.

---

### M5 — Difficulties, challenge runs, achievements, and skins

**Goal:** Turn the core game into a replayable challenge game with persistent rewards.

**Deliverables**

- Difficulty configs for Normal, Hard, Impossible, and Crazy.
- Difficulty selection screen with modifiers and warnings.
- Crazy all-enemies-dead exit gate and HUD counter.
- Run tracker with kill/damage/item/death attribution.
- Pure rule functions for Pacifist, Primitive, Untouchable, and Legend.
- Results screen with successful and failed badges and reasons.
- Achievement definitions, evaluation, unlock toasts, and persistence.
- Skins: unlock conditions, palette variants, equip/preview UI.
- Title, Achievements, Skins, Options screens.
- Pause and game-over flows integrated with run rules.
- Save data v1: settings, achievements, skins, stats; validation and migration.
- Unit tests for all difficulty modifiers, run-rule edge cases, achievements, and save round-trips.
- UI copy and tooltips explaining challenge rules.
- A manual test matrix covering every difficulty × run type combination.

**Acceptance criteria**

- All four difficulties apply the specified HP and damage modifiers.
- Impossible kills the player in two enemy hits; Crazy kills in one and requires all enemies dead.
- Pacifist is unavailable on Crazy and clearly communicated in the UI.
- Pacifist invalidates on any enemy death; Primitive invalidates on any secondary weapon use or non-rock kill; Untouchable invalidates on any damage or death.
- Legend requires all three in one completed run.
- Achievements unlock once, persist across reloads, and show correct toast/state.
- Skins unlock and equip correctly; no gameplay effect.
- Results screen accurately reports why a badge failed.
- Corrupt save recovery works without crashing.
- All difficulty/run combinations have been manually tested or are explicitly marked unavailable.

**Dependencies:** M3–M4.  
**Risks:** Rule edge cases; save schema mistakes; UI complexity; Crazy balance.

---

### M6 — Content and polish

**Goal:** Replace placeholders and make the game feel like a finished product.

**Deliverables**

- Final tilesets and backgrounds for all four levels and the boss arena.
- Final player sprite, animations, skins, and palette variants.
- Final enemy sprites and animations (six standard enemies if scope allows; five minimum).
- Final boss art and animation.
- Final UI, title logo, pixel font, icons, and results/achievement/skin screens.
- Final SFX set and four music tracks.
- Ambient effects: dust, drips, lantern glow, parallax.
- Accessibility settings: shake/flash intensity, volumes, key remapping, fullscreen.
- Credits screen and asset license inventory.
- Text externalization for future localization.
- Remove all placeholder assets and debug cheats from production builds.
- Final intro/outro narrative panels.
- Gamepad support if the milestone is on schedule; otherwise move to v1.1.

**Acceptance criteria**

- No placeholder art, audio, or UI text remains in the production build.
- Every entity and UI state has final art/animation.
- All music and SFX play at consistent levels; mute/volume controls work.
- All text is readable at 480×270 and on a 1080p display.
- Accessibility options function and persist.
- Asset licenses are documented.
- Browser matrix passes with final assets.
- Performance budgets still hold after the art/audio pass.

**Dependencies:** M1–M5; art/audio work should begin during M2–M3.  
**Risks:** Asset production time; style consistency; audio integration.

---

### M7 — Balance and QA

**Goal:** A release candidate that is fair, stable, and completable on all intended paths.

**Deliverables**

- At least three external playtest sessions with notes.
- Balance pass for player HP, enemy HP, item economy, level pacing, and boss fights.
- Crazy-mode tuning, especially all-kill levels and boss length.
- Bug fixing and edge-case hardening.
- Performance profiling at 1080p and 1440p; fix regressions.
- Browser matrix verification: Chrome, Edge, Firefox, Safari.
- Save migration/regression tests.
- Accessibility review.
- Full manual QA checklist completed.
- Release candidate build and known-issues list.
- Updated docs: README, controls, credits, changelog.
- Optional: speedrun timer and best-time display if scope allows.

**Acceptance criteria**

- No open P0 (crash/data loss/soft-lock) or P1 (progression blocker/severe visual break) bugs.
- Every difficulty can be completed, and every challenge run can be earned in at least one valid configuration.
- Pacifist, Primitive, and Untouchable are each verified with a complete run.
- Crazy all-kill gate verified on all four levels and the boss.
- 60 FPS target holds in normal play; boss and particle-heavy rooms stay above the acceptable threshold.
- Initial load under 3 seconds on broadband.
- No console errors in production.
- CI and E2E tests green.
- Live-deployed build passes the smoke test.
- Release notes and credits prepared.

**Dependencies:** M6.  
**Risks:** Balance regressions; late bugs; external feedback requiring scope changes.

---

### M8 — Release v1.0

**Goal:** Publish a stable, documented v1.0.

**Deliverables**

- Version bump and `CHANGELOG.md` entry.
- Git tag `v1.0.0`.
- GitHub Release with notes, screenshots/GIF, and play link.
- Final GitHub Pages deployment.
- Post-deploy smoke test on the browser matrix.
- README updated with controls, features, credits, and known issues.
- Backup of the release artifact and source tag.
- Optional: itch.io page or custom domain.

**Acceptance criteria**

- `v1.0.0` is tagged from the deployed commit.
- Public URL loads and is playable without errors.
- All features described in the README are present.
- Credits and licenses are complete.
- No P0/P1 bugs in the release build.
- A fresh player can understand controls and complete Level 1 without external instructions.
- Rollback path exists (previous tag/deploy).

**Dependencies:** M7.  
**Risks:** Deployment-only issues; missing credits/licensing; last-minute scope.

---

## 4. Project-wide Definition of Done

A milestone is done when:

- The deliverable list is complete or explicitly descoped with a recorded decision.
- Acceptance criteria pass.
- `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` pass.
- New pure logic has unit tests; new critical flows have manual QA notes.
- No debug-only shortcuts are reachable in production builds.
- The build is deployed to a preview or main URL and smoke-tested.
- Documentation and `CHANGELOG.md` are updated.
- No known P0/P1 bugs remain.
- The next milestone has a short kickoff note listing open questions and dependencies.

---

## 5. Dependencies and critical path

```text
M0 → M1 → M2 → M3 → M4 → M5 → M6 → M7 → M8
                └──────→ M4 (boss prototype can start after M1)
M2/M3: level design and Tiled pipeline can overlap with combat work
M3/M6: final art production should start during M3, not M6
M6/M7: audio integration can overlap with final art
```

**Critical path:** movement feel → combat/items → levels → boss → difficulty/run rules → final content → QA → release.

**Parallelizable work**

- Level design in Tiled while coding enemies.
- Sprite production (player, enemies, tiles) while systems are being built.
- Music/SFX composition while boss and meta systems are built.
- Documentation updates at every milestone.
- External playtests from M3 onward.

---

## 6. Release criteria for v1.0

The game is releasable when all of the following are true:

- Four standard levels and one boss are playable from start to finish.
- All four difficulties work with their specified modifiers.
- Pacifist, Primitive, Untouchable, and Legend can be earned and persist.
- Achievements and skins are complete, unlockable, and saved.
- Pause, retry, results, options, credits, and reset-save flows work.
- Keyboard controls are remappable and audio settings persist.
- Final art/audio replace all placeholders.
- No P0/P1 bugs; no known soft-locks.
- Performance and load targets are met.
- Browser matrix smoke tests pass.
- Licenses for all assets are documented.
- The deployed build is playable from a clean browser profile with no console errors.

---

## 7. Risks and mitigation schedule

| Risk                           | When to address | Mitigation                                                                                            |
| ------------------------------ | --------------- | ----------------------------------------------------------------------------------------------------- |
| Movement does not feel good    | M1              | Dedicated tuning week; external feedback; do not proceed until the core is fun                        |
| Scope creep                    | Every milestone | Freeze v1 scope; use the stretch backlog; require a trade-off for additions                           |
| Art/audio production slips     | M2–M6           | Start early; placeholders are shippable in dev; palette-swap skins; commission or reduce enemy roster |
| Crazy mode is grindy           | M5, M7          | Data-driven tuning; enemy counts; item supply; possibly boss-specific HP curve                        |
| Boss is unfair or buggy        | M4, M7          | Prototype early; telegraph audits; repeated playtests; debug phase skip                               |
| Run-rule edge cases            | M5              | Central event model; pure tests; explicit UI explanations; manual matrix                              |
| Save compatibility/corruption  | M5, M7          | Versioned schema, validation, backup, migration tests                                                 |
| Performance regressions        | M6, M7          | Budgets, pooling, profiling, reduced-effects settings                                                 |
| GitHub Pages deployment issues | M0, M8          | Deploy from M0; smoke-test the live base path every milestone                                         |
| Licensing gaps                 | M6, M8          | Asset license inventory; no copyrighted references or assets                                          |

---

## 8. Scope reduction plan

If the schedule slips, cut in this order:

1. **Gamepad support** → move to v1.1.
2. **Optional hazards** (steam vents, extra decorations) → cut.
3. **Enemy roster** → ship five standard enemies instead of six.
4. **Music tracks** → three tracks instead of four.
5. **Ore/score polish** → keep collectible ore but simplify results.
6. **Speedrun timer** → v1.1.
7. **Extra skins** → keep the achievement-linked skins, cut bonus palette variants.
8. **Fourth level** → only as a last resort; it weakens the progression and boss build-up. Prefer shortening levels over cutting one.

Do **not** cut:

- Rock throwing feel.
- Boss.
- All four difficulties.
- The three challenge runs and their tracking.
- Save persistence.
- Final QA and external playtests.

---

## 9. Stretch backlog (post-v1)

- Procedural endless mine with handcrafted chunks.
- Daily challenge seed and local leaderboard.
- Speedrun timer with splits and best-time tracking.
- Gamepad support.
- More biomes and a second boss.
- Boss rush mode.
- Additional skins and unlockable palette variants.
- Spanish and other localizations.
- Desktop build (Tauri).
- Steam/itch.io integration.
- Replay/ghost recording.
- Accessibility additions such as assist mode, colorblind palettes, and input hold toggles.

---

## 10. Immediate next actions

1. Confirm the open design decisions:
   - "Five lives" = 5 HP vs. limited retries.
   - Four levels + boss scope.
   - Boss HP curve under difficulty multipliers.
   - English-only UI for v1.
   - Art/audio sourcing and repository license.
2. M0 is complete: the scaffold, title screen, tests, CI, and deployment workflows are in place.
3. Build the M1 movement prototype before adding content.
4. Record a playable GIF at the end of M1 and M3 for feedback.
5. Schedule the first external playtest for the end of M3.

---

## 11. Revision history

| Version | Date       | Notes                                                                        |
| ------- | ---------- | ---------------------------------------------------------------------------- |
| 0.2     | 2026-10-19 | M0 scaffold, title screen, tooling, tests, CI, and deployment workflows done |
| 0.1     | 2026-10-19 | Initial roadmap based on the project brief and design draft                  |
