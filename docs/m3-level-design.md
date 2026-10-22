# M3 level design notes

Date: 2026-10-22  
Build: `0.3.0` (M3 complete)

## Run order

| #   | Level           | Map                    | Enemy HP bonus | Intent                                                                |
| --- | --------------- | ---------------------- | -------------- | --------------------------------------------------------------------- |
| 1   | Shaft Entrance  | `shaft-entrance.json`  | 0              | Reintroduce movement, rocks, items, and the four standard enemies.    |
| 2   | Goblin Tunnels  | `goblin-tunnels.json`  | +1             | Force short jumps over rail gaps and fight through scavenger patrols. |
| 3   | Crystal Caverns | `crystal-caverns.json` | +1             | Vertical platforming with bats, beetles, crystals, and falling rocks. |
| 4   | The Deep Vein   | `deep-vein.json`       | +2             | Longer gauntlet that combines every enemy and hazard before the nest. |

## Exit flow

Each level has one `exit` rectangle at the end of its route. The Level scene draws
an elevator frame, cart, light, and `ELEVATOR` label over that rectangle. Standing
inside the rectangle shows `E RIDE`; pressing `E` records the level completion,
stores HP/ore/item carry state, fades out, and starts the next level. The exit of
The Deep Vein starts the boss placeholder scene.

The same exit rule is enforced on Crazy difficulty: if any enemy remains alive,
the prompt shows `LOCKED: N LEFT` and the elevator refuses to leave.

## Level-specific notes

### Shaft Entrance

- Reuses the M2 combat geometry so movement, combat, item, and difficulty
  regression tests remain meaningful.
- Teaches rock throws against the practice dummy, then introduces the bat,
  goblin, skeleton, and beetle.
- The falling-rock trigger and spike strip are optional hazards on the critical
  path.
- Exit at the far right of the starting floor.

### Goblin Tunnels

- Three short rail gaps split the floor into combat rooms.
- One-way platforms provide an upper route over most ground patrols.
- Skeletons and beetles anchor the middle rooms; goblins pressure the landing
  zones.
- Falling rocks guard the central room, and spike strips punish straight-line
  running.
- Exit beyond the final beetle room.

### Crystal Caverns

- Taller camera space and stacked platforms make the vertical route the safer
  no-kill option.
- Bats patrol the upper lanes while beetles hold the floor.
- Crystal props are non-colliding decoration and visual landmarks.
- Two falling-rock traps and three spike strips break up the platform route.
- The three floor gaps are 48px wide. They were reduced from 64px after route QA
  showed that the original width left almost no margin beside the 73px full-jump
  distance.
- Exit on the lowest right-hand floor.

### The Deep Vein

- Longest level and highest enemy HP bonus.
- Goblins, skeletons, beetles, and bats appear in alternating pressure rooms.
- Three falling-rock traps and three spike strips cover the approach to the final
  elevator.
- Item pedestals and crates are placed before the hardest rooms so a prepared
  player can spend resources rather than hoard them.
- Exit at the far right, immediately before the boss placeholder.

## Route validation

- Every level can be completed with rocks alone; no door, crate, or pedestal is
  mandatory. A full rock-only run reached the boss placeholder with 0 item uses.
- Every level has an upper or alternate platform route that bypasses at least one
  ground encounter. A full no-kill run reached the boss placeholder with 0 kills
  and 0 rocks thrown.
- Exits sit on solid floor and are reachable from both the ground and platform
  routes.
- All maps are parsed by the unit test suite; object IDs, spawn, exit, enemy
  references, prop contents, and geometry bounds are validated before play.
- Complete route evidence is recorded in [M3 Playtest Notes](m3-playtest.md).

## M3 QA checklist

- [x] Start Run enters Shaft Entrance and shows the level intro card.
- [x] HUD shows level number, level name, difficulty, hearts, item ammo, and ore.
- [x] The elevator prompt appears only inside the exit rectangle.
- [x] `E` at the exit advances to the next level and preserves HP, ore, and item
      ammo.
- [x] The Deep Vein exit reaches the boss placeholder and the summary is readable.
- [x] Death restarts the current level with full HP and preserves the run.
- [x] Falling into a pit records a death and restarts the current level.
- [x] Crazy exits stay locked while enemies remain.
- [x] All four maps load with no console or page errors.
- [x] Normal-mode enemies and hazards are readable at 480x270.
- [x] Pause, options, restart, and quit flow pass browser coverage.

## Deferred

- Ghost and wormling enemies are not part of the M3 standard roster.
- Boss mechanics, challenge rules, difficulty selection UI, and meta progression
  remain in M4/M5.
- Mid-run saving remains out of scope for v1.
