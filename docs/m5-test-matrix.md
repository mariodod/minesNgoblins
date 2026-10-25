# M5 Test Matrix

**Build:** `v0.5.0`  
**Date:** 2026-10-24  
**Scope:** Difficulties, challenge runs, achievements, skins, results reporting, and save recovery.

This matrix records the M5 verification. Available combinations are exercised through a completed boss run at the selected difficulty in Playwright, and the rule functions are covered directly by Vitest. Human route pacing and full-run balance remain M7 work.

## Difficulty modifiers

| Mode       | Player HP | Enemy HP |  Enemy damage | Exit rule                     | Boss HP |
| ---------- | --------: | -------: | ------------: | ----------------------------- | ------: |
| Normal     |         5 |       ×1 |            ×1 | Reach the exit                |      48 |
| Hard       |         5 |       ×2 |            ×2 | Reach the exit                |      72 |
| Impossible |         4 |       ×3 |            ×2 | Reach the exit                |      96 |
| Crazy      |         1 |       ×5 | Any hit kills | Every standard enemy must die |     120 |

Evidence:

- `tests/unit/difficulties.test.ts` checks the configured HP, HP multipliers, damage multipliers, boss multipliers, and Pacifist availability.
- The same file proves an Impossible run at full HP dies in exactly two base enemy hits and a Crazy run dies in one.
- `tests/e2e/difficulty.spec.ts` checks player HP, enemy HP, and difficulty selection through the real scene flow.
- `tests/e2e/boss.spec.ts` checks boss HP scaling.
- `tests/e2e/levels.spec.ts` checks that the Crazy elevator stays locked while enemies remain.

## Difficulty × run matrix

`Tested` means the combination reached the boss victory Results screen at that difficulty and produced the expected badges. `Unavailable` means the rules reject the challenge and Results explains why.

| Difficulty | No challenge | Pacifist    | Primitive | Untouchable | Legend      |
| ---------- | ------------ | ----------- | --------- | ----------- | ----------- |
| Normal     | Tested       | Tested      | Tested    | Tested      | Tested      |
| Hard       | Tested       | Tested      | Tested    | Tested      | Tested      |
| Impossible | Tested       | Tested      | Tested    | Tested      | Tested      |
| Crazy      | Tested       | Unavailable | Tested    | Tested      | Unavailable |

Notes:

- Crazy requires every standard enemy to die, so Pacifist cannot be completed there.
- Legend requires Pacifist, Primitive, and Untouchable in the same run, so it is also unavailable on Crazy.
- Primitive and Untouchable remain available on Crazy. A Primitive Crazy clear requires every enemy to die to rocks only.
- The boss is the run completion condition and is not recorded as a standard-enemy kill. Wormlings are standard enemies and do count against Pacifist.

## Challenge invalidation checks

| Rule        | Scenario                                        | Expected result                             | Coverage  |
| ----------- | ----------------------------------------------- | ------------------------------------------- | --------- |
| Pacifist    | A standard enemy dies to a knife                | Failed: `A standard enemy died to a knife.` | Unit      |
| Pacifist    | A Wormling dies during the boss fight           | Failed                                      | Unit      |
| Pacifist    | Crazy difficulty                                | Unavailable: every enemy must die           | Unit, E2E |
| Primitive   | Any secondary item is used, even if it misses   | Failed: item name is included in the reason | Unit      |
| Primitive   | An enemy dies to magic                          | Failed                                      | Unit      |
| Untouchable | The player takes 2 damage                       | Failed: `Took 2 damage.`                    | Unit, E2E |
| Untouchable | The player dies                                 | Failed: `Died during the run.`              | Unit      |
| Legend      | Any of the three component badges fails         | Failed with the missing badge names         | Unit, E2E |
| Run ended   | The run is abandoned without defeating the boss | Active badges become failed with a reason   | Unit      |

## Results, achievements, and skins

| Check                                                                | Coverage    |
| -------------------------------------------------------------------- | ----------- |
| Results shows all four badges with complete/failed/unavailable state | E2E         |
| Failed badges include a readable reason                              | E2E         |
| Crazy Results marks Pacifist and Legend unavailable                  | E2E         |
| Difficulty achievements unlock Hard, Impossible, and Crazy rewards   | Unit, E2E   |
| Boss, challenge, level, ore, and item achievements unlock once       | Unit        |
| Achievement toast appears on level completion                        | E2E         |
| Achievements and equipped skin persist across reload                 | Unit, E2E   |
| Locked and invalid skins are sanitized on load                       | Unit        |
| Reward skins are repaired from existing achievements                 | Unit        |
| Skins change palette only and do not affect gameplay                 | Code review |
| First Descent, Ore Hunter, and Full Arsenal trigger contexts         | Unit        |

## Save v1 checks

| Check                                                      | Coverage  |
| ---------------------------------------------------------- | --------- |
| Default save includes settings, achievements, skins, stats | Unit      |
| `usedItems` is unique, validated, and persisted            | Unit      |
| Invalid or locked equipped skin falls back to `delver`     | Unit      |
| Corrupt JSON is backed up and defaults are written         | Unit, E2E |
| Unsupported versions take the backup/recovery path         | Unit      |
| Title explains corrupt-save recovery                       | E2E       |
| Known `usedItems` values survive a save round trip         | Unit      |

Backup keys use `minesNgoblins.save.backup.<timestamp>`. The current save uses `minesNgoblins.save.v1`.

## Manual smoke checklist

Run these against a development build before release:

1. Start a Normal run through the difficulty selector and confirm the intro, pause challenge summary, and Results badges.
2. Select Crazy and confirm the HUD enemy counter, locked elevator, and pause summary showing Pacifist and Legend as unavailable.
3. Take one hit on Impossible and confirm the remaining HP is 2; take a second hit and confirm death.
4. Take one hit on Crazy and confirm death.
5. On Crazy, clear every enemy in Shaft Entrance and confirm the elevator unlocks.
6. Complete a clean Normal boss run and confirm the achievement toast, Results badges, and unlocked skins.
7. Reload the page and confirm achievements, equipped skin, and settings persist.
8. Corrupt the save key in DevTools and confirm the title notice, backup key, and recovered defaults.
9. Walk the full Hard, Impossible, and Crazy routes to validate pacing and challenge feasibility in M7.

## Known gaps

- Human completion times for Hard, Impossible, and Crazy are not part of the M5 gate; M7 owns balance and full-route pacing.
- Crazy all-kill routes are verified as a rule and gate lock, but a full human all-kill route on every level remains M7 QA.
- Placeholder art/audio and final UI polish remain M6 work.
