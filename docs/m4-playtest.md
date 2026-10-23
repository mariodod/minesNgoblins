# M4 playtest notes

Date: 2026-10-22  
Build: `0.4.0` (M4 complete)  
Difficulty: Normal for pacing and visual checks; Crazy only for HP-scale coverage

## Scope

M4 adds the Great Worm boss and the run-completion flow after The Deep Vein:
the two-screen arena, three phases, head and body hit rules, five attacks,
between-phase supplies, boss retry, victory collapse, and a Results placeholder.
Challenge-run tracking, final art/audio, and the full results screen remain in
later milestones.

## Verification summary

| Check            | Result                                                                                   |
| ---------------- | ---------------------------------------------------------------------------------------- |
| Formatting       | `npm run format` passed                                                                  |
| TypeScript       | `npm run typecheck` passed                                                               |
| Lint             | `npm run lint` passed                                                                    |
| Unit tests       | 101 passed across 12 files                                                               |
| Browser tests    | 29 passed across the full Playwright suite                                               |
| Production build | `npm run build` passed                                                                   |
| Normal pacing    | Scripted rock-only kill in **2:01**, inside the 2–4 minute target                        |
| Difficulty HP    | 48 / 72 / 96 / 120 for Normal / Hard / Impossible / Crazy, covered by unit and E2E tests |

## Pacing check

A scripted Normal-mode bot fought the boss with rocks only:

| Metric               | Result                                            |
| -------------------- | ------------------------------------------------- |
| Fight duration       | 2:01                                              |
| Boss HP              | 48                                                |
| Head hits            | 48                                                |
| Rocks thrown         | 198                                               |
| Body deflections     | 72                                                |
| Secondary items used | 0                                                 |
| Player health        | Maintained with the development-only `healPlayer` |

The bot kept itself to the left of the head, jumped, and threw at the apex. Its
roughly one-in-four clean hit rate reflects imperfect automated aim, not a
required player hit rate. The result is useful as a lower-bound pacing check:
the authored 48 HP boss lands at the bottom of the 2–4 minute Normal target even
with a large number of deflections. A human player can trade accuracy for safer
positions and use the supply salves, so the target range is credible but still
needs external validation in M7.

The bot used `healPlayer` to survive long enough to finish the damage check. It
did not use secondary weapons, and all boss damage came from thrown rocks
(`bossHeadHits = 48`). This validates the rock-only clear path, not a no-hit or
no-debug clear.

Crazy was not timed end to end. Its 120 HP and faster telegraphs/recovery target
the 5–8 minute band; the next pacing pass should measure it with a player or a
stronger bot after M5 difficulty selection is in place.

## Visual and flow checks

- Title screen shows the M4 boss build and `v0.4.0` version footer.
- Boss intro frames the worm in the arena and displays the head-shot rule.
- Fight HUD shows boss name, difficulty, health bar, phase pips, and attack
  labels.
- Emerge bite, rock spit, burrow charge, quake, and Wormling summons all
  announce a telegraph before dealing damage.
- Head hits reduce boss HP; body hits deflect with feedback and no damage.
- Phase transitions at 66% and 33% clean up hazards, show the phase banner, and
  surface the next attack pool.
- Supply pedestals appear after the phase 2 and phase 3 transitions; `E`
  collects in-range supplies and updates the HUD.
- Death retry restores the original entry carry, full HP, boss HP, phases, and
  supplies without duplicate entities.
- Victory triggers collapse and slow motion, opens the sealed elevator, and
  advances to Results by `E` or after the five-second auto-transition.
- Results shows frozen run statistics, total time, difficulty, and return to
  title. Direct boss entries correctly show `LEVELS CLEARED 0/4`.

QA screenshots were captured at 960×540. The intro camera was corrected to frame
the boss cleanly, off-camera supply text was replaced with a screen-fixed
announcement, and the Results screen was rewritten as a readable stats grid with
an opaque panel.

## Automated coverage

`tests/e2e/boss.spec.ts` covers:

1. Direct `?boss=1` boot with designed Normal HP.
2. Crazy HP scaling and difficulty propagation.
3. Debug head hits versus body deflections.
4. Phase skipping, supplies, and attack-pool advancement.
5. Supply pedestal collection after taking damage.
6. Boss defeat, run completion, and arrival at Results.
7. Death retry cleanup and original carry preservation.
8. Pause resume and boss fight restart.

Unit coverage in `tests/unit/boss-data.test.ts`, `tests/unit/run-service.test.ts`,
and the difficulty tests verifies HP scaling, phase thresholds, attack
sequences, hole selection, body damage, Wormling HP, and boss run lifecycle.

## Caveats

- No external human playtest has been run for M4.
- The pacing bot used development healing; normal player survivability still
  needs a manual pass.
- Crazy fight duration and damage pressure are not yet measured.
- Results is intentionally a placeholder; badges, achievements, unlocks, and
  failed-run reasons belong to M5.
- Boss art, stage dressing, and audio remain placeholders until M6.
- Body deflects are intentionally frequent. If human playtests show the weak
  point is too hard to read, tune segment hitboxes or head exposure in M7.
