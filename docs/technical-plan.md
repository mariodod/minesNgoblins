# Mines & Goblins — Technical Plan

**Version:** 1.0  
**Date:** 2026-11-03  
**Status:** Shipped at `v1.0.0`; the game, its documentation, and the release pipeline below describe the shipped state

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

| Area             | Decision                                           |
| ---------------- | -------------------------------------------------- |
| Platform         | Desktop web, static hosting                        |
| Language         | TypeScript 6, `strict` mode                        |
| Game framework   | **Phaser 4.2.1**                                   |
| Build/dev server | Vite 8                                             |
| UI               | Phaser scenes and a generated 5×7 bitmap font      |
| Level format     | Hand-authored JSON in `public/maps/`               |
| Physics          | Phaser Arcade Physics                              |
| State            | Typed run/session services, no event bus framework |
| Persistence      | Versioned `localStorage` JSON                      |
| Unit tests       | Vitest 5                                           |
| Browser tests    | Playwright 1.64                                    |
| Lint/format      | ESLint 10 + Prettier 3                             |
| CI/CD            | GitHub Actions → GitHub Pages                      |
| Package manager  | npm (lockfile committed)                           |
| Runtime          | Node.js 24 for development/CI                      |
| Art              | Generated in code by `tools/assets/`               |
| Audio            | Phaser Web Audio; 16 kHz mono WAV                  |
| Versioning       | SemVer + Git tags per milestone                    |

---

## 3. Engine decision

### 3.1 Chosen: Phaser 4.2.x

**Why Phaser fits this game:**

- **2D-first:** sprites, tilemaps, cameras, animation, particles, input, audio, and scene management are built in.
- **Arcade Physics:** enough for a platformer with AABB collisions, gravity, one-way platforms, overlap checks, and projectile pooling. No need for a full rigid-body engine.
- **TypeScript:** first-class types and a large body of examples.
- **Web deployment:** produces a static bundle that can be hosted on GitHub Pages with no server.
- **Fast iteration:** Vite hot reload plus simple scene reloads.
- **Current stable:** Phaser 4 launched in April 2026 and the project ships on 4.2.1. Phaser 4 has a rebuilt WebGL renderer, unified filters, and modern performance characteristics.
- **License:** MIT.

**Constraints accepted:**

- Phaser 4 is WebGL-first, and its Canvas renderer is deprecated. We target modern WebGL2 browsers only.
- Arcade Physics is not a full platformer physics engine. We implement coyote time, jump buffering, one-way platforms, and projectile behavior ourselves on top of it.
- The engine is a framework, not an editor. Level geometry lives in hand-authored JSON files; entities and logic live in TypeScript.

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

| Layer           | Tool                                      | Notes                                                                |
| --------------- | ----------------------------------------- | -------------------------------------------------------------------- |
| Runtime         | Node.js 24                                | Required by `engines.node`; CI installs the same major               |
| Package manager | npm                                       | Commit `package-lock.json`; do not mix package managers              |
| Language        | TypeScript 6.x                            | `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`   |
| Framework       | Phaser 4.2.1                              | Pin exact version                                                    |
| Bundler         | Vite 8                                    | ESM, fast HMR, static build                                          |
| Level format    | Hand-authored JSON                        | Validated by `src/data/level-definition.ts` at load                  |
| Art             | Generators in `tools/assets/`             | PNG spritesheets, tiles, and a 5×7 bitmap font, all produced by code |
| Audio           | Phaser Web Audio                          | 16 kHz mono WAV for music and SFX; no Howler needed                  |
| Testing         | Vitest 5                                  | Pure systems and data validation                                     |
| Browser tests   | Playwright 1.64                           | Smoke-test boot, start, movement, pause                              |
| Lint            | ESLint 10 flat config + typescript-eslint | No `any` at boundaries without justification                         |
| Format          | Prettier 3                                | Single source of formatting truth                                    |
| CI              | GitHub Actions                            | install → format:check → lint → typecheck → test → build → e2e       |
| Hosting         | GitHub Pages                              | Static artifact deploy from `main`                                   |
| Save            | `localStorage`                            | Versioned schema, runtime validation                                 |
| Debug           | Phaser debug graphics + custom overlay    | Dev-only, gated behind `import.meta.env.DEV`                         |

### 4.1 Browser support

- Latest two major versions of Chrome, Edge, Firefox, and Safari.
- Desktop only; minimum viewport 960×540.
- WebGL2 required; show a friendly unsupported-browser screen if initialization fails.
- No Internet Explorer or legacy mobile support.

### 4.2 Display and pixel-art settings

- Internal resolution: **480×270**.
- Tile size: **16×16**.
- `pixelArt: true`, `roundPixels: true`, nearest-neighbor filtering.
- `Scale.NONE` plus a computed integer zoom: the 480×270 canvas is only ever shown at whole multiples, so sprite edges and bitmap glyphs stay on the physical pixel grid.
- Every label renders through the original 5×7 bitmap font (`src/ui/pixel-text.ts`), which patches `GameObjectFactory.text`. Canvas text and fractional font sizes are gone, which is what previously made the UI blurry.
- All gameplay and UI rendered at the internal resolution; no CSS-scaled DOM UI inside the canvas.
- Test at 1920×1080 (exact 4×), 2560×1440, 1366×768, and browser zoom levels.
- The canvas background uses letterboxing instead of stretching.

### 4.3 Audio

- Phaser's Web Audio backend; unlock audio on the first click/key press.
- Separate master, music, and SFX gains, all routed through Phaser's sound manager so mute and volume cover effects and music.
- Music: three 16 kHz mono WAV loops (`music-title`, `music-mines`, `music-boss`), authored by the committed generator in `tools/audio/`.
- SFX: 32 short mono WAV effects at 16 kHz for low latency and a small download.
- Asset keys match the `SfxName`/`MusicName` unions (`jump`, `music-title`, and so on) and come from the merged `asset-manifest.json`.

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
      ├─ LevelScene         (level geometry, entities, hazards, exit)
      ├─ BossScene          (Great Worm arena, phases, supplies, victory)
      ├─ HudScene           (overlay, always active during play)
      ├─ PauseScene         (run pause overlay)
      ├─ SettingsScene      (volume, shake, flash, fullscreen overlay)
      ├─ ControlsScene      (key rebinding overlay)
      ├─ ResultsScene
      ├─ AchievementsScene
      ├─ SkinsScene
      ├─ CreditsScene
      └─ ToastScene         (non-blocking achievement notices)
```

`LevelScene` is reused for all four standard levels, parameterized by a level ID. `BossScene` is separate because its camera, music, and entity logic differ.

### 5.2 Services and ownership

| Service / module        | Responsibility                                                       |
| ----------------------- | -------------------------------------------------------------------- |
| `SaveService`           | Load, validate, back up, recover, and write save data                |
| `RunService`            | Current run state, difficulty, timers, attribution, boss lifecycle   |
| `systems/challenges.ts` | Pure Pacifist/Primitive/Untouchable/Legend evaluation and reasons    |
| `systems/inventory.ts`  | Single secondary-item slot, use counts, pickup and replacement rules |
| `systems/damage.ts`     | Pure HP math, damage sources, and frontal-hit detection              |
| `AchievementService`    | Trigger evaluation, once-only unlocks, reward-skin synchronization   |
| `data/skins.ts`         | Skin definitions, palette data, sanitization, and texture keys       |
| `AudioService`          | Buses, music transitions, SFX throttling, unlock                     |
| `InputService`          | Keyboard mappings and buffered actions                               |
| `LevelScene` + data     | Load authored maps, instantiate entities, enforce exit rules         |

Services are created once at boot and accessed through Phaser's `registry`. Avoid global mutable singletons in tests; inject dependencies where practical.

### 5.3 Scene responsibilities

- Scenes own presentation and local lifecycle.
- Scenes must not directly write save data; they call services.
- `LevelScene` and `BossScene` report kills, damage, deaths, item uses, ore, and boss attempts to `RunService` at the moment they happen.
- `HudScene` renders snapshots supplied by the active gameplay scene, including the Crazy enemies-remaining counter.
- `PauseScene` pauses `LevelScene`/`BossScene` and shows the current challenge-track summary.
- `SettingsScene` pauses its caller, applies volume, screen-shake, flash, and fullscreen changes immediately, and persists them through `SaveService`.
- `ControlsScene` rebinds every action and writes through `SaveService`.
- `ToastScene` renders non-blocking achievement unlock notices above gameplay.
- Scene transitions use a short fade; gameplay state is not persisted across a browser refresh in v1.

### 5.4 Entity model

Use composition with a small number of focused base classes:

```text
Entity (Phaser.Physics.Arcade.Sprite)
  ├─ Player
  ├─ Enemy
  │    ├─ PracticeDummy
  │    ├─ Bat
  │    ├─ Goblin
  │    ├─ Skeleton
  │    ├─ Beetle
  │    └─ Wormling
  ├─ Boss
  │    ├─ GreatWorm
  │    ├─ BossRock
  │    └─ Shockwave
  ├─ Pickup
  │    ├─ Crate
  │    └─ ItemPickup
  ├─ Hazard
  │    └─ FallingRock
  └─ Projectile
       ├─ Rock
       ├─ Bone
       └─ ItemProjectile (knife, bullet, rune scroll)
```

- Collision bodies use simple rectangles, not per-pixel masks.
- Enemy behaviors are state machines driven by the shared `Enemy` base class and per-behavior subclasses.
- The boss uses a dedicated state machine with phases and attack selection.
- Projectiles are pooled to avoid allocation spikes.

### 5.5 Damage pipeline

All damage flows through one shape:

```ts
type DamageSource = 'rock' | 'knife' | 'bullet' | 'magic' | 'enemy' | 'hazard' | 'environment';

interface DamageEvent {
  amount: number;
  source: DamageSource;
  sourceX: number;
  sourceY: number;
  sourceEntityId?: string;
  /** Horizontal velocity of the projectile at impact, used for directional armor. */
  impactVx?: number;
}
```

Order of operations:

1. Source checks target invulnerability.
2. Difficulty and armor adjustments.
3. HP reduction through the pure `applyDamage` helper in `src/systems/damage.ts`.
4. Hit feedback (flash, knockback, hit-stop, SFX, particles).
5. Emit `enemy:damaged` or `player:damaged`.
6. If HP reaches 0, emit `enemy:killed` or `player:died` with full attribution.
7. The active scene reports the attributed event to `RunService`; pure challenge functions derive badge validity from the snapshot.

This ensures Pacifist, Primitive, and Crazy all see the same source-of-truth data.

### 5.6 Run and rule tracking

```ts
interface RunSnapshot {
  active: boolean;
  difficultyId: 'normal' | 'hard' | 'impossible' | 'crazy';
  levelIndex: number;
  levelId: string | null;
  startedAt: number;
  levelStartedAt: number;
  kills: number;
  killRecords: Array<{ enemyId: string; source: DamageSource; levelId: string | null }>;
  damageTaken: number;
  damageRecords: Array<{ amount: number; source: DamageSource; boss: boolean }>;
  deaths: number;
  itemUses: number;
  itemUseRecords: Array<{ itemId: string; levelId: string | null }>;
  itemsPickedUp: number;
  oreCollected: number;
  levelOreCollected: number;
  levelOreTotal: number;
  levelsCompleted: number;
  bossAttempts: number;
  bossDefeated: boolean;
  bossDamageTaken: number;
  outcome: 'abandoned' | 'victory' | null;
  endedAt: number | null;
  runDurationMs: number;
}
```

Challenge rules are pure functions over that snapshot plus the difficulty config:

```ts
function isPacifistAvailable(difficulty: DifficultyConfig): boolean {
  return difficulty.pacifistAllowed;
}

function isPacifistValid(run: RunSnapshot): boolean {
  return run.kills === 0;
}

function isPrimitiveValid(run: RunSnapshot): boolean {
  return run.itemUses === 0 && run.killRecords.every((kill) => kill.source === 'rock');
}

function isUntouchableValid(run: RunSnapshot): boolean {
  return run.damageTaken === 0 && run.deaths === 0;
}
```

Crazy marks Pacifist and Legend unavailable. Legend requires all three base badges to be complete in the same victorious run. Evaluation returns complete, failed, or unavailable plus a player-readable reason. The boss does not add a kill record; Wormlings do. Unit tests drive edge cases: environmental kills, item uses that miss, hazards, pit deaths, boss kills, and restarts.

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

Enemy spawns compute effective HP at spawn time from base HP, level bonus, and the active difficulty. The boss uses a separate `bossHpMultiplier` so its authored 48 HP becomes 48/72/96/120 across Normal/Hard/Impossible/Crazy without forcing the standard 1/2/3/3 enemy curve onto the fight. Boss max HP is computed once when `BossScene` starts, not on each hit.

### 5.8 Level pipeline

1. Author the level as a JSON file in `public/maps/`.
2. Reference stable string IDs from `src/data/` for enemies, items, and prop types.
3. `parseLevelDefinition` validates every map before play:
   - Known object types only.
   - A player spawn inside the level bounds.
   - At least one exit rectangle.
   - Enemy and item IDs exist.
   - Geometry inside the level bounds and a `killY` below them.
4. A unit test parses every shipped map and asserts the same rules, plus that the authored platforms stay reachable.
5. `LevelScene` builds collision groups, instantiates enemies and pickups, sets camera bounds, and starts the level.
6. On exit overlap plus interact, the scene advances to the next level or the boss.

### 5.9 Save pipeline

- Key: `minesNgoblins.save.v1`; schema version `1`.
- Read, parse, validate, and fill missing fields from defaults. Version 1 stores settings, achievement records, skin records, aggregate stats, and the unique `usedItems` set.
- Unknown skin IDs and locked equipped skins are sanitized on load.
- On parse, validation, or unsupported-version failure: preserve the raw value under `minesNgoblins.save.backup.<timestamp>`, write defaults, and show a Title notice.
- Writes happen on meaningful changes: settings, achievements, skins, kill/death/item stats, run start, and run completion.
- No secrets or personal data are stored; there is no backend or cloud sync.

---

## 6. Data-driven configuration

All tunable gameplay data lives in typed data modules:

```text
src/config/
  constants.ts        (title, canvas size, app version)
  tuning.ts           (player, rock, projectile, enemy, feedback, and hazard tuning)
src/data/
  achievements.ts
  assets.ts           (asset-manifest.json loader and typed asset records)
  boss.ts
  difficulties.ts
  enemies.ts
  items.ts
  level-definition.ts (level schema and runtime validation)
  level-registry.ts   (run order and per-level display metadata)
  skins.ts
  themes.ts
```

Example:

```ts
export interface EnemyDefinition {
  id: EnemyId;
  displayName: string;
  behavior: EnemyBehavior;
  spriteKey: string;
  baseHp: number;
  contactDamage: number;
  speed: number;
  flying: boolean;
  patrolRadius: number;
  detectRange: number;
  windupMs: number;
  attackMs: number;
  recoverMs: number;
  hitbox: { width: number; height: number };
}
```

Rules:

- No magic numbers in entity classes when the value belongs in tuning data.
- Level maps reference IDs, not raw stats.
- Data is validated at boot; invalid data fails fast.
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
- Crazy mode: an enemy remains → exit stays locked; zero enemies → the exit opens and advances. Covered on all four levels by `tests/e2e/levels.spec.ts` through the DEV `__MINES_LEVEL_DEBUG__` helper.
- Achievement persistence across a save/load round trip.

### 7.3 Browser tests (Playwright)

- Page loads and canvas is present.
- Title → Start Run → difficulty select → Level 1 boots without console errors.
- Keyboard input moves the player and throws a rock (using a dev/test-only state hook).
- Pause/resume works.
- Options persist after reload.
- A smoke test runs on each PR and before deploy.
- `BROWSER_MATRIX=1` adds Edge, Firefox, and WebKit projects; the default project stays Chromium so the timing-sensitive boss checks keep one renderer. The matrix runs a fixed spec list (title, movement, pause, settings, audio, accessibility) because those are the specs that are renderer-independent.

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
- Playwright tests expose a narrow `window.__MINES_TEST__` hook only in development builds, never production. `window.__MINES_DEBUG__` carries the boss-arena helpers, and `window.__MINES_LEVEL_DEBUG__` carries the level-only `defeatAllEnemies` helper used to verify the Crazy exit gate.
- The production bundle is scanned after every build to confirm none of those globals or the development query shortcuts (`?boss=1`, `?spawn=exit`, `?level=`, `?difficulty=`) survive into the shipped build.

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

Shipped measurements (1920×1080): 60.1–60.2 FPS on hardware, about 19–20 MB JS heap, and a 1,564 kB JavaScript bundle that gzips to 408 kB. See [M6 QA Notes](m6-qa.md) and [M7 QA Notes](m7-qa.md).

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

On every pull request and push to `main` (`.github/workflows/ci.yml`):

```text
npm ci
→ npm run format:check
→ npm run lint
→ npm run typecheck
→ npm run test
→ npm run build
→ Playwright Chromium suite
```

On `main`, a second workflow (`.github/workflows/deploy.yml`) runs lint, typecheck, unit tests, and the build, then publishes `dist/` to GitHub Pages.

### 9.2 Environment and base path

- Vite `base` must match the repository path (`/minesNgoblins/`) or the configured custom domain. It defaults to the repository path in production builds and can be overridden with `VITE_BASE_PATH`.
- No environment secrets are needed for v1.

### 9.3 Release process

1. Freeze scope for the milestone.
2. Run the full test suite and the QA checklist.
3. Update `CHANGELOG.md`, `package.json`, and the release notes.
4. Tag the release (`v0.x.0`, `v1.0.0`).
5. Deploy from the tagged commit.
6. Smoke-test the live URL with `tools/qa/smoke.mjs` on every engine.
7. Publish the GitHub Release with the notes, the `dist` archive, and the screenshots.

The `v1.0.0` release followed exactly this path; its notes live in [release-notes-v1.0.0.md](release-notes-v1.0.0.md).

---

## 10. Repository layout

```text
minesNgoblins/
  docs/
    game-design.md
    technical-plan.md
    roadmap.md
    asset-licenses.md
    release-notes-v1.0.0.md
    m1-playtest.md … m7-qa.md
    media/
  public/
    assets/
      sprites/
      tiles/
      items/
      props/
      fx/
      ui/
      title/
      fonts/
      README.md
    audio/
      sfx/
      music/
      README.md
    maps/
    favicon.svg
  tools/
    assets/            (art + bitmap font generators)
    audio/             (WAV synthesis generators)
    qa/                (smoke, screenshots, profiling scripts)
  src/
    main.ts
    game.ts
    config/
    scenes/
    entities/
    systems/
    services/
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
  LICENSE
  README.md
  CHANGELOG.md
```

Notes:

- `public/` assets are served as-is and referenced by Phaser's loader through `src/data/asset-manifest.json`.
- Every art and audio asset is generated by the committed scripts in `tools/`; there are no binary source files to keep elsewhere.
- `docs/` is the source of truth for design and process.

---

## 11. Security and privacy

- Static site, no backend, no user accounts, no cookies.
- No third-party analytics or tracking in v1.
- Save data stays in the browser.
- Avoid `eval`, remote code loading, and unsanitized HTML injection.
- Pin dependencies and review `npm audit` at milestone boundaries; do not auto-merge major upgrades.
- No Content Security Policy meta tag is shipped. The page loads only same-origin assets, but adding a CSP would need to allow the inline styles Phaser injects, and it was not worth the risk before v1.
- Every third-party asset and dependency license is tracked in `docs/asset-licenses.md`.

---

## 12. Risks and mitigations

| Risk                                         | Likelihood | Impact | Mitigation                                                                                      |
| -------------------------------------------- | ---------- | ------ | ----------------------------------------------------------------------------------------------- |
| Scope creep (procedural levels, more biomes) | High       | High   | Freeze v1 scope; keep a stretch backlog; reject additions that do not serve the core loop       |
| Game feel does not feel tight                | Low        | High   | Tuned coyote time, jump buffer, and jump cut; locked by `tests/unit/level-reachability.test.ts` |
| Crazy mode is tedious rather than hard       | Medium     | Medium | Data-driven HP; the M7 balance pass cut the Crazy multiplier from ×5 to ×3                      |
| Boss collision/behavior is hard to control   | Low        | High   | Simple segment hitboxes; scripted playtests measure the rock-only fight                         |
| Challenge rules have edge cases              | Medium     | Medium | Central event model; pure rule functions; explicit tests; results screen explains failures      |
| Art/audio production takes longer than code  | Resolved   | Low    | Everything is generated in code by `tools/assets/` and `tools/audio/`                           |
| Pixel scaling/readability issues             | Low        | Medium | Fixed 480×270; integer scaling; the generated 5×7 bitmap font                                   |
| Save corruption or schema changes            | Low        | Medium | Versioned schema, validation, backup key, tests                                                 |
| Browser audio autoplay blocks music          | Low        | Low    | Unlock audio on the first user gesture                                                          |
| Performance drops with particles/boss        | Low        | Medium | Budgets, pooling, profiling, screen-shake and flash settings                                    |
| "5 lives" ambiguity                          | Resolved   | Low    | Interpreted as 5 HP on Normal; death restarts the current level with full HP                    |
| GitHub Pages base path breaks assets         | Low        | Medium | Set `base` correctly; smoke-test the deployed build, not only local dev                         |
| Fresh-player onboarding is unverified        | High       | Medium | Carried as a P2 known issue; the title screen lists the core controls to reduce the risk        |

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
7. Add npm scripts: `dev`, `build`, `preview`, `lint`, `typecheck`, `test`, `test:e2e`, `assets`, `format`.
8. Verify `npm run build` output loads from the GitHub Pages base path.

---

## 14. Decision log

| Date       | Decision                                                                                                  | Status         |
| ---------- | --------------------------------------------------------------------------------------------------------- | -------------- |
| 2026-11-03 | M8 MIT license, `v1.0.0` tag, GitHub Release, and final deploy                                            | Done           |
| 2026-11-02 | M7 balance pass (Crazy enemy HP ×5 → ×3), scripted full-run playtests, and performance measurements       | Done           |
| 2026-10-19 | M0 scaffold implemented (Vite, TypeScript, Phaser, ESLint, Vitest, Playwright)                            | Done           |
| 2026-10-19 | M1 movement slice implemented (player, level scene, rocks, dummy, HUD, debug)                             | Done           |
| 2026-10-21 | M2 combat, enemies, items, hazards, and HUD implemented at `v0.2.0`                                       | Done           |
| 2026-10-22 | M3 four-level run, pause/options, settings, and boss placeholder at `v0.3.0`                              | Done           |
| 2026-10-22 | M4 Great Worm, supply drops, boss retry, victory, and results at `v0.4.0`                                 | Done           |
| 2026-10-24 | M5 difficulty select, challenge rules, achievements, skins, and save v1 at `v0.5.0`                       | Done           |
| 2026-10-30 | M6 generated art/audio/font packs, integer-scaled bitmap text, accessibility, credits, and QA at `v0.6.0` | Done           |
| 2026-10-24 | Challenge evaluation returns complete/failed/unavailable with reasons; Crazy disables Pacifist and Legend | Done           |
| 2026-10-22 | Browser-level held-key state restores movement across scene recreation                                    | Done           |
| 2026-10-22 | Pause and Settings use dedicated overlay scenes above Level and HUD                                       | Done           |
| 2026-10-19 | Use Phaser 4.2.x + TypeScript + Vite                                                                      | Accepted       |
| 2026-10-19 | Browser-first, static hosting on GitHub Pages                                                             | Accepted       |
| 2026-10-19 | Handcrafted levels, no procedural generation in v1                                                        | Accepted       |
| 2026-10-19 | One secondary item slot; deterministic authored pickups                                                   | Accepted       |
| 2026-10-19 | Local-only save data; no backend                                                                          | Accepted       |
| 2026-10-19 | Internal resolution 480×270, 16×16 tiles                                                                  | Accepted in M1 |
| 2026-10-22 | "5 lives" means 5 HP; death restarts the current level with carried entry state                           | Resolved in M3 |
| 2026-10-22 | Boss uses a separate HP curve: base 48 × 1/1.5/2/2.5 by difficulty                                        | Resolved in M4 |
| 2026-10-19 | Levels are hand-authored JSON validated at load, not Tiled exports                                        | Resolved in M6 |
| 2026-11-03 | Repository and assets are released under the MIT License                                                  | Resolved in M8 |
| 2026-11-03 | The game UI is English only; no localization layer ships in v1                                            | Resolved in M8 |
