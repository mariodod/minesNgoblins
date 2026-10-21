# Level maps

Hand-authored JSON levels are served from this directory and validated by `src/data/level-definition.ts` before play.

Props are authored objects:

```json
{ "type": "lantern", "x": 96, "y": 224 },
{ "type": "crate", "x": 520, "y": 280, "contents": "ore" },
{ "type": "pedestal", "x": 400, "y": 280, "item": "knife" }
```

Crate contents and pedestal items use the IDs from `src/data/items.ts`:
`knife`, `flintlock`, `rune-scroll`, `healing-salve`, and `ore`.
Crates are broken by any player projectile. Pedestals require the interact key (`E`).
