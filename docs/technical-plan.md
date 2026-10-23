# Mines & Goblins — Technical Plan

**Version:** 0.4  
**Date:** 2026-10-22  
**Status:** M4 complete at `v0.4.0`; four-level run, Great Worm boss, victory flow, pause/options, and settings persistence shipped

---

## 1. Technical goals

1. Ship a polished, 60 FPS, desktop-browser action platformer.
2. Keep the codebase small, typed, data-driven, and easy for one developer to maintain.
3. Make runs deterministic and challenge-rule tracking testable.
4. Support fast iteration on game feel and level design.
5. Deploy every main-branch build to a public URL with one automated pipeline.
6. Avoid backend infrastructure for v1.

### Non-goals

- Native desktop builds, mobile, or console in v1.
- Multiplayer or real-time networking.
- User accounts, cloud saves, or online leaderboards.
- A general-purpose game engine or editor.
- Procedural generation in v1.

---

## 2. Decision summary

| Area                   | Decision                                      |
| ---------------------- | --------------------------------------------- |
| Platform               | Desktop web, static hosting                   |
| Language               | TypeScript, `strict` mode                     |
| Game framework         | **Phaser 4.2.x**                              |
| Build/dev server       | Vite                                          |
| UI                     | Phaser scenes and bitmap/pixel text           |
| Level format           | Tiled JSON (`.tmj` / `.json`)                 |
| Physics                | Phaser Arcade Physics                         |
| State                  | Custom typed event bus + run/session services |
| Persistence            | Versioned `localStorage` JSON                 |
| Unit/integration tests | Vitest                                        |
| Browser smoke tests    | Playwright                                    |
| Lint/format            | ESLint + Prettier                             |
| CI/CD                  | GitHub Actions → GitHub Pages                 |
| Package manager        | npm (lockfile committed)                      |
| Runtime                | Node.js 24 LTS for development/CI             |
| Art                    | Aseprite; PNG spritesheets/atlases            |
| Audio                  | Phaser Web Audio; OGG music, WAV/OGG SFX      |
| Versioning             | SemVer + Git tags per milestone               |

---

## 3. Engine decision

### 3.1 Chosen: Phaser 4.2.x

**Why Phaser fits this game:**

- **2D-first:** sprites, tilemaps, cameras, animation, particles, input, audio, and scene management are built in.
- **Arcade Physics:** enough for a platformer with AABB collisions, gravity, one-way platforms, overlap checks, and projectile pooling. No need for a full rigid-body engine.
- **Tiled support:** native tilemap loading aligns with the handcrafted-level plan.
- **TypeScript:** first-class types and a large body of examples.
- **Web deployment:** produces a static bundle that can be hosted on GitHub Pages with no server.
- **Fast iteration:** Vite hot reload plus simple scene reloads.
- **Current stable:** Phaser 4 launched in April 2026 and the current stable line is 4.2.x (4.2.1 at the time of planning, July 2026). Phaser 4 has a rebuilt WebGL renderer, unified filters, and modern performance characteristics. It is mature enough to start a new project, while Phaser 3.90 remains the fallback if a blocking issue appears.
- **License:** MIT.

**Constraints accepted:**

- Phaser 4 is WebGL-first, and its Canvas renderer is deprecated. We target modern WebGL2 browsers only.
- Arcade Physics is not a full platformer physics engine. We will implement coyote time, jump buffering, one-way platforms, and projectile behavior ourselves on top of it.
- The engine is a framework, not an editor. Level layout lives in Tiled; entities and logic live in TypeScript.

**Version policy:** pin the exact Phaser version in `package.json` and commit the lockfile. Upgrade deliberately at milestone boundaries, not automatically.

### 3.2 Alternatives considered

| Option                      | Pros                                                                    | Cons                                                                                                                                     | Verdict       |
| --------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| **Godot 4.x**               | Excellent 2D engine, integrated editor, animation tools, desktop export | Adds a large editor/binary workflow; web export is heavier; CI and browser packaging are more complex; overkill for a small browser game | Not chosen    |
| **PixiJS + custom systems** | Excellent renderer, full control, lightweight core                      | No built-in scenes, physics, tilemaps, or audio; more engineering before the first playable                                              | Not chosen    |
| **Unity**                   | Mature tooling, asset store, multiplatform                              | Heavy, editor-centric, licensing complexity, slow web builds                                                                             | Not chosen    |
| **LÖVE / Love2D**           | Simple, fast, great for 2D                                              | Lua; web export has limitations; smaller TypeScript ecosystem                                                                            | Not chosen    |
| **Plain Canvas/WebGL**      | Maximum control, no dependency                                          | Rebuilding an engine delays the game; high maintenance                                                                                   | Not chosen    |
| **Phaser 3.90**             | Very mature, enormous ecosystem, Canvas fallback                        | Now the previous major line; Phaser 4 is the current direction                                                                           | Fallback only |

### 3.3 Why not Godot?

Godot is the strongest alternative and would be a good choice for a desktop-first game. For this project, the browser-first requirement, small team, TypeScript familiarity, static deployment, and simple 2D feature set make Phaser the lower-risk path. If the project later pivots to a native Steam release with complex tooling, Godot would be worth revisiting.

---

## 4. Stack details

| Layer           | Tool                                     | Notes                                                                              |
| --------------- | ---------------------------------------- | ---------------------------------------------------------------------------------- |
| Runtime         | Node.js 24 LTS                           | Use the current active LTS at bootstrap; pin in `.nvmrc`                           |
| Package manager | npm                                      | Commit `package-lock.json`; do not mix package managers                            |
| Language        | TypeScript 5.x                           | `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` where practical |
| Framework       | Phaser 4.2.x                             | Pin exact version                                                                  |
| Bundler         | Vite                                     | ESM, fast HMR, static build                                                        |
| Level editor    | Tiled 1.11+                              | JSON/TMJ export; object layers for entities                                        |
| Art             | Aseprite                                 | Export spritesheets/atlases; keep source files                                     |
| Audio           | Phaser Web Audio                         | OGG music; WAV/OGG SFX; no Howler needed                                           |
| Testing         | Vitest                                   | Pure systems and data validation                                                   |
| Browser tests   | Playwright                               | Smoke-test boot, start, movement, pause                                            |
| Lint            | ESLint 9 flat config + typescript-eslint | No `any` at boundaries without justification                                       |
| Format          | Prettier                                 | Single source of formatting truth                                                  |
| CI              | GitHub Actions                           | install → lint → typecheck → test → build                                          |
| Hosting         | GitHub Pages                             | Static artifact deploy from `main`                                                 |
| Save            | `localStorage`                           | Versioned schema, runtime validation                                               |
| Debug           | Phaser debug graphics + custom overlay   | Dev-only, tree-shaken or gated                                                     |

### 4.1 Browser support

- Latest two major versions of Chrome, Edge, Firefox, and Safari.
- Desktop only; minimum viewport 960×540.
- WebGL2 required; show a friendly unsupported-browser screen if initialization fails.
- No Internet Explorer or legacy mobile support.

### 4.2 Display and pixel-art settings

- Internal resolution: **480×270**.
- Tile size: **16×16**.
- `pixelArt: true`, `roundPixels: true`, nearest-neighbor filtering.
- `Scale.FIT` with auto-centering; evaluate integer-only scaling in M1 if fractional scaling causes shimmer.
- All gameplay and UI rendered at the internal resolution; no CSS-scaled DOM UI inside the canvas.
- Test at 1920×1080 (exact 4×), 2560×1440, 1366×768, and browser zoom levels.
- The canvas background uses letterboxing instead of stretching.

### 4.3 Audio

- Phaser's Web Audio backend; unlock audio on the first click/key press.
- Separate master, music, and SFX gains.
- Music: OGG (primary) with an MP3 fallback only if a target browser requires it.
- SFX: short WAV files for low latency, or OGG for longer stingers.
- Sound asset names follow `sfx_<category>_<name>` and `music_<scene>`.

---

## 5. Architecture

### 5.1 High-level shape

```text
main.ts
  └─ creates Phaser.Game
      ├─ BootScene          (config, scale, save load)
      ├─ PreloadScene       (asset manifest, loading bar)
      ├─ TitleScene
      ├─ RunSetupScene      (difficulty + challenge preview)
      ├─ LevelScene         (tilemap, entities, hazards, exit)
      ├─ BossScene          (Great Worm arena, phases, supplies, victory)
      ├─ HUDScene           (overlay, always active during play)
      ├─ PauseScene         (run pause overlay)
      ├─ SettingsScene      (volume and screen-shake overlay)
      ├─ ResultsScene
      ├─ AchievementsScene
      └─ SkinsScene
```

`LevelScene` is reused for all four standard levels, parameterized by a level ID. `BossScene` is separate because its camera, music, and entity logic differ.

### 5.2 Services and ownership

| Service              | Responsibility                                                |
| -------------------- | ------------------------------------------------------------- |
| `SaveService`        | Load/validate/migrate/write local save data                   |
| `SettingsService`    | Volume, accessibility, keybinds, equipped skin                |
| `RunService`         | Current run state, difficulty, level index, timers, stats     |
| `RuleService`        | Pacifist/Primitive/Untouchable validation from events         |
| `AchievementService` | Evaluate unlock conditions, persist unlocks, queue toasts     |
| `SkinService`        | Unlock/equip skins, expose palette data                       |
| `AudioService`       | Buses, music transitions, SFX throttling, unlock              |
| `InputService`       | Keyboard mappings, buffered actions, future gamepad adapter   |
| `LevelService`       | Load Tiled map, instantiate entities, validate spawn manifest |
| `EventBus`           | Typed pub/sub for gameplay events                             |

Services are created once at boot and accessed through a small typed service registry or Phaser's `registry`. Avoid global mutable singletons in tests; inject dependencies where practical.

### 5.3 Scene responsibilities

- Scenes own presentation and local lifecycle.
- Scenes must not directly write save data; they call services.
- `LevelScene` emits gameplay events; `RunService` and `RuleService` consume them.
- `HUDScene` subscribes to player/run events and renders state.
- `PauseScene` pauses `LevelScene`/`BossScene` and resumes them cleanly.
- `SettingsScene` pauses its caller, applies volume and screen-shake changes immediately, and persists them through `SaveService`.
- Scene transitions use a short fade; gameplay state is not persisted across a browser refresh in v1.

### 5.4 Entity model

Use composition with a small number of focused base classes:

```text
Entity (Phaser.Physics.Arcade.Sprite)
  ├─ Player
  ├─ Enemy
  │    ├─ Bat
  │    ├─ Goblin
  │    ├─ Skeleton
  │    ├─ Beetle
  │    ├─ Ghost
  │    └─ Wormling
  └─ Projectile
       ├─ Rock
       ├─ Knife
       ├─ Bullet
       └─ MagicOrb
```

- Collision bodies use simple rectangles, not per-pixel masks.
- Enemy behaviors are state machines (`idle`, `patrol`, `chase`, `windup`, `attack`, `hurt`, `dead`).
- Boss uses a dedicated state machine with phases and attack selection.
- Projectiles are pooled to avoid allocation spikes.

### 5.5 Damage pipeline

All damage flows through one function:

```ts
interface DamageEvent {
  targetId: string;
  amount: number;
  source: 'rock' | 'knife' | 'bullet' | 'magic' | 'enemy' | 'hazard' | 'environment';
  sourceEntityId?: string;
  isLethal?: boolean;
}
```

Order of operations:

1. Source checks target invulnerability.
2. Difficulty/armor adjustments, if any.
3. HP reduction.
4. Hit feedback (flash, knockback, hit-stop, SFX, particles).
5. Emit `enemy:damaged` or `player:damaged`.
6. If HP reaches 0, emit `enemy:killed` or `player:died` with full attribution.
7. `RuleService` updates challenge-run validity based on events.

This ensures Pacifist, Primitive, and Crazy all see the same source-of-truth data.

### 5.6 Run and rule tracking

```ts
interface RunState {
  runId: string;
  difficulty: 'normal' | 'hard' | 'impossible' | 'crazy';
  startedAt: number;
  levelIndex: number;
  kills: KillRecord[];
  damageTaken: DamageTakenRecord[];
  deaths: number;
  itemUses: ItemUseRecord[];
  itemsPickedUp: string[];
  oreCollected: number;
  bossDefeated: boolean;
}
```

Rules are pure functions:

```ts
function isPacifistValid(run: RunState): boolean {
  return run.kills.length === 0;
}

function isPrimitiveValid(run: RunState): boolean {
  return (
    run.kills.every((k) => k.source === 'rock') && run.itemUses.filter((u) => u.weapon).length === 0
  );
}

function isUntouchableValid(run: RunState): boolean {
  return run.damageTaken.length === 0 && run.deaths === 0;
}
```

Exact semantics are defined in the game design document. Unit tests drive edge cases: environmental kills, item uses that miss, hazards, pit deaths, boss kills, and restarts.

### 5.7 Difficulty configuration

Difficulty is data, not conditionals spread across the code:

```ts
interface DifficultyConfig {
  id: 'normal' | 'hard' | 'impossible' | 'crazy';
  playerMaxHp: number;
  enemyHpMultiplier: number;
  enemyDamageMultiplier: number;
  bossHpMultiplier: number;
  requiresAllEnemiesDead: boolean;
  pacifistAllowed: boolean;
}
```

Enemy spawns compute effective HP at spawn time from base HP, level bonus, and the active difficulty. The boss uses a separate `bossHpMultiplier` so its authored 48 HP becomes 48/72/96/120 across Normal/Hard/Impossible/Crazy without forcing the standard 1/2/3/5 enemy curve onto the fight. Boss max HP is computed once when `BossScene` starts, not on each hit.

### 5.8 Level pipeline

1. Design the level in Tiled.
2. Export JSON/TMJ into `public/maps/`.
3. Object layers reference stable string IDs from `src/data/`.
4. A validation test parses every map and checks:
   - Known object types only.
   - Exactly one player spawn.
   - At least one exit.
   - Enemy/item IDs exist.
   - All enemies are reachable enough to be counted (manual review plus a debug reachability overlay).
5. `LevelScene` builds collision groups, instantiates enemies/pickups, sets camera bounds, and emits `level:started`.
6. On exit overlap/interact, `level:completed` is emitted and the run advances.

### 5.9 Save pipeline

- Key: `minesNgoblins.save.v1`.
- Read → parse → validate schema → migrate if an older known version → merge defaults.
- On parse/validation failure: preserve the raw value under `minesNgoblins.save.corrupt.<timestamp>`, show a notice, start with defaults.
- Writes are debounced and performed on meaningful changes (settings, achievements, skins, run completion).
- No secrets or personal data are stored.

---

## 6. Data-driven configuration

All tunable gameplay data lives in typed data modules:

```text
src/data/
  difficulties.ts
  enemies.ts
  items.ts
  levels.ts
  achievements.ts
  skins.ts
  strings/en.ts
  tuning.ts
```

Example:

```ts
export interface EnemyDefinition {
  id: string;
  displayName: string;
  baseHp: number;
  contactDamage: number;
  speed: number;
  behavior: 'bat' | 'goblin' | 'skeleton' | 'beetle' | 'ghost' | 'wormling';
  spriteKey: string;
  hitbox: { width: number; height: number };
}
```

Rules:

- No magic numbers in entity classes when the value belongs in tuning data.
- Level maps reference IDs, not raw stats.
- Data is validated at boot in dev/test builds; invalid data fails fast.
- Balance changes should usually be data-only.

---

## 7. Testing strategy

### 7.1 Unit tests (Vitest)

- Damage math and rounding.
- Difficulty multipliers and player HP.
- Run rule validation (Pacifist, Primitive, Untouchable, combinations).
- Achievement unlock conditions.
- Save schema validation and migrations.
- Enemy HP progression.
- Level manifest validation.
- Projectile cooldowns and ammo caps (pure logic where possible).

Target: high coverage of pure systems (80%+ lines for `systems/`, `data/`, and rule logic), not an arbitrary global percentage.

### 7.2 Integration tests

- Scene boot with a mocked Phaser context where practical.
- Event attribution: simulate a rock kill, a magic kill, and a hazard kill, then assert run state.
- Level load: map → spawned entities → exit lock state.
- Crazy mode: enemy counter reaches 0 → exit unlocks.
- Achievement persistence across a save/load round trip.

### 7.3 Browser tests (Playwright)

- Page loads and canvas is present.
- Title → New Run → Level 1 boots without console errors.
- Keyboard input moves the player and throws a rock (using a dev/test-only state hook).
- Pause/resume works.
- Options persist after reload.
- A smoke test runs on each PR and before deploy.

### 7.4 Manual QA

Per milestone, run a written checklist covering:

- Controls and game feel.
- Collisions and one-way platforms.
- Every enemy behavior and counterplay.
- Damage, invulnerability, death, retry.
- Every item, ammo count, replacement, and pickup source.
- Level exits, transitions, pause, results.
- All difficulties and run-rule invalidation scenarios.
- Boss phases, telegraphs, victory, retry.
- Save/load, settings, achievements, skins.
- Browser matrix and common resolutions.
- Audio levels and mute behavior.

### 7.5 Test data and determinism

- Challenge-run tests use fixed event sequences.
- No random loot in v1; any future randomness must be seeded and recorded.
- Playwright tests expose a narrow `window.__MINES_TEST__` hook only in development/test builds, never production.

---

## 8. Performance plan

| Target             | Budget                        |
| ------------------ | ----------------------------- |
| Frame rate         | 60 FPS, fixed simulation step |
| Active enemies     | 8 simultaneous, 14 per level  |
| Active projectiles | 40                            |
| Particle count     | Under 200 simultaneous        |
| Draw calls         | Under 100 typical             |
| Initial JS bundle  | Under 5 MB compressed target  |
| Initial total load | Under 3 seconds on broadband  |
| Memory             | Under 200 MB                  |
| Save size          | Under 100 KB                  |

Techniques:

- Object pools for rocks, bullets, hit particles, and damage text if added.
- Texture atlases; avoid many small draw calls.
- No per-frame allocations in hot entity update loops.
- Limit screen shake and particle bursts.
- Use Arcade Physics with simple AABB bodies; no per-pixel collision.
- Pause/sleep off-screen enemies where safe, but keep Crazy enemy counts authoritative.
- Profile in Chrome and Firefox at 1080p and 1440p.
- Do not use Phaser 4's heaviest filters for core readability; use them sparingly for boss spectacle.

---

## 9. CI/CD and deployment

### 9.1 GitHub Actions pipeline

On every pull request and push to `main`:

```text
npm ci
→ npm run lint
→ npm run typecheck
→ npm run test
→ npm run build
→ Playwright smoke test (built preview)
→ upload build artifact
```

On `main`, deploy the artifact to GitHub Pages.

### 9.2 Environment and base path

- Vite `base` must match the repository path (`/minesNgoblins/`) or the configured custom domain.
- Use relative asset URLs where possible.
- Provide a 404 fallback page for SPA-style routes if needed; a single-page game should not require routing.
- No environment secrets are needed for v1.

### 9.3 Release process

1. Freeze scope for the milestone.
2. Run the full test suite and manual QA checklist.
3. Update `CHANGELOG.md` and version in `package.json`.
4. Tag the release (`v0.x.0`, `v1.0.0`).
5. Deploy from the tagged commit.
6. Smoke-test the live URL on the browser matrix.
7. Announce with screenshots/GIFs in the README or GitHub release.

---

## 10. Repository layout

```text
minesNgoblins/
  docs/
    game-design.md
    technical-plan.md
    roadmap.md
  public/
    assets/
      sprites/
      tiles/
      audio/
      fonts/
    maps/
  src/
    main.ts
    game.ts
    config/
    scenes/
    entities/
    systems/
    ui/
    data/
    types/
    utils/
  tests/
    unit/
    e2e/
  .github/
    workflows/
      ci.yml
      deploy.yml
  package.json
  vite.config.ts
  tsconfig.json
  eslint.config.js
  playwright.config.ts
  README.md
  CHANGELOG.md
```

Notes:

- `public/` assets are served as-is and referenced by Phaser's loader.
- Keep source art/audio in a separate `art-source/` or `audio-source/` directory only if repository size remains reasonable; otherwise store large source files in releases and keep exported assets in the repo.
- `docs/` is the source of truth for design and process.

---

## 11. Security and privacy

- Static site, no backend, no user accounts, no cookies.
- No third-party analytics or tracking in v1.
- Save data stays in the browser.
- Avoid `eval`, remote code loading, and unsanitized HTML injection.
- Pin dependencies and review `npm audit` at milestone boundaries; do not auto-merge major upgrades.
- Add a restrictive Content Security Policy meta tag if it does not interfere with Phaser/Vite.
- Track every third-party asset license in `docs/asset-licenses.md` before release.

---

## 12. Risks and mitigations

| Risk                                         | Likelihood | Impact | Mitigation                                                                                                 |
| -------------------------------------------- | ---------- | ------ | ---------------------------------------------------------------------------------------------------------- |
| Scope creep (procedural levels, more biomes) | High       | High   | Freeze v1 scope; keep a stretch backlog; reject additions that do not serve the core loop                  |
| Phaser 4 migration/API gaps                  | Medium     | Medium | Pin 4.2.x; build a movement/physics spike in M0–M1; fall back to Phaser 3.90 only if blocked               |
| Game feel does not feel tight                | Medium     | High   | Prototype movement first; tune coyote time, buffer, jump cut; playtest early                               |
| Crazy mode is tedious rather than hard       | High       | Medium | Data-driven HP; tune enemy counts, base HP, item supply; playtest Crazy in M5 and M7                       |
| Boss collision/behavior is hard to control   | Medium     | High   | Prototype segments/weak point in M1–M2; keep hitboxes simple; build boss in M4 with a dedicated debug view |
| Challenge rules have edge cases              | High       | Medium | Central event model; pure rule functions; explicit tests; results screen explains failures                 |
| Art/audio production takes longer than code  | High       | High   | Placeholder-first; palette-swap skins; start final art early; commission or scope down                     |
| Pixel scaling/readability issues             | Medium     | Medium | Fixed 480×270; test common displays; use bitmap font and strong silhouettes                                |
| Save corruption or schema changes            | Low        | Medium | Versioned schema, validation, backup key, tests                                                            |
| Browser audio autoplay blocks music          | High       | Low    | Unlock audio on first user gesture; show a clear start prompt                                              |
| Performance drops with particles/boss        | Medium     | Medium | Budgets, pooling, profiling, reduced-effects option                                                        |
| "5 lives" ambiguity                          | High       | Medium | Confirm before M5; current assumption documented and isolated in difficulty config                         |
| GitHub Pages base path breaks assets         | Low        | Medium | Set `base` correctly; smoke-test the deployed build, not only local dev                                    |

---

## 13. Bootstrap plan (M0) — implemented

The scaffold is complete. These were the bootstrap steps:

```bash
# From the repository root
npm create vite@latest . -- --template vanilla-ts
npm install phaser
npm install -D vitest @playwright/test eslint prettier typescript-eslint
```

Then:

1. Configure Vite (`base`, server, build, test).
2. Add Phaser game config and Boot/Preload/Title scenes.
3. Add ESLint flat config, Prettier, and TypeScript strict settings.
4. Add Vitest and a first pure test.
5. Add Playwright smoke test and config.
6. Add GitHub Actions CI and Pages deploy workflows.
7. Add npm scripts: `dev`, `build`, `preview`, `lint`, `typecheck`, `test`, `test:e2e`.
8. Verify `npm run build` output loads from the GitHub Pages base path.
9. Tag `v0.0.1` after the deployed title screen works.

---

## 14. Decision log

| Date       | Decision                                                                        | Status         |
| ---------- | ------------------------------------------------------------------------------- | -------------- |
| 2026-10-19 | M0 scaffold implemented (Vite, TypeScript, Phaser, ESLint, Vitest, Playwright)  | Done           |
| 2026-10-19 | M1 movement slice implemented (player, level scene, rocks, dummy, HUD, debug)   | Done           |
| 2026-10-21 | M2 combat, enemies, items, hazards, and HUD implemented at `v0.2.0`             | Done           |
| 2026-10-22 | M3 four-level run, pause/options, settings, and boss placeholder at `v0.3.0`    | Done           |
| 2026-10-22 | M4 Great Worm, supply drops, boss retry, victory, and results at `v0.4.0`       | Done           |
| 2026-10-22 | Browser-level held-key state restores movement across scene recreation          | Done           |
| 2026-10-22 | Pause and Settings use dedicated overlay scenes above Level and HUD             | Done           |
| 2026-10-19 | Use Phaser 4.2.x + TypeScript + Vite                                            | Accepted       |
| 2026-10-19 | Browser-first, static hosting on GitHub Pages                                   | Accepted       |
| 2026-10-19 | Handcrafted Tiled levels, no procedural generation in v1                        | Accepted       |
| 2026-10-19 | One secondary item slot; deterministic authored pickups                         | Accepted       |
| 2026-10-19 | Local-only save data; no backend                                                | Accepted       |
| 2026-10-19 | Internal resolution 480×270, 16×16 tiles                                        | Accepted in M1 |
| 2026-10-22 | "5 lives" means 5 HP; death restarts the current level with carried entry state | Resolved in M3 |
| 2026-10-22 | Boss uses a separate HP curve: base 48 × 1/1.5/2/2.5 by difficulty              | Resolved in M4 |
| TBD        | Game UI localization scope                                                      | Open           |
| TBD        | Repository and asset licenses                                                   | Open           |
