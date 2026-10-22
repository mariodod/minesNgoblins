# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses semantic versioning once public releases begin.

## [0.3.0] - 2026-10-22

### Added

- M3.2: run pause overlay on `Esc` or `P` with Resume, Restart Level, Options, and Quit Run actions.
- M3.2: quit-run confirmation, run shutdown, and return to the title screen.
- M3.2: shared Options overlay with persisted master volume and screen-shake settings, available from the title screen and pause menu.
- M3.2: live master-volume application to synthesized SFX and screen-shake scaling for full, reduced, and off settings.
- M3.2: Playwright coverage for pause/resume, pause restart, quit confirmation, settings persistence, and Crazy exit locking.
- M3.1: four authored run levels (Shaft Entrance, Goblin Tunnels, Crystal Caverns, The Deep Vein) with level-specific enemies, hazards, items, crystals, and elevator exits.
- M3.1: required level exit data and validation, plus an elevator interaction that advances the run with `E`.
- M3.1: level registry metadata, run order, level indexes, and development-only `?level=` and `?spawn=exit` overrides.
- M3.1: session-scoped `RunService` tracking difficulty, level index, total and level timers, kills, damage, deaths, item uses, pickups, ore, and levels completed.
- M3.1: level intro cards, HUD level progress, player HP/ore/item carry between levels, and refilled HP on death retries.
- M3.1: boss placeholder scene with a run summary and return-to-title flow.
- M3.1: unit tests for run state, all four maps, level registry, and inventory restore, plus Playwright coverage for every map, the elevator, and the full four-level debug flow.
- M3.1: M3 level design notes and QA checklist.
- M3: M3 playtest notes with automated rock-only and no-kill full-run evidence.

### Changed

- M3.2: the HUD hint now advertises `Esc` pause, and death continues to retry the current level with full HP.
- M3.1: Start Run now begins the four-level descent at Shaft Entrance instead of the retired combat test map.
- M3.1: player damage events carry their amount and damage source so run stats and future challenge rules share the same data.
- M3.1: the title screen identifies the M3 descent build.
- M3: Crystal Caverns floor gaps were reduced from 64px to 48px so full jumps keep a fair timing margin.

### Removed

- M3.1: retired `public/maps/movement-test.json`; Shaft Entrance preserves its geometry for regression coverage.

### Fixed

- M3: held movement keys now survive level transitions, death retries, and scene recreation through browser-level key state.
- M3: `A`/`D` movement and `W`/`S` aim aliases now work alongside the arrow keys.
- M3.1: interacting with `E` no longer consumes the key when no pedestal is in range, so elevator activation is not blocked.

## [0.2.0] - 2026-10-21

### Added

- M2.1: data-driven enemy definitions and difficulty configs.
- M2.1: Cave Bat, Goblin Scavenger, Skeleton Thrower, and Armored Beetle with patrol, telegraph, charge, ranged attack, armor deflection, and stun behavior.
- M2.1: skeleton bone projectiles and the falling-rock hazard, plus floor spike strips.
- M2.1: shared damage events, enemy HP formula, contact/projectile damage scaling, and frontal-armor checks.
- M2.1: expanded combat test map with all four enemies, two hazards, and additional platforming space.
- M2.1: unit tests for damage math, enemy data, HP scaling, armor checks, level hazards, and projectile aim.
- M2.1: placeholder enemy, bone, boulder, and spike textures plus new placeholder SFX.
- M2.1: development test hooks for enemy snapshots, projectiles, deflects, and falling rocks.
- M2.2: Knife, Flintlock, and Rune Scroll secondary weapons with limited uses, cooldowns, projectile physics, and magic blast/stun behavior.
- M2.2: one-slot inventory with same-item ammo stacking up to caps and different-item replacement.
- M2.2: authored crates and interaction pedestals, including one-time ore, healing salve, and secondary-item pickups.
- M2.2: HUD secondary-item icon, ammo count, ore counter, and updated control hints.
- M2.2: placeholder weapon, projectile, salve, ore, and pickup textures plus knife, gunshot, magic, crate, pickup, heal, and empty-slot SFX.
- M2.2: unit tests for item definitions, inventory stacking/replacement, ammo caps, and authored prop validation.
- M2.3: difficulty-aware player HP plus enemy HP and damage scaling, with `LevelSceneData.difficultyId` and a development-only `?difficulty=` override.
- M2.3: dynamic HUD hearts, item/ore positioning, and a visible difficulty label for every supported maximum HP.
- M2.3: item-use events now carry the data-driven damage source for future run tracking.
- M2.3: unit tests for difficulty configs and Playwright checks for Hard, Impossible, Crazy, and invalid-query fallback.
- M2.3: M2 playtest notes covering enemy, item, difficulty, and feedback checks.

### Changed

- M2.1: rock speed increased to 300 px/s and gravity reduced to 350 px/s² for more reliable mid-range combat.
- M2.1: charge attacks now lock direction during their telegraph, so jumping over a charge is a reliable counter.
- M2.1: enemy and projectile overlaps are resolved before terrain collisions, preventing same-frame hits from being swallowed.
- M2.2: secondary items use `C`/`K`, and pedestals use `E`; item tuning now lives in `src/data/items.ts`.
- M2.3: hit-stop now applies to every applied enemy hit and to nonlethal player damage; player damage adds red impact particles alongside the existing shake and HUD flash.
- M2.3: level restarts preserve the active difficulty, and the title screen identifies the M2 combat build.

### Fixed

- M2.1: corrected player/projectile overlap argument order so bones and falling rocks damage the player instead of destroying the player object.
- M2.2: item lookups now reject inherited object keys such as `toString`, so invalid authored item IDs fail validation cleanly.
- M2.3: collecting a different secondary item clears the previous item's cooldown.

## [0.1.0] - 2026-10-19

### Added

- M1.1: player movement with acceleration, friction, variable jump, jump cut, coyote time, jump buffering, and one-way platform drop-through.
- M1.1: `LevelScene` with a provisional JSON level format, validation, camera follow, and level bounds.
- M1.1: movement test level, parallax-free cave placeholder art, props, and loading progress.
- M1.1: title screen Start Run transitions into the level.
- M1.1: buffered keyboard input so fast taps are not eaten.
- M1.1: unit tests for level validation and an end-to-end movement/jump/drop-through test.
- M1.2: rock throwing with horizontal/up/down aim, cooldown, arcs, one bounce, and cleanup.
- M1.2: practice dummy enemy with three HP, hit flash, HP pips, and death feedback.
- M1.2: player damage with knockback, invulnerability blink, hearts, and camera feedback.
- M1.2: death and automatic retry flow (level restarts in under two seconds).
- M1.2: `HudScene` with hearts, infinite-rock indicator, level name, and death overlay.
- M1.2: level gap and kill plane for fall deaths; two practice dummies in the test level.
- M1.2: end-to-end tests for rock combat and death/retry.
- M1.3: development-only debug overlay (`F3`) with FPS, player state, and Arcade Physics hitboxes.
- M1.3: synthesized WebAudio placeholder SFX for jump, land, throw, bounce, hit, hurt, and death.
- M1.3: rock-aim math extracted to a pure module with unit tests.
- M1.3: `docs/m1-playtest.md` with three internal passes, tuning snapshot, and known limitations.
- M1.3: performance check and frame-count test hook; 60.2 FPS measured at 1920×1080 in headed Chromium.

### Changed

- M1.3: movement test spawns on a one-way scaffold so drop-through coverage is deterministic; local Playwright runs use two workers for stability.

### Fixed

- HUD infinite-rock label now reads `ROCK INF` instead of a glyph that rendered as `00`.

## [0.0.1] - 2026-10-19

### Added

- Initial Vite + TypeScript + Phaser 4 project scaffold.
- Boot, Preload, and keyboard-navigable Title scenes with placeholder art.
- Versioned local save service with settings, achievements, skins, and stats foundations.
- Unit tests for save parsing, backup/recovery, persistence, and unlocks.
- Playwright smoke test for boot and title-screen navigation.
- ESLint, Prettier, strict TypeScript, Vitest, and Playwright configuration.
- GitHub Actions CI and GitHub Pages deployment workflows.
- Project documentation: game design, technical plan, and roadmap.
