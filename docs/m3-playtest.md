# M3 playtest notes

Date: 2026-10-22  
Build: `0.3.0` (M3 complete)  
Difficulty: Normal

## Scope

M3 covers the four-level normal run from Shaft Entrance to the boss placeholder,
including elevator exits, level intro cards, carry state, death/retry, pause,
options, quit-run, persisted settings, and run statistics. Challenge badges,
boss combat, and meta progression remain in later milestones.

## Verification summary

| Check                        | Result                                                                                      |
| ---------------------------- | ------------------------------------------------------------------------------------------- |
| Formatting                   | `npm run format` passed                                                                     |
| TypeScript                   | `npm run typecheck` passed                                                                  |
| Lint                         | `npm run lint` passed                                                                       |
| Unit tests                   | 84 passed across 11 files                                                                   |
| Browser tests                | 21 Playwright tests passed                                                                  |
| Production build             | `npm run build` passed; 1.46 MB JS (382 KB gzip)                                            |
| Production frame rate        | 60.16 FPS measured over 5 seconds with `requestAnimationFrame`                              |
| Map validation               | All four maps parse and pass spawn, exit, enemy, item, prop, and geometry checks            |
| Rock-only full run           | Completed to the boss placeholder using 34 rocks, 0 item uses, 7 kills, and 4 deaths        |
| Pacifist full run            | Completed to the boss placeholder with 0 kills, 0 rocks thrown, 0 item uses, and 3 deaths   |
| Pause/settings/quit coverage | Resume, restart, options, quit confirmation, and settings persistence covered by Playwright |
| Crazy exit lock              | Covered by Playwright on Shaft Entrance; the same shared exit rule applies to every level   |

The two route runs started from the title screen, used Normal difficulty, and
reached the boss placeholder with all four levels completed. They were driven by
a temporary Playwright route bot that is not part of the repository build.

## Route evidence

### Rock-only run

- Time to boss: 2:20.
- Kills: 7.
- Rocks thrown: 34.
- Item uses: 0.
- Deaths: 4 (all on Goblin Tunnels).
- Levels completed: 4.
- Carry state and HUD advanced correctly at every elevator.

### Pacifist run

- Time to boss: 1:52.
- Kills: 0.
- Rocks thrown: 0.
- Item uses: 0.
- Deaths: 3 (one each on Goblin Tunnels, Crystal Caverns, and The Deep Vein).
- Pickups/ore/crates: 0.
- Levels completed: 4.

This confirms a viable no-kill traversal for every level and a full run that does
not depend on secondary weapons or supplies.

### Crystal Caverns fairness fix

The first route runs exposed three 64 px floor gaps in Crystal Caverns. At the
110 px/s run speed and the 73 px full-jump distance, a 64 px gap left almost no
timing margin. The floors were widened to make each gap 48 px, and both complete
runs above were recorded after that change.

## Manual checklist

- [x] Start Run enters Shaft Entrance and shows the level intro card.
- [x] HUD shows level number, level name, difficulty, hearts, item ammo, and ore.
- [x] The elevator prompt appears only inside the exit rectangle.
- [x] `E` advances to the next level and preserves HP, ore, and item ammo.
- [x] The Deep Vein exit reaches the boss placeholder and its summary is readable.
- [x] Death restarts the current level with full HP and preserves run statistics.
- [x] Falling into a pit records a death and restarts the current level.
- [x] Crazy exits stay locked while enemies remain.
- [x] All four maps load without console or page errors.
- [x] Normal enemies and hazards are readable at 480x270.
- [x] Pause, options, restart, quit confirmation, and title return work.
- [x] Volume and screen-shake settings persist through the save service.
- [x] Held movement keys survive a level transition and retry.

## Known limitations and follow-ups

- The boss is a placeholder until M4.
- The title screen defaults to Normal; the difficulty selector and challenge
  badges arrive in M5.
- The automated route times are near-optimal. A first-time player will take
  longer because of exploration and deaths; final 15-25 minute pacing should be
  checked with external players during the M7 balance pass.
- Production frame rate was measured on Shaft Entrance. Profiling with the full
  Deep Vein enemy and projectile budget remains part of the M7 performance pass.
- No external human playtest was available during this implementation. The
  route checks above are automated keyboard playthroughs with recorded run
  statistics.

## Verdict

The M3 functional scope is complete: the game is playable from title to boss
placeholder, all four levels validate, both required route challenges complete,
and pause/settings/retry/quit flows pass browser coverage. Pacing, full-budget
performance, boss combat, and challenge enforcement stay on the roadmap for M4,
M5, and M7.
