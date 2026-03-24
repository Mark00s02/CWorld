# Drop your 3D model files here (.glb recommended)

## Recommended free sources:
- https://itch.io/game-assets/free/tag-low-poly
- https://quaternius.com (amazing free low-poly packs)
- https://kenney.nl/assets
- https://sketchfab.com (search "low poly", filter free, download as GLB)

## File naming (to match ASSET_CONFIG defaults):
- character.glb      ← player (village side)
- wild_character.glb ← player (wild side)
- farmer.glb
- guard.glb
- carpenter.glb
- fisherman.glb
- hunter.glb
- child.glb
- cow.glb
- sheep.glb
- chicken.glb
- wolf.glb
- bear.glb
- zombie.glb
- skeleton.glb

## Scale guide:
The game world uses cells of 4 units wide.
A typical character should be ~2 units tall.
If your model is huge, set playerScale: 0.01 in ASSET_CONFIG.
If tiny, set playerScale: 10.
