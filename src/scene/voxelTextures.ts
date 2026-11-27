import * as THREE from 'three';

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function createPixelTexture(
  draw: (ctx: CanvasRenderingContext2D, rng: () => number) => void,
  seed: number,
  size = 16,
  srgb = true,
  anisotropy = 8,
  useMipmaps = true,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  draw(ctx, mulberry32(seed));

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = useMipmaps ? THREE.NearestMipmapLinearFilter : THREE.NearestFilter;
  tex.generateMipmaps = useMipmaps;
  tex.anisotropy = anisotropy;
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createRadialGlowTexture(innerColor: string, midColor: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, innerColor);
  grad.addColorStop(0.35, midColor);
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function fillNoise(
  ctx: CanvasRenderingContext2D,
  palette: string[],
  rng: () => number,
  size = 16,
) {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      ctx.fillStyle = palette[Math.floor(rng() * palette.length)];
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

export interface VoxelMaterialPack {
  grass: THREE.MeshStandardMaterial[];
  dirt: THREE.MeshStandardMaterial;
  sand: THREE.MeshStandardMaterial;
  gravel: THREE.MeshStandardMaterial;
  stone: THREE.MeshStandardMaterial;
  cobblestone: THREE.MeshStandardMaterial;
  oakLog: THREE.MeshStandardMaterial[];
  oakPlanks: THREE.MeshStandardMaterial;
  spruceLog: THREE.MeshStandardMaterial[];
  sprucePlanks: THREE.MeshStandardMaterial;
  oakLeaves: THREE.MeshStandardMaterial;
  spruceLeaves: THREE.MeshStandardMaterial;
  diamondOre: THREE.MeshStandardMaterial;
  emeraldOre: THREE.MeshStandardMaterial;
  goldOre: THREE.MeshStandardMaterial;
  redstoneOre: THREE.MeshStandardMaterial;
  obsidian: THREE.MeshStandardMaterial;
  portalCore: THREE.MeshBasicMaterial;
  windowGlass: THREE.MeshStandardMaterial;
  lantern: THREE.MeshStandardMaterial;
  waterfall: THREE.MeshStandardMaterial;
  campfireLog: THREE.MeshStandardMaterial;
  campfireEmber: THREE.MeshBasicMaterial;
  flowerRed: THREE.MeshStandardMaterial;
  flowerYellow: THREE.MeshStandardMaterial;
  flowerStem: THREE.MeshStandardMaterial;
  creeperHead: THREE.MeshStandardMaterial[];
  creeperBody: THREE.MeshStandardMaterial;
  cloud: THREE.MeshStandardMaterial;
  sunTexture: THREE.CanvasTexture;
  sunGlowTexture: THREE.CanvasTexture;
  moonTexture: THREE.CanvasTexture;
  moonGlowTexture: THREE.CanvasTexture;
  dispose: () => void;
}

export function createVoxelMaterialPack(maxAnisotropy = 8): VoxelMaterialPack {
  const textures: THREE.Texture[] = [];
  const materials: THREE.Material[] = [];
  const aniso = Math.max(1, Math.min(maxAnisotropy, 16));

  const trackTex = <T extends THREE.Texture>(tex: T): T => {
    if (tex instanceof THREE.CanvasTexture && tex.anisotropy <= 8) {
      tex.anisotropy = aniso;
    }
    textures.push(tex);
    return tex;
  };
  const trackMat = <T extends THREE.Material>(mat: T): T => {
    materials.push(mat);
    return mat;
  };

  // === TERRAIN TEXTURES ===
  const grassTopTex = trackTex(
    createPixelTexture((ctx, rng) => {
      fillNoise(ctx, ['#5aa832', '#64b83b', '#4e962b', '#6ec444', '#529e2e'], rng);
    }, 101),
  );

  const dirtTex = trackTex(
    createPixelTexture((ctx, rng) => {
      fillNoise(ctx, ['#6f4a2b', '#7b5331', '#623f24', '#855c38', '#56361d'], rng);
    }, 102),
  );

  const grassSideTex = trackTex(
    createPixelTexture((ctx, rng) => {
      fillNoise(ctx, ['#6f4a2b', '#7b5331', '#623f24', '#855c38', '#56361d'], rng);
      const greens = ['#5aa832', '#64b83b', '#4e962b', '#6ec444'];
      for (let x = 0; x < 16; x++) {
        const overhang = 3 + Math.floor(rng() * 4);
        for (let y = 0; y < overhang; y++) {
          ctx.fillStyle = greens[Math.floor(rng() * greens.length)];
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }, 103),
  );

  const sandTex = trackTex(
    createPixelTexture((ctx, rng) => {
      fillNoise(ctx, ['#e2d29b', '#eadba6', '#d8c58b', '#efe2b2', '#cfb97d'], rng);
    }, 104),
  );

  const gravelTex = trackTex(
    createPixelTexture((ctx, rng) => {
      fillNoise(ctx, ['#888684', '#747270', '#9a9794', '#666462', '#a8a5a1'], rng);
    }, 105),
  );

  const stoneTex = trackTex(
    createPixelTexture((ctx, rng) => {
      fillNoise(ctx, ['#7b7f86', '#858991', '#6f737a', '#8f939b', '#676b72'], rng);
      ctx.fillStyle = '#5a5d64';
      for (let i = 0; i < 8; i++) {
        const sx = Math.floor(rng() * 13);
        const sy = Math.floor(rng() * 15);
        ctx.fillRect(sx, sy, 3, 1);
      }
    }, 106),
  );

  const cobbleTex = trackTex(
    createPixelTexture((ctx, rng) => {
      fillNoise(ctx, ['#7a7d84', '#888b92', '#696c73', '#9598a0'], rng);
      // Cobblestone mortar lines
      ctx.fillStyle = '#4c4f56';
      for (let y = 0; y < 16; y += 4) {
        ctx.fillRect(0, y, 16, 1);
      }
      for (let row = 0; row < 4; row++) {
        const offset = (row % 2) * 3;
        for (let x = offset; x < 16; x += 5) {
          ctx.fillRect(x, row * 4, 1, 4);
        }
      }
      ctx.fillStyle = '#a4a7af';
      for (let i = 0; i < 10; i++) {
        ctx.fillRect(Math.floor(rng() * 15), Math.floor(rng() * 15), 1, 1);
      }
    }, 107),
  );

  // === AUTHENTIC PIXEL ORES (grey stone base + crisp colored pixel ore veins + emissiveMap) ===
  const ORE_FLECKS: Array<[number, number]> = [
    [2, 2], [3, 2], [3, 3], [4, 3],
    [10, 2], [11, 2], [11, 3], [12, 3], [10, 4],
    [6, 6], [7, 6], [7, 7], [8, 7],
    [2, 10], [3, 10], [3, 11], [4, 11], [4, 12],
    [10, 10], [11, 10], [12, 10], [11, 11], [12, 11],
    [7, 13], [8, 13],
  ];

  const makeOreMaterial = (
    veinPalette: string[],
    glowColor: string,
    seed: number,
  ): THREE.MeshStandardMaterial => {
    const colorTex = trackTex(
      createPixelTexture((ctx, rng) => {
        fillNoise(ctx, ['#767a81', '#81858d', '#6b6f76', '#8c9098'], rng);
        ctx.fillStyle = '#5c5f66';
        for (let i = 0; i < 5; i++) {
          ctx.fillRect(Math.floor(rng() * 13), Math.floor(rng() * 15), 3, 1);
        }
        for (const [x, y] of ORE_FLECKS) {
          ctx.fillStyle = veinPalette[Math.floor(rng() * veinPalette.length)];
          ctx.fillRect(x, y, 1, 1);
        }
      }, seed),
    );

    // Emissive map masks ONLY the pixel ore flecks so the stone stays authentic grey!
    const emissiveTex = trackTex(
      createPixelTexture((ctx) => {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 16, 16);
        ctx.fillStyle = '#ffffff';
        for (const [x, y] of ORE_FLECKS) {
          ctx.fillRect(x, y, 1, 1);
        }
      }, seed + 50),
    );

    return trackMat(
      new THREE.MeshStandardMaterial({
        map: colorTex,
        emissive: new THREE.Color(glowColor),
        emissiveMap: emissiveTex,
        emissiveIntensity: 0.45,
        roughness: 0.85,
        metalness: 0.08,
      }),
    );
  };

  const diamondOre = makeOreMaterial(['#38bdf8', '#22d3ee', '#7dd3fc', '#0284c7'], '#22d3ee', 201);
  const emeraldOre = makeOreMaterial(['#34d399', '#10b981', '#6ee7b7', '#059669'], '#10b981', 202);
  const goldOre = makeOreMaterial(['#facc15', '#f59e0b', '#fef08a', '#d97706'], '#fbbf24', 203);
  const redstoneOre = makeOreMaterial(['#f43f5e', '#ef4444', '#fb7185', '#dc2626'], '#f43f5e', 204);

  // === WOOD & FOLIAGE ===
  const oakLogSideTex = trackTex(
    createPixelTexture((ctx, rng) => {
      const browns = ['#6b4c2d', '#5d4024', '#7a5936', '#4e351d'];
      for (let x = 0; x < 16; x++) {
        const stripe = browns[x % browns.length];
        for (let y = 0; y < 16; y++) {
          ctx.fillStyle = rng() > 0.28 ? stripe : browns[Math.floor(rng() * browns.length)];
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }, 301),
  );

  const oakLogTopTex = trackTex(
    createPixelTexture((ctx, rng) => {
      fillNoise(ctx, ['#b68d5c', '#a87f4f', '#c29b6a'], rng);
      ctx.strokeStyle = '#6a4b2b';
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, 15, 15);
      ctx.strokeStyle = '#8b663d';
      ctx.strokeRect(3.5, 3.5, 9, 9);
      ctx.strokeRect(6.5, 6.5, 3, 3);
    }, 302),
  );

  const oakPlanksTex = trackTex(
    createPixelTexture((ctx, rng) => {
      fillNoise(ctx, ['#b2844c', '#a67841', '#be9056', '#9b6e39'], rng);
      ctx.fillStyle = '#754e24';
      for (let y = 0; y < 16; y += 4) {
        ctx.fillRect(0, y, 16, 1);
      }
      ctx.fillRect(7, 0, 1, 4);
      ctx.fillRect(13, 4, 1, 4);
      ctx.fillRect(4, 8, 1, 4);
      ctx.fillRect(11, 12, 1, 4);
    }, 303),
  );

  const spruceLogSideTex = trackTex(
    createPixelTexture((ctx, rng) => {
      const browns = ['#422b18', '#382313', '#4d331d', '#2e1c0e'];
      for (let x = 0; x < 16; x++) {
        const stripe = browns[x % browns.length];
        for (let y = 0; y < 16; y++) {
          ctx.fillStyle = rng() > 0.25 ? stripe : browns[Math.floor(rng() * browns.length)];
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }, 304),
  );

  const sprucePlanksTex = trackTex(
    createPixelTexture((ctx, rng) => {
      fillNoise(ctx, ['#6d4c2f', '#604227', '#785536', '#563a21'], rng);
      ctx.fillStyle = '#3b2615';
      for (let y = 0; y < 16; y += 4) {
        ctx.fillRect(0, y, 16, 1);
      }
      ctx.fillRect(5, 0, 1, 4);
      ctx.fillRect(12, 4, 1, 4);
      ctx.fillRect(8, 8, 1, 4);
      ctx.fillRect(3, 12, 1, 4);
    }, 305),
  );

  const oakLeavesTex = trackTex(
    createPixelTexture((ctx, rng) => {
      fillNoise(ctx, ['#3b8028', '#479631', '#2f6a20', '#54ab3a', '#357424'], rng);
    }, 306),
  );

  const spruceLeavesTex = trackTex(
    createPixelTexture((ctx, rng) => {
      fillNoise(ctx, ['#26533c', '#2e6348', '#1e4431', '#357052', '#224a36'], rng);
    }, 307),
  );

  // === ARCHITECTURE, PORTAL & LANTERN ===
  const obsidianTex = trackTex(
    createPixelTexture((ctx, rng) => {
      fillNoise(ctx, ['#141020', '#1c152e', '#100c1a', '#261b40', '#0c0914'], rng);
      ctx.fillStyle = '#3f2868';
      for (let i = 0; i < 14; i++) {
        ctx.fillRect(Math.floor(rng() * 16), Math.floor(rng() * 16), 1, 1);
      }
    }, 401),
  );

  const portalCoreTex = trackTex(
    createPixelTexture((ctx, rng) => {
      fillNoise(ctx, ['#7e22ce', '#9333ea', '#a855f7', '#6b21a8', '#c084fc'], rng);
      ctx.fillStyle = '#e879f9';
      for (let i = 0; i < 16; i++) {
        ctx.fillRect(Math.floor(rng() * 15), Math.floor(rng() * 15), 2, 1);
      }
    }, 402),
  );

  const windowColorTex = trackTex(
    createPixelTexture((ctx) => {
      // Wooden window frame
      ctx.fillStyle = '#5c3c20';
      ctx.fillRect(0, 0, 16, 16);
      // Warm glass panes
      ctx.fillStyle = '#bfe3ff';
      ctx.fillRect(2, 2, 5, 5);
      ctx.fillRect(9, 2, 5, 5);
      ctx.fillRect(2, 9, 5, 5);
      ctx.fillRect(9, 9, 5, 5);
      // Pane sheen
      ctx.fillStyle = '#e6f5ff';
      ctx.fillRect(3, 3, 2, 1);
      ctx.fillRect(10, 3, 2, 1);
    }, 403),
  );

  const windowEmissiveTex = trackTex(
    createPixelTexture((ctx) => {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(2, 2, 5, 5);
      ctx.fillRect(9, 2, 5, 5);
      ctx.fillRect(2, 9, 5, 5);
      ctx.fillRect(9, 9, 5, 5);
    }, 404),
  );

  const lanternColorTex = trackTex(
    createPixelTexture((ctx) => {
      ctx.fillStyle = '#272a33';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(3, 3, 10, 10);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(5, 5, 6, 6);
      // Iron bars
      ctx.fillStyle = '#1f232b';
      ctx.fillRect(7, 2, 2, 12);
    }, 405),
  );

  const lanternEmissiveTex = trackTex(
    createPixelTexture((ctx) => {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(3, 3, 10, 10);
      ctx.fillStyle = '#000000';
      ctx.fillRect(7, 2, 2, 12);
    }, 406),
  );

  const waterfallTex = trackTex(
    createPixelTexture((ctx, rng) => {
      fillNoise(ctx, ['#2d8cf0', '#38bdf8', '#2563eb', '#60a5fa'], rng);
      ctx.fillStyle = '#e0f2fe';
      for (let i = 0; i < 16; i++) {
        ctx.fillRect(Math.floor(rng() * 15), Math.floor(rng() * 14), 1, 3);
      }
    }, 407),
  );
  waterfallTex.wrapS = THREE.RepeatWrapping;
  waterfallTex.wrapT = THREE.RepeatWrapping;

  // === CREEPER ===
  const creeperSkinTex = trackTex(
    createPixelTexture((ctx, rng) => {
      fillNoise(ctx, ['#47ad35', '#57be44', '#3d992d', '#68cc54', '#348826'], rng);
    }, 501),
  );

  const creeperFaceTex = trackTex(
    createPixelTexture((ctx, rng) => {
      fillNoise(ctx, ['#47ad35', '#57be44', '#3d992d', '#68cc54', '#348826'], rng);
      ctx.fillStyle = '#0d130d';
      ctx.fillRect(2, 4, 4, 4);
      ctx.fillRect(10, 4, 4, 4);
      ctx.fillRect(6, 8, 4, 4);
      ctx.fillRect(4, 10, 2, 5);
      ctx.fillRect(10, 10, 2, 5);
      ctx.fillRect(6, 10, 4, 3);
    }, 502),
  );

  // === CELESTIAL PIXEL ART: SUN & MOON (strictly distinct!) ===
  const sunTexture = trackTex(
    createPixelTexture((ctx) => {
      // Soft outer golden rim (pixel square)
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(1, 1, 14, 14);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(2, 2, 12, 12);
      ctx.fillStyle = '#fef9c3';
      ctx.fillRect(4, 4, 8, 8);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(5, 5, 6, 6);
      // Warm pixel highlights on edges
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(3, 2, 2, 1);
      ctx.fillRect(12, 10, 1, 3);
    }, 601, 16, true, 1, false),
  );

  const sunGlowTexture = trackTex(
    createRadialGlowTexture('rgba(255, 240, 160, 0.85)', 'rgba(255, 196, 72, 0.28)'),
  );

  const moonTexture = trackTex(
    createPixelTexture((ctx) => {
      // Crisp silver-white square Minecraft moon with authentic pixel craters & phase shading
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(1, 1, 14, 14);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(2, 2, 11, 11);

      // Subtle gibbous shadow along right-bottom rim for lunar phase depth
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(13, 1, 2, 14);
      ctx.fillRect(12, 2, 1, 12);
      ctx.fillRect(2, 13, 13, 2);

      // Pixel craters
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(3, 3, 3, 3);
      ctx.fillRect(9, 4, 2, 2);
      ctx.fillRect(5, 9, 4, 3);
      ctx.fillRect(10, 9, 2, 2);

      // Deeper crater centers
      ctx.fillStyle = '#64748b';
      ctx.fillRect(4, 4, 2, 2);
      ctx.fillRect(6, 10, 2, 2);
      ctx.fillRect(10, 5, 1, 1);
    }, 602, 16, true, 1, false),
  );

  const moonGlowTexture = trackTex(
    createRadialGlowTexture('rgba(210, 232, 255, 0.55)', 'rgba(148, 188, 255, 0.16)'),
  );

  // === BUILD MATERIALS ===
  const grassSideMat = trackMat(
    new THREE.MeshStandardMaterial({ map: grassSideTex, roughness: 0.9, metalness: 0.02 }),
  );
  const grassTopMat = trackMat(
    new THREE.MeshStandardMaterial({ map: grassTopTex, roughness: 0.88, metalness: 0.02 }),
  );
  const dirtMat = trackMat(
    new THREE.MeshStandardMaterial({ map: dirtTex, roughness: 0.95, metalness: 0.02 }),
  );
  const sandMat = trackMat(
    new THREE.MeshStandardMaterial({ map: sandTex, roughness: 0.92, metalness: 0.01 }),
  );
  const gravelMat = trackMat(
    new THREE.MeshStandardMaterial({ map: gravelTex, roughness: 0.94, metalness: 0.02 }),
  );
  const stoneMat = trackMat(
    new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.92, metalness: 0.04 }),
  );
  const cobbleMat = trackMat(
    new THREE.MeshStandardMaterial({ map: cobbleTex, roughness: 0.9, metalness: 0.04 }),
  );

  const oakSideMat = trackMat(
    new THREE.MeshStandardMaterial({ map: oakLogSideTex, roughness: 0.9, metalness: 0.02 }),
  );
  const oakTopMat = trackMat(
    new THREE.MeshStandardMaterial({ map: oakLogTopTex, roughness: 0.9, metalness: 0.02 }),
  );
  const oakPlanks = trackMat(
    new THREE.MeshStandardMaterial({ map: oakPlanksTex, roughness: 0.88, metalness: 0.02 }),
  );

  const spruceSideMat = trackMat(
    new THREE.MeshStandardMaterial({ map: spruceLogSideTex, roughness: 0.92, metalness: 0.02 }),
  );
  const sprucePlanks = trackMat(
    new THREE.MeshStandardMaterial({ map: sprucePlanksTex, roughness: 0.88, metalness: 0.02 }),
  );

  const oakLeaves = trackMat(
    new THREE.MeshStandardMaterial({ map: oakLeavesTex, roughness: 0.86, metalness: 0.02 }),
  );
  const spruceLeaves = trackMat(
    new THREE.MeshStandardMaterial({ map: spruceLeavesTex, roughness: 0.88, metalness: 0.02 }),
  );

  const obsidian = trackMat(
    new THREE.MeshStandardMaterial({ map: obsidianTex, roughness: 0.65, metalness: 0.25 }),
  );
  const portalCore = trackMat(
    new THREE.MeshBasicMaterial({
      map: portalCoreTex,
      transparent: true,
      opacity: 0.82,
      side: THREE.DoubleSide,
    }),
  );

  const windowGlass = trackMat(
    new THREE.MeshStandardMaterial({
      map: windowColorTex,
      emissive: new THREE.Color('#ffba52'),
      emissiveMap: windowEmissiveTex,
      emissiveIntensity: 0.1,
      roughness: 0.35,
      metalness: 0.1,
    }),
  );

  const lantern = trackMat(
    new THREE.MeshStandardMaterial({
      map: lanternColorTex,
      emissive: new THREE.Color('#ffae38'),
      emissiveMap: lanternEmissiveTex,
      emissiveIntensity: 0.5,
      roughness: 0.5,
      metalness: 0.2,
    }),
  );

  const waterfall = trackMat(
    new THREE.MeshStandardMaterial({
      map: waterfallTex,
      color: new THREE.Color('#7dd3fc'),
      transparent: true,
      opacity: 0.82,
      roughness: 0.15,
      metalness: 0.08,
    }),
  );

  const campfireLog = trackMat(
    new THREE.MeshStandardMaterial({ color: '#422916', roughness: 0.95 }),
  );
  const campfireEmber = trackMat(new THREE.MeshBasicMaterial({ color: '#ff8a24' }));

  const flowerRed = trackMat(
    new THREE.MeshStandardMaterial({ color: '#f43f5e', roughness: 0.8 }),
  );
  const flowerYellow = trackMat(
    new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.8 }),
  );
  const flowerStem = trackMat(
    new THREE.MeshStandardMaterial({ color: '#3f8f29', roughness: 0.9 }),
  );

  const creeperBody = trackMat(
    new THREE.MeshStandardMaterial({ map: creeperSkinTex, roughness: 0.82 }),
  );
  const creeperFaceMat = trackMat(
    new THREE.MeshStandardMaterial({ map: creeperFaceTex, roughness: 0.82 }),
  );

  const cloud = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.96,
      metalness: 0,
      transparent: true,
      opacity: 0.92,
    }),
  );

  return {
    grass: [grassSideMat, grassSideMat, grassTopMat, dirtMat, grassSideMat, grassSideMat],
    dirt: dirtMat,
    sand: sandMat,
    gravel: gravelMat,
    stone: stoneMat,
    cobblestone: cobbleMat,
    oakLog: [oakSideMat, oakSideMat, oakTopMat, oakTopMat, oakSideMat, oakSideMat],
    oakPlanks,
    spruceLog: [spruceSideMat, spruceSideMat, oakTopMat, oakTopMat, spruceSideMat, spruceSideMat],
    sprucePlanks,
    oakLeaves,
    spruceLeaves,
    diamondOre,
    emeraldOre,
    goldOre,
    redstoneOre,
    obsidian,
    portalCore,
    windowGlass,
    lantern,
    waterfall,
    campfireLog,
    campfireEmber,
    flowerRed,
    flowerYellow,
    flowerStem,
    creeperHead: [creeperBody, creeperBody, creeperBody, creeperBody, creeperFaceMat, creeperBody],
    creeperBody,
    cloud,
    sunTexture,
    sunGlowTexture,
    moonTexture,
    moonGlowTexture,
    dispose: () => {
      textures.forEach((t) => t.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}
