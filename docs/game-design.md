# Mines & Goblins — Game Design Document

**Version:** 0.1 (draft for review)  
**Date:** 2026-10-19  
**Status:** Planning  
**Working title:** Mines & Goblins

---

## 1. High concept

Mines & Goblins is a retro, side-scrolling action platformer about a miner descending a cursed mine with an unlimited supply of rocks. The game combines the readable, punishing encounter design of _Ghosts 'n Goblins_ with the scavenging and run-based structure of _Spelunky_.

The player advances through four handcrafted mine levels, dodges or defeats enemies, finds limited stronger weapons, and finally faces a giant worm at the bottom of the mine. Short runs, strict challenge rules, and unlockable cosmetic rewards give the game replay value beyond the first clear.

**Player fantasy:** You are the last stubborn miner in a collapse-ridden shaft, armed with a rock and a bad plan.

---

## 2. Design pillars

1. **One rock, many answers.** The rock is always available, always useful, and always deals exactly 1 damage. Mastery comes from aiming, arc, timing, positioning, and knowing when _not_ to throw.
2. **Scavenge, then commit.** Knives, flintlocks, and magic are limited. Finding a strong item creates a small, exciting decision: use it now, save it for the boss, or lose it by picking up something else.
3. **Runs tell stories.** Pacifist, Primitive, and Untouchable runs turn the same levels into different games. Achievements and skins commemorate unusual clears.
4. **Readable retro challenge.** Enemies telegraph, hazards are visible, and deaths feel earned. The game is hard because the player understands what went wrong, not because of hidden information.
5. **Descent into the mine.** A cohesive underground aesthetic, escalating enemy designs, and a giant worm finale make the journey feel like one continuous descent.

### Non-goals for v1

- Not a roguelike with procedural levels.
- Not a combat-heavy melee game.
- Not a story-driven RPG.
- Not a mobile or multiplayer game.
- Not a game where stronger items are required to win.

---

## 3. Target audience and platform

- **Platform:** Desktop web browsers (Chrome, Edge, Firefox, Safari; WebGL2 required).
- **Input:** Keyboard first. Gamepad support is a stretch goal for v1.1.
- **Session length:** 15–25 minutes for a complete Normal run; individual levels 2–4 minutes.
- **Audience:** Players who enjoy retro action platformers, precision challenges, speedruns, and self-imposed challenge runs.
- **Tone:** Darkly comic retro adventure. Stylized peril, dust, and monster goo; no realistic gore.

---

## 4. Core loop and structure

### 4.1 Moment-to-moment loop

1. Read the room: enemies, hazards, platforms, escape routes.
2. Move and jump through the space, using the environment to avoid danger.
3. Throw rocks to damage or interrupt enemies, or bypass them entirely.
4. Find a crate or pedestal and decide whether to take the limited item.
5. Reach the level exit with as much health and ammo as possible.

### 4.2 Run loop

```text
Title
  → choose difficulty
  → run intro
  → level 1
  → level 2
  → level 3
  → level 4
  → boss arena
  → results / achievements / unlocks
  → title
```

- A run starts when the player confirms a difficulty and begins level 1.
- A run ends when the giant worm is defeated, or when the player quits from the pause menu.
- The run is a single continuous session. **Mid-run saving is out of scope for v1.**
- On death, the player restarts the current level with full health. The run continues; the death is recorded in run statistics.
- Levels are linear. There is no backtracking or level select during a run.
- The exit of each level is a mine elevator/cart. In Crazy mode, the exit stays locked until every enemy in the level is dead.

### 4.3 Failure and retry

- Reaching 0 HP triggers a short death animation and a retry prompt.
- Retrying restarts the current level from its entrance with full HP and the run's persistent statistics intact.
- Pacifist and Primitive runs remain eligible after a death. Untouchable runs do not.
- Boss deaths restart the boss encounter, not the whole run.
- The pause menu offers **Resume**, **Restart Level**, **Options**, and **Quit Run**.

### 4.4 Session goals and meta loop

- Complete the mine on each difficulty.
- Complete the three challenge runs and their combinations.
- Unlock achievements and cosmetic skins.
- Improve clear time, reduce deaths, and chase personal bests.
- No currency, loot boxes, or online progression. Rewards are earned through play.

---

## 5. Player character

### 5.1 Health and survivability

The player's survivability is represented by **hearts (HP)**. The source brief says the player starts with "5 lives" on Normal; for v1 this is interpreted as **5 hit points**, matching the brief's later descriptions of dying in two hits or one hit. There is no separate stock of extra lives in v1.

| Difficulty | Player HP | Notes                                         |
| ---------- | --------: | --------------------------------------------- |
| Normal     |         5 | Baseline                                      |
| Hard       |         5 | Enemies deal double damage, so hits cost more |
| Impossible |         4 | Enemies deal 2 damage, so two hits kill       |
| Crazy      |         1 | Any damage kills                              |

- Damage grants 1.2 seconds of invulnerability; the player flashes during this window.
- Taking damage applies a small knockback and a brief hit-stop.
- Falling into a bottomless pit is an instant death, regardless of HP.
- Health pickups are rare; there is no regenerating health.
- If the "5 lives" wording is intended to mean a limited stock of retries instead of hearts, that can be added later without changing combat. This is an open question in section 19.

### 5.2 Movement

The player is a compact, readable pixel-art miner.

| Action                        | Default input             | Behavior                                                |
| ----------------------------- | ------------------------- | ------------------------------------------------------- |
| Move left / right             | `A` / `D` or Left / Right | Accelerated run with friction                           |
| Jump                          | `Space` or `Z`            | Variable-height jump                                    |
| Drop through one-way platform | Down + Jump               | Brief collision disable                                 |
| Throw rock                    | `X` or `J`                | Arc projectile; hold Up/Down to angle                   |
| Use item                      | `C` or `K`                | Uses the equipped secondary item                        |
| Pause                         | `Esc` or `P`              | Opens pause menu                                        |
| Interact                      | `E`                       | Takes items from pedestals; activates the exit/elevator |

**Movement feel targets (starting values, tuned in M1):**

| Parameter           | Starting value                               |
| ------------------- | -------------------------------------------- |
| Run speed           | 110 px/s                                     |
| Ground acceleration | 1400 px/s²                                   |
| Ground friction     | 1800 px/s²                                   |
| Jump velocity       | 300 px/s                                     |
| Gravity             | 900 px/s²                                    |
| Jump cut            | 50% upward velocity removed on early release |
| Max fall speed      | 500 px/s                                     |
| Coyote time         | 100 ms                                       |
| Jump buffer         | 120 ms                                       |

**M1 result:** the starting values were retained after the internal passes: a short tap reaches about 34 px and a full jump reaches about 46-50 px. Details are in [M1 Playtest Notes](m1-playtest.md).

- Jumping is the primary defensive verb. The player should be able to jump over most contact enemies and projectiles.
- There is no melee attack, stomp attack, or dodge roll in v1. The rock is the answer to nearly every combat problem.
- The player can throw while grounded or airborne.
- Throwing does not interrupt movement, but has a short animation and cooldown.

### 5.3 Aiming and throwing

- By default, rocks are thrown horizontally in the facing direction.
- Holding Up while throwing aims 45° upward; holding Down aims 45° downward.
- The rock arcs under gravity, bounces once with reduced energy, and disappears shortly afterward.
- The rock deals exactly 1 damage to the first enemy it hits. It does not pierce.
- A small trajectory preview is **not** shown; mastery comes from learning the arc. Debug builds may display it.
- Throw cooldown: 0.4 seconds.
- Throwing has priority over item use; the inputs are separate.

### 5.4 Damage feedback

- Player: red flash, knockback, brief screen shake, invulnerability blink.
- Enemy: white flash, hit-stop, small particle burst, knockback proportional to damage.
- Lethal enemy hit: brief freeze, death animation, puff of dust/goo, removal from the level.
- Boss: stronger flash, hit marker, health bar reduction, phase-transition roar and arena shake.
- An optional "damage numbers" setting is out of scope for v1; readability comes from hit reactions and enemy HP pips for tougher enemies.

---

## 6. Rocks, items, and economy

### 6.1 Always available: Rock

| Property     | Value                    |
| ------------ | ------------------------ |
| Ammo         | Unlimited                |
| Damage       | 1                        |
| Speed        | 300 px/s initial         |
| Gravity      | 350 px/s²                |
| Bounces      | 1                        |
| Cooldown     | 0.4 s                    |
| Hit behavior | Single target, no pierce |

The rock is deliberately weak. It is the baseline against which every stronger item is measured, and it is the only weapon used in a Primitive run.

### 6.2 Secondary items

The player has **one secondary item slot**. The item has a limited number of uses. Picking up a different item replaces the current one. Picking up the same item adds uses up to its cap.

| Item              | Uses (initial / cap) | Damage | Behavior and effect                                                                     |
| ----------------- | -------------------: | -----: | --------------------------------------------------------------------------------------- |
| **Knife**         |                5 / 8 |      3 | Fast, straight throw. Reliable mid-range damage.                                        |
| **Flintlock**     |               6 / 12 |      2 | Very fast bullet. Straight line, short muzzle flash.                                    |
| **Rune scroll**   |                2 / 3 |      4 | Lobbed projectile; explodes in a small radius and stuns surviving enemies for 1 second. |
| **Healing salve** |              Instant |      — | Restores 2 HP. Consumed immediately; does not occupy the item slot.                     |

Design intent:

- **Knife** is the dependable "big rock": more damage, easier to aim, limited.
- **Flintlock** is the fast precision option. It rewards good aim with rapid damage but has low per-shot damage.
- **Rune scroll** is the panic button and crowd-control tool. Its area damage and stun can rescue a bad room or create a boss punish window.
- **Healing salve** is a rare safety valve, especially on higher difficulties.

### 6.3 Item sources

- **Crates:** breakable with any projectile. Contents are authored per crate, not randomized in v1. Crates may contain a secondary item, ore, or a healing salve.
- **Pedestals:** placed items that require an interact press. This prevents accidental replacement of a good item and creates visible risk/reward decisions.
- **Boss arena:** two supply pedestals appear between phases, offering a way to recover damage output without invalidating a Primitive run by merely picking items up.

**Primitive-run rule:** using a secondary weapon invalidates the run, even if it misses. Picking up an item does not invalidate it. Healing salves are utility pickups and do not invalidate the run.

### 6.4 Economy principles

- Every level contains at least one secondary item, but no level requires one.
- Strong items are optional shortcuts, not keys.
- Item placement should create a decision: take a detour for a knife, or preserve health and time.
- Contents are deterministic so that challenge runs and speedruns are fair.
- The player can always fall back on rocks. No soft-locks caused by running out of ammo.

### 6.5 Ore and score

- Ore chunks are collectible pickups worth points and tracked as a completion statistic.
- Ore is optional and does not gate progression or achievements in v1.
- Results screens show ore collected, kills, damage taken, deaths, and clear time.
- Score is a secondary motivator; the primary rewards are achievements and skins.

---

## 7. Enemies

### 7.1 Design rules

Every enemy must:

- Be identifiable at a glance by silhouette, palette, and movement.
- Telegraph its dangerous action.
- Have a counterplay that uses movement, rocks, or the environment.
- Be avoidable without taking damage.
- Be killable with rocks alone, even if it takes time (important for Primitive and Crazy runs).
- Never require a specific secondary item to defeat.

Enemies do not respawn. Enemy counts are finite and tracked for the Crazy-mode exit gate.

### 7.2 Enemy roster

| Enemy                | Base HP | Role               | Behavior                                                            | Counterplay                                    |
| -------------------- | ------: | ------------------ | ------------------------------------------------------------------- | ---------------------------------------------- |
| **Cave Bat**         |       1 | Flying nuisance    | Flutters in a sine pattern toward the player's vertical position    | Jump/duck; one rock kills                      |
| **Goblin Scavenger** |       2 | Basic pressure     | Patrols; charges when the player is close and on the same level     | Jump over the charge; throw while it recovers  |
| **Skeleton Thrower** |       2 | Ranged denial      | Keeps distance and lobs bones in an arc                             | Close the gap or arc a rock over cover         |
| **Armored Beetle**   |       3 | Positioning puzzle | Slow patrol; stone hits from the front are deflected                | Hit its exposed back after it turns or charges |
| **Mine Ghost**       |       2 | Terror/pressure    | Drifts through terrain; phases out and becomes briefly invulnerable | Wait for the materialized window; keep moving  |
| **Wormling**         |       3 | Burrow ambusher    | Burrows under the floor and emerges near the player                 | Watch dust; move after the emerge telegraph    |

**Boss:** the Great Worm, detailed in section 9.

The v1 target is six standard enemies. M2 implements the first four; the Ghost and Wormling arrive with the later levels. If scope becomes tight, the roster can ship with five without changing the core design.

### 7.3 Enemy health progression

Enemy health increases by level, then by difficulty:

```text
effective HP = ceil((base HP + level HP bonus) × difficulty HP multiplier)
```

| Level               | HP bonus |
| ------------------- | -------: |
| 1 — Shaft Entrance  |       +0 |
| 2 — Goblin Tunnels  |       +1 |
| 3 — Crystal Caverns |       +1 |
| 4 — The Deep Vein   |       +2 |

Example (Normal):

| Enemy            | Level 1 | Level 2 | Level 3 | Level 4 |
| ---------------- | ------: | ------: | ------: | ------: |
| Cave Bat         |       1 |       1 |       1 |       1 |
| Goblin Scavenger |       2 |       3 |       3 |       4 |
| Skeleton Thrower |       2 |       3 |       3 |       4 |
| Armored Beetle   |       3 |       4 |       4 |       5 |
| Mine Ghost       |       — |       — |       3 |       4 |
| Wormling         |       — |       — |       — |       5 |

Difficulty multipliers are applied after the level bonus. On Crazy (×5), a Level 4 Goblin has 20 HP, so players are expected to use scavenged weapons and careful positioning. This is intentionally extreme; final numbers are subject to the balance pass in M7.

### 7.4 Enemy damage

| Source                              |   Base damage |
| ----------------------------------- | ------------: |
| Contact with standard enemy         |             1 |
| Enemy projectile                    |             1 |
| Heavy contact (Wormling, boss bite) |             2 |
| Spikes                              |             1 |
| Falling rocks                       |             2 |
| Bottomless pit                      | Instant death |

- Hard and Impossible multiply **enemy** damage (contact, projectiles, boss attacks) by 2.
- Hazard damage stays fixed to keep environmental rules readable.
- Crazy has 1 player HP, so any positive damage is lethal.
- Invulnerability frames prevent a single contact from draining multiple hearts.

### 7.5 Enemy drops and population

- Enemies drop ore at a low, authored rate. They do not drop weapons in v1.
- Maximum active enemies per level: 14. Maximum simultaneous active enemies: 8. This keeps encounters readable and performance predictable.
- Enemy spawns are authored in Tiled; no wave spawning except the boss's Wormling summons.
- In Crazy, the HUD shows `Enemies remaining: N`. The exit remains visibly locked until N reaches 0.
- Level design must guarantee that every enemy is reachable and killable in Crazy. No enemy may be trapped behind an unopenable gate or permanently invulnerable.

---

## 8. Levels and hazards

### 8.1 Level list

| #   | Level                     | Length      | New elements                                  | Enemy focus                 |
| --- | ------------------------- | ----------- | --------------------------------------------- | --------------------------- |
| 1   | **Shaft Entrance**        | 2–3 screens | Movement, rocks, crates, first pit            | Bats, Goblins               |
| 2   | **Goblin Tunnels**        | 3–4 screens | One-way platforms, spikes, skeletons          | Goblins, Skeletons, Beetles |
| 3   | **Crystal Caverns**       | 3–4 screens | Vertical routes, moving platforms, ghosts     | Bats, Ghosts, Beetles       |
| 4   | **The Deep Vein**         | 4–5 screens | Combined hazards, gauntlet, heavy pressure    | All standard enemies        |
| 5   | **The Great Worm's Nest** | Boss arena  | Burrow holes, falling rocks, supply pedestals | Great Worm + Wormlings      |

The internal resolution is **480×270**, with **16×16 tiles**. Levels scroll smoothly and can be wider and taller than the screen. The camera follows the player with a deadzone and clamps to level bounds.

### 8.2 Hazards

| Hazard                | Behavior                                     | Damage |
| --------------------- | -------------------------------------------- | ------ |
| Spikes                | Static, visible, avoidable                   | 1      |
| Falling rocks         | Dust telegraph, shadow, then fall            | 2      |
| Bottomless pit        | Instant death and level restart              | Lethal |
| Moving platform       | Safe traversal; can crush? No crushing in v1 | None   |
| Steam vent (optional) | Periodic, telegraphed burst                  | 1      |

For v1, the core hazard set is spikes, falling rocks, and pits. Steam vents are a stretch element if Level 4 needs extra texture.

### 8.3 Level design rules

1. **No mandatory kills.** A player must be able to reach every exit without killing an enemy. This is required for Pacifist runs and good encounter design.
2. **No unavoidable damage.** Every attack and hazard must have a readable response.
3. **Telegraph off-screen danger.** Falling rocks and emerging enemies warn before they hit.
4. **No blind jumps.** The camera should reveal landing zones before commitment.
5. **Introduce one or two ideas per level.** Teach, then combine.
6. **Every enemy is reachable in Crazy.** The all-kill gate must never create a soft-lock.
7. **Items are optional.** A Primitive player can ignore every pedestal and still win.
8. **Checkpoints are level entrances only.** Levels are short enough that a retry is quick.
9. **Exit readability.** The elevator/cart is visually distinct; its locked state in Crazy is obvious.
10. **Pacifist routes exist.** Each combat room needs a dodge route, a higher route, or a timing window that avoids kills.
11. **Performance budget.** Avoid more than 8 active enemies and 40 active projectiles.

### 8.4 Tiled map structure

| Layer / object layer | Purpose                                                                     |
| -------------------- | --------------------------------------------------------------------------- |
| `background-far`     | Parallax backdrop                                                           |
| `background-near`    | Parallax mine structures                                                    |
| `terrain`            | Solid collision tiles                                                       |
| `one-way`            | Jump-through platforms                                                      |
| `hazards`            | Spikes, falling-rock triggers, pits                                         |
| `decor`              | Non-colliding visual details                                                |
| `objects`            | Player spawn, enemy spawns, crates, items, exit, checkpoints, camera bounds |

Object properties use stable IDs defined in TypeScript data files. A validation script/test will fail the build if a map references an unknown enemy, item, or exit type.

### 8.5 Pacing

- Levels escalate from open, readable spaces to tighter, layered rooms.
- Level 1 teaches movement and throwing with low punishment.
- Level 2 introduces ranged pressure and positioning.
- Level 3 introduces verticality and a "phasing" threat.
- Level 4 is a best-of roster gauntlet with little downtime.
- The boss is a dedicated spectacle and skill check, not a remix room.

---

## 9. Boss: The Great Worm

### 9.1 Fantasy

A colossal worm that has burrowed through the heart of the mine. It attacks from below, shatters the arena, and forces the player to read the ground itself. It is the final exam for movement, aiming, and patience.

### 9.2 Arena

- Two screens wide (960×270), one screen tall.
- Three burrow holes: left, center, right.
- Two elevated side platforms for repositioning.
- Falling rocks from the ceiling in later phases.
- Two supply pedestals appear after the phase 2 and phase 3 transitions. The pair is a healing salve plus either a knife or a rune scroll. Picking them up is optional and does not invalidate a Primitive run; using a secondary weapon does.
- Arena exits are sealed until the worm dies.

### 9.3 Health and phases

- Starting base HP: **48**.
- The boss uses a separate difficulty curve: Normal 48, Hard 72, Impossible 96, Crazy 120. Keeping the curve separate from the standard enemy multiplier preserves the designed 120 HP Crazy fight.
- Phase thresholds: **66%** and **33%**.
- Only the **head** is vulnerable. Body hits produce a metallic/stone spark and deal 0 damage.
- The worm is untargetable while fully burrowed.
- After a failed charge, the head is exposed for the phase's recovery window (about 2–2.5 seconds).

| Phase | Health range | Behavior                                                                            |
| ----- | ------------ | ----------------------------------------------------------------------------------- |
| 1     | 100–66%      | Alternating emerge bites and single-rock spits; long recovery windows               |
| 2     | 66–33%       | Adds burrow charge, quake, two-rock spit, and a summon of up to two Wormlings       |
| 3     | 33–0%        | Faster telegraphs, three-rock spit, four-rock quake, charges, and Wormling pressure |

### 9.4 Attacks

| Attack               | Telegraph                                | Response                                                 |
| -------------------- | ---------------------------------------- | -------------------------------------------------------- |
| **Emerge bite**      | Dust plume and rumble at a hole          | Move away from the hole; punish the head                 |
| **Rock spit**        | Head rears back and glows                | Jump the arcing rocks or hide behind a platform          |
| **Burrow charge**    | Low rumble; dust trail crosses the floor | Jump over the passing body, then punish the stunned head |
| **Quake**            | Ceiling dust and falling pebbles         | Watch shadows; move to safe gaps                         |
| **Summon Wormlings** | Roar; two burrow plumes                  | Clear or dodge the adds while avoiding the boss          |

### 9.5 Victory

- The final hit triggers slow motion, a screen-wide rumble, and the worm's collapse.
- The arena settles and the elevator opens. Press Interact anywhere to leave, or advance automatically after a short delay.
- The Results screen appears with run stats, completed and failed challenge badges, newly unlocked achievements, and unlocked skins.
- Boss defeat is the only completion condition for a run.

### 9.6 Boss design rules

- Every attack has a distinct audio and visual tell.
- No attack is undodgeable; the player always has at least one safe response.
- The fight gives breathing room between patterns.
- Add control: Wormlings are a pressure valve, not a swarm. Two at a time maximum.
- The boss fight must be completable with rocks alone. Primitive runs are a core promise.

---

## 10. Difficulty modes

All difficulties are selectable from the start. The UI shows recommended order and warnings, but does not lock modes.

| Mode           | Player HP | Enemy HP |  Enemy damage | Exit rule                         | Design intent                                   |
| -------------- | --------: | -------: | ------------: | --------------------------------- | ----------------------------------------------- |
| **Normal**     |         5 |       ×1 |            ×1 | Reach the exit                    | The intended first experience; five hearts      |
| **Hard**       |         5 |       ×2 |            ×2 | Reach the exit                    | Enemies are tougher and hit harder              |
| **Impossible** |         4 |       ×3 |            ×2 | Reach the exit                    | Two enemy hits kill; every mistake is expensive |
| **Crazy**      |         1 |       ×5 | Any hit kills | **Kill every enemy in the level** | Masochistic mode; full clear required           |

Rules and edge cases:

- Enemy HP is multiplied after level bonuses and rounded up.
- Enemy damage applies to contact, projectiles, and boss attacks.
- Hazard damage is fixed; pits are always lethal.
- In Crazy, the exit is locked until the alive-enemy count is zero.
- Pacifist runs cannot be completed on Crazy because the mode requires killing every enemy. The UI communicates this before the run starts.
- Difficulties do not change item damage or ammo counts in v1; they change survivability and enemy durability.
- Boss HP uses a separate `bossHpMultiplier` (Normal 1, Hard 1.5, Impossible 2, Crazy 2.5) on top of its 48 base HP. The balance pass may tune the base value, but the curve is now data-driven.
- Achievements are difficulty-aware: completing Hard, Impossible, and Crazy each grants a separate reward.

### 10.1 "Five lives" interpretation

The brief says the player starts with five lives on Normal, while the higher difficulties are described in hits. For v1:

- "Lives" are interpreted as **5 HP (hearts)**.
- There is no extra-life stock.
- Death restarts the current level with full HP.
- A future option can add a limited-retry arcade mode without changing the core rules.

This interpretation is listed as an open question for confirmation.

---

## 11. Challenge runs, achievements, and skins

### 11.1 Run tracking

Every run records:

- Enemies killed, with damage source attribution.
- Damage taken, by source.
- Secondary items picked up and used.
- Deaths and level restarts.
- Time elapsed.
- Ore collected.
- Difficulty and completion state.

The tracking system listens to gameplay events such as `enemy:killed`, `player:damaged`, and `item:used`. A challenge rule is a pure validation function over that data. This keeps rules testable and prevents ad-hoc checks scattered across entities.

### 11.2 Challenge runs

A challenge badge is awarded only when the run is completed by defeating the boss. The results screen lists completed and failed badges, with the reason for failure where useful.

| Run             | Requirement                                         | Invalidated by                                                                      | Available on             |
| --------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------ |
| **Pacifist**    | Complete the run without killing any standard enemy | Any standard-enemy death during the run, from any source                            | Normal, Hard, Impossible |
| **Primitive**   | Complete the run using only rocks to damage enemies | Any secondary weapon use (even a miss); any enemy death caused by a non-rock source | All modes                |
| **Untouchable** | Complete the run without taking any damage          | Any damage, pit death, or death/restart                                             | All modes                |

Notes:

- Pacifist and Primitive can be combined: avoid all kills, and never use a secondary weapon.
- Pacifist and Untouchable can be combined.
- **Legend** is awarded for completing Pacifist + Primitive + Untouchable in a single run.
- Deaths are allowed for Pacifist and Primitive (the run continues after a level restart) but automatically fail Untouchable.
- Environmental enemy deaths count as kills for Pacifist and as non-rock damage for Primitive.
- Items can be picked up during a Primitive run; only using them invalidates the run. Healing salves are instant utility and are allowed.
- In Crazy, Pacifist is unavailable. A Primitive Crazy run is possible but extremely demanding; every enemy must die to rocks.
- Run achievements are not difficulty-specific by themselves. They must be earned on a completed run; the difficulty is recorded on the results screen.

### 11.3 Achievements

| ID                 | Name             | Condition                                              | Reward             |
| ------------------ | ---------------- | ------------------------------------------------------ | ------------------ |
| `first_descent`    | First Descent    | Complete Level 1                                       | —                  |
| `worm_slayer`      | Worm Slayer      | Defeat the Great Worm                                  | Wormhide skin      |
| `pacifist`         | Pacifist         | Complete a run with 0 kills                            | Pale Wanderer skin |
| `primitive`        | Primitive        | Complete a run using only rocks                        | Boneclad skin      |
| `untouchable`      | Untouchable      | Complete a run without taking damage                   | Gilded skin        |
| `legend`           | Legend           | Complete Pacifist + Primitive + Untouchable in one run | Legend skin        |
| `hard_clear`       | Hardened         | Complete the game on Hard                              | Ironclad skin      |
| `impossible_clear` | Against the Odds | Complete the game on Impossible                        | Obsidian skin      |
| `crazy_clear`      | Certified Crazy  | Complete the game on Crazy                             | Crimson skin       |
| `full_arsenal`     | Full Arsenal     | Use every secondary item at least once                 | —                  |
| `boss_flawless`    | Flawless Warden  | Defeat the boss without taking damage in the fight     | —                  |
| `ore_hunter`       | Ore Hunter       | Collect all ore in a single level                      | —                  |

Achievements unlock at the moment their condition is met (level completion or run completion). Run-level achievements are evaluated only after the boss dies. The boss is the run's completion condition, not a standard enemy: defeating it does not count as a Pacifist kill, otherwise Pacifist would be impossible by definition. Full Arsenal checks the persistent set of secondary items the player has used at least once across all runs.

### 11.4 Skins

All skins are cosmetic palette swaps using the same hitbox, animations, and silhouette.

| Skin             | Unlock                            |
| ---------------- | --------------------------------- |
| Delver (default) | Available from the start          |
| Pale Wanderer    | Pacifist achievement              |
| Boneclad         | Primitive achievement             |
| Gilded           | Untouchable achievement           |
| Wormhide         | Defeat the Great Worm             |
| Ironclad         | Complete Hard                     |
| Obsidian         | Complete Impossible               |
| Crimson          | Complete Crazy                    |
| Legend           | Complete the triple challenge run |

Skins are equipped from the Skins screen and persist in the local save. No skin changes gameplay.

---

## 12. UI, UX, and save data

### 12.1 Screen flow

```text
Boot → Title
Title → Start Run → Difficulty Select → Run Intro → Level 1 … Level 4 → Boss → Results
Title → Achievements
Title → Skins
Title → Options
Level → Pause → Resume / Restart Level / Options / Quit Run
Death → Game Over → Retry Level / Quit Run
Boss defeated → Results → Title
```

### 12.2 HUD

- **Top left:** hearts, current HP.
- **Top center:** level name and progress (e.g., "2 — Goblin Tunnels").
- **Top right:** secondary item icon and remaining uses; rock icon with infinity symbol.
- **Crazy mode only:** enemies remaining counter.
- **Boss fight:** boss name, large health bar, phase pips.
- Run badges are not shown during play by default. Pause lists the four challenge states, and Results shows the final badges with failure reasons.

The HUD is minimal, readable at 480×270, and uses a pixel font. Important states use icons and shape, not color alone.

### 12.3 Menus

- **Title:** Start Run, Achievements, Skins, Options.
- **Difficulty select:** cards with player HP, enemy modifiers, and special rules; warning if Pacifist is incompatible with Crazy.
- **Pause:** Resume, Restart Level, Options, Quit Run.
- **Options:** master/music/SFX volume, screen shake, flashing intensity, fullscreen, key remapping, reset save.
- **Achievements:** grid with locked/unlocked state and descriptions.
- **Skins:** preview and equip.
- **Results:** clear time, deaths, kills, damage taken, items used, ore, badges, achievements unlocked, skins unlocked.

### 12.4 Accessibility

- Remappable keyboard controls.
- Screen shake intensity: full, reduced, off.
- Flash intensity: full, reduced.
- Volume sliders.
- Pause at any time.
- No flashing above 3 Hz.
- High-contrast interactables and telegraphs.
- Text uses clear labels and is not embedded in images.
- Optional gamepad support is planned for v1.1.
- The game is desktop-only in v1; no touch controls.

### 12.5 Save data

Local save via `localStorage`, versioned and validated on load.

```ts
interface SaveDataV1 {
  version: 1;
  settings: {
    masterVolume: number;
    musicVolume: number;
    sfxVolume: number;
    screenShake: 'full' | 'reduced' | 'off';
    flashIntensity: 'full' | 'reduced';
    equippedSkin: string;
    keybinds: Record<string, string>;
  };
  achievements: Record<string, { unlockedAt: string }>;
  skins: Record<string, { unlockedAt: string }>;
  stats: {
    runsStarted: number;
    runsCompleted: number;
    bestRunTimeMs: number | null;
    totalDeaths: number;
    totalKills: number;
    usedItems: string[];
  };
}
```

- The save key is `minesNgoblins.save.v1`.
- A corrupt or outdated save is backed up under `minesNgoblins.save.backup.<timestamp>` and replaced with defaults after a user-visible notice.
- There is no account, cloud sync, or online leaderboard.
- A "Reset Save" action requires confirmation.
- Mid-run progress is not saved in v1. Refreshing or closing the browser ends the run.

---

## 13. Art and audio direction

### 13.1 Visual style

- **Pixel art:** 16-bit console era, chunky and readable, not faux-3D.
- **Internal resolution:** 480×270, 16×16 tiles; nearest-neighbor scaling.
- **Palette:** limited per area. Mine browns and charcoal, lantern amber, goblin green, crystal teal, and a hot crimson for danger.
- **Player:** 24×32 px silhouette, miner's helmet with a small lamp, satchel, scarf. The lamp can be a visual anchor in dark rooms.
- **Enemies:** strong silhouettes; eyes and silhouettes readable at small sizes.
- **Boss:** large segmented worm, 160–240 px across the arena, with clear head, segmented body, and exposed weak point. Multiple animated parts.
- **Backgrounds:** two parallax layers, timber supports, rails, crystals, distant cave voids. Subtle dust and dripping water.
- **VFX:** dust puffs, rock chips, sparks, hit flashes, ground rumble, screen shake, lantern glow. No excessive bloom or modern particle noise.
- **Skins:** palette swaps with distinct color identity; no geometry changes.

### 13.2 Animation budget

| Entity         | Animations                                                                                     |
| -------------- | ---------------------------------------------------------------------------------------------- |
| Player         | Idle (4), run (6), jump (2), fall (2), throw (3), hurt (2), death (5)                          |
| Standard enemy | Idle/patrol (4), attack/wind-up (3), hurt (1), death (4)                                       |
| Boss           | Idle/emerge (6), bite (6), spit (5), charge (6), stunned (4), death (10), phase transition (4) |
| UI             | Button states, achievement toast, skin preview idle                                            |

### 13.3 Audio

- Chiptune-adjacent music with a dark, adventurous tone.
- Tracks: title, mine levels (one looping track with light variation), boss, results. Four tracks is the v1 target.
- SFX: jump, land, throw, rock bounce, knife throw, gunshot, magic cast, hit, enemy hurt, enemy death, player hurt, pickup, crate break, elevator, boss roar, rumble, phase transition, victory.
- Audio buses: master, music, SFX.
- Browser audio must unlock on the first user interaction (title click/key press).
- Placeholder assets during development must be CC0 or original. Final assets require a license inventory.
- No copyrighted music, sprites, or sound effects. The referenced games are inspiration only.

### 13.4 Narrative presentation

- A short intro crawl establishes the mine, the missing crew, and the worm.
- Environmental storytelling through abandoned equipment, rails, warning signs, and bones.
- A short ending panel after the boss. No dialogue trees, cutscene system, or voice acting in v1.
- Tone: ominous but playful; the miner is stubborn rather than heroic.

---

## 14. Design constraints and fairness rules

1. **Rock always works.** Every standard enemy and the boss can be defeated with rocks.
2. **No item gates.** Progression never requires a secondary item.
3. **No mandatory kills outside Crazy.** Pacifist routes must exist.
4. **No unavoidable damage.** Every threat has a tell and a response.
5. **Determinism.** Authored spawns and item contents; no random loot in v1.
6. **Fast retry.** Death to playable again in under 3 seconds.
7. **Readable state.** The player always knows HP, item ammo, exit status, and boss phase.
8. **Fair Crazy.** All enemies reachable; exit lock visible; enemy counter accurate.
9. **Strict run tracking.** Rules are enforced by events, not by the honor system; the results screen explains failures.
10. **No pay-to-win or cosmetic power.** Skins are purely visual.

---

## 15. Balance and tuning targets

| Metric                        | Target                        |
| ----------------------------- | ----------------------------- |
| Normal full run               | 15–25 minutes                 |
| Level length                  | 2–4 minutes                   |
| Boss fight, Normal            | 2–4 minutes                   |
| Boss fight, Crazy             | 5–8 minutes                   |
| Player death-to-retry         | Under 3 seconds               |
| Time to understand rock throw | Under 30 seconds              |
| Time to first enemy kill      | Under 60 seconds              |
| Max active enemies            | 8                             |
| Max active projectiles        | 40                            |
| Frame rate                    | 60 FPS on integrated graphics |
| Initial load                  | Under 3 seconds on broadband  |
| Save size                     | Under 100 KB                  |

The balance pass in M7 prioritizes feel over exact numbers. The values in this document are starting points, not commitments.

---

## 16. Content summary for v1

| Content             |                  Count |
| ------------------- | ---------------------: |
| Standard levels     |                      4 |
| Boss arenas         |                      1 |
| Standard enemies    |          6 (minimum 5) |
| Secondary weapons   |                      3 |
| Utility pickups     | 2 (healing salve, ore) |
| Difficulties        |                      4 |
| Challenge runs      | 3 + triple combination |
| Achievements        |                     12 |
| Skins               |                      9 |
| Music tracks        |                      4 |
| Internal resolution |                480×270 |

---

## 17. Out of scope for v1

- Procedural level generation.
- Additional biomes beyond the mine.
- Co-op or multiplayer.
- Mobile and touch controls.
- Online accounts, cloud saves, or leaderboards.
- Level editor or user-generated content.
- Melee combat, dodge roll, or stomp attacks.
- Destructible terrain.
- Multiple playable characters with different stats.
- Localization beyond English (the text layer is i18n-ready).
- Desktop packaging (Tauri/Electron) — possible later.
- Steam/itch.io store integration.

## 18. Stretch backlog

- Procedural "endless mine" mode using handcrafted room chunks.
- Daily challenge seed and local leaderboard.
- Speedrun timer, split tracking, and ghost replay.
- Gamepad support with remapping.
- Additional boss or boss rush.
- New biome: flooded lower mines or crystal caverns.
- More skins and palette variants.
- Spanish localization and other languages.
- Desktop build via Tauri.
- Photo mode or replay export.
- Steam achievements/cloud saves if the game moves beyond the browser.

## 19. Open questions and assumptions

1. **"Five lives" meaning.** Resolved in M3: five means 5 HP/hearts, not 5 retries. Death restarts the current level with full HP.
2. **Scope.** Four standard levels plus one boss is the v1 target. Confirm this is enough content.
3. **Boss HP scaling.** Resolved in M4: the boss has 48 base HP and a separate 1/1.5/2/2.5 difficulty curve, producing 48/72/96/120. Normal pacing was checked at 2:01 with a scripted rock-only bot; Crazy still needs a separate timing pass in M7.
4. **Game language.** Game UI is English for v1, while docs/code are English. Spanish UI can be added later. Confirm.
5. **Art and audio sourcing.** Custom, commissioned, or licensed placeholder assets? This affects the M6 estimate significantly.
6. **License.** The repository license and asset licenses are undecided. Choose before public release.
7. **Difficulty unlocks.** Resolved in M5: all modes are available from the start for accessibility and challenge, with a recommended Normal pick and warnings for Impossible and Crazy.
8. **Mid-run save.** Not planned for v1. A browser refresh ends the run. Confirm this is acceptable.

---

## 20. Revision history

| Version | Date       | Notes                                                                                        |
| ------- | ---------- | -------------------------------------------------------------------------------------------- |
| 0.2     | 2026-10-24 | M5: difficulty select, challenge badges, achievements, skins, Results reporting, and save v1 |
| 0.1     | 2026-10-19 | Initial design document based on the project brief                                           |
