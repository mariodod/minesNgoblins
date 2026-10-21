# M2 combat and items playtest

Date: 2026-10-21  
Build: M2.2 working tree (Normal difficulty only; version bumps to `0.2.0` in M2.3)

## Automated checks

- `npm run format`, `npm run lint`, and `npm run typecheck` pass.
- `npm test`: 57 unit tests pass.
- `npm run test:e2e`: 5 Playwright tests pass.
- `npm run build`: production bundle succeeds.

## M2.1 enemy and hazard checks

- All four standard enemies can be defeated with rocks alone.
- Bat, Goblin, Skeleton, and Beetle telegraph their dangerous actions and remain avoidable.
- The Beetle deflects rocks from the front and takes damage from behind.
- Skeleton bones follow the intended arc, hit the player's torso, and deal one damage without removing the player body.
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

## Known limitations

- Only Normal difficulty is wired into the level scene. Difficulty selection, HP caps, and enemy scaling presentation arrive in M2.3.
- The HUD reserves five heart slots; lower-HP difficulties will need a dynamic layout.
- Art and SFX remain placeholders.
- Pause, exits, and run tracking are not part of M2.

## Next

M2.3 will add feedback polish, difficulty integration, final item/enemy tuning, and the `0.2.0` version bump.
