# 🌿 Cosy World 3D — Folder Project

## Project Structure

```
cosy_world/
├── index.html          ← Open this in your browser
├── style.css           ← All game styles
├── game.js             ← All game logic + asset loader
├── README.md           ← This file
├── server.py           ← Local dev server (Python)
└── assets/
    ├── models/         ← Drop .glb / .gltf / .fbx models here
    │   ├── character.glb
    │   ├── farmer.glb
    │   ├── cow.glb
    │   └── ...
    ├── textures/       ← Drop .png / .jpg textures here
    │   ├── grass.png
    │   ├── water.png
    │   └── ...
    └── sounds/         ← Drop .mp3 / .ogg sounds here
        ├── day_ambient.mp3
        └── ...
```

---

## ⚠️ IMPORTANT: You MUST use a local server

Browsers block loading local files from HTML for security.
You can't just double-click `index.html` — models won't load.

**Option A — Python (easiest, built-in):**
```bash
cd cosy_world
python -m http.server 8080
# Then open: http://localhost:8080
```

**Option B — VS Code:**
Install the "Live Server" extension → right-click `index.html` → "Open with Live Server"

**Option C — Node.js:**
```bash
npx serve .
```

---

## 🎨 Adding Custom Assets from itch.io

### Step 1 — Find assets
Good free sources:
- https://itch.io/game-assets/free/tag-low-poly
- https://quaternius.com (free low-poly packs)
- https://kenney.nl/assets (free game assets)
- https://sketchfab.com (free 3D models, download as GLB)

Look for **GLB** or **GLTF** format — it's the best for Three.js.
FBX also works. Avoid OBJ (no animations).

### Step 2 — Drop files into assets/models/
```
assets/models/character.glb
assets/models/cow.glb
assets/models/wolf.glb
```

### Step 3 — Edit ASSET_CONFIG in game.js
Open `game.js` and find `const ASSET_CONFIG = {` near the top:

```js
const ASSET_CONFIG = {
  // Uncomment and set your model paths:
  playerModel:    'assets/models/character.glb',
  playerScale:    1.2,    // adjust if too big/small
  playerYOffset:  0,      // adjust if floating or underground

  cowModel:       'assets/models/cow.glb',
  wolfModel:      'assets/models/wolf.glb',
  sheepModel:     'assets/models/sheep.glb',

  grassTexture:   'assets/textures/grass.png',
  // etc...
};
```

### Step 4 — Adjust scale if needed
Most itch.io models are different sizes. Use `playerScale` to fix:
```js
playerScale: 0.5,   // model was too big → shrink to half
playerScale: 2.0,   // model was too small → double it
playerYOffset: -0.2 // model sinks into ground → lift it up
```

---

## 🎭 Swapping a specific entity mid-game
You can swap any entity's model from the browser console:
```js
// Swap the player's character
loadModel('assets/models/new_character.glb', (model) => {
  charGroup.remove(charMesh);
  model.scale.setScalar(1.2);
  charMesh = model;
  charGroup.add(model);
});

// Swap a specific NPC
const farmer = entities.find(e => e.role === 'farmer');
swapEntityModel(farmer, 'assets/models/farmer.glb', 1.0, 0);
```

---

## 🎵 Adding Custom Sounds
Drop `.mp3` or `.ogg` files into `assets/sounds/`, then in `game.js` find
`ASSET_CONFIG` and uncomment the sound lines:
```js
bgmDay:   'assets/sounds/peaceful_morning.mp3',
bgmNight: 'assets/sounds/night_crickets.mp3',
sfxChop:  'assets/sounds/axe_chop.mp3',
```

---

## 🖼️ Adding Textures
Drop `.png` files into `assets/textures/`. Ideal size: 512×512 or 1024×1024.
```js
grassTexture: 'assets/textures/grass_tile.png',
waterTexture: 'assets/textures/water_tile.png',
sandTexture:  'assets/textures/sand_tile.png',
snowTexture:  'assets/textures/snow_tile.png',
woodTexture:  'assets/textures/wood_plank.png',
stoneTexture: 'assets/textures/stone_tile.png',
```

---

## 🔧 Controls Reference
| Key | Action |
|-----|--------|
| W/S | Forward / Backward |
| A/D | Strafe Left / Right |
| Shift | Sprint |
| Space | Jump |
| Mouse | Look around |
| Left Click | Eat / Pick / Chop (hold on tree) / Toggle lantern |
| Right Click | Attack with weapon / Gather stone/sparkstone |
| F | Interact: NPC, animals, chest, fish, mushroom, fireflies |
| B / I | Open bag / inventory |
| Tab | Cycle hotbar slots |
| Esc | Pause menu |
| 💾 Save | Saves to browser localStorage |

---

## 🐛 Troubleshooting
**Model doesn't appear?**
- Make sure you're using a local server (not file://)
- Check the browser console (F12) for errors
- Verify the path in ASSET_CONFIG matches the actual file name (case-sensitive!)

**Model is invisible / wrong color?**
- The model may have no material — set `playerScale` and check in console

**Model is huge / tiny?**
- Adjust `playerScale` in ASSET_CONFIG

**Model is floating / underground?**
- Adjust `playerYOffset` (positive = up, negative = down)

**Animations not playing?**
- GLB files from itch.io often include animations. Check `gltf.animations` in the browser console.
- The current game uses procedural animation. GLB animations need an AnimationMixer — ask me to add that!
