# Level maps

Hand-authored JSON levels are served from this directory and validated by
`src/data/level-definition.ts` before play. Run order and display metadata live in
`src/data/level-registry.ts`.

The four Normal-mode levels are:

1. `shaft-entrance.json` — Shaft Entrance
2. `goblin-tunnels.json` — Goblin Tunnels
3. `crystal-caverns.json` — Crystal Caverns
4. `deep-vein.json` — The Deep Vein

Every level requires a player `spawn`, at least one enemy, and one `exit` rectangle.
The exit is the elevator interaction zone at the end of the level.

Props are authored objects:

```json
{ "type": "lantern", "x": 96, "y": 224 },
{ "type": "crystal", "x": 150, "y": 320 },
{ "type": "crate", "x": 520, "y": 280, "contents": "ore" },
{ "type": "pedestal", "x": 400, "y": 280, "item": "knife" }
```

Crate contents and pedestal items use the IDs from `src/data/items.ts`:
`knife`, `flintlock`, `rune-scroll`, `healing-salve`, and `ore`.
Crates are broken by any player projectile. Pedestals require the interact key (`E`).
Crystals are non-colliding decoration for the cavern levels.

Development builds also accept `?level=<id>` and `?spawn=exit` for map and exit checks.
`spawn=exit` places the miner at the level exit once on the initial level start.
