# M2 combat and items playtest

Date: 2026-10-21  
Build: `0.2.0` (M2 complete)

## Automated checks

- `npm run format`, `npm run lint`, and `npm run typecheck` pass.
- `npm test`: 60 unit tests pass.
- `npm run test:e2e`: 9 Playwright tests pass, including Hard, Impossible, and Crazy scaling.
- `npm run build`: production bundle succeeds.

## M2.1 enemy and hazard checks

- All four standard enemies can be defeated with rocks alone.
- Bat, Goblin, Skeleton, and Beetle telegraph their dangerous actions and remain avoidable.
- The Beetle deflects rocks from the front and takes damage from behind.
- Skeleton bones follow the intended arc, hit the player's torso, and deal scaled damage without removing the player body.
- Spikes and falling rocks damage the player and grant invulnerability frames.

## M2.2 item checks

- A pedestal item is collected with `E`, shows its icon and ammo in the HUD, and disappears after collection.
- Knife throws consume ammo, travel straight, and break crates.
- A rock also breaks a crate, so crates cannot soft-lock a player without a secondary weapon.
- Crates release authored ore and healing-salve pickups; collecting them updates the ore counter and hearts.
- The Flintlock hits a practice dummy for two damage and consumes one use.
- The Rune Scroll replaces the current item, damages enemies in a small blast, and clears the slot at zero uses.
- The HUD immediately reflects item replacement, remaining uses, ore, and healing.
- No browser console or page errors occurred during the checks.

## M2.3 difficulty and feedback checks

- Normal remains the default: 5 player HP, 3 dummy HP, 1× enemy HP, and 1× enemy damage.
- Hard: 5 player HP and 6 dummy HP. A bat contact hit reduced player HP from 5 to 3, confirming 2× damage.
- Impossible: 4 player HP and 9 dummy HP. The HUD showed four hearts and the `[IMPOSSIBLE]` label.
- Crazy: 1 player HP and 15 dummy HP. The HUD showed one heart and the `[CRAZY]` label.
- Dying on Crazy restarted the level with 1 HP and kept Crazy selected.
- The heart row, ammo position, item slot, and ore counter all reposition from the player's maximum HP, so 1- and 4-heart layouts remain readable.
- Applying an enemy hit now triggers the 45 ms hit-stop. Player damage also triggers hit-stop, a red impact burst, knockback, a screen shake, and the HUD damage flash.
- The development-only `?difficulty=normal|hard|impossible|crazy` query supported manual checks; invalid values fall back to Normal.

## Known limitations

- The difficulty selection screen and run-rule enforcement (Crazy kill requirements, Pacifist restrictions) arrive with M5.
- The HUD label is the only in-game difficulty explanation; the future select screen will carry the full rules.
- Art and SFX remain placeholders.
- Pause, exits, and run tracking are not part of M2.

## Next

M3 starts the four-level Normal-mode run: level data, transitions, exits, RunService, pause, game over/retry, and a boss placeholder.
