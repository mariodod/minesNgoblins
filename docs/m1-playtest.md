# M1 Internal Playtest Notes

**Date:** 2026-10-19  
**Build:** M1 movement vertical slice (0.1.0)  
**Level:** Shaft Entrance - Movement Test  
**Environment:** Windows, Chromium via Playwright 1.64.1, 1280×720 for input passes and 1920×1080 for the performance pass.

These passes were run internally with automated browser scripts and screenshot review. They are not external player tests; external playtesting is planned for M7.

## Controls

| Action        | Input                     |
| ------------- | ------------------------- |
| Move          | `A` / `D` or Left / Right |
| Jump          | `Space` or `Z`            |
| Throw rock    | `X` or `J`                |
| Aim up/down   | `W` / `S` or Up / Down    |
| Drop through  | `Down` + `Jump`           |
| Debug overlay | `F3` (development builds) |

## Pass 1 - Traversal

**Script:** `tests/e2e/movement.spec.ts`

1. Started a run from the title screen. The player spawns on a small starting scaffold, which is a one-way platform.
2. Pressed `Down` + `Jump` to drop through the scaffold and landed on the solid floor.
3. Ran right, jumped, and landed again.
4. Confirmed the player never became stuck or left the level.

**Observations**

- The buffered jump input prevents fast taps from being eaten.
- A 120 ms tap produced a 34 px apex (jump cut active). A held jump reached about 46-50 px.
- The 48 px floor gap is clearable with a running jump.
- Drop-through lasted long enough to clear the 16 px platform and felt responsive.
- Camera follow and the 80×48 deadzone avoided jitter during the run.
- The starting scaffold was added during M1.3 so the drop-through check does not depend on jump timing under CI load.

**Result:** Pass.

## Pass 2 - Combat and aiming

**Scripts:** `tests/e2e/combat.spec.ts`, `tests/unit/rock-aim.test.ts`, and screenshot capture.

1. Approached the first practice dummy and threw a horizontal rock.
2. Confirmed the dummy went from 3 HP to 2 HP: exactly 1 damage.
3. Threw with `Up` held and with `Down` held; both launches were visible and used the intended 45° arc directions.
4. Threw two more horizontal rocks and killed the dummy. The enemy count dropped from 2 to 1.
5. Confirmed rocks collide with the level, bounce once with reduced energy, and are cleaned up by their lifetime.

**Observations**

- Rock cooldown (400 ms) prevented accidental double throws.
- The horizontal throw hit reliably at close range; the arc drops noticeably at longer distances, as intended.
- Hit flash, damage pips, hit particles, and the dummy death tween made damage readable.
- The HUD initially rendered the infinity glyph as `00`; it was replaced with the explicit `ROCK INF` label.

**Result:** Pass.

## Pass 3 - Damage, death, and retry

**Scripts:** `tests/e2e/death-retry.spec.ts` and the M1 playtest script.

1. Ran into a practice dummy and took contact damage. HP went from 5 to 4, knockback pushed the player away, and invulnerability blinking started.
2. Continued into the floor gap. The player fell past `killY` and died.
3. Confirmed the death overlay, automatic retry, spawn reset, full 5 HP, and reset dummies.
4. Repeated the fall-death check.

**Observations**

- Death-to-control time measured at **1.46 s** and **1.51 s**, under the 3 s target.
- Hearts updated immediately on damage and restored on retry.
- The camera shake and death overlay made the failure state clear.
- Retry restarts the current level with full HP, matching the current design assumption.

**Result:** Pass.

## Debug overlay and performance

- `F3` toggles Arcade Physics hitboxes and an FPS/state readout. The `tests/e2e/debug.spec.ts` check toggles it on and off.
- At 1920×1080 (4× the internal 480×270 resolution), a headed hardware-accelerated Chromium run rendered **181 frames in 3.005 s = 60.2 FPS**.
- A headless Chromium run with SwiftShader software rendering rendered **178 frames in 3.012 s = 59.1 FPS**; Phaser's smoothed counter reported 58-59.
- No page errors were reported by the Playwright suites.
- No obvious physics tunneling occurred during the traversal or combat passes.

## Tuning snapshot

| Parameter                | Value | Note                                |
| ------------------------ | ----- | ----------------------------------- |
| Run speed                | 110   | px/s                                |
| Ground acceleration      | 1400  | px/s²                               |
| Ground friction          | 1800  | px/s²                               |
| Air acceleration         | 900   | px/s²                               |
| Jump velocity            | 300   | px/s upward                         |
| Gravity                  | 900   | px/s²                               |
| Max fall speed           | 500   | px/s                                |
| Coyote time              | 100   | ms                                  |
| Jump buffer              | 120   | ms                                  |
| Jump cut                 | 50%   | upward velocity retained on release |
| Drop-through window      | 250   | ms                                  |
| Invulnerability          | 1200  | ms                                  |
| Rock speed               | 260   | px/s                                |
| Rock gravity             | 600   | px/s²                               |
| Rock bounce              | 0.45  | first bounce                        |
| Rock cooldown            | 400   | ms                                  |
| Player HP                | 5     | hearts                              |
| Practice dummy HP        | 3     | rock damage is 1                    |
| Death delay before retry | 1.3   | s; plus 150 ms fade                 |

No movement or combat values were changed during M1. The initial values passed the internal checks; further tuning should wait for enemy variety in M2 and real player feedback.

## Known limitations and follow-ups

- Practice dummies are static targets with no attack behavior; M2 adds real enemy state machines.
- The level is a provisional JSON map, not a Tiled export yet.
- Player, enemies, and pickups still use one-frame placeholder art.
- SFX are synthesized WebAudio placeholders, not authored assets.
- There is no pause menu, settings screen, or item slot yet.
- Rocks pass upward through one-way platforms; they collide only while falling.
- Performance is validated on the development machine only. M7 should repeat the 1080p check on target hardware and lower-end machines.

## Checklist

- [x] Player can traverse the test level without getting stuck.
- [x] No input eat on fast jump taps.
- [x] Coyote time and jump buffering are implemented.
- [x] Jump cut works.
- [x] One-way platform drop-through works.
- [x] Rock arcs in three directions.
- [x] Rock bounces once and deals 1 damage.
- [x] Practice dummy can be killed.
- [x] Player takes damage, becomes invulnerable, and dies.
- [x] Death retry returns control in under 3 seconds.
- [x] HUD shows hearts, rock status, and level name.
- [x] Debug overlay toggles with F3.
- [x] Unit, end-to-end, lint, typecheck, and build checks pass.
- [x] At least three internal passes recorded.
