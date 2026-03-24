'use strict';
// ═══════════════════════════════════════════════════════════════════════
//  🌿 COSY WORLD 3D — game.js
//  Folder project version — drop assets into /assets/ and reference below
// ═══════════════════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────────────────────
//  ASSET CONFIGURATION
//  Put your downloaded models/textures here and uncomment the lines.
//  Get free assets from: https://itch.io/game-assets/free
//                        https://quaternius.com
//                        https://kenney.nl
//
//  Supported formats: .glb, .gltf (best), .fbx, .obj
// ──────────────────────────────────────────────────────────────────────
const ASSET_CONFIG = {
  // ── CHARACTER MODELS ────────────────────────────────────────────────
  // Drop your .glb file into assets/models/ then set the path here.
  // The game will auto-swap it for the procedural character.
  playerModel: 'assets/models/Character.glb',
  playerScale: 1.2,   // scale the model up/down to fit
  playerYOffset:  0,     // vertical offset if model floats or sinks

  npcFarmerModel:  null,  // 'assets/models/farmer.glb'
  npcGuardModel:   'assets/models/guard.glb',  // 'assets/models/guard.glb'
  npcChildModel:   null,  // 'assets/models/child.glb'
  npcFisherModel:  null,  // 'assets/models/fisherman.glb'
  npcCarpModel:    null,  // 'assets/models/carpenter.glb'
  npcHunterModel:  null,  // 'assets/models/hunter.glb'
  wildCharModel:   null,  // 'assets/models/wild_character.glb'

  // ── ANIMAL MODELS ───────────────────────────────────────────────────
  cowModel:        null,  // 'assets/models/cow.glb'
  sheepModel:      null,  // 'assets/models/sheep.glb'
  chickenModel:    null,  // 'assets/models/chicken.glb'
  wolfModel:       null,  // 'assets/models/wolf.glb'
  bearModel:       null,  // 'assets/models/bear.glb'
  zombieModel:     null,  // 'assets/models/zombie.glb'
  skeletonModel:   null,  // 'assets/models/skeleton.glb'

  // ── TEXTURES ────────────────────────────────────────────────────────
  grassTexture:    null,  // 'assets/textures/grass.png'
  waterTexture:    null,  // 'assets/textures/water.png'
  sandTexture:     null,  // 'assets/textures/sand.png'
  snowTexture:     null,  // 'assets/textures/snow.png'
  woodTexture:     null,  // 'assets/textures/wood.png'
  stoneTexture:    null,  // 'assets/textures/stone.png'

  // ── SOUNDS ──────────────────────────────────────────────────────────
  // Drop .mp3 or .ogg files into assets/sounds/
  // bgmDay:   'assets/sounds/day_ambient.mp3',
  // bgmNight: 'assets/sounds/night_ambient.mp3',
  // sfxChop:  'assets/sounds/chop.mp3',
  // sfxSplash:'assets/sounds/splash.mp3',
};

// ──────────────────────────────────────────────────────────────────────
//  ASSET LOADER ENGINE
//  Handles GLB/GLTF/FBX loading with fallback to procedural geometry.
//  You don't need to touch this — just fill in ASSET_CONFIG above.
// ──────────────────────────────────────────────────────────────────────
const _assetCache = {};
const _gltfLoader = window.THREE && window.THREE.GLTFLoader
  ? new THREE.GLTFLoader()
  : null;

function loadModel(path, onLoad, onError) {
  if (!path) { onError && onError('no path'); return; }
  if (_assetCache[path]) { onLoad(_assetCache[path].clone()); return; }
  if (!_gltfLoader) { onError && onError('no loader'); return; }
  _gltfLoader.load(
    path,
    (gltf) => {
      const model = gltf.scene;
      model.traverse(c => {
        if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; }
      });
      _assetCache[path] = model;
      onLoad(model.clone());
    },
    undefined,
    (err) => { console.warn('Model load failed:', path, err); onError && onError(err); }
  );
}

// Texture loader with fallback
const _texLoader = new THREE.TextureLoader();
const _texCache = {};
function loadTexture(path) {
  if (!path) return null;
  if (_texCache[path]) return _texCache[path];
  const tex = _texLoader.load(path);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  _texCache[path] = tex;
  return tex;
}

// Audio loader (for custom sounds)
const _audioContext = null;
function loadSound(path, callback) {
  if (!path) return;
  fetch(path)
    .then(r => r.arrayBuffer())
    .then(buf => {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      ctx.decodeAudioData(buf, decoded => callback(decoded, ctx));
    })
    .catch(e => console.warn('Sound load failed:', path, e));
}

// ──────────────────────────────────────────────────────────────────────
//  MODEL SWAP HELPER
//  Call this to replace a procedural mesh with your custom model.
//  Usage: swapEntityModel(entity, 'assets/models/cow.glb', 1.2, 0)
// ──────────────────────────────────────────────────────────────────────
function swapEntityModel(ent, modelPath, scale=1, yOffset=0) {
  if (!modelPath) return;
  loadModel(modelPath,
    (model) => {
      // Copy position/rotation from old mesh
      model.position.copy(ent.mesh.position);
      model.rotation.copy(ent.mesh.rotation);
      model.scale.setScalar(scale);
      model.position.y += yOffset;
      // Replace in scene
      scene.remove(ent.mesh);
      ent.mesh = model;
      scene.add(model);
      // Re-attach health bar
      if (ent.hb) { model.add(ent.hb.hbm); }
    },
    () => console.log('Keeping procedural mesh for', ent.type)
  );
}

// Apply configured models to all entities after spawn
function applyAssetConfig() {
  // Player
  if (ASSET_CONFIG.playerModel) {
    loadModel(ASSET_CONFIG.playerModel, (model) => {
      charGroup.remove(charMesh);
      model.scale.setScalar(ASSET_CONFIG.playerScale);
      model.position.y = ASSET_CONFIG.playerYOffset;
      charMesh = model;
      charGroup.add(charMesh);
    });
  }

  // Entities
  const roleMap = {
    farmer:    ASSET_CONFIG.npcFarmerModel,
    guard:     ASSET_CONFIG.npcGuardModel,
    child:     ASSET_CONFIG.npcChildModel,
    fisherman: ASSET_CONFIG.npcFisherModel,
    carpenter: ASSET_CONFIG.npcCarpModel,
    hunter:    ASSET_CONFIG.npcHunterModel,
    cow:       ASSET_CONFIG.cowModel,
    sheep:     ASSET_CONFIG.sheepModel,
    chicken:   ASSET_CONFIG.chickenModel,
    wolf:      ASSET_CONFIG.wolfModel,
    bear:      ASSET_CONFIG.bearModel,
    zombie:    ASSET_CONFIG.zombieModel,
    skeleton:  ASSET_CONFIG.skeletonModel,
  };
  for (const ent of entities) {
    const path = roleMap[ent.role] || roleMap[ent.type];
    if (path) swapEntityModel(ent, path);
  }

  // Textures on tiles
  const texMap = {
    grass: ASSET_CONFIG.grassTexture, water: ASSET_CONFIG.waterTexture,
    sand:  ASSET_CONFIG.sandTexture,  snow:  ASSET_CONFIG.snowTexture,
  };
  for (const [type, texPath] of Object.entries(texMap)) {
    if (!texPath) continue;
    const tex = loadTexture(texPath);
    if (!tex) continue;
    tex.repeat.set(1, 1);
    for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) {
      if (worldGrid[r][c] === type && tileObjs[r][c]) {
        tileObjs[r][c].traverse(child => {
          if (child.isMesh && child.material && child.material[2]) {
            child.material[2] = new THREE.MeshLambertMaterial({ map: tex });
          }
        });
      }
    }
  }
}

// ═══════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════
const GRID=24, CELL=4, BASE_H=0.4, ELEV_STEP=1.2;
// Open world: global tile coordinates
let worldOffX=0, worldOffZ=0; // current world offset in grid cells
// Simple deterministic noise for terrain generation
function worldNoise(gx,gz){
  // Mix integer coordinates into a float 0..1
  let h=(gx*374761393+gz*668265263)&0x7fffffff;
  h=(h^(h>>13))*1274126177&0x7fffffff;
  h=(h^(h>>16));
  return (h&0x7fffffff)/0x7fffffff;
}
// Persistent world cache — remembers every tile ever placed/generated
const worldCache={};
function worldCacheKey(gx,gz){return gx+'|'+gz;}
function setWorldCache(gx,gz,tile){worldCache[worldCacheKey(gx,gz)]=tile;}
function getWorldCache(gx,gz){return worldCache[worldCacheKey(gx,gz)];}

function generateTile(gx,gz){
  const n=worldNoise(gx,gz);
  const n2=worldNoise(gx*3+7,gz*5+11);
  const n3=worldNoise(gx+gz*13,gz-gx*7);
  if(n<0.08) return 'water';
  if(n<0.12) return 'sand';
  if(n>0.92) return 'snow';
  if(n>0.72&&n2>0.6) return 'tree';
  if(n>0.55&&n2<0.3) return 'flower';
  if(n>0.65&&n2>0.75&&n3<0.3) return 'mushroom';
  if(n2>0.92&&n3>0.5) return 'path';
  return 'grass';
}
function getWorldTile(gx,gz){
  const cached=getWorldCache(gx,gz);
  if(cached) return cached;
  const t=generateTile(gx,gz);
  setWorldCache(gx,gz,t);
  return t;
}
const DAY_DURATION=120; // seconds for full day/night cycle
const HALF_WORLD=(GRID*CELL)/2-CELL;

// ── Renderer ──────────────────────────────────────
const renderer=new THREE.WebGLRenderer({canvas:document.getElementById('c'),antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.1;
window.addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();});

// ── Scene ─────────────────────────────────────────
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x87ceeb);
scene.fog=new THREE.Fog(0x87ceeb,40,130);

// ── Camera ────────────────────────────────────────
const camera=new THREE.PerspectiveCamera(68,innerWidth/innerHeight,0.1,200);
let camYaw=0, camPitch=-0.3;
const _camPos=new THREE.Vector3(), _camLook=new THREE.Vector3();

// ── Lighting ──────────────────────────────────────
const ambLight=new THREE.AmbientLight(0xffeedd,0.55); scene.add(ambLight);
const sun=new THREE.DirectionalLight(0xfff5e0,1.4);
sun.position.set(30,50,20); sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);
sun.shadow.camera.near=1; sun.shadow.camera.far=200;
sun.shadow.camera.left=sun.shadow.camera.bottom=-60;
sun.shadow.camera.right=sun.shadow.camera.top=60;
sun.shadow.bias=-0.001;
scene.add(sun);
const fillLight=new THREE.DirectionalLight(0xaaddff,0.3);
fillLight.position.set(-20,10,-10); scene.add(fillLight);

// ── Sky dome ──────────────────────────────────────
const skyMat=new THREE.ShaderMaterial({
  side:THREE.BackSide,
  uniforms:{uTop:{value:new THREE.Color(0x1a6fa8)},uBot:{value:new THREE.Color(0x87ceeb)}},
  vertexShader:`varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`uniform vec3 uTop,uBot;varying vec3 vP;void main(){float t=clamp((vP.y+40.)/180.,0.,1.);gl_FragColor=vec4(mix(uBot,uTop,t),1.);}`
});
scene.add(new THREE.Mesh(new THREE.SphereGeometry(150,16,16),skyMat));

// ── Clouds ────────────────────────────────────────
const cloudGroup=new THREE.Group(); scene.add(cloudGroup);
for(let i=0;i<14;i++){
  const g=new THREE.Group();
  for(let j=0;j<5;j++){
    const m=new THREE.Mesh(new THREE.SphereGeometry(1.8+Math.random()*2,7,7),new THREE.MeshLambertMaterial({color:0xffffff,transparent:true,opacity:0.86}));
    m.position.set(j*2.2-4+Math.random()*2,Math.random(),Math.random());g.add(m);
  }
  g.position.set((Math.random()-.5)*160,28+Math.random()*12,(Math.random()-.5)*160);
  cloudGroup.add(g);
}

// ── Ground ────────────────────────────────────────
const gplane=new THREE.Mesh(new THREE.PlaneGeometry(GRID*CELL+20,GRID*CELL+20),new THREE.MeshLambertMaterial({color:0x2d4a3e}));
gplane.rotation.x=-Math.PI/2; gplane.position.y=-0.05; gplane.receiveShadow=true; scene.add(gplane);

// ── Materials ─────────────────────────────────────
const _mc={};
function mF(c){if(!_mc[c])_mc[c]=new THREE.MeshLambertMaterial({color:c});return _mc[c];}
function mS(c,opts={}){return new THREE.MeshStandardMaterial({color:c,roughness:0.85,metalness:0,...opts});}

// ═══════════════════════════════════════════════════
//  WORLD GRID
// ═══════════════════════════════════════════════════
const TILE_COLORS={
  grass:{top:0x52b788,side:0x2d6a4f},flower:{top:0x74c69d,side:0x2d6a4f},
  tree:{top:0x1b4332,side:0x2d6a4f},water:{top:0x4cc9f0,side:0x1d6a8a},
  sand:{top:0xd4b483,side:0xb08050},  /* warm sandy tan */snow:{top:0xe8f4f8,side:0x8090a0},
  path:{top:0xadb5bd,side:0x606870},house:{top:0xff6b6b,side:0x8b3a3a},
  barn:{top:0xd4720a,side:0x8b4513},fence:{top:0xc8a878,side:0x9a7040},
  mushroom:{top:0x9d4edd,side:0x4a2060},campfire:{top:0xe76f51,side:0x8b3a1a},
  lantern:{top:0xffd166,side:0x806020},chest:{top:0xe9c46a,side:0x806020},
};
const SCORES={house:10,barn:8,fence:2,chest:8,campfire:5,tree:2,flower:1,grass:0.2,water:1,sand:0.5,snow:1,path:0.3,lantern:4,mushroom:3};

let worldGrid=Array.from({length:GRID},()=>Array(GRID).fill('grass'));
let elevGrid =Array.from({length:GRID},()=>Array(GRID).fill(0));
// track tree density per cell (for forest detection)
let treeGrid  =Array.from({length:GRID},()=>Array(GRID).fill(false));
const tileObjs=Array.from({length:GRID},()=>Array(GRID).fill(null));

function wX(c){return(c-GRID/2)*CELL+CELL/2;}
function wZ(r){return(r-GRID/2)*CELL+CELL/2;}
function cellOf(wx,wz){return{col:Math.floor((wx+GRID*CELL/2)/CELL),row:Math.floor((wz+GRID*CELL/2)/CELL)};}
function inGrid(r,c){return r>=0&&r<GRID&&c>=0&&c<GRID;}

function isForest(r,c){
  let count=0;
  for(let dr=-2;dr<=2;dr++) for(let dc=-2;dc<=2;dc++){
    if(inGrid(r+dr,c+dc)&&treeGrid[r+dr][c+dc]) count++;
  }
  return count>=5;
}

function buildTileMesh(type){
  const C=TILE_COLORS[type]||TILE_COLORS.grass;
  const g=new THREE.Group();
  const block=new THREE.Mesh(new THREE.BoxGeometry(CELL-.12,BASE_H,CELL-.12),[
    mF(C.side),mF(C.side),mF(C.top),mF(C.side),mF(C.side),mF(C.side)
  ]);
  block.position.y=BASE_H/2; block.castShadow=true; block.receiveShadow=true; g.add(block);
  const h=BASE_H;
  switch(type){
    case 'flower':{
      const fc=[0xff6b9d,0xffd166,0xff6b6b,0x74c69d];
      for(let i=0;i<3;i++){
        const st=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,.55,5),mF(0x52b788));
        st.position.set((Math.random()-.5)*1.2,h+.27,(Math.random()-.5)*1.2);
        const hd=new THREE.Mesh(new THREE.SphereGeometry(.22,6,6),mF(fc[i%fc.length]));
        hd.position.copy(st.position); hd.position.y+=.3; g.add(st); g.add(hd);
      }
      break;
    }
    case 'tree':{
      const tr=new THREE.Mesh(new THREE.CylinderGeometry(.22,.32,1.6,7),mF(0x7a4f2e));
      tr.position.y=h+.8; tr.castShadow=true; g.add(tr);
      [[1.6,2.2],[1.2,1.7],[.75,1.2]].forEach(([r,y],i)=>{
        const cn=new THREE.Mesh(new THREE.ConeGeometry(r,1.2,8),mF([0x1b4332,0x2d6a4f,0x52b788][i]));
        cn.position.y=h+y+.6; cn.castShadow=true; g.add(cn);
      });
      break;
    }
    case 'house':{
      const w=new THREE.Mesh(new THREE.BoxGeometry(CELL*.82,1.4,CELL*.82),mF(0xfdebd0));
      w.position.y=h+.7; w.castShadow=true; g.add(w);
      const rf=new THREE.Mesh(new THREE.ConeGeometry(CELL*.67,1.1,4),mF(0xc0392b));
      rf.position.y=h+1.95; rf.rotation.y=Math.PI/4; rf.castShadow=true; g.add(rf);
      const dr=new THREE.Mesh(new THREE.BoxGeometry(.55,.85,.1),mF(0x7a4f2e));
      dr.position.set(0,h+.42,CELL*.41); g.add(dr);
      [-.8,.8].forEach(x=>{const wn=new THREE.Mesh(new THREE.BoxGeometry(.45,.45,.1),mS(0x87ceeb,{roughness:.2,metalness:.1,transparent:true,opacity:.7}));wn.position.set(x,h+.78,CELL*.41);g.add(wn);});
      break;
    }
    case 'barn':{
      const w=new THREE.Mesh(new THREE.BoxGeometry(CELL*.9,1.6,CELL*.9),mF(0x8b4513));
      w.position.y=h+.8; w.castShadow=true; g.add(w);
      const rf=new THREE.Mesh(new THREE.BoxGeometry(CELL*.95,.6,CELL*.95),mF(0xd4720a));
      rf.position.y=h+1.9; rf.castShadow=true; g.add(rf);
      break;
    }
    case 'fence':{
      // Corner post
      const post=new THREE.Mesh(new THREE.BoxGeometry(.2,.75,.2),mF(0xc8a878));
      post.position.y=h+.37; g.add(post);
      // Two rails running full cell width along X
      [0,1].forEach(i=>{
        const rx=new THREE.Mesh(new THREE.BoxGeometry(CELL+.05,.09,.09),mF(0xd4b896));
        rx.position.set(0,h+.22+i*.27,0); g.add(rx);
        // Rail along Z so fences look right on side columns too
        const rz=new THREE.Mesh(new THREE.BoxGeometry(.09,.09,CELL+.05),mF(0xd4b896));
        rz.position.set(0,h+.22+i*.27,0); g.add(rz);
      });
      // End posts at cell edges (give it a proper picket look)
      [CELL/2-.1,-CELL/2+.1].forEach(ox=>{
        [CELL/2-.1,-CELL/2+.1].forEach(oz=>{
          const ep=new THREE.Mesh(new THREE.BoxGeometry(.14,.6,.14),mF(0xc8a878));
          ep.position.set(ox,h+.3,oz); g.add(ep);
        });
      });
      break;
    }
    case 'campfire':{
      [0,1].forEach(i=>{const lg=new THREE.Mesh(new THREE.CylinderGeometry(.1,.12,1.2,6),mF(0x7a4f2e));lg.rotation.z=Math.PI/2;lg.rotation.y=i*Math.PI/2;lg.position.y=h+.12;g.add(lg);});
      const fl=new THREE.Mesh(new THREE.ConeGeometry(.22,.7,6),new THREE.MeshBasicMaterial({color:0xff6b35}));fl.position.y=h+.5;fl.name='flame';g.add(fl);
      const fl2=new THREE.Mesh(new THREE.ConeGeometry(.14,.5,5),new THREE.MeshBasicMaterial({color:0xffd166}));fl2.position.y=h+.62;fl2.name='flame2';g.add(fl2);
      // Persistent point light — built once, animated later
      const cfl=new THREE.PointLight(0xff7733,2.5,8);cfl.position.y=h+.7;cfl.name='campfireLight';g.add(cfl);
      break;
    }
    case 'lantern':{
      const pl=new THREE.Mesh(new THREE.CylinderGeometry(.06,.08,1.3,6),mF(0x555555));pl.position.y=h+.65;g.add(pl);
      const bx=new THREE.Mesh(new THREE.BoxGeometry(.4,.45,.4),new THREE.MeshStandardMaterial({color:0xffd166,roughness:.3,emissive:new THREE.Color(0xffd166),emissiveIntensity:1.2,transparent:true,opacity:.9}));bx.position.y=h+1.3;bx.name='lanternBox';g.add(bx);
      const pt=new THREE.PointLight(0xffdd88,3.5,20);pt.position.y=h+1.35;pt.name='lanternLight';g.add(pt);
      break;
    }
    case 'mushroom':{
      const st=new THREE.Mesh(new THREE.CylinderGeometry(.2,.28,.65,8),mF(0xfdebd0));st.position.y=h+.32;g.add(st);
      const cp=new THREE.Mesh(new THREE.SphereGeometry(.65,10,10,0,Math.PI*2,0,Math.PI/2),mF(0x9d4edd));cp.position.y=h+.7;g.add(cp);
      for(let i=0;i<4;i++){const sp=new THREE.Mesh(new THREE.SphereGeometry(.09,5,5),mF(0xffffff));const a=i*Math.PI/2+.3;sp.position.set(Math.cos(a)*.4,h+.85,Math.sin(a)*.4);g.add(sp);}
      break;
    }
    case 'chest':{
      const bd=new THREE.Mesh(new THREE.BoxGeometry(CELL*.55,.45,CELL*.45),mF(0x9a6b2e));bd.position.y=h+.22;g.add(bd);
      const ld=new THREE.Mesh(new THREE.BoxGeometry(CELL*.55,.22,CELL*.45),mF(0xb8850d));ld.position.y=h+.55;g.add(ld);
      break;
    }
    case 'water':{block.material[2]=mS(0x4cc9f0,{roughness:.05,metalness:.1,transparent:true,opacity:.82,name:'waterTop'});break;}
  }
  return g;
}

let _worldBuilding=false;
let coins=0;
function setTile(row,col,type,elev){
  if(!inGrid(row,col))return;
  if(tileObjs[row][col]){scene.remove(tileObjs[row][col]);tileObjs[row][col]=null;}
  if(elev!==undefined) elevGrid[row][col]=elev;
  const g=buildTileMesh(type);
  g.position.set(wX(col),elevGrid[row][col]*ELEV_STEP,wZ(row));
  scene.add(g); tileObjs[row][col]=g; worldGrid[row][col]=type;
  treeGrid[row][col]=(type==='tree');
  // Persist to world cache using absolute global coords
  const gx=worldOffX+col-Math.floor(GRID/2);
  const gz=worldOffZ+row-Math.floor(GRID/2);
  setWorldCache(gx,gz,type);
}

function buildWorld(){
  // ── Seeded random using simple LCG so world is different each run ──
  let seed=Date.now()%99999;
  function rng(){seed=(seed*1664525+1013904223)&0x7fffffff;return seed/0x7fffffff;}
  function ri(lo,hi){return lo+Math.floor(rng()*(hi-lo+1));}

  // Fill with grass
  for(let r=0;r<GRID;r++) for(let c=0;c<GRID;c++) setTile(r,c,'grass');

  // ── Random lake (avoid edges) ──
  const lakeR=ri(5,14), lakeC=ri(5,14), lakeW=ri(3,5), lakeH=ri(3,5);
  for(let r=lakeR;r<lakeR+lakeH;r++) for(let c=lakeC;c<lakeC+lakeW;c++) if(inGrid(r,c)) setTile(r,c,'water');
  // Sand shore around lake
  for(let r=lakeR-1;r<=lakeR+lakeH;r++) for(let c=lakeC-1;c<=lakeC+lakeW;c++){
    if(inGrid(r,c)&&worldGrid[r][c]==='grass') setTile(r,c,'sand');
  }

  // ── 4 random forest patches in corners ──
  const forestSeeds=[[ri(1,4),ri(1,4)],[ri(1,4),ri(18,22)],[ri(18,22),ri(1,4)],[ri(18,22),ri(18,22)]];
  for(const [fr,fc] of forestSeeds){
    for(let dr=0;dr<4;dr++) for(let dc=0;dc<4;dc++){
      if(inGrid(fr+dr,fc+dc)&&rng()>.25) setTile(fr+dr,fc+dc,'tree');
    }
  }
  // Scattered trees
  for(let i=0;i<8;i++){
    const r=ri(2,GRID-3),c=ri(2,GRID-3);
    if(worldGrid[r][c]==='grass') setTile(r,c,'tree');
  }

  // ── Snow patch in a random corner ──
  const snowR=ri(0,1)*(GRID-6)+1, snowC=ri(0,1)*(GRID-6)+1;
  for(let dr=0;dr<ri(3,5);dr++) for(let dc=0;dc<ri(3,5);dc++) if(inGrid(snowR+dr,snowC+dc)&&worldGrid[snowR+dr][snowC+dc]==='grass') setTile(snowR+dr,snowC+dc,'snow');

  // ── Flowers scattered ──
  for(let i=0;i<12;i++){
    const r=ri(1,GRID-2),c=ri(1,GRID-2);
    if(worldGrid[r][c]==='grass') setTile(r,c,'flower');
  }

  // ── Village: 3 houses + barn in center-ish area ──
  const vr=ri(9,14), vc=ri(9,14);
  setTile(vr,vc,'house'); setTile(vr,vc+2,'house'); setTile(vr+2,vc+1,'house');
  setTile(vr-1,vc,'lantern'); setTile(vr-1,vc+2,'lantern');
  setTile(vr+3,vc+1,'campfire');
  setTile(vr+1,vc+4,'barn');
  setTile(vr+2,vc+4,'chest');

  // Path from village toward center
  for(let c2=vc-3;c2<=vc;c2++) if(inGrid(vr+1,c2)&&worldGrid[vr+1][c2]==='grass') setTile(vr+1,c2,'path');
  for(let r2=vr+1;r2<=vr+4;r2++) if(inGrid(r2,vc+1)&&worldGrid[r2][vc+1]==='grass') setTile(r2,vc+1,'path');

  // Fences around barn area
  const fR=vr+1, fC=vc+3;
  for(let c2=fC;c2<=fC+3;c2++){
    if(inGrid(fR-1,c2)) setTile(fR-1,c2,'fence');
    if(inGrid(fR+3,c2)) setTile(fR+3,c2,'fence');
  }
  for(let r2=fR;r2<=fR+2;r2++){
    if(inGrid(r2,fC-1)) setTile(r2,fC-1,'fence');
    if(inGrid(r2,fC+3)) setTile(r2,fC+3,'fence');
  }

  // Mushrooms near trees
  for(let i=0;i<4;i++){
    const r=ri(1,GRID-2),c=ri(1,GRID-2);
    if(worldGrid[r][c]==='grass'){
      let nt=false;
      for(let dr=-2;dr<=2;dr++) for(let dc=-2;dc<=2;dc++) if(inGrid(r+dr,c+dc)&&treeGrid[r+dr][c+dc])nt=true;
      if(nt) setTile(r,c,'mushroom');
    }
  }
}
_worldBuilding=true; buildWorld(); _worldBuilding=false;

// Count houses for village detection
function countHouses(){return worldGrid.flat().filter(t=>t==='house').length;}
function isVillage(){return countHouses()>=3;}

// ── Open world: shift terrain when player nears edge ──
const SHIFT_MARGIN=5; // cells from edge to trigger shift
let shiftCooldown=0;
// SHIFT_AMOUNT: how many cells to shift at once
const SHIFT_AMOUNT=8;

function checkWorldShift(){
  const{col,row}=cellOf(charState.pos.x,charState.pos.z);
  let dr=0,dc=0;
  if(col<SHIFT_MARGIN)       dc=-1;
  else if(col>GRID-SHIFT_MARGIN) dc=1;
  if(row<SHIFT_MARGIN)       dr=-1;
  else if(row>GRID-SHIFT_MARGIN) dr=1;
  if(dr===0&&dc===0) return;
  shiftWorld(dr*SHIFT_AMOUNT, dc*SHIFT_AMOUNT);
}

let _shifting=false;
function shiftWorld(shiftR, shiftC){
  if(_shifting) return; // prevent re-entrancy
  _shifting=true;
  worldOffX+=shiftC; worldOffZ+=shiftR;

  // ── Snapshot everything before any mutation ──
  const oldObjs =Array.from({length:GRID},(_,r)=>tileObjs[r].slice());
  const oldGrid =Array.from({length:GRID},(_,r)=>worldGrid[r].slice());
  const oldElev =Array.from({length:GRID},(_,r)=>elevGrid[r].slice());
  const oldTree =Array.from({length:GRID},(_,r)=>treeGrid[r].slice());

  // Determine which old meshes are no longer needed (they moved out of view)
  const usedOld=new Set();
  for(let r=0;r<GRID;r++) for(let c=0;c<GRID;c++){
    const sr=r-shiftR, sc=c-shiftC;
    if(sr>=0&&sr<GRID&&sc>=0&&sc<GRID) usedOld.add(sr*GRID+sc);
  }
  // Remove meshes that scrolled off
  for(let r=0;r<GRID;r++) for(let c=0;c<GRID;c++){
    if(!usedOld.has(r*GRID+c)&&oldObjs[r][c]){
      scene.remove(oldObjs[r][c]);
    }
  }

  // ── Rebuild grid data + reposition surviving meshes ──
  // Use plain arrays, not the live ones, while building
  const nGrid=Array.from({length:GRID},()=>new Array(GRID).fill('grass'));
  const nElev=Array.from({length:GRID},()=>new Array(GRID).fill(0));
  const nTree=Array.from({length:GRID},()=>new Array(GRID).fill(false));
  const nObjs=Array.from({length:GRID},()=>new Array(GRID).fill(null));

  for(let r=0;r<GRID;r++) for(let c=0;c<GRID;c++){
    const sr=r-shiftR, sc=c-shiftC;
    if(sr>=0&&sr<GRID&&sc>=0&&sc<GRID){
      // Carry over from old grid
      nGrid[r][c]=oldGrid[sr][sc];
      nElev[r][c]=oldElev[sr][sc];
      nTree[r][c]=oldTree[sr][sc];
      nObjs[r][c]=oldObjs[sr][sc];
      if(nObjs[r][c]) nObjs[r][c].position.set(wX(c),nElev[r][c]*ELEV_STEP,wZ(r));
    } else {
      // New cell — look up global coord in cache
      const gx=worldOffX+c-Math.floor(GRID/2);
      const gz=worldOffZ+r-Math.floor(GRID/2);
      const t=getWorldTile(gx,gz);
      nGrid[r][c]=t;
      nElev[r][c]=0;
      nTree[r][c]=(t==='tree');
      nObjs[r][c]=null;
    }
  }

  // Commit to live arrays
  for(let r=0;r<GRID;r++) for(let c=0;c<GRID;c++){
    worldGrid[r][c]=nGrid[r][c];
    elevGrid[r][c]=nElev[r][c];
    treeGrid[r][c]=nTree[r][c];
    tileObjs[r][c]=nObjs[r][c];
  }

  // ── Build meshes for new cells ──
  for(let r=0;r<GRID;r++) for(let c=0;c<GRID;c++){
    if(tileObjs[r][c]===null){
      const g=buildTileMesh(worldGrid[r][c]);
      g.position.set(wX(c),elevGrid[r][c]*ELEV_STEP,wZ(r));
      scene.add(g);
      tileObjs[r][c]=g;
    }
  }

  // ── Move player + entities ──
  charState.pos.x-=shiftC*CELL;
  charState.pos.z-=shiftR*CELL;
  charGroup.position.copy(charState.pos);
  for(const e of entities){
    e.pos.x-=shiftC*CELL;
    e.pos.z-=shiftR*CELL;
    e.mesh.position.copy(e.pos);
  }

  _shifting=false;
}

// ═══════════════════════════════════════════════════
//  DAY/NIGHT CYCLE
// ═══════════════════════════════════════════════════
let dayTime=0; // 0-1, 0=sunrise, 0.5=sunset
let dayCount=1;
let isNight=false;
let wildRaidActive=false, undeadRaidActive=false;
let raidCooldown=0;

const DAY_SKY=new THREE.Color(0x87ceeb);
const NIGHT_SKY=new THREE.Color(0x050a15);
const SUNSET_SKY=new THREE.Color(0xff8c42);
const _tmpCol=new THREE.Color();

function updateDayNight(dt){
  dayTime=(dayTime+dt/DAY_DURATION)%1;
  const t=dayTime;
  const wasNight=isNight;
  isNight=t>0.5;

  // Sky color
  let skyCol;
  if(t<0.05)       skyCol=_tmpCol.copy(NIGHT_SKY).lerp(DAY_SKY,t/0.05);
  else if(t<0.45)  skyCol=DAY_SKY;
  else if(t<0.5)   skyCol=_tmpCol.copy(DAY_SKY).lerp(SUNSET_SKY,(t-.45)/.05);
  else if(t<0.55)  skyCol=_tmpCol.copy(SUNSET_SKY).lerp(NIGHT_SKY,(t-.5)/.05);
  else             skyCol=NIGHT_SKY;
  scene.background.copy(skyCol);
  scene.fog.color.copy(skyCol);
  skyMat.uniforms.uTop.value.copy(skyCol);

  // Light intensity
  const dayPct=isNight?0:Math.sin(t*Math.PI*2)*1.2;
  sun.intensity=Math.max(0.05,dayPct);
  ambLight.intensity=isNight?0.12:0.55;
  fillLight.intensity=isNight?0.05:0.3;

  // Sun position arc
  const sunAngle=t*Math.PI*2;
  sun.position.set(Math.sin(sunAngle)*60,Math.cos(sunAngle)*60+10,20);

  // UI
  const phases=['Dawn','Morning','Noon','Afternoon','Dusk','Night','Midnight','Late Night'];
  const phaseIdx=Math.floor(t*8);
  const phaseIco=isNight?'🌙':'☀️';
  document.getElementById('hud-time').textContent=`Day ${dayCount}`;
  document.getElementById('time-label').textContent=phases[phaseIdx]||'Dawn';
  document.getElementById('timebar-fill').style.width=(t*100)+'%';
  document.getElementById('timebar-fill').style.background=isNight?'#3a3a7a':'#ffd166';
  document.getElementById('pill-day').childNodes[0].textContent=phaseIco+' ';

  // Night started
  if(!wasNight&&isNight){
    dayCount++;
    raidCooldown-=dt;
    if(raidCooldown<=0&&Math.random()<0.4&&!undeadRaidActive){
      triggerUndeadRaid();
    }
  }
  // Day started
  if(wasNight&&!isNight){
    raidCooldown-=dt;
    if(raidCooldown<=0&&isVillage()&&Math.random()<0.3&&!wildRaidActive){
      triggerWildRaid();
    }
  }
}

// ═══════════════════════════════════════════════════
//  PLAYER
// ═══════════════════════════════════════════════════
function buildHumanoid(bodyCol,hatCol,pantsCol,sz=1){
  const g=new THREE.Group();
  const torso=new THREE.Mesh(new THREE.BoxGeometry(sz*.7,sz*.85,sz*.42),mF(bodyCol));
  torso.position.y=sz*.9; torso.castShadow=true; g.add(torso);
  const head=new THREE.Mesh(new THREE.BoxGeometry(sz*.55,sz*.55,sz*.52),mF(0xe8c99a));
  head.position.y=sz*1.62; head.castShadow=true; g.add(head);
  [-.14,.14].forEach(x=>{const e=new THREE.Mesh(new THREE.BoxGeometry(sz*.1,sz*.1,sz*.06),mF(0x2a1a0a));e.position.set(x*sz,sz*1.66,sz*.27);g.add(e);});
  const brim=new THREE.Mesh(new THREE.CylinderGeometry(sz*.4,sz*.42,sz*.07,12),mF(hatCol));brim.position.y=sz*1.94;g.add(brim);
  const htop=new THREE.Mesh(new THREE.CylinderGeometry(sz*.28,sz*.3,sz*.35,10),mF(hatCol));htop.position.y=sz*2.12;g.add(htop);
  ['armL','armR'].forEach((nm,i)=>{const a=new THREE.Mesh(new THREE.BoxGeometry(sz*.24,sz*.7,sz*.26),mF(bodyCol));a.position.set((i===0?.47:-.47)*sz,sz*.85,0);a.name=nm;g.add(a);});
  ['legL','legR'].forEach((nm,i)=>{const l=new THREE.Mesh(new THREE.BoxGeometry(sz*.26,sz*.72,sz*.27),mF(pantsCol));l.position.set((i===0?.2:-.2)*sz,sz*.26,0);l.name=nm;g.add(l);});
  [.2,-.2].forEach(x=>{const s=new THREE.Mesh(new THREE.BoxGeometry(sz*.28,sz*.14,sz*.38),mF(0x2a1a0a));s.position.set(x*sz,-sz*.11,sz*.06);g.add(s);});
  return g;
}

const charGroup=new THREE.Group(); scene.add(charGroup);
let charMesh=buildHumanoid(0x52b788,0xf4a261,0x3a5a8a);
charGroup.add(charMesh);
const charState={
  pos:new THREE.Vector3(0,BASE_H,0),
  facingAngle:0,moving:false,jumping:false,velY:0,
  hp:100,maxhp:100,
  damageCooldown:0, // invincibility frames
  dead:false,
  equippedWeapon:null,
  attackCooldown:0,
  chopTimer:0,
  choppingCell:null,
};
const WEAPON_DMG={sword:25,spear:35};

// ── Inventory & player side ────────────────────────
let playerSide='none'; // 'human' or 'wild'
let wildPower=0; // 0-100
const inventory={
  meat:0, milk:0, eggs:0, wool:0, fish:0,
  wood:0, stone:0, cloth:0, mushroom:0, rod:0
};
let hotbarSelected=0; // index into HOTBAR_DEFS
const HOTBAR_DEFS=[
  {key:'wood',ico:'🪵',lbl:'Wood'},{key:'fish',ico:'🐟',lbl:'Fish'},
  {key:'meat',ico:'🥩',lbl:'Meat'},{key:'milk',ico:'🥛',lbl:'Milk'},
  {key:'eggs',ico:'🥚',lbl:'Eggs'},{key:'wool',ico:'🧶',lbl:'Wool'},
  {key:'mushroom',ico:'🍄',lbl:'Shroom'},{key:'cloth',ico:'🧥',lbl:'Cloth'},
  {key:'rod',ico:'🎣',lbl:'Rod'},{key:'stone',ico:'🪨',lbl:'Stone'},
  {key:'sparkstone',ico:'✨',lbl:'Spark'},{key:'firefly',ico:'✨',lbl:'Firefly'},
  {key:'sword',ico:'⚔️',lbl:'Sword'},{key:'spear',ico:'🗡️',lbl:'Spear'},
  {key:'flower',ico:'🌸',lbl:'Flower'},
  {key:'bones',ico:'🦴',lbl:'Bones'},
  {key:'zombie_blood',ico:'🩸',lbl:'Z.Blood'},
  {key:'potion',ico:'🧪',lbl:'Potion'},
];
function updateHotbar(){
  const hb=document.getElementById('hotbar');
  if(!hb||hb.classList.contains('wild-hotbar')) return;
  hb.innerHTML=HOTBAR_DEFS.map((d,i)=>`
    <div class="hslot${i===hotbarSelected?' active':''}" data-i="${i}" onclick="hotbarSelected=${i};updateHotbar()">
      <div class="h-ico">${d.ico}</div>
      <div class="h-lbl">${d.lbl}</div>
      ${inventory[d.key]>0?`<div class="h-qty">${inventory[d.key]}</div>`:''}
    </div>
  `).join('')+'<div id="build-toggle" style="width:36px;height:56px;display:flex;align-items:center;justify-content:center;cursor:pointer;border-radius:10px;border:2px dashed rgba(82,183,136,0.3);color:#52b788;font-size:10px;font-weight:700;text-align:center;line-height:1.2;" onclick="toggleBuildMode()">🏗️<br>Build</div>';
}
let buildMode=false;
function toggleBuildMode(){
  buildMode=!buildMode;
  const p=document.getElementById('palette');
  p.style.display=buildMode?'flex':'none';
  showToast(buildMode?'🏗️ Build mode ON – Tab cycles tiles':'🏗️ Build mode OFF');
}
// Chest storage: keyed by "r_c"
const chestStorage={};
function getChestKey(r,c){return r+'_'+c;}
function openChest(r,c){
  const key=getChestKey(r,c);
  if(!chestStorage[key]) chestStorage[key]={};
  const chest=chestStorage[key];
  const labels={meat:'🥩 Meat',milk:'🥛 Milk',eggs:'🥚 Eggs',wool:'🧶 Wool',fish:'🐟 Fish',wood:'🪵 Wood',stone:'🪨 Stone',cloth:'🧥 Cloth',mushroom:'🍄 Mushroom',bones:'🦴 Bones',zombie_blood:'🩸 Z.Blood',potion:'🧪 Potion',rod:'🎣 Rod',sparkstone:'✨ Spark',firefly:'✨ Firefly',flower:'🌸 Flower',sword:'⚔️ Sword',spear:'🗡️ Spear'};
  // Build chest UI — deposit and withdraw
  const el=document.getElementById('inventory');
  el.style.display='block';
  cursorMode=true; invOpen=true;
  showCursor();
  document.getElementById('inventory').innerHTML=`
    <h3>📦 Chest</h3>
    <div style="display:flex;gap:12px;flex-wrap:wrap;">
      <div style="flex:1;min-width:110px;">
        <div style="color:#74c69d;font-size:11px;font-weight:700;margin-bottom:6px;">YOUR BAG</div>
        ${Object.entries(inventory).filter(([,v])=>v>0).map(([k,v])=>`
          <div class="inv-item" style="cursor:pointer" onclick="depositItem('${key}','${k}')">
            <span>${labels[k]||k}</span><span class="qty">${v} →</span>
          </div>`).join('')||'<div style="color:#666;font-size:11px">Empty</div>'}
      </div>
      <div style="flex:1;min-width:110px;">
        <div style="color:#ffd166;font-size:11px;font-weight:700;margin-bottom:6px;">IN CHEST</div>
        ${Object.entries(chest).filter(([,v])=>v>0).map(([k,v])=>`
          <div class="inv-item" style="cursor:pointer" onclick="withdrawItem('${key}','${k}')">
            <span>← ${labels[k]||k}</span><span class="qty">${v}</span>
          </div>`).join('')||'<div style="color:#666;font-size:11px">Empty</div>'}
      </div>
    </div>
    <div style="margin-top:10px;font-size:10px;color:#74c69d;">Click item to transfer · F to close</div>
    <button id="inv-close" style="margin-top:10px;padding:6px 16px;background:#52b788;color:#081c15;border:none;border-radius:10px;cursor:pointer;font-weight:700;font-size:12px;">Close</button>
  `;
  document.getElementById('inv-close').addEventListener('click',closeInventory);
  invOpen=true;
  currentChest=key;
}
let currentChest=null;
function depositItem(key,item){
  if((inventory[item]||0)<=0)return;
  inventory[item]--;
  if(!chestStorage[key]) chestStorage[key]={};
  chestStorage[key][item]=(chestStorage[key][item]||0)+1;
  // Find chest cell
  const [r,c]=key.split('_').map(Number);
  openChest(r,c);
}
function withdrawItem(key,item){
  if(!chestStorage[key]||(chestStorage[key][item]||0)<=0)return;
  chestStorage[key][item]--;
  inventory[item]=(inventory[item]||0)+1;
  const [r,c]=key.split('_').map(Number);
  openChest(r,c);
}
// closeInventory defined below (after toggleInventory)
// This stub ensures early callers work before the real definition loads
function closeInventory(){
  const el=document.getElementById('inventory');
  if(el) el.style.display='none';
  invOpen=false; currentChest=null; cursorMode=false;
  hideCursor();
  if(playerSide!=='none'&&!isPaused) setTimeout(()=>document.getElementById('c').requestPointerLock(),50);
}
// NPC held items (separate from player bag)
let npcDrops={};  // keyed by entity array index

function npcGather(ent, item, qty=1){
  const idx=entities.indexOf(ent);
  if(idx<0)return;
  if(!npcDrops[idx]) npcDrops[idx]={};
  npcDrops[idx][item]=(npcDrops[idx][item]||0)+qty;
  pushNotif(`${ent.role} gathered +${qty} ${item}`);
}

function addItem(item,qty=1){
  if(inventory[item]!==undefined) inventory[item]+=qty;
  updateHotbar();
  pushNotif(`+${qty} ${item} 🎒`);
}

// ─── Wild power ───────────────────────────────────
function addWildPower(amt){
  wildPower=Math.min(100,wildPower+amt);
  document.getElementById('wild-power-fill').style.width=wildPower+'%';
  document.getElementById('wild-power-label').textContent=`Dark Power: ${Math.floor(wildPower)}%`;
}

// ═══════════════════════════════════════════════════
//  INPUT
// ═══════════════════════════════════════════════════
const K={};
let mouseActive=false;
let lmbHeld=false; // track left mouse button held for chop
let selectedTile='grass';
let soundOn=false, audioCtx=null;
let currentElev=0;
const clk={t:0};
let invOpen=false;
let cursorMode=false; // Alt/B toggles free cursor (no pause screen)
function showCursor(){
  // Show cursor by setting body cursor and releasing pointer lock
  document.body.style.cursor='default';
  const ch=document.getElementById('crosshair');
  if(ch) ch.style.display='none';
  if(document.pointerLockElement) document.exitPointerLock();
}
function hideCursor(){
  document.body.style.cursor='none';
  const ch=document.getElementById('crosshair');
  if(ch) ch.style.display='block';
}
function toggleCursorMode(){
  if(cursorMode){
    cursorMode=false;
    hideCursor();
    document.getElementById('c').requestPointerLock();
    showToast('🎮 Cursor locked');
  } else {
    cursorMode=true;
    showCursor();
    showToast('🖱️ Cursor free – Alt to lock');
  }
}

let isPaused=false;
function showPause(){
  isPaused=true;
  document.getElementById('lock-overlay').style.display='flex';
  document.getElementById('lock-title').textContent='⏸ Paused';
  document.getElementById('crosshair').style.display='none';
}
function hidePause(){
  isPaused=false;
  document.getElementById('lock-overlay').style.display='none';
  document.getElementById('crosshair').style.display='block';
}
function resumeGame(){
  hidePause();
  document.getElementById('c').requestPointerLock();
}
function goMainMenu(){
  isPaused=false;
  document.getElementById('lock-overlay').style.display='none';
  document.getElementById('palette').style.display='none';
  document.getElementById('hotbar').style.display='none';
  document.getElementById('player-hp-wrap').style.display='none';
  document.getElementById('side-chooser').style.display='flex';
  document.getElementById('crosshair').style.display='none';
  buildMode=false;
  if(mouseActive) document.exitPointerLock();
  resetGame();
  playerSide='none';
}

document.getElementById('btn-continue')?.addEventListener('click',resumeGame);
document.getElementById('btn-save-pause')?.addEventListener('click',saveGame);
document.getElementById('btn-mainmenu')?.addEventListener('click',()=>{saveGame();goMainMenu();});
// Clicking overlay itself (not buttons) also resumes
document.getElementById('lock-overlay').addEventListener('click',e=>{
  if(e.target===document.getElementById('lock-overlay')||e.target.id==='lock-title'||e.target.id==='lock-hint') resumeGame();
});

document.addEventListener('pointerlockchange',()=>{
  mouseActive=!!document.pointerLockElement;
  if(mouseActive){
    // Got lock: game is running
    hidePause();
    cursorMode=false;
    hideCursor();
  } else if(!cursorMode&&!invOpen&&!isPaused&&playerSide!=='none'){
    // Lost lock unexpectedly (shouldn't happen but handle it)
    document.getElementById('crosshair').style.display='none';
  }
});
document.addEventListener('mousemove',e=>{
  if(!mouseActive)return;
  camYaw-=e.movementX*.002;
  camPitch-=e.movementY*.002;
  camPitch=Math.max(-.6,Math.min(.5,camPitch));
});
document.addEventListener('keydown',e=>{
  if(e.code==='Tab'){e.preventDefault();if(playerSide!=='none')cycleTile();return;}
  if(e.code==='Space'){e.preventDefault();doJump();return;}
  if(e.code==='AltLeft'||e.code==='AltRight'){e.preventDefault();toggleCursorMode();return;}
  if(e.code==='Escape'){
    e.preventDefault();
    if(invOpen){closeInventory();return;}
    if(isPaused){resumeGame();return;}
    // Show pause screen
    isPaused=true;
    if(mouseActive) document.exitPointerLock();
    else showPause();
    return;
  }
  K[e.code]=true;
  if(e.code==='KeyZ'){e.preventDefault();doAction();}
  if(e.code==='KeyF'){e.preventDefault();doInteract();}
  if(e.code==='KeyI'||e.code==='KeyB'){e.preventDefault();toggleInventory();}
});
document.addEventListener('keyup',e=>{ K[e.code]=false; });

// Use document-level mouse events — canvas events are unreliable during pointer lock
document.addEventListener('mousedown',e=>{
  if(e.button===0){
    lmbHeld=true;
    if(mouseActive) doLeftClick();
  }
  if(e.button===2){
    if(mouseActive) doRightClick();
  }
});
document.addEventListener('mouseup',e=>{
  if(e.button===0) lmbHeld=false;
  // Don't clear choppingCell on mouseup — let updatePlayer handle it
  // chop completes when chopTimer>=3, or cancels if lmbHeld goes false
});
document.getElementById('c').addEventListener('contextmenu',e=>e.preventDefault());

function doLeftClick(){
  // Wild side: always summon
  if(playerSide==='wild'){doWildAction();return;}
  // Build mode: place tile
  if(buildMode){doAction();return;}
  const cell=getTargetCell();
  // Eat consumable from selected hotbar slot
  const sel=HOTBAR_DEFS[hotbarSelected];
  if(sel&&['meat','milk','eggs','fish','mushroom','potion'].includes(sel.key)&&(inventory[sel.key]||0)>0){
    inventory[sel.key]--;
    const healAmt={meat:20,milk:15,eggs:12,fish:35,mushroom:18,potion:50}[sel.key]||10;
    charState.hp=Math.min(charState.maxhp,charState.hp+healAmt);
    updatePlayerHP();updateHotbar();
    const msg=sel.key==='potion'?'Drank potion! +50hp 🧪':'Ate '+sel.key+' +'+healAmt+'hp ❤️';
    pushNotif(msg);
    if(sel.key==='potion') showToast('🧪 Potion! +50 HP!');
    return;
  }
  // If no cell from raycast, try cell in front of player
  if(!cell){
    const reach=CELL*1.5;
    const fx=charState.pos.x+Math.sin(charState.facingAngle)*reach;
    const fz=charState.pos.z+Math.cos(charState.facingAngle)*reach;
    const{col,row}=cellOf(fx,fz);
    if(inGrid(row,col)) cell={r:row,c:col};
    else return;
  }
  const tile=worldGrid[cell.r][cell.c];
  // Pick flower
  if(tile==='flower'){addItem('flower',1);setTile(cell.r,cell.c,'grass');pushNotif('Picked flower 🌸 +1');return;}
  // Toggle lantern
  if(tile==='lantern'){
    const obj=tileObjs[cell.r][cell.c];
    if(obj){const ll=obj.getObjectByName('lanternLight');if(ll){ll.intensity=ll.intensity>0?0:2.5;pushNotif(ll.intensity>0?'Lantern on 🏮':'Lantern off');}}
    return;
  }
  // Hold to chop tree — keep holding LMB
  if(tile==='tree'){
    if(!charState.choppingCell||charState.choppingCell.r!==cell.r||charState.choppingCell.c!==cell.c){
      charState.choppingCell=cell; charState.chopTimer=0;
      pushNotif('Chopping... hold LMB 🪓');
    }
    return;
  }
  // Interact: chest, water, mushroom
  doInteract();
}
function doRightClick(){
  if(playerSide==='wild'){doErase();return;}
  // Village: attack with weapon
  if(charState.equippedWeapon){doMeleeAttack();return;}
  const cell=getTargetCell();
  // Gather from path tile
  if(cell&&worldGrid[cell.r][cell.c]==='path'){
    if(Math.random()<0.45){addItem('sparkstone',1);pushNotif('Found sparkstone ✨ +1');}
    else{addItem('stone',1);pushNotif('Found stone 🪨 +1');}
    return;
  }
  // Only erase in build mode
  if(buildMode){doErase();return;}
  // Otherwise: no action (don't destroy tiles accidentally)
}
function doMeleeAttack(){
  if(charState.attackCooldown>0)return;
  const dmg=WEAPON_DMG[charState.equippedWeapon]||20;
  let hit=null,hitD=3;
  for(const e of entities){
    if(!e.alive||(playerSide==='human'&&!isEnemy(e)))continue;
    if(playerSide==='wild'&&!(isNPC(e)&&(e.role==='guard'||e.role==='farmer')))continue;
    const d=charState.pos.distanceTo(e.pos);
    if(d<hitD){hitD=d;hit=e;}
  }
  if(hit){dealDamage(null,hit,dmg);charState.attackCooldown=0.6;playNote(350,'sawtooth',.07,.12);pushNotif('Hit '+hit.type+' -'+dmg+'hp ⚔️');}
  else pushNotif('No target in range ⚔️');
}

['up','down','left','right'].forEach(dir=>{
  const el=document.getElementById('m-'+dir);if(!el)return;
  const dn=()=>{K['m'+dir]=true;};const up=()=>{K['m'+dir]=false;};
  el.addEventListener('touchstart',e=>{e.preventDefault();dn();},{passive:false});
  el.addEventListener('touchend',e=>{e.preventDefault();up();},{passive:false});
  el.addEventListener('mousedown',dn);el.addEventListener('mouseup',up);
});
document.getElementById('m-action')?.addEventListener('click',doAction);

// Tile list per side
const HUMAN_TILES=['grass','flower','tree','water','sand','path','house','barn','fence','campfire','lantern','chest'];
const WILD_TILES=['summon-zombie','summon-skeleton','summon-wolf','summon-bear'];
let TILE_LIST=HUMAN_TILES;

document.getElementById('btn-save')?.addEventListener('click',saveGame);
function saveGame(){
  const data={inventory,hp:charState.hp,wildPower,coins,dayCount,playerSide};
  localStorage.setItem('cosyWorldSave',JSON.stringify(data));
  showToast('💾 Saved!');
}

document.getElementById('btn-sound').addEventListener('click',()=>{
  soundOn=!soundOn;
  document.getElementById('btn-sound').textContent=soundOn?'🔊 Sound':'🔇 Sound';
  if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();
  if(soundOn)startAmbient();
  showToast(soundOn?'🎵 Sound on!':'🔇 Muted');
});
document.getElementById('btn-inv').addEventListener('click',toggleInventory);
document.getElementById('inv-close')?.addEventListener('click',closeInventory);

function toggleInventory(){
  if(invOpen){closeInventory();return;}
  invOpen=true;
  cursorMode=true;
  renderInventory();
  const el=document.getElementById('inventory');
  if(el) el.style.display='block';
  showCursor(); // shows overlay + hides crosshair + releases pointer lock
}
function renderInventory(){
  const items=Object.entries(inventory).filter(([,v])=>v>0);
  const labels={meat:'🥩 Meat',milk:'🥛 Milk',eggs:'🥚 Eggs',wool:'🧶 Wool',fish:'🐟 Fish',wood:'🪵 Wood',stone:'🪨 Stone',cloth:'🧥 Cloth',mushroom:'🍄 Mushroom'};
  const ITEM_LABELS={meat:'🥩 Meat',milk:'🥛 Milk',eggs:'🥚 Eggs',wool:'🧶 Wool',
    fish:'🐟 Fish',wood:'🪵 Wood',stone:'🪨 Stone',cloth:'🧥 Cloth',
    mushroom:'🍄 Shroom',rod:'🎣 Rod',sparkstone:'✨ Spark',firefly:'✨ Firefly',
    sword:'⚔️ Sword',spear:'🗡️ Spear',flower:'🌸 Flower'};
  const recipes=[
    {name:'🎣 Fishing Rod',   needs:{wool:1,wood:1},      gives:{rod:1}},
    {name:'🧥 Cloth',         needs:{wool:2},               gives:{cloth:1}},
    {name:'💊 Healing wrap',  needs:{cloth:1,mushroom:1},   gives:{},heal:30,note:'Heals 30hp'},
    {name:'🧪 Potion',        needs:{zombie_blood:1,flower:1},gives:{potion:1},note:'+50hp when drunk'},
    {name:'⚔️ Sword',         needs:{wood:1,stone:3},       gives:{sword:1},note:'25 dmg'},
    {name:'🗡️ Spear',         needs:{wood:4,stone:2},       gives:{spear:1},note:'35 dmg'},
    {name:'🏮 Lantern craft', needs:{wood:1,wool:1,firefly:3},gives:{},place:'lantern',note:'Place lantern'},
    {name:'🔥 Campfire craft',needs:{wood:2,sparkstone:1},  gives:{},place:'campfire',note:'Place campfire'},
    {name:'🚧 Fence craft',   needs:{wood:2,stone:3},       gives:{},place:'fence',note:'Place fence'},
  ];
  const bag=items.length===0
    ?'<div style="color:#74c69d;font-size:12px;padding:4px 0;">Empty — chop trees, fish, or talk to NPCs!</div>'
    :items.map(([k,v])=>`<div class="inv-item"><span>${labels[k]||k}</span><span class="qty">${v}</span></div>`).join('');
  const craft=recipes.map(rc=>{
    const canMake=Object.entries(rc.needs).every(([k,v])=>(inventory[k]||0)>=v);
    const safeName=rc.name.replace(/['"<>&]/g,'');
    const onclick=canMake?`craftItem('${safeName}',${JSON.stringify(rc.needs)},${JSON.stringify(rc.gives||{})},${rc.heal||0},'${rc.place||''}')`:null;
    return `<div class="inv-item" style="opacity:${canMake?1:.45};cursor:${canMake?'pointer':'default'}"${onclick?` onclick="${onclick}"`:''}">
      <span>${rc.name}${rc.note?'<br><span style="font-size:9px;color:#74c69d;">'+rc.note+'</span>':''}</span>
      <span class="qty" style="font-size:10px;">${Object.entries(rc.needs).map(([k,v])=>v+' '+k).join(', ')}</span>
    </div>`;
  }).join('');
  document.getElementById('inv-items').innerHTML=`
    <div style="font-size:10px;color:#74c69d;font-weight:700;margin-bottom:4px;">ITEMS</div>
    ${bag}
    <div style="font-size:10px;color:#ffd166;font-weight:700;margin:8px 0 4px;">CRAFT</div>
    ${craft}
  `;
}
function craftItem(name,needs,gives,heal,placeTileType){
  // Consume materials
  for(const [k,v] of Object.entries(needs)){inventory[k]=Math.max(0,(inventory[k]||0)-v);}
  // Give items
  for(const [k,v] of Object.entries(gives)){if(v)inventory[k]=(inventory[k]||0)+v;}
  updateHotbar();
  if(heal>0){
    let t=null,td=10;
    for(const e of entities){if(!e.alive)continue;const d=charState.pos.distanceTo(e.pos);if(d<td&&e.hp<e.maxhp){td=d;t=e;}}
    if(t){healEntity(t,heal);pushNotif('💊 Healed '+t.type+' +'+heal+'hp');}
    else pushNotif('💊 Crafted wrap! No injured nearby.');
  }
  if(placeTileType&&placeTileType!==''){
    selectedTile=placeTileType;
    buildMode=true;
    closeInventory();
    showToast('Now click to place: '+placeTileType);
    return;
  }
  if(gives&&gives.sword){charState.equippedWeapon='sword';pushNotif('⚔️ Sword equipped!');}
  if(gives&&gives.spear){charState.equippedWeapon='spear';pushNotif('🗡️ Spear equipped!');}
  if(!heal) showToast('✅ Crafted: '+name);
  renderInventory();
}

// Elev wired inside chooseSide for human side

// ─── Raycaster ───────────────────────────────────
const raycaster=new THREE.Raycaster();
const groundPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
function getTargetCell(){
  raycaster.setFromCamera(new THREE.Vector2(0,0),camera);
  const targets=[];
  for(let r=0;r<GRID;r++) for(let c=0;c<GRID;c++) if(tileObjs[r][c]) tileObjs[r][c].children.forEach(ch=>targets.push(ch));
  const hits=raycaster.intersectObjects(targets,false);
  if(hits.length){const p=hits[0].point;const{col,row}=cellOf(p.x,p.z);if(inGrid(row,col))return{r:row,c:col};}
  // Try ground plane intersection
  const pt=new THREE.Vector3();
  raycaster.ray.intersectPlane(groundPlane,pt);
  if(pt&&pt.x!==undefined){const{col,row}=cellOf(pt.x,pt.z);if(inGrid(row,col))return{r:row,c:col};}
  // Fallback: use cell directly in front of player (within reach distance)
  const reach=CELL*1.5;
  const fx=charState.pos.x+Math.sin(charState.facingAngle)*reach;
  const fz=charState.pos.z+Math.cos(charState.facingAngle)*reach;
  const{col,row}=cellOf(fx,fz);
  if(inGrid(row,col)) return{r:row,c:col};
  return null;
}
const hlMesh=new THREE.Mesh(new THREE.BoxGeometry(CELL-.1,.08,CELL-.1),new THREE.MeshBasicMaterial({color:0xffd166,transparent:true,opacity:.5,depthTest:false}));
hlMesh.visible=false;scene.add(hlMesh);

// ─── Actions ─────────────────────────────────────
function doJump(){if(!charState.jumping){charState.jumping=true;charState.velY=7.5;playNote(520,'sine',.06,.18);}}

function doAction(){
  if(playerSide==='wild'){doWildAction();return;}
  if(buildMode){
    const cell=getTargetCell();if(!cell)return;
    setTile(cell.r,cell.c,selectedTile,currentElev);
    coins+=SCORES[selectedTile]||0;
    playNote(440,'triangle',.08,.15);
    showToast('Placed '+selectedTile+'!');
  }
}
// doWildAction defined below after side setup
function doErase(){
  const cell=getTargetCell();if(!cell||worldGrid[cell.r][cell.c]==='grass')return;
  const prev=worldGrid[cell.r][cell.c];
  if(playerSide==='wild'){
    if(prev==='mushroom'){
      addWildPower(5);
      charState.hp=Math.min(charState.maxhp,charState.hp+20);
      updatePlayerHP();
      elevGrid[cell.r][cell.c]=0;
      setTile(cell.r,cell.c,'grass',0);
      playNote(180,'sine',.06,.3);
      pushNotif('🍄 +5 Power +20 HP');
    }
    return;
  }
  if(prev==='tree'){addItem('wood',2);}
  elevGrid[cell.r][cell.c]=0;
  setTile(cell.r,cell.c,'grass',0);
  playNote(220,'sawtooth',.06,.1);
  showToast('Erased!');
}

// ─── F key interaction ───────────────────────────
function doInteract(){
  if(invOpen){closeInventory();return;}
  let closest=null,closestD=4;
  for(const e of entities){
    if(!e.alive)continue;
    const d=charState.pos.distanceTo(e.pos);
    if(d<closestD){closestD=d;closest=e;}
  }
  if(closest&&isNPC(closest)&&playerSide==='human'){
    openNPCPanel(closest);
    return;
  }
  // Tame wolf with bones
  if(closest&&closest.type==='wolf'&&playerSide==='human'){
    if((inventory.bones||0)>=1){
      inventory.bones--;
      updateHotbar();
      // Convert wolf to tamed dog
      closest.tamed=true;
      closest.role='dog';
      // Recolor the wolf mesh to look like a dog (brown)
      closest.mesh.traverse(ch=>{if(ch.material&&ch.material.color)ch.material=ch.material.clone();if(ch.material&&ch.material.color)ch.material.color.set(0x8B4513);});
      tamedDogs.push(closest);
      pushNotif('🐺→🐕 Wolf tamed! It follows you now.');
      showToast('Wolf tamed! 🐕');
    } else {
      showToast('Need 1 bone to tame a wolf!');
      pushNotif('Need bones 🦴 to tame wolf');
    }
    return;
  }
  if(closest&&isFarm(closest)){
    if(closest.type==='cow'){addItem('milk',1);pushNotif('Milked cow 🐄 +1 milk');}
    else if(closest.type==='sheep'){addItem('wool',1);pushNotif('Sheared sheep 🐑 +1 wool');}
    else if(closest.type==='chicken'){addItem('eggs',1);pushNotif('Collected eggs 🥚 +1');}
    return;
  }
  const cell=getTargetCell();if(!cell)return;
  const{r,c}=cell;
  const tile=worldGrid[r][c];
  if(tile==='chest'){openChest(r,c);return;}
  if(tile==='water'){
    if(inventory.rod>0){addItem('fish',1+Math.floor(Math.random()*2));pushNotif('🎣 Fished!');}
    else showToast('Need a fishing rod first!');
    return;
  }
  if(tile==='mushroom'){
    if(playerSide==='wild'){addWildPower(5);charState.hp=Math.min(charState.maxhp,charState.hp+20);updatePlayerHP();setTile(r,c,'grass');pushNotif('🍄 +5 Power +20HP');}
    else{addItem('mushroom',1);setTile(r,c,'grass');pushNotif('Picked mushroom 🍄');}
    return;
  }
  // Pick flower with F too
  if(tile==='flower'){addItem('flower',1);setTile(r,c,'grass');pushNotif('Picked flower 🌸 +1');return;}
  // Stone/sparkstone from path with F
  if(tile==='path'){
    if(Math.random()<0.45){addItem('sparkstone',1);pushNotif('Found sparkstone ✨ +1');}
    else{addItem('stone',1);pushNotif('Found stone 🪨 +1');}
    return;
  }
  // Catch firefly — only works at night
  if(isNight){
    addItem('firefly',1);
    pushNotif('Caught firefly ✨ +1');
  } else {
    pushNotif('Fireflies only appear at night 🌙');
  }
}

// ── NPC interaction panel ──────────────────────────
const ALL_JOBS=['farmer','carpenter','guard','fisherman','hunter','miner'];
function openNPCPanel(npc){
  invOpen=true; cursorMode=true;
  showCursor();
  const idx=entities.indexOf(npc);
  const drops=npcDrops[idx]||{};
  const hasItems=Object.values(drops).some(v=>v>0);
  const jobBtns=ALL_JOBS.filter(j=>j!==npc.role&&j!=='child')
    .map(j=>`<button onclick="switchNPCJob(${idx},'${j}')" style="padding:5px 10px;margin:3px;border-radius:8px;border:1px solid rgba(82,183,136,0.4);background:rgba(10,30,15,0.8);color:#d8f3dc;font-size:11px;cursor:pointer;">${j}</button>`)
    .join('');
  const itemList=hasItems
    ?Object.entries(drops).filter(([,v])=>v>0).map(([k,v])=>`<span style="color:#ffd166;font-size:12px;">${k}×${v}</span>`).join(' ')
    :'<span style="color:#74c69d;font-size:11px;">Nothing gathered yet</span>';
  const el=document.getElementById('inventory');
  el.style.display='block';
  el.innerHTML=`
    <h3>👤 ${npc.role.toUpperCase()}</h3>
    <div style="margin:8px 0;">
      <div style="font-size:11px;color:#74c69d;margin-bottom:6px;">📦 Carrying: ${itemList}</div>
      ${hasItems?`<button onclick="collectNPCItems(${idx})" style="padding:6px 14px;border-radius:10px;border:none;background:#52b788;color:#081c15;font-weight:700;font-size:12px;cursor:pointer;margin-bottom:6px;">🎒 Take all items</button>`:''}
    </div>
    <div style="margin-top:8px;">
      <div style="font-size:11px;color:#ffd166;font-weight:700;margin-bottom:5px;">🔄 Switch job:</div>
      <div style="display:flex;flex-wrap:wrap;gap:3px;">${jobBtns}</div>
    </div>
    <button onclick="closeInventory()" style="margin-top:12px;padding:6px 16px;background:#52b788;color:#081c15;border:none;border-radius:10px;cursor:pointer;font-weight:700;font-size:12px;">Close</button>
  `;
}
function collectNPCItems(idx){
  const drops=npcDrops[idx]||{};
  Object.entries(drops).forEach(([k,v])=>{if(v>0){inventory[k]=(inventory[k]||0)+v;drops[k]=0;}});
  updateHotbar();
  pushNotif('Collected NPC items! 🎒');
  const npc=entities[idx];
  if(npc&&npc.alive) openNPCPanel(npc); else closeInventory();
}
function switchNPCJob(idx,newJob){
  const npc=entities[idx];
  if(!npc||!npc.alive){closeInventory();return;}
  scene.remove(npc.mesh);
  npc.role=newJob;
  npc.mesh=buildNPCMesh(newJob);
  npc.mesh.position.copy(npc.pos);
  scene.add(npc.mesh);
  npc.hb=addHealthBar(npc.mesh,2.6);
  drawHP(npc);
  pushNotif('NPC switched to: '+newJob+' 🔄');
  openNPCPanel(npc);
}

// ── Wild summon selector ───────────────────────────
function selectWild(el,type){
  document.querySelectorAll('#hotbar .hslot').forEach(s=>s.classList.remove('active'));
  el.classList.add('active'); selectedTile=type;
}

function cycleTile(){
  if(playerSide==='wild'){
    const slots=document.querySelectorAll('#hotbar .hslot');
    if(!slots.length)return;
    let cur=0;
    slots.forEach((s,i)=>{if(s.classList.contains('active'))cur=i;});
    const next=(cur+1)%slots.length;
    slots.forEach(s=>s.classList.remove('active'));
    slots[next].classList.add('active');
    selectedTile=slots[next].dataset.t||slots[next].getAttribute('data-t');
    showToast('Selected: '+selectedTile);
  } else {
    // Always cycle hotbar slots, regardless of build mode
    const slots=document.querySelectorAll('#hotbar .hslot[data-i]');
    if(!slots.length)return;
    let cur=0;
    slots.forEach((s,i)=>{if(parseInt(s.dataset.i)===hotbarSelected)cur=i;});
    const next=(cur+1)%slots.length;
    hotbarSelected=parseInt(slots[next].dataset.i);
    updateHotbar();
    // If in build mode, also update selected tile from palette
    if(buildMode){
      const i=TILE_LIST.indexOf(selectedTile);
      const nextI=(i+1)%TILE_LIST.length;
      selectedTile=TILE_LIST[nextI];
      document.querySelectorAll('#palette .tb').forEach(b=>b.classList.toggle('active',b.dataset.t===selectedTile));
    }
  }
}

// ═══════════════════════════════════════════════════
//  PLAYER MOVEMENT (fixed W=forward S=backward)
// ═══════════════════════════════════════════════════
const _fwd=new THREE.Vector3(),_right=new THREE.Vector3(),_mdir=new THREE.Vector3();

function updatePlayerHP(){
  const pct=charState.hp/charState.maxhp;
  const fill=document.getElementById('player-hp-fill');
  const lbl=document.getElementById('player-hp-label');
  if(fill){fill.style.width=(pct*100)+'%';fill.style.background=pct>.5?'#52b788':pct>.25?'#ffd166':'#e63946';}
  if(lbl)lbl.textContent='❤️ '+Math.ceil(charState.hp)+' / '+charState.maxhp;
}

function updatePlayerHP(){
  const pct=charState.hp/charState.maxhp;
  const fill=document.getElementById('player-hp-fill');
  const lbl=document.getElementById('player-hp-label');
  if(fill){fill.style.width=(pct*100)+'%';fill.style.background=pct>.5?'#52b788':pct>.25?'#ffd166':'#e63946';}
  if(lbl)lbl.textContent='❤️ '+Math.ceil(charState.hp)+' / '+charState.maxhp;
}

function updatePlayer(dt){
  // W=forward into screen (negative Z when camYaw=0)
  // camYaw rotates clockwise, so forward vector = (-sin, 0, -cos)
  _fwd.set(-Math.sin(camYaw),0,-Math.cos(camYaw));
  // right = fwd rotated 90° right = (-cos, 0, sin) → nope, use cross product
  _right.crossVectors(_fwd,new THREE.Vector3(0,1,0)).normalize();
  // _right now points to the RIGHT when facing forward

  const mF=(K['KeyW']||K['ArrowUp']   ||K['mup']   ?1:0)-(K['KeyS']||K['ArrowDown'] ||K['mdown'] ?1:0);
  const mR=(K['KeyD']||K['ArrowRight'] ||K['mright']?1:0)-(K['KeyA']||K['ArrowLeft'] ||K['mleft'] ?1:0);
  const moving=mF!==0||mR!==0;

  _mdir.set(0,0,0);
  if(moving){
    _mdir.addScaledVector(_fwd,mF);
    _mdir.addScaledVector(_right,mR);
    _mdir.normalize();
    charState.facingAngle=Math.atan2(_mdir.x,_mdir.z);
  }

  const spd=(K['ShiftLeft']||K['ShiftRight'])?16:7.5;
  // Move freely — world shifts when reaching edge
  charState.pos.x+=_mdir.x*spd*dt;
  charState.pos.z+=_mdir.z*spd*dt;
  // Only clamp to prevent going fully off the active grid
  const _hw=(GRID*CELL)/2-CELL*0.5;
  charState.pos.x=Math.max(-_hw,Math.min(_hw,charState.pos.x));
  charState.pos.z=Math.max(-_hw,Math.min(_hw,charState.pos.z));

  const{col,row}=cellOf(charState.pos.x,charState.pos.z);
  const elev=inGrid(row,col)?elevGrid[row][col]:0;
  const groundY=BASE_H+elev*ELEV_STEP;
  if(charState.jumping){
    charState.velY-=22*dt; charState.pos.y+=charState.velY*dt;
    if(charState.pos.y<=groundY){charState.pos.y=groundY;charState.jumping=false;charState.velY=0;}
  } else charState.pos.y=groundY;

  charGroup.position.copy(charState.pos);
  charGroup.rotation.y=charState.facingAngle;
  // Update world coords HUD
  const _wc=document.getElementById('hud-coords');
  if(_wc){const _col=cellOf(charState.pos.x,charState.pos.z);_wc.textContent=(worldOffX+_col.col-Math.floor(GRID/2))+', '+(worldOffZ+_col.row-Math.floor(GRID/2));}

  // Player damage from nearby enemies
  if(charState.damageCooldown>0) charState.damageCooldown-=dt;
  if(!charState.dead && charState.damageCooldown<=0){
    for(const e of entities){
      if(!e.alive)continue;
      const isEnemy_=(playerSide==='human')?(isWild(e)||isUndead(e)):(isNPC(e)&&(e.role==='guard'||e.role==='farmer'));
      if(!isEnemy_)continue;
      const d=charState.pos.distanceTo(e.pos);
      if(d<2.2){
        const dmg=isUndead(e)?10:isWild(e)?14:(e.role==='guard'?20:12);
        charState.hp=Math.max(0,charState.hp-dmg);
        charState.damageCooldown=1.5; // 1.5s invincibility
        playNote(200,'sawtooth',.1,.15);
        showToast('💔 -'+dmg+' HP');
        updatePlayerHP();
        if(charState.hp<=0){
          charState.dead=true;
          showToast('💀 You died! Press Esc to return to menu');
          setTimeout(()=>{ isPaused=true; if(mouseActive)document.exitPointerLock(); else showPause(); document.getElementById('lock-title').textContent='💀 You Died'; },1500);
        }
        break;
      }
    }
  }

  const sw=moving?Math.sin(clk.t*6)*.45:0;
  const bob=moving?Math.abs(Math.sin(clk.t*6))*.04:0;
  const lL=charMesh.getObjectByName('legL'),lR=charMesh.getObjectByName('legR');
  const aL=charMesh.getObjectByName('armL'),aR=charMesh.getObjectByName('armR');
  if(lL)lL.rotation.x=sw; if(lR)lR.rotation.x=-sw;
  if(aL)aL.rotation.x=-sw*.6; if(aR)aR.rotation.x=sw*.6;
  charMesh.position.y=bob;
  charState.moving=moving;

  // ── Tamed dogs follow and protect ──────────────
  for(const dog of tamedDogs){
    if(!dog.alive){continue;}
    const d=charState.pos.distanceTo(dog.pos);
    // Follow player
    if(d>4){
      const dx=charState.pos.x-dog.pos.x, dz=charState.pos.z-dog.pos.z;
      const dn=Math.sqrt(dx*dx+dz*dz)||1;
      dog.pos.x+=dx/dn*dog.speed*dt;
      dog.pos.z+=dz/dn*dog.speed*dt;
      dog.mesh.rotation.y=Math.atan2(dx/dn,dz/dn);
      dog.mesh.position.copy(dog.pos);
    }
    // Attack nearby enemies
    if(dog.timers&&dog.timers.attack<=0){
      for(const e of entities){
        if(!e.alive||(!isWild(e)&&!isUndead(e))||e===dog)continue;
        if(dog.pos.distanceTo(e.pos)<3){
          dealDamage(dog,e,20);
          if(dog.timers)dog.timers.attack=1.2;
          pushNotif('🐕 Dog attacked '+e.type+'!');
          break;
        }
      }
    }
  }
  // Remove dead dogs from list
  for(let i=tamedDogs.length-1;i>=0;i--){if(!tamedDogs[i].alive)tamedDogs.splice(i,1);}

  // ── Attack cooldown ──────────────────────────────
  if(charState.attackCooldown>0) charState.attackCooldown-=dt;

  // ── Chop timer: increment while LMB held on a tree ──
  if(charState.choppingCell && lmbHeld){
    const{r,c}=charState.choppingCell;
    if(worldGrid[r]&&worldGrid[r][c]==='tree'){
      charState.chopTimer+=dt;
      const pct=Math.floor(charState.chopTimer/3*100);
      if(pct<100) pushNotif('Chopping '+Math.min(99,pct)+'%... 🪓');
      if(charState.chopTimer>=3){
        const woodAmt=Math.random()<0.1?8:1+Math.floor(Math.random()*4);
        addItem('wood',woodAmt);
        setTile(r,c,'grass');
        playNote(260,'sawtooth',.07,.2);
        pushNotif('Chopped! +'+woodAmt+' wood 🪵');
        charState.choppingCell=null; charState.chopTimer=0; lmbHeld=false;
      }
    } else {
      charState.choppingCell=null; charState.chopTimer=0;
    }
  } else if(!lmbHeld && charState.chopTimer>0){
    charState.chopTimer=0; charState.choppingCell=null;
  }
}
function updateCamera(){
  const arm=10;
  const cx=charState.pos.x+Math.sin(camYaw)*Math.cos(camPitch)*arm;
  const cy=charState.pos.y+Math.sin(-camPitch)*arm+2;
  const cz=charState.pos.z+Math.cos(camYaw)*Math.cos(camPitch)*arm;
  _camPos.set(cx,cy,cz);
  camera.position.lerp(_camPos,.1);
  _camLook.copy(charState.pos).add(new THREE.Vector3(0,1.6,0));
  camera.lookAt(_camLook);
}

// ═══════════════════════════════════════════════════
//  ENTITY SYSTEM
// ═══════════════════════════════════════════════════
const entities=[];
const tamedDogs=[]; // tamed wolves that follow player

// ─── Mesh builders ───────────────────────────────
function buildAnimalMesh(type){
  const g=new THREE.Group();
  const configs={
    cow:    {bodyC:0xf5f5dc,legC:0x8B4513,headC:0xf0e0c0,sz:1},
    sheep:  {bodyC:0xf0f0f0,legC:0xd4c9a8,headC:0xd4c9a8,sz:0.85},
    chicken:{bodyC:0xffffff,legC:0xffa500,headC:0xffffff,sz:0.55},
    wolf:   {bodyC:0x5a5a6a,legC:0x4a4a5a,headC:0x7a7a8a,sz:0.85},
    bear:   {bodyC:0x5a3a1a,legC:0x4a2a0a,headC:0x6a4a2a,sz:1.15},
    zombie: {bodyC:0x4a7a4a,legC:0x2a4a2a,headC:0x5a8a5a,sz:0.9},
    skeleton:{bodyC:0xd4d4d4,legC:0xc4c4c4,headC:0xe0e0e0,sz:0.9},
  };
  const cfg=configs[type]||configs.cow;
  const s=cfg.sz;

  if(type==='chicken'){
    const body=new THREE.Mesh(new THREE.SphereGeometry(s*.28,8,8),mF(cfg.bodyC));body.position.y=s*.35;body.scale.set(1,.8,1);g.add(body);
    const head=new THREE.Mesh(new THREE.SphereGeometry(s*.16,7,7),mF(cfg.bodyC));head.position.set(s*.22,s*.54,0);g.add(head);
    const beak=new THREE.Mesh(new THREE.ConeGeometry(s*.06,s*.1,4),mF(0xffa500));beak.position.set(s*.38,s*.53,0);beak.rotation.z=-Math.PI/2;g.add(beak);
    const comb=new THREE.Mesh(new THREE.SphereGeometry(s*.08,5,5),mF(0xff2222));comb.position.set(s*.2,s*.66,0);g.add(comb);
    [[s*.1,s*.1],[s*.1,-s*.1]].forEach(([lx,lz],i)=>{const leg=new THREE.Mesh(new THREE.CylinderGeometry(s*.03,s*.03,s*.18,5),mF(0xffa500));leg.position.set(lx,s*.12,lz);leg.name='leg'+i;g.add(leg);});
    return g;
  }
  if(type==='sheep'){
    const body=new THREE.Mesh(new THREE.BoxGeometry(s*.9,s*.6,s*.6),mF(0xf0f0f0));body.position.y=s*.55;g.add(body);
    for(let i=0;i<7;i++){const bump=new THREE.Mesh(new THREE.SphereGeometry(s*(.2+Math.random()*.08),6,6),mF(0xfefefe));bump.position.set((Math.random()-.5)*s*.7,s*.65+Math.random()*s*.12,(Math.random()-.5)*s*.4);g.add(bump);}
    const head=new THREE.Mesh(new THREE.BoxGeometry(s*.32,s*.32,s*.32),mF(0xd4c9a8));head.position.set(s*.55,s*.7,0);g.add(head);
    [[s*.28,s*.22],[s*.28,-s*.22],[-s*.28,s*.22],[-s*.28,-s*.22]].forEach(([lx,lz],i)=>{const l=new THREE.Mesh(new THREE.BoxGeometry(s*.13,s*.4,s*.13),mF(0xd4c9a8));l.position.set(lx,s*.2,lz);l.name='leg'+i;g.add(l);});
    return g;
  }

  // Generic quadruped
  const body=new THREE.Mesh(new THREE.BoxGeometry(s*.9,s*.55,s*.55),mF(cfg.bodyC));body.position.y=s*.55;body.castShadow=true;g.add(body);
  const head=new THREE.Mesh(new THREE.BoxGeometry(s*.45,s*.42,s*.42),mF(cfg.headC));head.position.set(s*.52,s*.72,0);head.castShadow=true;g.add(head);
  const sn=new THREE.Mesh(new THREE.BoxGeometry(s*.18,s*.18,s*.28),mF(cfg.headC));sn.position.set(s*.7,s*.65,0);g.add(sn);
  [[s*.28,s*.22],[s*.28,-s*.22],[-s*.28,s*.22],[-s*.28,-s*.22]].forEach(([lx,lz],i)=>{
    const l=new THREE.Mesh(new THREE.BoxGeometry(s*.16,s*.45,s*.16),mF(cfg.legC));l.position.set(lx,s*.22,lz);l.name='leg'+i;g.add(l);
  });

  // Special bits
  if(type==='wolf'){
    const fang=new THREE.Mesh(new THREE.ConeGeometry(s*.04,s*.1,4),mF(0xffffff));fang.position.set(s*.77,s*.57,0);fang.rotation.z=Math.PI;g.add(fang);
    const tail=new THREE.Mesh(new THREE.CylinderGeometry(s*.06,s*.03,s*.5,5),mF(cfg.bodyC));tail.position.set(-s*.55,s*.65,0);tail.rotation.z=.6;tail.name='tail';g.add(tail);
  }
  if(type==='bear'){
    [-1,1].forEach(s2=>{const ear=new THREE.Mesh(new THREE.SphereGeometry(s*.12,5,5),mF(cfg.bodyC));ear.position.set(s*.58,s*.97,s2*s*.22);g.add(ear);});
  }
  if(type==='zombie'||type==='skeleton'){
    // Upright bipedal
    g.children.forEach(c=>g.remove(c));
    const torso=new THREE.Mesh(new THREE.BoxGeometry(s*.6,s*.7,s*.35),mF(cfg.bodyC));torso.position.y=s*.85;g.add(torso);
    const hd=new THREE.Mesh(new THREE.BoxGeometry(s*.45,s*.45,s*.42),mF(cfg.headC));hd.position.y=s*1.5;g.add(hd);
    if(type==='zombie'){
      // Outstretched arms
      [-1,1].forEach(side=>{
        const arm=new THREE.Mesh(new THREE.BoxGeometry(s*.2,s*.55,s*.22),mF(cfg.bodyC));
        arm.position.set(side*s*.5,s*.95,s*.25);arm.rotation.x=-.8;arm.name='arm'+side;g.add(arm);
      });
    } else {
      // Skeleton: ribs visible
      [0,1].forEach(i=>{const rib=new THREE.Mesh(new THREE.BoxGeometry(s*.55,s*.08,s*.3),mF(0xd4d4d4));rib.position.set(0,s*(.55+i*.18),0);g.add(rib);});
      [-1,1].forEach(side=>{const arm=new THREE.Mesh(new THREE.CylinderGeometry(s*.06,s*.06,s*.5,5),mF(0xd4d4d4));arm.position.set(side*s*.5,s*.9,0);arm.rotation.z=side*.5;g.add(arm);});
    }
    ['legL','legR'].forEach((nm,i)=>{const l=new THREE.Mesh(new THREE.BoxGeometry(s*.22,s*.6,s*.22),mF(cfg.legC));l.position.set((i===0?.15:-.15)*s,s*.28,0);l.name=nm;g.add(l);});
  }
  return g;
}

// ─── Type sets & helpers (declared early — used inside spawnEntity) ──
const FARM_T=new Set(['cow','sheep','chicken']);
const WILD_T=new Set(['wolf','bear']);
const UNDEAD_T=new Set(['zombie','skeleton']);
function isFarm(e){return FARM_T.has(e.type);}
function isWild(e){return WILD_T.has(e.type);}
function isUndead(e){return UNDEAD_T.has(e.type);}
function isNPC(e){return e.type==='npc';}
function isEnemy(e){return isWild(e)||isUndead(e);}

// ─── NPC builders ────────────────────────────────
const NPC_ROLES={
  farmer:   {bodyC:0xa0522d,hatC:0x8b4513,pantsC:0x3a3a2a,label:'🌾'},
  carpenter:{bodyC:0x6b4226,hatC:0x4a2e18,pantsC:0x2a2a4a,label:'🪓'},
  guard:    {bodyC:0x4a4a8a,hatC:0x2a2a6a,pantsC:0x2a2a5a,label:'⚔️'},
  child:    {bodyC:0xff9999,hatC:0xffcc44,pantsC:0x4488cc,label:'👦',sz:.65},
  fisherman:{bodyC:0x2266aa,hatC:0x114488,pantsC:0x1a3a5a,label:'🎣'},
  hunter:   {bodyC:0x556644,hatC:0x334422,pantsC:0x3a2a1a,label:'🏹'},
  miner:    {bodyC:0x666655,hatC:0x444433,pantsC:0x333322,label:'⛏️'},
};
function buildNPCMesh(role){
  const cfg=NPC_ROLES[role]||NPC_ROLES.guard;
  const sz=cfg.sz||1;
  const g=buildHumanoid(cfg.bodyC,cfg.hatC,cfg.pantsC,sz);
  // Tool
  if(role==='guard'){
    const sw=new THREE.Mesh(new THREE.BoxGeometry(.06,.75,.06),mF(0xaaaaaa));sw.position.set(.5,.9,.2);sw.rotation.z=.25;sw.name='tool';g.add(sw);
    const sh=new THREE.Mesh(new THREE.BoxGeometry(.5,.6,.06),mF(0x4a4a8a));sh.position.set(-.5,.85,.1);sh.name='shield';g.add(sh);
  }
  if(role==='farmer'){
    const hoe=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,.8,5),mF(0x7a4f2e));hoe.position.set(.45,.9,.2);hoe.rotation.z=.3;hoe.name='tool';g.add(hoe);
  }
  if(role==='carpenter'){
    const axe=new THREE.Mesh(new THREE.BoxGeometry(.15,.35,.06),mF(0x999999));axe.position.set(.45,1.1,.2);axe.name='tool';g.add(axe);
  }
  if(role==='fisherman'){
    const rod=new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,.9,5),mF(0x7a4f2e));rod.position.set(.45,1,.25);rod.rotation.z=-.4;rod.name='tool';g.add(rod);
  }
  if(role==='hunter'){
    const bow=new THREE.Mesh(new THREE.TorusGeometry(.3,.04,6,12,Math.PI),mF(0x7a4f2e));bow.position.set(.45,1,.1);bow.rotation.y=Math.PI/2;bow.name='tool';g.add(bow);
    const arr=new THREE.Mesh(new THREE.CylinderGeometry(.02,.02,.6,4),mF(0xaaaaaa));arr.position.set(.45,.95,.1);arr.rotation.z=Math.PI/2;g.add(arr);
  }
  if(role==='miner'){
    // pickaxe
    const hndl=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,.75,5),mF(0x7a4f2e));hndl.position.set(.42,.95,.15);hndl.rotation.z=.4;hndl.name='tool';g.add(hndl);
    const hd=new THREE.Mesh(new THREE.BoxGeometry(.28,.14,.1),mF(0x888888));hd.position.set(.62,1.2,.15);g.add(hd);
  }
  // Label sprite (simple colored sphere above head)
  const badge=new THREE.Mesh(new THREE.SphereGeometry(.12,6,6),mF(cfg.hatC));
  badge.position.y=sz*2.4; g.add(badge);
  return g;
}

// ─── Health bar ───────────────────────────────────
function addHealthBar(mesh,offsetY=2.4){
  const cv=document.createElement('canvas');cv.width=64;cv.height=10;
  const ctx2=cv.getContext('2d');
  const tex=new THREE.CanvasTexture(cv);
  const hbm=new THREE.Mesh(new THREE.PlaneGeometry(.8,.12),new THREE.MeshBasicMaterial({map:tex,transparent:true,depthTest:false}));
  hbm.rotation.x=-Math.PI/2.2;hbm.position.y=offsetY;hbm.name='hbar';mesh.add(hbm);
  return{cv,ctx2,tex,hbm};
}
function drawHP(ent){
  if(!ent.hb)return;
  const{cv,ctx2,tex}=ent.hb;
  ctx2.clearRect(0,0,64,10);
  ctx2.fillStyle='#222';ctx2.fillRect(0,0,64,10);
  const pct=Math.max(0,ent.hp/ent.maxhp);
  ctx2.fillStyle=pct>.6?'#52b788':pct>.3?'#ffd166':'#e63946';
  ctx2.fillRect(1,1,Math.round(62*pct),8);
  tex.needsUpdate=true;
  ent.hb.hbm.visible=ent.hp<ent.maxhp;
}

// ─── Spawn entity ─────────────────────────────────
function spawnEntity(type,x,z,role){
  let mesh,hp=100,speed=2;
  if(['farmer','carpenter','guard','child','fisherman'].includes(type)||role){
    const r=role||type;
    mesh=buildNPCMesh(r);
    hp=role==='guard'?180:120;
    speed=r==='child'?1.8:r==='fisherman'?1.5:2;
    type='npc';
  } else {
    mesh=buildAnimalMesh(type);
    const hps={cow:80,sheep:50,chicken:30,wolf:120,bear:200,zombie:80,skeleton:100};
    const spds={cow:1.2,sheep:1.5,chicken:1.8,wolf:2.8,bear:1.6,zombie:1.4,skeleton:1.8};
    hp=hps[type]||80; speed=spds[type]||2;
  }
  const pos=new THREE.Vector3(x,BASE_H,z);
  mesh.position.copy(pos);
  scene.add(mesh);
  const hb=addHealthBar(mesh,type==='npc'?2.6:2.2);
  // sunProof: undead wearing wool clothes survive daylight
  const sunProof=(isUndead({type})&&inventory.wool>0&&Math.random()<0.3);
  if(sunProof) inventory.wool=Math.max(0,inventory.wool-1);
  const angle=Math.random()*Math.PI*2;
  const ent={mesh,type,role:role||type,pos,hp,maxhp:hp,speed,
    state:'idle',target:null,alive:true,
    sunProof,
    facingAngle:angle,
    inShelter:false,
    insideBuilding:false,
    breedTimer: isFarm({type}) ? (DAY_DURATION*2 + Math.random()*DAY_DURATION) : 0,
    breedPartner: null,
    relationshipTimer: (type==='npc'&&!['child'].includes(role||type)) ? (DAY_DURATION*4 + Math.random()*DAY_DURATION*2) : 0,
    partner: null,
    timers:{wander:Math.random()*3,attack:0,work:0,grow:type==='npc'&&role==='child'?120:0},
    wanderDir:new THREE.Vector3(Math.sin(angle),0,Math.cos(angle)),
    hb,
    homePos:new THREE.Vector3(x,BASE_H,z),
    carryItem:null,
    healCooldown:0,
    satiety: type==='npc'?100:null,  // NPC hunger (0=starving)
    satietyTimer: 30+Math.random()*20, // drain every ~35s
    weapon:null, // equipped weapon
  };
  // Clothed undead get a purple tint
  if(sunProof) mesh.traverse(c=>{if(c.material)c.material=c.material.clone&&c.material.clone();if(c.material&&c.material.color)c.material.color.set(0x7a3a9a);});
  drawHP(ent);
  entities.push(ent);
  return ent;
}

// Spawn initial world
function rF(){return(Math.random()-.5)*20;}
function rW(){return(Math.random()<.5?1:-1)*(22+Math.random()*10);}

// Farm animals
['cow','cow','cow','sheep','sheep','sheep','sheep','chicken','chicken','chicken','chicken','chicken'].forEach(t=>spawnEntity(t,rF(),rF()));
// Wild animals (start at forest edges)
spawnEntity('wolf',rW(),rW()); spawnEntity('wolf',rW(),rW()); spawnEntity('wolf',rW(),rW());
spawnEntity('bear',rW(),rW()); spawnEntity('bear',rW(),rW());
// NPCs with roles
spawnEntity('npc',-4,-6,'farmer');  spawnEntity('npc',4,-6,'farmer');
spawnEntity('npc',-6, 4,'carpenter'); spawnEntity('npc',6,4,'carpenter');
spawnEntity('npc',-3, 2,'guard'); spawnEntity('npc',3,2,'guard'); spawnEntity('npc',0,6,'guard');
spawnEntity('npc', 1,-2,'child'); spawnEntity('npc',-2,1,'child');
spawnEntity('npc', 8,10,'fisherman'); spawnEntity('npc',-8,10,'fisherman');

// ─── Entity query helpers ─────────────────────────
function nearest(ent,filter,maxD=999){
  let best=null,bestD=maxD*maxD;
  for(const e of entities){if(!e.alive||e===ent||!filter(e))continue;const d=ent.pos.distanceToSquared(e.pos);if(d<bestD){bestD=d;best=e;}}
  return best;
}
function nearestWater(pos){
  let best=null,bestD=999;
  for(let r=0;r<GRID;r++) for(let c=0;c<GRID;c++){
    if(worldGrid[r][c]==='water'){const wx=wX(c),wz=wZ(r);const d=Math.hypot(pos.x-wx,pos.z-wz);if(d<bestD){bestD=d;best={x:wx,z:wz};}}
  }
  return best;
}
function nearestTree(pos){
  let best=null,bestD=999;
  for(let r=0;r<GRID;r++) for(let c=0;c<GRID;c++){
    if(worldGrid[r][c]==='tree'){const wx=wX(c),wz=wZ(r);const d=Math.hypot(pos.x-wx,pos.z-wz);if(d<bestD){bestD=d;best={r,c,x:wx,z:wz};}}
  }
  return best;
}

function dealDamage(attacker,target,dmg){
  target.hp-=dmg;
  drawHP(target);
  if(target.hp<=0) killEntity(target,attacker);
}

function healEntity(target,amt){
  target.hp=Math.min(target.maxhp,target.hp+amt);
  drawHP(target);
  showToast(`💊 Healed +${amt}`);
}

function killEntity(ent,killer){
  ent.alive=false;
  scene.remove(ent.mesh);
  const idx=entities.indexOf(ent);if(idx>=0)entities.splice(idx,1);

  if(playerSide==='wild'&&isNPC(ent)){addWildPower(12);showToast('💀 +Dark Power!');}
  if(playerSide==='human'&&isEnemy(ent)){coins+=isUndead(ent)?8:5;document.getElementById('hud-coins').textContent=Math.floor(coins);}

  // Undead drops — go to nearby guard's pocket, OR player if they killed it
  if(isUndead(ent)){
    const dropItem=ent.type==='skeleton'?'bones':'zombie_blood';
    const dropName=ent.type==='skeleton'?'bones 🦴':'zombie blood 🩸';
    // Check if player killed it (killer===null means dealDamage from player via doMeleeAttack)
    if(killer===null||killer===undefined){
      // Player killed it
      addItem(dropItem,1);
      pushNotif('You got '+dropName+'!');
    } else {
      // Guard or other NPC killed it — drops to nearest guard
      const guard=nearest({pos:ent.pos},e=>isNPC(e)&&e.role==='guard',12);
      if(guard){npcGather(guard,dropItem,1);pushNotif('Guard collected '+dropName);}
    }
  }

  // Drops — wild animal meat goes to nearby hunter, NOT player auto-bag
  if(isWild(ent)){
    const hunter=nearest({pos:ent.pos},e=>isNPC(e)&&e.role==='hunter',10);
    if(hunter){
      npcGather(hunter,'meat',2);
      pushNotif('Hunter got meat 🥩');
    }
    // Wild side player heals on kill
    if(playerSide==='wild'){charState.hp=Math.min(charState.maxhp,charState.hp+15);updatePlayerHP();}
  }
  // Farm animal killed — only drops if player kills them (handled in doInteract)
  // NPCs (farmers) never kill farm animals for meat
  if(isNPC(ent)&&playerSide==='wild'){
    charState.hp=Math.min(charState.maxhp,charState.hp+10);updatePlayerHP();
  }

  // Respawn logic
  if(isWild(ent)) setTimeout(()=>spawnEntity(ent.type,rW(),rW()),25000);
  if(isUndead(ent)) return; // no respawn
  if(isFarm(ent)) setTimeout(()=>spawnEntity(ent.type,rF(),rF()),18000);
  if(isNPC(ent))  setTimeout(()=>{if(isVillage())spawnEntity('npc',rF(),rF(),ent.role);},30000);
}

// ─── Helpers ─────────────────────────────────────

// Shelter = house or barn position
function nearestShelter(pos){
  return nearestBuildingOf(pos,'house',9999)||nearestBuildingOf(pos,'barn',9999);
}
function nearestBuildingOf(pos,tileType,maxDist){
  let best=null,bestD=maxDist*maxDist;
  for(let r=0;r<GRID;r++) for(let c=0;c<GRID;c++){
    if(worldGrid[r][c]===tileType){
      const wx=wX(c),wz=wZ(r);
      const d2=(pos.x-wx)**2+(pos.z-wz)**2;
      if(d2<bestD){bestD=d2;best={x:wx,z:wz};}
    }
  }
  return best;
}

// Fence bounds for child containment
function isInsideFence(x,z){
  // Check if any adjacent cell has a fence (rough check: stay within the fence ring)
  const{col,row}=cellOf(x,z);
  for(let dr=-3;dr<=3;dr++) for(let dc=-3;dc<=3;dc++){
    if(inGrid(row+dr,col+dc)&&worldGrid[row+dr][col+dc]==='fence') return true;
  }
  return false;
}

// Limb animation – extracted so all entities use the same facing logic
function animateLimbs(ent,moving,dt){
  const rate=ent.type==='chicken'?14:7;
  const sw=moving?Math.sin(clk.t*rate)*.4:0;
  // Quadrupeds
  for(let i=0;i<4;i++){const lg=ent.mesh.getObjectByName('leg'+i);if(lg)lg.rotation.x=(i%2===0?sw:-sw);}
  // Bipeds (NPC/undead)
  const lL=ent.mesh.getObjectByName('legL'),lR=ent.mesh.getObjectByName('legR');
  const aL=ent.mesh.getObjectByName('armL'),aR=ent.mesh.getObjectByName('armR');
  if(lL)lL.rotation.x=sw; if(lR)lR.rotation.x=-sw;
  if(aL)aL.rotation.x=-sw*.6; if(aR)aR.rotation.x=sw*.6;
  if(ent.type==='chicken') ent.mesh.position.y=BASE_H+Math.abs(Math.sin(clk.t*8))*.05;
  // Wolf tail
  if(ent.type==='wolf'){const tl=ent.mesh.getObjectByName('tail');if(tl)tl.rotation.z=.6+Math.sin(clk.t*5)*.3;}
}

// ─── AI update ────────────────────────────────────
const _v=new THREE.Vector3();
const _vf=new THREE.Vector3();
// moveToward: moves ent toward (tx,tz), sets mesh facing correctly
// Three.js: rotation.y=0 faces +Z, rotation.y=PI faces -Z
// atan2(dx,dz) gives angle where +Z=0, +X=PI/2 — correct for Three.js Y rotation
// ── Fence collision for hostile entities ──────────
function cellHasFence(wx,wz){
  const{col,row}=cellOf(wx,wz);
  return inGrid(row,col)&&worldGrid[row][col]==='fence';
}
function blockedByFence(ent,nx,nz,spd,dt){
  if(!isWild(ent)&&!isUndead(ent)) return false;
  const nx2=ent.pos.x+nx*spd*dt*2; // probe ahead
  const nz2=ent.pos.z+nz*spd*dt*2;
  return cellHasFence(nx2,nz2);
}

// ── Facing helper ─────────────────────────────────
function snapFacing(ent, nx, nz){
  if(Math.abs(nx)<0.001&&Math.abs(nz)<0.001) return;
  const target = Math.atan2(nx, nz);
  // Fast lerp so facing is nearly immediate (no visible lag)
  let diff = target - (ent.facingAngle||0);
  while(diff > Math.PI)  diff -= Math.PI*2;
  while(diff < -Math.PI) diff += Math.PI*2;
  ent.facingAngle = (ent.facingAngle||0) + diff * 0.35;
  ent.mesh.rotation.y = ent.facingAngle;
}

function moveToward(ent,tx,tz,spd,dt){
  const dx=tx-ent.pos.x, dz=tz-ent.pos.z;
  const d=Math.sqrt(dx*dx+dz*dz);
  if(d<0.25){ ent.mesh.rotation.y=ent.facingAngle||0; return d; }
  const nx=dx/d, nz=dz/d;
  snapFacing(ent, nx, nz);
  if(!blockedByFence(ent,nx,nz,spd,dt)){
    ent.pos.x=Math.max(-HALF_WORLD,Math.min(HALF_WORLD,ent.pos.x+nx*spd*dt));
    ent.pos.z=Math.max(-HALF_WORLD,Math.min(HALF_WORLD,ent.pos.z+nz*spd*dt));
  }
  return d;
}
function moveAway(ent,fx,fz,spd,dt){
  const dx=ent.pos.x-fx, dz=ent.pos.z-fz;
  const d=Math.sqrt(dx*dx+dz*dz)||1;
  const nx=dx/d, nz=dz/d;
  snapFacing(ent, nx, nz);
  if(!blockedByFence(ent,nx,nz,spd,dt)){
    ent.pos.x=Math.max(-HALF_WORLD,Math.min(HALF_WORLD,ent.pos.x+nx*spd*dt));
    ent.pos.z=Math.max(-HALF_WORLD,Math.min(HALF_WORLD,ent.pos.z+nz*spd*dt));
  }
}
function applyWander(ent,spd,dt){
  if(ent.timers.wander<=0){
    // Pick a random angle and bake it into wanderDir immediately
    const angle=Math.random()*Math.PI*2;
    ent.wanderDir.x=Math.sin(angle);
    ent.wanderDir.z=Math.cos(angle);
    ent.wanderDir.y=0;
    ent.timers.wander=2.5+Math.random()*3;
    // Snap face to new direction right away
    snapFacing(ent, ent.wanderDir.x, ent.wanderDir.z);
  }
  snapFacing(ent, ent.wanderDir.x, ent.wanderDir.z);
  if(blockedByFence(ent,ent.wanderDir.x,ent.wanderDir.z,spd,dt)){
    // Bounce: pick new direction
    const a=Math.random()*Math.PI*2;
    ent.wanderDir.x=Math.sin(a); ent.wanderDir.z=Math.cos(a);
    ent.timers.wander=1.5;
  } else {
    ent.pos.x=Math.max(-HALF_WORLD,Math.min(HALF_WORLD,ent.pos.x+ent.wanderDir.x*spd*dt));
    ent.pos.z=Math.max(-HALF_WORLD,Math.min(HALF_WORLD,ent.pos.z+ent.wanderDir.z*spd*dt));
  }
  return true;
}

function updateEntities(dt){
  const WH=HALF_WORLD;
  let farmAlive=0,npcAlive=0;
  const entsCopy=[...entities];

  for(const ent of entsCopy){
    if(!ent.alive)continue;
    if(isFarm(ent))farmAlive++;
    if(isNPC(ent))npcAlive++;

    ent.timers.wander-=dt;
    ent.timers.attack-=dt;
    ent.timers.work-=dt;
    ent.healCooldown-=dt;

    // Satiety for NPCs
    if(isNPC(ent) && ent.satiety!==null){
      ent.satietyTimer-=dt;
      if(ent.satietyTimer<=0){
        ent.satiety=Math.max(0,ent.satiety-8);
        ent.satietyTimer=30+Math.random()*20;
        // Eat from own drops if hungry
        const idx=entities.indexOf(ent);
        const drops=npcDrops[idx]||{};
        if(ent.satiety<50){
          for(const food of ['fish','meat','milk']){
            if((drops[food]||0)>0){
              drops[food]--;
              ent.satiety=Math.min(100,ent.satiety+35);
              pushNotif(`${ent.role} ate ${food} (+35 satiety)`);
              break;
            }
          }
        }
        if(ent.satiety===0){
          // Starving: lose HP
          ent.hp=Math.max(1,ent.hp-5);
          drawHP(ent);
        }
      }
    }

    // If entity is inside a building, skip AI (it's resting)
    if(ent.insideBuilding) continue;

    const pos=ent.pos;
    let moving=false;

    // ── FARM ANIMALS ──────────────────────────────
    if(isFarm(ent)){
      const threat=nearest(ent,isEnemy,16);
      if(threat){
        moveAway(ent,threat.pos.x,threat.pos.z,ent.speed,dt);
        moving=true;
      } else {
        // Stay inside fence bounds roughly
        moving=applyWander(ent,ent.speed*.55,dt);
        if(Math.random()<.003) ent.timers.wander=0; // force new dir
        // Farm animals produce resources — farmer collects them
        if(Math.random()<.0003){
          const farmer=nearest(ent,e=>isNPC(e)&&e.role==='farmer',15);
          if(farmer){
            if(ent.type==='cow'){npcGather(farmer,'milk',1);pushNotif('Farmer gets milk 🥛');}
            if(ent.type==='sheep'){npcGather(farmer,'wool',1);pushNotif('Farmer shears sheep 🧶');}
            if(ent.type==='chicken'&&Math.random()<.3){npcGather(farmer,'eggs',1);pushNotif('Farmer collects eggs 🥚');}
          }
        }
      }
    }

    // ── WILD ANIMALS ──────────────────────────────
    if(isWild(ent)){
      const guardThreat=nearest(ent,e=>isNPC(e)&&e.role==='guard',10);
      const childPrey=nearest(ent,e=>isNPC(e)&&e.role==='child',18);
      const farmPrey=nearest(ent,isFarm,24);
      const prey=childPrey||farmPrey;

      if(guardThreat&&guardThreat.pos.distanceTo(pos)<8){
        moveAway(ent,guardThreat.pos.x,guardThreat.pos.z,ent.speed*.8,dt);
        moving=true;
      } else if(prey){
        const d=moveToward(ent,prey.pos.x,prey.pos.z,ent.speed,dt);
        moving=d>1.5;
        if(d<1.8&&ent.timers.attack<=0){
          dealDamage(ent,prey,ent.type==='bear'?25:15);
          ent.timers.attack=1.2;
        }
      } else {
        moving=applyWander(ent,ent.speed*.4,dt);
      }
    }

    // ── UNDEAD ────────────────────────────────────
    if(isUndead(ent)){
      if(!isNight&&!ent.sunProof){
        ent.hp-=8*dt; drawHP(ent);
        if(ent.hp<=0){killEntity(ent,null);continue;}
      }
      // At night: attack NPCs & farm
      const npcTarget=nearest(ent,isNPC,40);
      const farmTarget=nearest(ent,isFarm,25);
      const target=npcTarget||farmTarget;
      if(target){
        const d=moveToward(ent,target.pos.x,target.pos.z,ent.speed,dt);
        moving=d>1;
        if(d<1.8&&ent.timers.attack<=0){
          dealDamage(ent,target,ent.type==='skeleton'?20:12);
          ent.timers.attack=1.0;
        }
      } else {
        moving=applyWander(ent,ent.speed*.5,dt);
      }
    }

    // ── NPC AI ────────────────────────────────────
    if(isNPC(ent)){
      const enemy=nearest(ent,isEnemy,20);

      // ── FEAR AT NIGHT: seek shelter ──
      if(isNight&&ent.role!=='guard'&&!ent.inShelter){
        const shelter=nearestShelter(pos);
        if(shelter){
          const d=moveToward(ent,shelter.x,shelter.z,ent.speed*1.2,dt);
          moving=d>1.5;
          if(d<3) ent.inShelter=true;
          pos.x=Math.max(-WH,Math.min(WH,pos.x));
          pos.z=Math.max(-WH,Math.min(WH,pos.z));
          pos.y=BASE_H; ent.mesh.position.copy(pos);
          animateLimbs(ent,moving,dt);
          continue;
        }
      }
      if(!isNight) ent.inShelter=false;

      // ── CHILD ──
      if(ent.role==='child'){
        ent.timers.grow-=dt;
        if(ent.timers.grow<=0){
          const roles=['farmer','carpenter','guard','fisherman'];
          const newRole=roles[Math.floor(Math.random()*roles.length)];
          killEntity(ent,null);
          spawnEntity('npc',pos.x,pos.z,newRole);
          showToast('👶→👤 A child grew up!');
          continue;
        }
        if(enemy){
          moveAway(ent,enemy.pos.x,enemy.pos.z,ent.speed*1.3,dt);
          moving=true;
        } else {
          // Stay inside fence area (rough bounds -18 to 18)
          const maxRoam=16;
          if(Math.abs(pos.x)>maxRoam||Math.abs(pos.z)>maxRoam){
            // Walk back toward center
            const d=moveToward(ent,0,0,ent.speed*.6,dt);moving=d>1;
          } else {
            moving=applyWander(ent,ent.speed*.6,dt);
          }
        }
      }

      // ── GUARD ──
      else if(ent.role==='guard'){
        if(enemy){
          const d=moveToward(ent,enemy.pos.x,enemy.pos.z,ent.speed,dt);
          moving=d>1.5;
          if(d<2&&ent.timers.attack<=0){
            dealDamage(ent,enemy,35);
            ent.timers.attack=0.8;
            const sw=ent.mesh.getObjectByName('tool');
            if(sw){sw.rotation.z=-.8;setTimeout(()=>{if(sw)sw.rotation.z=.25;},180);}
          }
        } else {
          // Patrol: protect children/farm animals
          const ward=nearest(ent,e=>(isNPC(e)&&e.role==='child')||isFarm(e),40)||nearest(ent,isNPC,40);
          if(ward&&pos.distanceTo(ward.pos)>8){
            const d=moveToward(ent,ward.pos.x,ward.pos.z,ent.speed*.7,dt);moving=d>1;
          } else {
            moving=applyWander(ent,ent.speed*.3,dt);
          }
        }
      }

      // ── FARMER ──
      else if(ent.role==='farmer'){
        if(enemy&&isWild(enemy)&&pos.distanceTo(enemy.pos)<12){
          const d=moveToward(ent,enemy.pos.x,enemy.pos.z,ent.speed*.8,dt);
          moving=d>1.2;
          if(d<2&&ent.timers.attack<=0){dealDamage(ent,enemy,18);ent.timers.attack=1.4;}
        } else {
          const injured=nearest(ent,e=>isFarm(e)&&e.hp<e.maxhp*.7,18);
          if(injured&&ent.healCooldown<=0){
            const d=moveToward(ent,injured.pos.x,injured.pos.z,ent.speed,dt);
            moving=d>1.5;
            if(d<2){healEntity(injured,25);ent.healCooldown=8;}
          } else {
            const farm=nearest(ent,isFarm,30);
            if(farm&&pos.distanceTo(farm.pos)>8){
              const d=moveToward(ent,farm.pos.x,farm.pos.z,ent.speed*.5,dt);moving=d>1;
            } else {
              moving=applyWander(ent,ent.speed*.35,dt);
            }
          }
        }
      }

      // ── CARPENTER ──
      else if(ent.role==='carpenter'){
        if(enemy&&pos.distanceTo(enemy.pos)<8){
          moveAway(ent,enemy.pos.x,enemy.pos.z,ent.speed,dt);moving=true;
        } else if(ent.timers.work>0){
          // Doing work, stay still
          moving=false;
        } else {
          const tree=nearestTree(pos);
          if(tree){
            const d=moveToward(ent,tree.x,tree.z,ent.speed*.7,dt);moving=d>1;
            if(d<2.5&&ent.timers.work<=0){
              setTile(tree.r,tree.c,'grass');
              addItem('wood',2);
              ent.timers.work=10;
              playNote(260,'sawtooth',.04,.1);
              showToast('🪓 Carpenter chopped!');
            }
          } else {
            moving=applyWander(ent,ent.speed*.3,dt);
          }
        }
      }

      // ── FISHERMAN ──
      else if(ent.role==='fisherman'){
        if(enemy&&pos.distanceTo(enemy.pos)<10){
          moveAway(ent,enemy.pos.x,enemy.pos.z,ent.speed,dt);moving=true;
        } else {
          const water=nearestWater(pos);
          if(water){
            const d=moveToward(ent,water.x,water.z,ent.speed*.7,dt);
            moving=d>2.5;
            if(d<3){
              if(ent.timers.work<=0){npcGather(ent,'fish',1);pushNotif('Fisherman caught fish 🐟');ent.timers.work=7;}
              if(ent.healCooldown<=0){
                const hurt=nearest(ent,e=>isNPC(e)&&e.hp<e.maxhp*.8,10);
                if(hurt){healEntity(hurt,35);ent.healCooldown=10;}
              }
            }
          } else moving=applyWander(ent,ent.speed*.4,dt);
        }
      }

      else if(ent.role==='hunter'){
        const wildPrey=nearest(ent,e=>isWild(e),16);
        if(enemy&&pos.distanceTo(enemy.pos)<10){
          moveAway(ent,enemy.pos.x,enemy.pos.z,ent.speed,dt);moving=true;
        } else if(wildPrey){
          const d=pos.distanceTo(wildPrey.pos);
          if(d<8){
            const d2=moveToward(ent,wildPrey.pos.x,wildPrey.pos.z,ent.speed*.5,dt);
            moving=d2>1;
            if(d2<2&&ent.timers.attack<=0){
              dealDamage(ent,wildPrey,25);
              ent.timers.attack=1.5;
              if(d2>CELL) wildPrey.target=null;
            }
          }
        } else {
          moving=applyWander(ent,ent.speed*.4,dt);
        }
      }

      else if(ent.role==='miner'){
        // Find path tiles to mine stone/sparkstone from
        if(enemy&&pos.distanceTo(enemy.pos)<8){
          moveAway(ent,enemy.pos.x,enemy.pos.z,ent.speed,dt);moving=true;
        } else if(ent.timers.work>0){
          moving=false; // mining
        } else {
          // Find nearest path tile
          let pathTarget=null, pathD=999;
          for(let mr=0;mr<GRID;mr++) for(let mc=0;mc<GRID;mc++){
            if(worldGrid[mr][mc]==='path'){
              const d=Math.hypot(pos.x-wX(mc),pos.z-wZ(mr));
              if(d<pathD){pathD=d;pathTarget={r:mr,c:mc,x:wX(mc),z:wZ(mr)};}
            }
          }
          if(pathTarget){
            const d=moveToward(ent,pathTarget.x,pathTarget.z,ent.speed*.6,dt);
            moving=d>2;
            if(d<2.5&&ent.timers.work<=0){
              // Mine it
              const item=Math.random()<0.45?'sparkstone':'stone';
              npcGather(ent,item,1);
              pushNotif('Miner found '+item+' ⛏️');
              ent.timers.work=8;
            }
          } else {
            moving=applyWander(ent,ent.speed*.3,dt);
          }
        }
      }

      pos.x=Math.max(-WH,Math.min(WH,pos.x));
      pos.z=Math.max(-WH,Math.min(WH,pos.z));
    }

    pos.y=BASE_H;
    ent.mesh.position.copy(pos);
    animateLimbs(ent,moving,dt);
  }

  // ── BREEDING & SHELTER (run on all living entities) ──
  for(const ent of entsCopy){
    if(!ent.alive) continue;
    const pos=ent.pos;

    // ── Animal breeding ──────────────────────────
    if(isFarm(ent) && ent.breedTimer>0){
      ent.breedTimer-=dt;
      if(ent.breedTimer<=0){
        // Find same-type partner nearby
        const partner=nearest(ent, e=>isFarm(e)&&e.type===ent.type&&e!==ent&&e.alive, 8);
        if(partner){
          // Spawn baby near them
          const bx=pos.x+(Math.random()-.5)*2, bz=pos.z+(Math.random()-.5)*2;
          spawnEntity(ent.type, bx, bz);
          showToast('🐣 New '+ent.type+' baby born!');
          ent.breedTimer=DAY_DURATION*2+Math.random()*DAY_DURATION;
          partner.breedTimer=DAY_DURATION*2+Math.random()*DAY_DURATION;
        } else {
          ent.breedTimer=DAY_DURATION*0.5; // retry sooner
        }
      }
    }

    // ── NPC relationships & children ────────────
    if(isNPC(ent)&&ent.role!=='child'&&ent.relationshipTimer>0){
      ent.relationshipTimer-=dt;
      if(ent.relationshipTimer<=0){
        if(!ent.partner){
          const mate=nearest(ent, e=>isNPC(e)&&e.role!=='child'&&!e.partner&&e!==ent, 12);
          if(mate){
            ent.partner=mate; mate.partner=ent;
            showToast('💕 Two villagers formed a relationship!');
          }
          ent.relationshipTimer=DAY_DURATION*4+Math.random()*DAY_DURATION*2;
        } else if(ent.partner&&ent.partner.alive){
          // Have a child
          const bx=pos.x+(Math.random()-.5)*2, bz=pos.z+(Math.random()-.5)*2;
          spawnEntity('npc',bx,bz,'child');
          showToast('👶 A child was born to villagers!');
          ent.relationshipTimer=DAY_DURATION*6+Math.random()*DAY_DURATION*3;
          if(ent.partner) ent.partner.relationshipTimer=ent.relationshipTimer;
        } else {
          ent.partner=null; // partner died
          ent.relationshipTimer=DAY_DURATION*3;
        }
      }
    }

    // ── Shelter entry/exit for animals (barns) ───
    if(isFarm(ent)){
      const barn=nearestBuildingOf(pos,'barn',8);
      if(isNight&&barn&&!ent.insideBuilding){
        // Enter barn at night
        const d=moveToward(ent,barn.x,barn.z,ent.speed,dt);
        if(d<1.5){
          ent.insideBuilding=true;
          ent.mesh.visible=false; // inside
        }
      } else if(!isNight&&ent.insideBuilding){
        // Exit barn in morning
        ent.insideBuilding=false;
        ent.mesh.visible=true;
        ent.mesh.position.set(pos.x,BASE_H,pos.z);
      }
    }

    // ── Shelter entry/exit for NPCs (houses/barns) ──
    if(isNPC(ent)&&ent.role!=='guard'){
      const shelter=nearestBuildingOf(pos,'house',10)||nearestBuildingOf(pos,'barn',10);
      if(isNight&&shelter&&!ent.insideBuilding){
        const d=moveToward(ent,shelter.x,shelter.z,ent.speed*1.1,dt);
        if(d<1.5){
          ent.insideBuilding=true;
          ent.mesh.visible=false;
        }
      } else if(!isNight&&ent.insideBuilding){
        ent.insideBuilding=false;
        ent.mesh.visible=true;
        ent.mesh.position.set(pos.x,BASE_H,pos.z);
      }
    }
  }

  document.getElementById('hud-animals').textContent=farmAlive;
  document.getElementById('hud-npcs').textContent=npcAlive;
}

// ─── Raid events ─────────────────────────────────
function triggerWildRaid(){
  wildRaidActive=true; raidCooldown=60+Math.random()*60;
  showEvent('🐺 WILD RAID! Animals attack the village!','#ff6b35');
  document.getElementById('hud-event').textContent='Wild Raid!';
  document.getElementById('pill-event').style.display='flex';
  const forestCells=[];
  for(let r=0;r<GRID;r++) for(let c=0;c<GRID;c++) if(isForest(r,c)) forestCells.push([r,c]);
  const spawn=(type)=>{
    if(forestCells.length>0){
      const [fr,fc]=forestCells[Math.floor(Math.random()*forestCells.length)];
      spawnEntity(type,wX(fc)+(Math.random()-.5)*4,wZ(fr)+(Math.random()-.5)*4);
    } else spawnEntity(type,rW(),rW());
  };
  for(let i=0;i<4;i++) spawn('wolf');
  for(let i=0;i<2;i++) spawn('bear');
  setTimeout(()=>{wildRaidActive=false;document.getElementById('pill-event').style.display='none';},60000);
}

function triggerUndeadRaid(){
  undeadRaidActive=true; raidCooldown=90+Math.random()*90;
  showEvent('💀 UNDEAD SPAWN! The dead rise from the forest!','#7a2a7a');
  document.getElementById('hud-event').textContent='Undead Spawn!';
  document.getElementById('pill-event').style.display='flex';
  // Find all forest cells and spawn from them
  const forestCells=[];
  for(let r=0;r<GRID;r++) for(let c=0;c<GRID;c++) if(isForest(r,c)) forestCells.push([r,c]);
  if(forestCells.length===0){
    // Fallback: spawn at world edges
    for(let i=0;i<6;i++) spawnEntity('zombie',rW(),rW());
    for(let i=0;i<3;i++) spawnEntity('skeleton',rW(),rW());
  } else {
    for(let i=0;i<6;i++){
      const [fr,fc]=forestCells[Math.floor(Math.random()*forestCells.length)];
      spawnEntity('zombie',wX(fc)+(Math.random()-.5)*4,wZ(fr)+(Math.random()-.5)*4);
    }
    for(let i=0;i<3;i++){
      const [fr,fc]=forestCells[Math.floor(Math.random()*forestCells.length)];
      spawnEntity('skeleton',wX(fc)+(Math.random()-.5)*4,wZ(fr)+(Math.random()-.5)*4);
    }
  }
  setTimeout(()=>{undeadRaidActive=false;document.getElementById('pill-event').style.display='none';},120000);
}

function showEvent(msg,color){
  const el=document.getElementById('event-banner');
  el.textContent=msg; el.style.background=color+'cc'; el.style.color='#fff';
  el.style.opacity='1';
  setTimeout(()=>el.style.opacity='0',5000);
}

// ═══════════════════════════════════════════════════
//  WORLD ANIMATION
// ═══════════════════════════════════════════════════
// Tree growth timer
let treeGrowTimer=0;
let mushSpawnTimer=0;
function maybeGrowTree(){
  const attempts=5;
  for(let i=0;i<attempts;i++){
    const r=Math.floor(Math.random()*GRID),c=Math.floor(Math.random()*GRID);
    if(worldGrid[r][c]==='grass'&&!treeGrid[r][c]){
      let nearTree=false;
      for(let dr=-3;dr<=3;dr++) for(let dc=-3;dc<=3;dc++){
        if(inGrid(r+dr,c+dc)&&treeGrid[r+dr][c+dc]){nearTree=true;break;}
      }
      if(nearTree&&Math.random()<0.4){setTile(r,c,'tree');return;}
    }
  }
}
function maybeSpawnMushroom(){
  // Higher chance at night
  const chance=isNight?0.65:0.18;
  if(Math.random()>chance)return;
  const attempts=8;
  for(let i=0;i<attempts;i++){
    const r=Math.floor(Math.random()*GRID),c=Math.floor(Math.random()*GRID);
    if(worldGrid[r][c]==='grass'){
      // Prefer near trees
      let nearTree=false;
      for(let dr=-2;dr<=2;dr++) for(let dc=-2;dc<=2;dc++){
        if(inGrid(r+dr,c+dc)&&treeGrid[r+dr][c+dc]){nearTree=true;break;}
      }
      if(nearTree||Math.random()<0.2){setTile(r,c,'mushroom');return;}
    }
  }
}

// Fireflies
const fireflies=[];
const FF_COUNT=30;
(function initFireflies(){
  for(let i=0;i<FF_COUNT;i++){
    const mesh=new THREE.Mesh(
      new THREE.SphereGeometry(.06,4,4),
      new THREE.MeshBasicMaterial({color:0xeeff44})
    );
    const light=new THREE.PointLight(0xaaffaa,.0,4);
    mesh.add(light);
    mesh.visible=false;
    scene.add(mesh);
    fireflies.push({
      mesh,light,
      x:(Math.random()-.5)*(GRID*CELL*.8),
      y:BASE_H+.5+Math.random()*2,
      z:(Math.random()-.5)*(GRID*CELL*.8),
      phase:Math.random()*Math.PI*2,
      blinkSpeed:1+Math.random()*2,
      drift:{x:(Math.random()-.5)*.4,z:(Math.random()-.5)*.4},
    });
  }
})();
function updateFireflies(t){
  const show=isNight;
  for(const ff of fireflies){
    ff.mesh.visible=show;
    if(!show){ff.light.intensity=0;continue;}
    // Drift around
    ff.x+=ff.drift.x*(1/60);ff.z+=ff.drift.z*(1/60);
    const hw=(GRID*CELL*.8)/2;
    if(Math.abs(ff.x)>hw)ff.drift.x*=-1;
    if(Math.abs(ff.z)>hw)ff.drift.z*=-1;
    ff.y=BASE_H+.5+Math.sin(t*.7+ff.phase)*1.2;
    ff.mesh.position.set(ff.x,ff.y,ff.z);
    // Blink
    const blink=Math.max(0,Math.sin(t*ff.blinkSpeed+ff.phase));
    ff.light.intensity=blink*.8;
    ff.mesh.material.opacity=blink;
  }
}

function animateWorld(t){
  cloudGroup.position.x=Math.sin(t*.015)*10;
  // Grow a tree randomly every ~30 seconds
  treeGrowTimer+=1/60;
  if(treeGrowTimer>30){treeGrowTimer=0;maybeGrowTree();}
  mushSpawnTimer+=1/60;
  const mushInterval=isNight?25:90;
  if(mushSpawnTimer>mushInterval){mushSpawnTimer=0;maybeSpawnMushroom();}
  updateFireflies(t);
  for(let r=0;r<GRID;r++) for(let c=0;c<GRID;c++){
    const obj=tileObjs[r][c];if(!obj)continue;
    const type=worldGrid[r][c];
    if(type==='campfire'){
      const fl=obj.getObjectByName('flame'),fl2=obj.getObjectByName('flame2');
      if(fl){fl.scale.y=.85+Math.sin(t*7+c)*.3;fl.scale.x=.85+Math.sin(t*5+r)*.2;fl.rotation.y=t*2;}
      if(fl2){fl2.scale.y=.8+Math.sin(t*9+c+r)*.35;fl2.rotation.y=-t*3;}
      // Campfire light — already in mesh, just pulse it
      const cfl=obj.getObjectByName('campfireLight');
      if(cfl){
        cfl.intensity=(isNight?3:.8)+Math.abs(Math.sin(t*7+c)*.8);
        cfl.distance=isNight?10:5;
      }
    }
    if(type==='lantern'){
      const lb=obj.getObjectByName('lanternBox'),ll=obj.getObjectByName('lanternLight');
      // Only animate if light is on (intensity>0 = on, user can toggle with LMB)
      if(ll&&ll.intensity>0){
        ll.intensity=(isNight?4:1.2)+Math.sin(t*3.2+c+r)*.4;
        ll.distance=isNight?22:10;
      }
      if(lb&&lb.material.emissiveIntensity!==undefined){
        lb.material.emissiveIntensity=(ll&&ll.intensity>0)?(isNight?1.5:.6):0;
      }
    }
  }
  // Highlight
  if(mouseActive){
    const cell=getTargetCell();
    if(cell){
      const el=elevGrid[cell.r][cell.c]||0;
      hlMesh.position.set(wX(cell.c),BASE_H+el*ELEV_STEP+.07,wZ(cell.r));
      hlMesh.visible=true;
    } else hlMesh.visible=false;
  } else hlMesh.visible=false;
}

// ═══════════════════════════════════════════════════
//  AUDIO
// ═══════════════════════════════════════════════════
let ambInt=null;
function startAmbient(){
  clearInterval(ambInt);
  ambInt=setInterval(()=>{
    if(!soundOn){clearInterval(ambInt);return;}
    const n=isNight?[110,147,165,196]:[261,294,329,392,440,523];
    playNote(n[Math.floor(Math.random()*n.length)],'sine',isNight?.03:.04,isNight?2:1.5);
  },isNight?3000:2000);
}
function playNote(freq,type,vol,dur){
  if(!audioCtx||!soundOn)return;
  const o=audioCtx.createOscillator(),g=audioCtx.createGain();
  o.connect(g);g.connect(audioCtx.destination);
  o.type=type;o.frequency.value=freq;
  g.gain.setValueAtTime(vol,audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+dur);
  o.start();o.stop(audioCtx.currentTime+dur);
}
let lastStep=0;
setInterval(()=>{
  if(!soundOn||!charState.moving)return;
  const n=performance.now();
  if(n-lastStep>340){
    lastStep=n;
    const{col,row}=cellOf(charState.pos.x,charState.pos.z);
    const t=inGrid(row,col)?worldGrid[row][col]:'grass';
    const fq={grass:280,flower:320,water:180,sand:200,snow:350,path:240,house:260};
    playNote((fq[t]||260)+Math.random()*30,'triangle',.03,.1);
  }
},50);

// ── Notifications (upper-left log) ────────────────
const notifications=[];
function pushNotif(msg){
  notifications.unshift({msg,ts:Date.now()});
  if(notifications.length>6) notifications.length=6;
  renderNotifs();
}
function renderNotifs(){
  const el=document.getElementById('notif-log');
  if(!el)return;
  el.innerHTML=notifications
    .filter(n=>Date.now()-n.ts<6000)
    .map(n=>`<div class="notif-line">${n.msg}</div>`)
    .join('');
}
setInterval(renderNotifs,1000);

// Toast still used for important center messages
function showToast(msg){
  const t=document.getElementById('toast');t.textContent=msg;t.style.opacity='1';
  clearTimeout(t._t);t._t=setTimeout(()=>t.style.opacity='0',2000);
  pushNotif(msg);
}

// ═══════════════════════════════════════════════════
//  SIDE CHOOSER SETUP
// ═══════════════════════════════════════════════════
function resetGame(){
  // Reset all state for new game
  entities.length=0;
  for(let r=0;r<GRID;r++) for(let c=0;c<GRID;c++){
    if(tileObjs[r][c]){scene.remove(tileObjs[r][c]);tileObjs[r][c]=null;}
    worldGrid[r][c]='grass'; elevGrid[r][c]=0; treeGrid[r][c]=false;
  }
  Object.keys(inventory).forEach(k=>inventory[k]=0);
  charState.hp=100; charState.dead=false; charState.damageCooldown=0;
  charState.pos.set(0,BASE_H,0); charGroup.position.copy(charState.pos);
  wildPower=0; coins=0; dayTime=0; dayCount=1; isNight=false;
  notifications.length=0;
  npcDrops={};
  _worldBuilding=true; buildWorld(); _worldBuilding=false;
  // Respawn entities
  ['cow','cow','cow','sheep','sheep','sheep','sheep','chicken','chicken','chicken','chicken','chicken'].forEach(t=>spawnEntity(t,rF(),rF()));
  spawnEntity('wolf',rW(),rW());spawnEntity('wolf',rW(),rW());spawnEntity('wolf',rW(),rW());
  spawnEntity('bear',rW(),rW());spawnEntity('bear',rW(),rW());
  spawnEntity('npc',-4,-6,'farmer');spawnEntity('npc',4,-6,'farmer');
  spawnEntity('npc',-6,4,'carpenter');spawnEntity('npc',6,4,'carpenter');
  spawnEntity('npc',-3,2,'guard');spawnEntity('npc',3,2,'guard');spawnEntity('npc',0,6,'guard');
  spawnEntity('npc',1,-2,'child');spawnEntity('npc',-2,1,'child');
  spawnEntity('npc',8,10,'fisherman');spawnEntity('npc',-8,10,'fisherman');
  spawnEntity('npc',0,4,'hunter');
}

function chooseSide(side){
  playerSide=side;
  document.getElementById('side-chooser').style.display='none';
  document.getElementById('lock-overlay').style.display='flex';
  document.getElementById('player-hp-wrap').style.display='flex';

  if(side==='human'){
    TILE_LIST=HUMAN_TILES;
    document.getElementById('side-pill').textContent='🌿 Village';
    document.getElementById('side-pill').className='pill pill-green';
    // Show hotbar (inventory-driven, starts empty)
    document.getElementById('hotbar').style.display='flex';
    document.getElementById('palette').style.display='none';
    updateHotbar();
    // Build palette (hidden until build mode toggled)
    const tiles=[
      {t:'grass',i:'🌿'},{t:'flower',i:'🌸'},{t:'tree',i:'🌲'},{t:'water',i:'💧'},
      {t:'sand',i:'🏝️'},{t:'path',i:'🪨'},{t:'house',i:'🏠'},{t:'barn',i:'🐄'},
      {t:'fence',i:'🚧'},{t:'campfire',i:'🔥'},{t:'lantern',i:'🏮'},{t:'chest',i:'📦'},
    ];
    document.getElementById('palette').innerHTML=tiles.map(({t,i})=>
      `<div class="tb${t==='grass'?' active':''}" data-t="${t}"><div class="ico">${i}</div><div class="lbl">${t}</div></div>`
    ).join('')+`<div id="elev-ctrl"><span>⬆ ELEV</span><button class="elev-btn" id="elev-dn">−</button><span id="elev-val">0</span><button class="elev-btn" id="elev-up">+</button></div>`;
    // Wire elevation buttons
    setTimeout(()=>{
      document.getElementById('elev-up')?.addEventListener('click',()=>{currentElev=Math.min(6,currentElev+1);document.getElementById('elev-val').textContent=currentElev;});
      document.getElementById('elev-dn')?.addEventListener('click',()=>{currentElev=Math.max(0,currentElev-1);document.getElementById('elev-val').textContent=currentElev;});
    },50);
  } else {
    TILE_LIST=WILD_TILES;
    charGroup.remove(charMesh);
    charMesh=buildHumanoid(0x2a0a2a,0x9d4edd,0x1a0a2a);
    charGroup.add(charMesh);
    addWildPower(50);
    // Spawn wild player in a forest cell
    const forestCells=[];
    for(let r=0;r<GRID;r++) for(let c=0;c<GRID;c++) if(isForest(r,c)) forestCells.push([r,c]);
    if(forestCells.length>0){
      const [fr,fc]=forestCells[Math.floor(Math.random()*forestCells.length)];
      charState.pos.set(wX(fc),BASE_H,wZ(fr));
      charGroup.position.copy(charState.pos);
    }
    document.getElementById('side-pill').textContent='💀 Wild Side';
    document.getElementById('side-pill').className='pill pill-dark';
    document.getElementById('wild-power').style.display='flex';
    document.getElementById('hotbar').className='wild-hotbar';
    document.getElementById('hotbar').style.display='flex';
    document.getElementById('hotbar').innerHTML=`
      <div class="hslot active" data-t="summon-zombie" onclick="selectWild(this,'summon-zombie')"><div class="h-ico">💀</div><div class="h-lbl">Zombie</div><div class="h-qty">20⚡</div></div>
      <div class="hslot" data-t="summon-skeleton" onclick="selectWild(this,'summon-skeleton')"><div class="h-ico">💀</div><div class="h-lbl">Skeleton</div><div class="h-qty">25⚡</div></div>
      <div class="hslot" data-t="summon-wolf" onclick="selectWild(this,'summon-wolf')"><div class="h-ico">🐺</div><div class="h-lbl">Wolf</div><div class="h-qty">15⚡</div></div>
      <div class="hslot" data-t="summon-bear" onclick="selectWild(this,'summon-bear')"><div class="h-ico">🐻</div><div class="h-lbl">Bear</div><div class="h-qty">30⚡</div></div>
    `;
  }

  if(side==='build'){
    document.getElementById('side-pill').textContent='🏗️ Build';
    document.getElementById('side-pill').style.background='rgba(10,30,60,0.82)';
    document.getElementById('hotbar').style.display='flex';
    buildMode=true;
    document.getElementById('palette').style.display='flex';
    const tiles=[
      {t:'grass',i:'🌿'},{t:'flower',i:'🌸'},{t:'tree',i:'🌲'},{t:'water',i:'💧'},
      {t:'sand',i:'🏝️'},{t:'path',i:'🪨'},{t:'house',i:'🏠'},{t:'barn',i:'🐄'},
      {t:'fence',i:'🚧'},{t:'campfire',i:'🔥'},{t:'lantern',i:'🏮'},{t:'chest',i:'📦'},
      {t:'mushroom',i:'🍄'},{t:'snow',i:'❄️'},
    ];
    document.getElementById('palette').innerHTML=tiles.map(({t,i})=>
      `<div class="tb${t==='grass'?' active':''}" data-t="${t}"><div class="ico">${i}</div><div class="lbl">${t}</div></div>`
    ).join('')+`<div id="elev-ctrl"><span>⬆ ELEV</span><button class="elev-btn" id="elev-dn">−</button><span id="elev-val">0</span><button class="elev-btn" id="elev-up">+</button></div>`;
    setTimeout(()=>{
      document.getElementById('elev-up')?.addEventListener('click',()=>{currentElev=Math.min(6,currentElev+1);document.getElementById('elev-val').textContent=currentElev;});
      document.getElementById('elev-dn')?.addEventListener('click',()=>{currentElev=Math.max(0,currentElev-1);document.getElementById('elev-val').textContent=currentElev;});
    },50);
    // no enemies in build mode
    entities.forEach(e=>{if(isWild(e)||isUndead(e)){scene.remove(e.mesh);e.alive=false;}});
    entities.splice(0,entities.length,...entities.filter(e=>e.alive));
  }

  // Wire up build palette clicks
  document.getElementById('palette').addEventListener('click',e=>{
    const btn=e.target.closest('.tb');if(!btn)return;
    document.querySelectorAll('#palette .tb').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    selectedTile=btn.dataset.t;
  });

  // Wire elevation buttons
  document.getElementById('elev-up')?.addEventListener('click',()=>{currentElev=Math.min(6,currentElev+1);document.getElementById('elev-val').textContent=currentElev;});
  document.getElementById('elev-dn')?.addEventListener('click',()=>{currentElev=Math.max(0,currentElev-1);document.getElementById('elev-val').textContent=currentElev;});
}

document.getElementById('choose-human').addEventListener('click',()=>chooseSide('human'));
document.getElementById('choose-wild').addEventListener('click',()=>chooseSide('wild'));
document.getElementById('choose-build').addEventListener('click',()=>chooseSide('build'));

// Override doWildAction to use selectedTile
function doWildAction(){
  const cell=getTargetCell();
  if(!cell){showToast('⚡ Aim at the ground!');return;}
  const{r,c}=cell;
  const cost={['summon-zombie']:20,['summon-skeleton']:25,['summon-wolf']:15,['summon-bear']:30};
  const c2=cost[selectedTile]||20;
  if(wildPower<c2){showToast(`⚡ Need ${c2} dark power!`);return;}

  const forestNeeded=selectedTile.includes('zombie')||selectedTile.includes('skeleton');
  if(forestNeeded&&!isForest(r,c)){showToast('🌲 Must summon from a forest (5+ trees)!');return;}

  addWildPower(-c2);
  if(selectedTile==='summon-zombie')    spawnEntity('zombie',wX(c),wZ(r));
  else if(selectedTile==='summon-skeleton') spawnEntity('skeleton',wX(c),wZ(r));
  else if(selectedTile==='summon-wolf')   spawnEntity('wolf',wX(c),wZ(r));
  else if(selectedTile==='summon-bear')   spawnEntity('bear',wX(c),wZ(r));
  playNote(110,'sawtooth',.08,.3);
  showToast('💀 Summoned!');
}

// ═══════════════════════════════════════════════════
//  MAIN LOOP
// ═══════════════════════════════════════════════════
let lastTime=performance.now();
function animate(now){
  requestAnimationFrame(animate);
  const dt=Math.min((now-lastTime)/1000,.05);
  lastTime=now; clk.t+=dt;
  if(playerSide!=='none'){
    updatePlayer(dt);
    updateCamera();
    updateEntities(dt);
    updateDayNight(dt);
    animateWorld(clk.t);
    // Open world: check if we need to stream new terrain
    shiftCooldown-=dt;
    if(shiftCooldown<=0){checkWorldShift();shiftCooldown=1.5;}
  }
  renderer.render(scene,camera);
}
animate(performance.now());

// ── Title screen ──────────────────────────────────
(function initTitleScreen(){
  const ts=document.getElementById('title-screen');
  const leavesEl=document.getElementById('title-leaves');
  const emojis=['🌿','🌸','🍄','🌲','🍃','✨','🌾','🌼'];
  // Spawn falling leaves
  for(let i=0;i<18;i++){
    const leaf=document.createElement('div');
    leaf.className='leaf';
    leaf.textContent=emojis[Math.floor(Math.random()*emojis.length)];
    leaf.style.left=Math.random()*100+'%';
    leaf.style.top=(-60+Math.random()*60)+'px';
    leaf.style.fontSize=(1+Math.random()*1.5)+'rem';
    leaf.style.animationDuration=(4+Math.random()*6)+'s';
    leaf.style.animationDelay=(Math.random()*4)+'s';
    leavesEl.appendChild(leaf);
  }
  // Pulse the title after pop
  setTimeout(()=>{
    const t=document.querySelector('.title-main');
    if(t) t.style.animation='titlePop 0.8s cubic-bezier(0.34,1.56,0.64,1) forwards, pulse 2s ease-in-out 0.8s infinite';
  },800);
  // Fade out after 3 seconds
  setTimeout(()=>{
    ts.classList.add('fade-out');
    setTimeout(()=>{
      ts.style.display='none';
    },800);
  },3000);
})();