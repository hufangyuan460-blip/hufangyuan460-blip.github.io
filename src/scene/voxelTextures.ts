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

/**
 * Creates a razor-sharp 16x16 Minecraft-style CanvasTexture:
 * NearestFilter (mag & min), generateMipmaps = false, SRGBColorSpace for color maps.
 */
function createPixelTexture(
  draw: (ctx: CanvasRenderingContext2D, rng: () => number) => void,
  seed: number,
  size = 16,
  srgb = true,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);
  draw(ctx, mulberry32(seed));

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
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

function drawGrid(
  ctx: CanvasRenderingContext2D,
  rows: string[],
  palette: Record<string, string>,
) {
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      const color = palette[ch];
      if (!color) continue; // '.' or space stays transparent (alpha = 0)
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

function drawDirtBase(ctx: CanvasRenderingContext2D, rng: () => number) {
  // Structured warm-brown soil with clustered clods + tiny grey-white pebble grains
  const base = '#7c5332';
  const mid = '#6d4729';
  const dark = '#55361d';
  const light = '#8f623d';

  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 16, 16);

  // Organic 2x2 / 2x1 clod patches (not uniform TV static)
  for (let i = 0; i < 24; i++) {
    const x = Math.floor(rng() * 15);
    const y = Math.floor(rng() * 15);
    ctx.fillStyle = i % 3 === 0 ? light : mid;
    ctx.fillRect(x, y, 2, 1 + (i % 2));
  }
  for (let i = 0; i < 16; i++) {
    const x = Math.floor(rng() * 15);
    const y = Math.floor(rng() * 15);
    ctx.fillStyle = dark;
    ctx.fillRect(x, y, 1 + (i % 2), 1);
  }
  // Classic tiny Minecraft dirt pebbles (muted grey-white specks)
  const pebbles: Array<[number, number, string]> = [
    [2, 5, '#9d958c'],
    [11, 7, '#a8a096'],
    [6, 11, '#8c847b'],
    [13, 13, '#a69e94'],
    [3, 14, '#8d857d'],
    [9, 3, '#9a9289'],
    [14, 9, '#888078'],
  ];
  for (const [px, py, col] of pebbles) {
    ctx.fillStyle = col;
    ctx.fillRect(px, py, 1, 1);
  }
}

function drawStoneBase(ctx: CanvasRenderingContext2D) {
  // Vanilla MC stone: calm cool-grey horizontal micro-strata (never harsh random noise)
  const stoneGrid = [
    'bbbbccccbbbbccbb',
    'bbbaabbbbbccddcb',
    'aabbbbbbbccbbbbb',
    'bbccbbbbbbbbabbb',
    'ccddccbbbbaabbbb',
    'bbccbbbbbbbbccbb',
    'bbbbbaabbbccddcc',
    'bbbaaaabbbbbccbb',
    'bbbbbbbbccbbbbbb',
    'bbccbbbccddccbbb',
    'ccddccbbbbccbbab',
    'bbccbbbbbbbbbaab',
    'bbbbbaabbbbbbbbb',
    'bbbaabbbbbccbbcc',
    'bbbbbbbbbccddccb',
    'bcccbbbbbbccbbbb',
  ];
  drawGrid(ctx, stoneGrid, {
    a: '#696d74', // subtle dark horizontal seam
    b: '#7c8087', // core stone grey
    c: '#8a8e96', // mid-light stone grain
    d: '#989ca4', // subtle highlight streak
  });
}

function drawOreCluster(
  ctx: CanvasRenderingContext2D,
  palette: { recess: string; dark: string; main: string; bright: string },
  variant: number,
) {
  // Classic clustered vanilla Minecraft ore veins (with 1px dark recessed edge + specular highlight)
  const clustersA: Array<[number, number, string]> = [
    // Upper-left cluster
    [2, 2, 'r'], [3, 2, 'b'], [4, 2, 'm'],
    [2, 3, 'm'], [3, 3, 'm'], [4, 3, 'd'], [5, 3, 'r'],
    [3, 4, 'd'], [4, 4, 'r'],
    // Upper-right cluster
    [10, 2, 'r'], [11, 2, 'b'], [12, 2, 'm'],
    [9, 3, 'r'], [10, 3, 'm'], [11, 3, 'm'], [12, 3, 'd'],
    [11, 4, 'd'], [12, 4, 'r'],
    // Center cluster
    [6, 7, 'b'], [7, 7, 'm'], [8, 7, 'r'],
    [5, 8, 'r'], [6, 8, 'm'], [7, 8, 'd'], [8, 8, 'd'],
    [6, 9, 'r'], [7, 9, 'r'],
    // Lower-left cluster
    [2, 11, 'b'], [3, 11, 'm'], [4, 11, 'r'],
    [2, 12, 'm'], [3, 12, 'd'], [4, 12, 'd'],
    [3, 13, 'r'],
    // Lower-right cluster
    [10, 11, 'r'], [11, 11, 'b'], [12, 11, 'm'], [13, 11, 'm'],
    [11, 12, 'm'], [12, 12, 'd'], [13, 12, 'r'],
    [12, 13, 'r'],
  ];

  const clustersB: Array<[number, number, string]> = [
    [3, 2, 'b'], [4, 2, 'm'], [5, 2, 'r'],
    [2, 3, 'r'], [3, 3, 'm'], [4, 3, 'd'], [5, 3, 'd'],
    [4, 4, 'r'],
    [11, 3, 'b'], [12, 3, 'm'], [13, 3, 'r'],
    [10, 4, 'r'], [11, 4, 'm'], [12, 4, 'd'],
    [11, 5, 'r'],
    [6, 6, 'r'], [7, 6, 'b'], [8, 6, 'm'],
    [6, 7, 'm'], [7, 7, 'm'], [8, 7, 'd'], [9, 7, 'r'],
    [7, 8, 'r'],
    [2, 10, 'b'], [3, 10, 'm'], [4, 10, 'm'],
    [2, 11, 'm'], [3, 11, 'd'], [4, 11, 'r'],
    [9, 11, 'b'], [10, 11, 'm'], [11, 11, 'r'],
    [9, 12, 'm'], [10, 12, 'd'], [11, 12, 'd'],
    [10, 13, 'r'],
  ];

  const list = variant % 2 === 0 ? clustersA : clustersB;
  for (const [x, y, k] of list) {
    ctx.fillStyle =
      k === 'r'
        ? palette.recess
        : k === 'd'
          ? palette.dark
          : k === 'b'
            ? palette.bright
            : palette.main;
    ctx.fillRect(x, y, 1, 1);
  }
}

export interface VoxelMaterialPack {
  grass: THREE.MeshStandardMaterial[];
  dirt: THREE.MeshStandardMaterial;
  sand: THREE.MeshStandardMaterial;
  gravel: THREE.MeshStandardMaterial;
  stone: THREE.MeshStandardMaterial;
  andesite: THREE.MeshStandardMaterial;
  cobblestone: THREE.MeshStandardMaterial;
  stoneBricks: THREE.MeshStandardMaterial;
  crackedStoneBricks: THREE.MeshStandardMaterial;
  mossyStoneBricks: THREE.MeshStandardMaterial;
  deepslate: THREE.MeshStandardMaterial;
  cobbledDeepslate: THREE.MeshStandardMaterial;
  deepslateTiles: THREE.MeshStandardMaterial;
  craftingTable: THREE.MeshStandardMaterial[];
  furnace: THREE.MeshStandardMaterial[];
  furnaceFront: THREE.MeshStandardMaterial;
  chest: THREE.MeshStandardMaterial[];
  redConcrete: THREE.MeshStandardMaterial;
  whiteConcrete: THREE.MeshStandardMaterial;
  seaLantern: THREE.MeshStandardMaterial;
  farmlandWet: THREE.MeshStandardMaterial[];
  wheat: THREE.MeshStandardMaterial;
  farmWater: THREE.MeshStandardMaterial;
  redWool: THREE.MeshStandardMaterial;
  whiteWool: THREE.MeshStandardMaterial;
  calcite: THREE.MeshStandardMaterial;
  barrel: THREE.MeshStandardMaterial[];
  hayBlock: THREE.MeshStandardMaterial[];
  spruceTrapdoor: THREE.MeshStandardMaterial;
  oakDoorLower: THREE.MeshStandardMaterial;
  oakDoorUpper: THREE.MeshStandardMaterial;
  copperRod: THREE.MeshStandardMaterial;
  oakLog: THREE.MeshStandardMaterial[];
  oakPlanks: THREE.MeshStandardMaterial;
  spruceLog: THREE.MeshStandardMaterial[];
  sprucePlanks: THREE.MeshStandardMaterial;
  cherryLog: THREE.MeshStandardMaterial[];
  oakLeaves: THREE.MeshStandardMaterial;
  oakLeavesDepth: THREE.MeshDepthMaterial;
  spruceLeaves: THREE.MeshStandardMaterial;
  spruceLeavesDepth: THREE.MeshDepthMaterial;
  cherryLeaves: THREE.MeshStandardMaterial;
  cherryLeavesDepth: THREE.MeshDepthMaterial;
  coalOre: THREE.MeshStandardMaterial;
  ironOre: THREE.MeshStandardMaterial;
  diamondOre: THREE.MeshStandardMaterial;
  emeraldOre: THREE.MeshStandardMaterial;
  goldOre: THREE.MeshStandardMaterial;
  redstoneOre: THREE.MeshStandardMaterial;
  obsidian: THREE.MeshStandardMaterial;
  cryingObsidian: THREE.MeshStandardMaterial;
  ironBlock: THREE.MeshStandardMaterial;
  diamondBlock: THREE.MeshStandardMaterial;
  goldBlock: THREE.MeshStandardMaterial;
  beaconBlock: THREE.MeshStandardMaterial;
  redstoneLamp: THREE.MeshStandardMaterial;
  portalCore: THREE.MeshBasicMaterial;
  windowGlass: THREE.MeshStandardMaterial;
  lantern: THREE.MeshStandardMaterial;
  waterfall: THREE.MeshStandardMaterial;
  campfireLog: THREE.MeshStandardMaterial;
  campfireEmber: THREE.MeshBasicMaterial;
  flowerPoppy: THREE.MeshStandardMaterial;
  flowerDandelion: THREE.MeshStandardMaterial;
  grassTuft: THREE.MeshStandardMaterial;
  sugarCane: THREE.MeshStandardMaterial;
  creeperHead: THREE.MeshStandardMaterial[];
  creeperBody: THREE.MeshStandardMaterial;
  cloud: THREE.MeshStandardMaterial;
  sunTexture: THREE.CanvasTexture;
  sunGlowTexture: THREE.CanvasTexture;
  moonTexture: THREE.CanvasTexture;
  moonGlowTexture: THREE.CanvasTexture;
  dispose: () => void;
}

export function createVoxelMaterialPack(): VoxelMaterialPack {
  const textures: THREE.Texture[] = [];
  const materials: THREE.Material[] = [];

  const trackTex = <T extends THREE.Texture>(tex: T): T => {
    textures.push(tex);
    return tex;
  };
  const trackMat = <T extends THREE.Material>(mat: T): T => {
    materials.push(mat);
    return mat;
  };

  // === 1. GRASS BLOCK (Top + Jagged Side Fringe w/ Shadow + Dirt Bottom) ===
  const grassTopTex = trackTex(
    createPixelTexture((ctx) => {
      // Fresh bright multi-tone vanilla grass top (brightest face value!)
      const grid = [
        'bcbdcbabcbdbcbab',
        'cdcbabcbcdcbabcb',
        'abcbcdcbabcbcdcb',
        'cbdbcbabcbdbcbab',
        'babcbbcdcbabcbdc',
        'cdcbabcbdbcbabcb',
        'cbabcbcdcbabcbdb',
        'dbcbabcbcbdbcbab',
        'bcbdcbabcbcdcbab',
        'abcbcdcbabcbdbcb',
        'cbdbcbabcbcdcbab',
        'cdcbabcbdbcbabcd',
        'babcbbcdcbabcbcb',
        'cbdbcbabcbcdcbab',
        'abcbcdcbabcbdbcb',
        'cdcbabcbdbcbabcb',
      ];
      drawGrid(ctx, grid, {
        a: '#559e2f', // deep grass tuft
        b: '#65b539', // mid lush grass
        c: '#73c644', // bright grass blade
        d: '#82d450', // sun-kissed highlight tip
      });
    }, 101),
  );

  const dirtTex = trackTex(
    createPixelTexture((ctx, rng) => {
      drawDirtBase(ctx, rng);
    }, 102),
  );

  const grassSideTex = trackTex(
    createPixelTexture((ctx, rng) => {
      drawDirtBase(ctx, rng);
      // Organic 3-5px jagged hanging grass overhang with 1px deep-green shadow outline underneath
      const fringeHeights = [4, 5, 4, 3, 4, 5, 5, 4, 3, 4, 5, 4, 3, 4, 5, 4];
      const greens = ['#64b438', '#70c242', '#57a12f', '#79cc4b'];
      for (let x = 0; x < 16; x++) {
        const h = fringeHeights[x];
        for (let y = 0; y < h; y++) {
          ctx.fillStyle = y === 0 ? '#77ca49' : greens[(x * 3 + y * 5) % greens.length];
          ctx.fillRect(x, y, 1, 1);
        }
        // Deep-green shadow border right along bottom of hanging grass
        ctx.fillStyle = '#3d7420';
        ctx.fillRect(x, h - 1, 1, 1);
        // Subtle 1px dark dirt contact shadow beneath the overhang
        ctx.fillStyle = '#472c16';
        ctx.fillRect(x, h, 1, 1);
      }
    }, 103),
  );

  // === 2. SAND (Warm creamy beige + soft horizontal grain + pale sparkles) ===
  const sandTex = trackTex(
    createPixelTexture((ctx) => {
      const grid = [
        'bbccbbddbbccbbab',
        'aabbbccbbbbbaabb',
        'bbddbbbbccbbccbb',
        'ccbbbbbbbaabbbdd',
        'bbbccbbddbbbbbbb',
        'baabbbbbbbccbbab',
        'bbbbccbbbbbbccbb',
        'bbddbbbaabbbddbb',
        'ccbbbbccbbbbbbbb',
        'bbbbaabbbbccbbab',
        'bbccbbddbbbbbbcc',
        'aabbbbbbbccbbbbb',
        'bbbbddbbbbbaabbb',
        'bbccbbbbccbbddbb',
        'bbbaabbbbbbccbbb',
        'ccbbbbddbbbaabbc',
      ];
      drawGrid(ctx, grid, {
        a: '#d8cca6', // soft warm sand grain
        b: '#eae0c2', // bright coastal white-cream sand
        c: '#f3ecd4', // sunlit white sand
        d: '#fbf8ea', // crisp pale sand sparkle
      });
    }, 104),
  );

  // === 3. GRAVEL (Structured pebble mosaic) ===
  const gravelTex = trackTex(
    createPixelTexture((ctx) => {
      const grid = [
        'abbcdabbcdaabbcd',
        'aabbdaabbdabbcca',
        'cdabbcddabbcdaab',
        'ccabbcdaabbcddab',
        'abbcdaabbcdabbcc',
        'daabbcdabbcdaabb',
        'bcdaabbccdabbcda',
        'bbcdabbcdaabbcdb',
        'aabbcdabbcdaabbc',
        'cdaabbcddabbcdaa',
        'abbcdaabbcdabbcd',
        'aabbcdaabbccdaab',
        'cdabbcdaabbcddab',
        'ccdabbcdaabbcdab',
        'abbcddabbcdaabbc',
        'daabbcdabbcdaabb',
      ];
      drawGrid(ctx, grid, {
        a: '#686563',
        b: '#817e7b',
        c: '#979490',
        d: '#ada9a4',
      });
    }, 105),
  );

  // === 4. STONE (Soft cool-grey horizontal strata) ===
  const stoneTex = trackTex(
    createPixelTexture((ctx) => {
      drawStoneBase(ctx);
    }, 106),
  );

  // === 5. COBBLESTONE (Clear interlocking rounded stone blocks with dark mortar outlines) ===
  const cobbleTex = trackTex(
    createPixelTexture((ctx) => {
      const grid = [
        'aaaddddaaaccccca',
        'addccbbaddccbbca',
        'adccbbbadccbbbba',
        'acbbbbbaabbbbaaa',
        'aaaaaaaadddddaaa',
        'ddccbaaddccbbbaa',
        'dccbbbadccbbbbaa',
        'cbbbbbacbbbbbaaa',
        'aaaaaaacbbbbbaaa',
        'accccbaaaaaaaadd',
        'accbbbadccbbbadc',
        'abbbbbadbbbbbabc',
        'abbbbaabbbbaaaaa',
        'aaaaaddccbaaccca',
        'ddccadccbbaccbba',
        'dccbadbbbbabbbba',
      ];
      drawGrid(ctx, grid, {
        a: '#4a4d54', // crisp dark cobblestone mortar outline
        b: '#6e727a', // shaded stone underside
        c: '#878b94', // core stone face
        d: '#a5a9b2', // bright top-left stone highlight
      });
    }, 107),
  );

  // === 6. CLASSIC VANILLA ORES (Stone base + clustered veins + 1px dark recess + highlights) ===
  const makeOreMaterial = (
    palette: { recess: string; dark: string; main: string; bright: string },
    variant: number,
    options: {
      roughness?: number;
      metalness?: number;
      emissiveColor?: string;
      emissiveBase?: number;
    } = {},
  ): THREE.MeshStandardMaterial => {
    const colorTex = trackTex(
      createPixelTexture((ctx) => {
        drawStoneBase(ctx);
        drawOreCluster(ctx, palette, variant);
      }, 200 + variant),
    );

    let emissiveMap: THREE.CanvasTexture | undefined;
    if (options.emissiveColor) {
      emissiveMap = trackTex(
        createPixelTexture((ctx) => {
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, 16, 16);
          drawOreCluster(
            ctx,
            { recess: '#000000', dark: '#555555', main: '#bbbbbb', bright: '#ffffff' },
            variant,
          );
        }, 240 + variant, 16, false),
      );
    }

    return trackMat(
      new THREE.MeshStandardMaterial({
        map: colorTex,
        emissive: options.emissiveColor ? new THREE.Color(options.emissiveColor) : new THREE.Color('#000000'),
        emissiveMap,
        emissiveIntensity: options.emissiveBase ?? 0,
        roughness: options.roughness ?? 0.84,
        metalness: options.metalness ?? 0.08,
      }),
    );
  };

  const coalOre = makeOreMaterial(
    { recess: '#53565d', dark: '#17191d', main: '#25282e', bright: '#3d414a' },
    0,
    { roughness: 0.9, metalness: 0.04 },
  );

  const ironOre = makeOreMaterial(
    { recess: '#595c63', dark: '#9c785c', main: '#d4b092', bright: '#f0d8c2' },
    1,
    { roughness: 0.78, metalness: 0.2 },
  );

  const goldOre = makeOreMaterial(
    { recess: '#565960', dark: '#c7850a', main: '#f5c22c', bright: '#fff3a1' },
    0,
    { roughness: 0.68, metalness: 0.34, emissiveColor: '#f5b82e', emissiveBase: 0.06 },
  );

  const diamondOre = makeOreMaterial(
    { recess: '#545861', dark: '#0b9cb8', main: '#3ee4e8', bright: '#c9ffff' },
    1,
    { roughness: 0.65, metalness: 0.25, emissiveColor: '#2bd9e6', emissiveBase: 0.1 },
  );

  const emeraldOre = makeOreMaterial(
    { recess: '#545960', dark: '#0c8a48', main: '#27d972', bright: '#b3ffd1' },
    0,
    { roughness: 0.68, metalness: 0.2, emissiveColor: '#22c55e', emissiveBase: 0.08 },
  );

  const redstoneOre = makeOreMaterial(
    { recess: '#565960', dark: '#991b1b', main: '#ef3333', bright: '#ff9696' },
    1,
    { roughness: 0.78, metalness: 0.1, emissiveColor: '#ef4444', emissiveBase: 0.12 },
  );

  // === 7. LOGS (Coarse Vertical Bark Sides + Concentric Growth-Ring Top/Bottom) ===
  const makeBarkSide = (palette: Record<string, string>, seed: number) =>
    trackTex(
      createPixelTexture((ctx) => {
        const grid = [
          'abcbdaabcbdbaabc',
          'abcbdaabccbdabbc',
          'abbcdaabcbdaabcc',
          'abcbdaabcbdaabbc',
          'accbdaabbcdaabcb',
          'abcbdaabcbdaabcb',
          'abcbdaabccbdabbc',
          'abbcdaabcbdaabcb',
          'abcbdaabcbdaabcc',
          'abcbdabbcdaaabbc',
          'accbdaabcbdaabcb',
          'abcbdaabccbdabcb',
          'abbcdaabcbdaabbc',
          'abcbdaabcbdaabcb',
          'abcbdaabbcdaabcc',
          'accbdaabcbdaabbc',
        ];
        drawGrid(ctx, grid, palette);
      }, seed),
    );

  const makeLogTop = (barkCol: string, ringDark: string, woodMid: string, woodLight: string, seed: number) =>
    trackTex(
      createPixelTexture((ctx) => {
        // Outer bark border (2px)
        ctx.fillStyle = barkCol;
        ctx.fillRect(0, 0, 16, 16);
        // Sapwood interior
        ctx.fillStyle = woodLight;
        ctx.fillRect(2, 2, 12, 12);
        // Concentric growth rings
        ctx.fillStyle = woodMid;
        ctx.fillRect(3, 3, 10, 10);
        ctx.fillStyle = ringDark;
        ctx.fillRect(4, 4, 8, 8);
        ctx.fillStyle = woodLight;
        ctx.fillRect(5, 5, 6, 6);
        ctx.fillStyle = ringDark;
        ctx.fillRect(6, 6, 4, 4);
        ctx.fillStyle = woodMid;
        ctx.fillRect(7, 7, 2, 2);
        // Subtle bark edge notches
        ctx.fillStyle = ringDark;
        ctx.fillRect(1, 3, 1, 3);
        ctx.fillRect(14, 9, 1, 4);
        ctx.fillRect(5, 1, 4, 1);
        ctx.fillRect(8, 14, 3, 1);
      }, seed),
    );

  const oakLogSideTex = makeBarkSide(
    { a: '#4b331b', b: '#634525', c: '#755430', d: '#85623a' },
    301,
  );
  const oakLogTopTex = makeLogTop('#543a1f', '#8c673d', '#b8915c', '#cfa974', 302);

  const spruceLogSideTex = makeBarkSide(
    { a: '#24160b', b: '#352212', c: '#442c18', d: '#523720' },
    303,
  );
  const spruceLogTopTex = makeLogTop('#2e1c0e', '#593b21', '#7d5634', '#946941', 304);

  // === 8. PLANKS (4 Horizontal Boards + 1px Dark Grooves + Staggered Vertical Seams + Grain) ===
  const makePlanksTex = (
    pal: { groove: string; dark: string; mid: string; light: string; highlight: string },
    seed: number,
  ) =>
    trackTex(
      createPixelTexture((ctx) => {
        const verticalJoints = [7, 13, 3, 10];
        for (let board = 0; board < 4; board++) {
          const y0 = board * 4;
          // Top subtle bevel highlight
          ctx.fillStyle = pal.highlight;
          ctx.fillRect(0, y0, 16, 1);
          // Main board body with gentle horizontal grain
          ctx.fillStyle = pal.light;
          ctx.fillRect(0, y0 + 1, 16, 1);
          ctx.fillStyle = pal.mid;
          ctx.fillRect(0, y0 + 2, 16, 1);

          // Gentle wood-grain streaks inside each plank
          ctx.fillStyle = pal.dark;
          ctx.fillRect((board * 5 + 1) % 13, y0 + 2, 3, 1);
          ctx.fillRect((board * 7 + 8) % 13, y0 + 1, 2, 1);
          ctx.fillStyle = pal.highlight;
          ctx.fillRect((board * 3 + 4) % 13, y0 + 1, 3, 1);

          // 1px dark horizontal seam between planks
          ctx.fillStyle = pal.groove;
          ctx.fillRect(0, y0 + 3, 16, 1);

          // Staggered vertical plank joint
          const jx = verticalJoints[board];
          ctx.fillStyle = pal.groove;
          ctx.fillRect(jx, y0, 1, 3);
          ctx.fillStyle = pal.highlight;
          ctx.fillRect((jx + 1) % 16, y0 + 1, 1, 2);
        }
      }, seed),
    );

  const oakPlanksTex = makePlanksTex(
    {
      groove: '#6b4923',
      dark: '#936b38',
      mid: '#a87d45',
      light: '#ba8e52',
      highlight: '#c99f62',
    },
    305,
  );

  const sprucePlanksTex = makePlanksTex(
    {
      groove: '#3b2615',
      dark: '#573a21',
      mid: '#684729',
      light: '#775332',
      highlight: '#855f3b',
    },
    306,
  );

  // === 9. FANCY LEAVES (True Alpha-Cutout 16x16 with ~24% Transparent Holes!) ===
  const oakLeavesTex = trackTex(
    createPixelTexture((ctx) => {
      // '.' = alpha 0 transparent cutout (~25% airy vanilla Fancy Leaves holes!)
      const grid = [
        '.bc.abcb..bc.ab.',
        'abcdbcab.abcdbca',
        'bab.cdba.bab.cdb',
        '.ab.abcb..ab.abc',
        'bcda.bab.bcda.ba',
        'cdba..bc.cdba..b',
        'abcb.abcdabcb.ab',
        '.bab.cdba.bab.cd',
        '..bc.abcb..bc.ab',
        'abcdbcab.abcdbca',
        'cdba.bab.cdba.ba',
        'abcb..ab.abcb..a',
        '.bab.bcda.bab.bc',
        'bcda.cdba.cda.cd',
        'cdba..babcdba..b',
        '.ab..abcb.ab..ab',
      ];
      drawGrid(ctx, grid, {
        a: '#2c6820', // deep shaded leaf cluster
        b: '#3f8a2b', // core rich oak green
        c: '#55a638', // sunlit mid-bright leaf
        d: '#6ec248', // crisp top leaf highlight
      });
    }, 307),
  );

  const spruceLeavesTex = trackTex(
    createPixelTexture((ctx) => {
      // Airy pine-needle clusters (~23% transparent holes) in classic cool spruce greens
      const grid = [
        '.ab.bcda..ab.bcd',
        'bcdaabcb.bcdaabc',
        'abcb.bab.abcb.ba',
        '..ab.bcda..ab.bc',
        'cdba.abcbcdba.ab',
        'abcb..bababcb..b',
        '.bab.bcda.bab.bc',
        'bcda.cdba.cda.cd',
        'abcb..ab.abcb..a',
        '.bab.bcda.bab.bc',
        'cdba.abcbcdba.ab',
        '..bc.cdba..bc.cd',
        'abcdabcb.abcdabc',
        'bab.cdba.bab.cdb',
        'abcb..ab.abcb..a',
        '.bc..bcda.bc..bc',
      ];
      drawGrid(ctx, grid, {
        a: '#1c4230', // deep pine shadow
        b: '#285940', // core spruce green
        c: '#357050', // mid spruce needle
        d: '#468762', // bright needle tip
      });
    }, 308),
  );

  // === 10. OBSIDIAN & CRYING OBSIDIAN ===
  const obsidianTex = trackTex(
    createPixelTexture((ctx) => {
      const grid = [
        'aabbaaaacbaaaabb',
        'abccbaaabbbaaabc',
        'abddcaaaabbaaaab',
        'aabbaaaabccbaaaa',
        'aaaaabbbaddbaaaa',
        'aaabccbaaabbaabb',
        'aaabddbaaaaaabcc',
        'baaaabbaaaaabddb',
        'bbaaaaabccbaaabb',
        'cbbaaaabddbaaaaa',
        'abcaaaaaabbaabca',
        'aabaaabccbaabddb',
        'aaaaaabddbaaaabb',
        'abccbaaaabbaaaaa',
        'abddbaaaabccbaaa',
        'aabbaaaaabddbaaa',
      ];
      drawGrid(ctx, grid, {
        a: '#0f0b18',
        b: '#23153b',
        c: '#462675',
        d: '#7c4dcc',
      });
    }, 401),
  );

  const cryingObsidianGrid = [
    'aabbaaaacbaaaabb',
    'abcebaaabbbaaabc',
    'abffcaaaabbaaeeb',
    'aabbaaaabccbaefa',
    'aaaaabbbadfbaffa',
    'aaabccbaaaebaaab',
    'aaabefbaaaaaabcc',
    'baaaffbaaaaabefb',
    'bbaaaeeabccbaafb',
    'cbbaaaabefbaaaaa',
    'abcaaaaaabbaabca',
    'aabaaabcebaabefb',
    'aaaaaabffbaaaabb',
    'abcebaaaabbaaeaa',
    'abffbaaaabcebaaa',
    'aabbaaaaabffbaaa',
  ];

  const cryingObsidianTex = trackTex(
    createPixelTexture((ctx) => {
      drawGrid(ctx, cryingObsidianGrid, {
        a: '#0f0b18',
        b: '#24143e',
        c: '#4b2580',
        d: '#7c4dcc',
        e: '#a855f7', // glowing violet weeping vein
        f: '#f0abfc', // bright lavender tear highlight
      });
    }, 451),
  );

  const cryingObsidianEmissiveTex = trackTex(
    createPixelTexture((ctx) => {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 16, 16);
      drawGrid(ctx, cryingObsidianGrid, {
        e: '#a0a0a0',
        f: '#ffffff',
      });
    }, 452, 16, false),
  );

  // === 10B. STONE BRICKS, MOSSY STONE BRICKS, DEEPSLATE & DEEPSLATE TILES ===
  const stoneBricksGrid = [
    'ddddddddddddddda',
    'dccccbbccccccbba',
    'dccbbbbccbbccbba',
    'dcbbbbbccbbbbbba',
    'dccccccccbbccbba',
    'dbbbbbbbbbbbbbba',
    'dbbbccbbbbbbbbba',
    'aaaaaaaaaaaaaaaa',
    'dddddddaaddddddd',
    'dccccbbaacccccbb',
    'dccbbbbaaccbbbcb',
    'dcbbbbbaacbbbbbb',
    'dccccbbaacccbbcb',
    'dbbbbbbaabbbbbbb',
    'dbbbbbbaabbccbbb',
    'aaaaaaaaaaaaaaaa',
  ];

  const stoneBricksTex = trackTex(
    createPixelTexture((ctx) => {
      drawGrid(ctx, stoneBricksGrid, {
        a: '#4b4f57', // crisp mortar groove
        b: '#6e737c', // shaded stone brick lower edge
        c: '#838892', // core stone brick body
        d: '#a1a6b0', // sunlit top-left bevel highlight
      });
    }, 453),
  );

  const crackedStoneBricksTex = trackTex(
    createPixelTexture((ctx) => {
      drawGrid(ctx, stoneBricksGrid, {
        a: '#4b4f57',
        b: '#6e737c',
        c: '#838892',
        d: '#a1a6b0',
      });
      // Crisp jagged fracture lines across stone brick faces
      const cracks = [
        '.....k..........',
        '......k.........',
        '.....k.k....k...',
        '....k...k..k....',
        '.....k.....k....',
        '............k...',
        '................',
        '................',
        '..........k.....',
        '...k.....k......',
        '..k.....k.k.....',
        '...k.......k....',
        '....k.......k...',
        '...k............',
        '................',
        '................',
      ];
      drawGrid(ctx, cracks, { k: '#32353b' });
    }, 470),
  );

  const andesiteTex = trackTex(
    createPixelTexture((ctx) => {
      const grid = [
        'bcbdabcbcdabcbda',
        'abcbcdabcbcdabcb',
        'cdabcbcdabcbcdab',
        'bcdaabcbcdabcbda',
        'abcbcdabbcdaabcb',
        'cdabcbcdabcbcdab',
        'bcbbdaabcbcdabcb',
        'abcbcdabcbdaabcb',
        'cdabcbdaabcbcdab',
        'bcbdabcbcdabcbda',
        'abcbcdabbcdaabcb',
        'cdabcbcdabcbcdab',
        'bcdaabcbcdabcbda',
        'abcbcdabcbcdabcb',
        'cdabcbdaabcbcdab',
        'bcbdabcbcdabcbda',
      ];
      drawGrid(ctx, grid, {
        a: '#6d7076',
        b: '#81848a',
        c: '#93969c',
        d: '#a5a8ae',
      });
    }, 471),
  );

  const cobbledDeepslateTex = trackTex(
    createPixelTexture((ctx) => {
      const grid = [
        'aaaddddaaaccccca',
        'addccbbaddccbbca',
        'adccbbbadccbbbba',
        'acbbbbbaabbbbaaa',
        'aaaaaaaadddddaaa',
        'ddccbaaddccbbbaa',
        'dccbbbadccbbbbaa',
        'cbbbbbacbbbbbaaa',
        'aaaaaaacbbbbbaaa',
        'accccbaaaaaaaadd',
        'accbbbadccbbbadc',
        'abbbbbadbbbbbabc',
        'abbbbaabbbbaaaaa',
        'aaaaaddccbaaccca',
        'ddccadccbbaccbba',
        'dccbadbbbbabbbba',
      ];
      drawGrid(ctx, grid, {
        a: '#1e2027',
        b: '#31343e',
        c: '#444854',
        d: '#5c6170',
      });
    }, 472),
  );

  const craftingTopTex = trackTex(
    createPixelTexture((ctx) => {
      ctx.fillStyle = '#9c6c38';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#5a3919';
      ctx.fillRect(0, 0, 16, 1);
      ctx.fillRect(0, 15, 16, 1);
      ctx.fillRect(0, 0, 1, 16);
      ctx.fillRect(15, 0, 1, 16);
      // 3x3 crafting grid
      ctx.fillStyle = '#b9884e';
      ctx.fillRect(2, 2, 12, 12);
      ctx.fillStyle = '#523417';
      ctx.fillRect(2, 5, 12, 1);
      ctx.fillRect(2, 10, 12, 1);
      ctx.fillRect(5, 2, 1, 12);
      ctx.fillRect(10, 2, 1, 12);
    }, 473),
  );

  const craftingSideTex = trackTex(
    createPixelTexture((ctx) => {
      ctx.fillStyle = '#a87942';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#6c4923';
      ctx.fillRect(0, 0, 16, 3);
      ctx.fillRect(0, 3, 16, 1);
      ctx.fillRect(0, 15, 16, 1);
      ctx.fillRect(0, 0, 2, 16);
      ctx.fillRect(14, 0, 2, 16);
      // Hanging saw & hammer pixel tools
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(4, 6, 3, 5);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(5, 11, 1, 3);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(9, 6, 3, 2);
      ctx.fillStyle = '#5b3a1b';
      ctx.fillRect(10, 8, 1, 6);
    }, 474),
  );

  const furnaceFrontTex = trackTex(
    createPixelTexture((ctx) => {
      drawStoneBase(ctx);
      ctx.fillStyle = '#4a4d54';
      ctx.fillRect(1, 1, 14, 1);
      ctx.fillRect(1, 14, 14, 1);
      // Upper grill opening
      ctx.fillStyle = '#1f2228';
      ctx.fillRect(3, 3, 10, 3);
      // Lower arched firebox with warm glowing coals
      ctx.fillStyle = '#1c1e24';
      ctx.fillRect(4, 9, 8, 5);
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(5, 11, 6, 3);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(6, 12, 4, 2);
    }, 475),
  );

  const oakDoorLowerTex = trackTex(
    createPixelTexture((ctx) => {
      ctx.fillStyle = '#9e7039';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#5c3c1b';
      ctx.fillRect(0, 0, 16, 1);
      ctx.fillRect(0, 15, 16, 1);
      ctx.fillRect(0, 0, 2, 16);
      ctx.fillRect(14, 0, 2, 16);
      ctx.fillRect(7, 1, 2, 14);
      // Recessed door panels
      ctx.fillStyle = '#7e5528';
      ctx.fillRect(3, 2, 3, 12);
      ctx.fillRect(10, 2, 3, 12);
      // Iron hinge straps
      ctx.fillStyle = '#3f4552';
      ctx.fillRect(1, 3, 2, 2);
      ctx.fillRect(1, 11, 2, 2);
    }, 476),
  );

  const oakDoorUpperTex = trackTex(
    createPixelTexture((ctx) => {
      ctx.fillStyle = '#9e7039';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#5c3c1b';
      ctx.fillRect(0, 0, 16, 2);
      ctx.fillRect(0, 15, 16, 1);
      ctx.fillRect(0, 0, 2, 16);
      ctx.fillRect(14, 0, 2, 16);
      // 4-pane upper door window (transparent cutout or pale glass)
      ctx.fillStyle = '#9dd8ed';
      ctx.fillRect(3, 3, 4, 4);
      ctx.fillRect(9, 3, 4, 4);
      ctx.fillRect(3, 9, 4, 4);
      ctx.fillRect(9, 9, 4, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(4, 4, 1, 1);
      ctx.fillRect(10, 10, 1, 1);
      // Iron doorknob
      ctx.fillStyle = '#334155';
      ctx.fillRect(12, 13, 2, 2);
    }, 477),
  );

  const mossyStoneBricksTex = trackTex(
    createPixelTexture((ctx) => {
      drawGrid(ctx, stoneBricksGrid, {
        a: '#4b4f57',
        b: '#6e737c',
        c: '#838892',
        d: '#a1a6b0',
      });
      // Creeping moss vines along mortar seams & brick corners
      const mossOverlay = [
        '.....mm.........',
        '....mMMm........',
        '.....mm....m....',
        '..........mMm...',
        '....m..........m',
        '..mmMm........mM',
        '.mMMmm..mm...mMM',
        'mmMMm..mMMm..mMm',
        '..mm....mm......',
        '.......mMm......',
        '.......mM.......',
        'm...........mm..',
        'Mm.........mMMm.',
        'MMm.......mMMm..',
        'mMm...mm...mm...',
        'mm...mMMm.......',
      ];
      drawGrid(ctx, mossOverlay, {
        m: '#3d6b26', // deep moss shadow
        M: '#5c9638', // vibrant mossy vine
      });
    }, 454),
  );

  const deepslateTex = trackTex(
    createPixelTexture((ctx) => {
      const grid = [
        'aabbbbccccbbbaaa',
        'abbbccddddccbbab',
        'baabbbbbbbbbbaaa',
        'bbbccccbbbbccbbb',
        'bbccddddccbbccbb',
        'aaabbbbbbbaabbbb',
        'bbbbccbbbbccddcc',
        'bbaabbbbbbbbbbba',
        'abbbcccbbbccbbba',
        'bbbccddccbbbaabb',
        'baabbbbbbbbcccbb',
        'bbbbccbbbbccddcc',
        'bbccddccbbaabbbb',
        'aaabbbbbbbbbccbb',
        'bbbcccbbbbaabbbb',
        'baabbbccccbbbaaa',
      ];
      drawGrid(ctx, grid, {
        a: '#2b2e36',
        b: '#3b3f49',
        c: '#4b505c',
        d: '#5c6270',
      });
    }, 455),
  );

  const deepslateTilesTex = trackTex(
    createPixelTexture((ctx) => {
      const grid = [
        'dddddddaaddddddd',
        'dccccbbaacccccbb',
        'dccbbbbaaccbbbcb',
        'dbbbbbbaabbbbbbb',
        'aaaaaaaaaaaaaaaa',
        'dddaadddddddaadd',
        'ccbaacccccbbaacc',
        'bbbaaccbbbbaacbb',
        'bbbaabbbbbbaabbb',
        'aaaaaaaaaaaaaaaa',
        'dddddaadddddddaa',
        'ccccbaacccccbbaa',
        'cbbbbaaccbbbbaaa',
        'bbbbbaabbbbbbaaa',
        'bbbbbaabbbbbbaaa',
        'aaaaaaaaaaaaaaaa',
      ];
      drawGrid(ctx, grid, {
        a: '#1a1d24', // deep tile seam
        b: '#2c303a', // dark slate tile lower shade
        c: '#3b404d', // main slate tile body
        d: '#525868', // crisp slate tile top bevel
      });
    }, 456),
  );

  // === 10C. CHERRY LOG & FANCY CHERRY LEAVES (Alpha-Cutout Sakura Blossom Canopy!) ===
  const cherryLogSideTex = trackTex(
    createPixelTexture((ctx) => {
      const grid = [
        'abbcbbabbcbbabbc',
        'abbbccabbbccabbb',
        'addcbbabbcbbaddc',
        'abbcbbabbcbbabbc',
        'abbcbbaddcbbabbc',
        'abbbccabbbccabbb',
        'abbcbbabbcbbabbc',
        'addcbbabbcbbabbc',
        'abbcbbabbcbbaddc',
        'abbbccaddcbbabbb',
        'abbcbbabbcbbabbc',
        'abbcbbabbcbbabbc',
        'addcbbabbbccaddc',
        'abbcbbabbcbbabbc',
        'abbbccaddcbbabbb',
        'abbcbbabbcbbabbc',
      ];
      drawGrid(ctx, grid, {
        a: '#28131b', // deep dark cherry bark crevice
        b: '#3b1d29', // rich maroon cherry bark
        c: '#4e2736', // warm cherry bark grain
        d: '#723a50', // horizontal cherry lenticel band
      });
    }, 457),
  );
  const cherryLogTopTex = makeLogTop('#361a25', '#b87082', '#e8b5c2', '#f7d6df', 458);

  const cherryLeavesTex = trackTex(
    createPixelTexture((ctx) => {
      // ~25% airy transparent holes ('.' = alpha 0) with multi-tone pink sakura clusters!
      const grid = [
        '.bc.abcb..bc.ab.',
        'abcdbcab.abcdbca',
        'bab.cdba.bab.cdb',
        '.ab.abcb..ab.abc',
        'bcda.bab.bcda.ba',
        'cdba..bc.cdba..b',
        'abcb.abcdabcb.ab',
        '.bab.cdba.bab.cd',
        '..bc.abcb..bc.ab',
        'abcdbcab.abcdbca',
        'cdba.bab.cdba.ba',
        'abcb..ab.abcb..a',
        '.bab.bcda.bab.bc',
        'bcda.cdba.cda.cd',
        'cdba..babcdba..b',
        '.ab..abcb.ab..ab',
      ];
      drawGrid(ctx, grid, {
        a: '#d96c9a', // deep sakura shadow petal
        b: '#f08db8', // rich cherry blossom pink
        c: '#f9b4d2', // soft pastel blossom
        d: '#fce7f3', // bright sunlit sakura tip
      });
    }, 459),
  );

  // === 10D. PRECIOUS METAL BLOCKS, BEACON & REDSTONE LAMP ===
  const makeBevelBlock = (
    outerDark: string,
    outerLight: string,
    body: string,
    innerShine: string,
    glint: string,
    seed: number,
  ) =>
    trackTex(
      createPixelTexture((ctx) => {
        ctx.fillStyle = body;
        ctx.fillRect(0, 0, 16, 16);
        // Outer bevel rim
        ctx.fillStyle = outerLight;
        ctx.fillRect(0, 0, 16, 1);
        ctx.fillRect(0, 0, 1, 16);
        ctx.fillStyle = outerDark;
        ctx.fillRect(0, 15, 16, 1);
        ctx.fillRect(15, 0, 1, 16);
        // Recessed decorative inner frame
        ctx.fillStyle = outerDark;
        ctx.fillRect(2, 2, 12, 1);
        ctx.fillRect(2, 2, 1, 12);
        ctx.fillStyle = outerLight;
        ctx.fillRect(2, 13, 12, 1);
        ctx.fillRect(13, 2, 1, 12);
        // Inner brushed metallic shine & diagonal specular glints
        ctx.fillStyle = innerShine;
        ctx.fillRect(3, 3, 10, 10);
        ctx.fillStyle = body;
        ctx.fillRect(5, 5, 6, 6);
        ctx.fillStyle = glint;
        ctx.fillRect(4, 4, 2, 1);
        ctx.fillRect(4, 5, 1, 1);
        ctx.fillRect(10, 10, 2, 1);
        ctx.fillRect(11, 11, 1, 1);
      }, seed),
    );

  const ironBlockTex = makeBevelBlock('#9ca3af', '#f8fafc', '#d1d5db', '#e5e7eb', '#ffffff', 460);
  const diamondBlockTex = makeBevelBlock('#0891b2', '#cffafe', '#22d3ee', '#67e8f9', '#ecfeff', 461);
  const goldBlockTex = makeBevelBlock('#b45309', '#fef08a', '#f59e0b', '#fbbf24', '#fffbeb', 462);

  const beaconTex = trackTex(
    createPixelTexture((ctx) => {
      // Aqua glass outer border
      ctx.fillStyle = '#bae6fd';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(1, 1, 14, 14);
      // Translucent inner chamber
      ctx.fillStyle = '#0ea5e9';
      ctx.fillRect(2, 2, 12, 10);
      // Obsidian base pedestal inside
      ctx.fillStyle = '#1b112c';
      ctx.fillRect(2, 12, 12, 3);
      ctx.fillStyle = '#4c2882';
      ctx.fillRect(3, 13, 10, 1);
      // Radiant Nether Star crystal core
      ctx.fillStyle = '#7dd3fc';
      ctx.fillRect(4, 3, 8, 8);
      ctx.fillStyle = '#e0f2fe';
      ctx.fillRect(5, 4, 6, 6);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(6, 5, 4, 4);
    }, 463),
  );

  const beaconEmissiveTex = trackTex(
    createPixelTexture((ctx) => {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#888888';
      ctx.fillRect(2, 2, 12, 10);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(4, 3, 8, 8);
    }, 464, 16, false),
  );

  const redstoneLampTex = trackTex(
    createPixelTexture((ctx) => {
      ctx.fillStyle = '#3f2818';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#d98a36';
      ctx.fillRect(2, 2, 12, 12);
      ctx.fillStyle = '#f5c26b';
      ctx.fillRect(3, 3, 10, 10);
      ctx.fillStyle = '#fff0b8';
      ctx.fillRect(5, 5, 6, 6);
      // Classic vanilla cross lattice
      ctx.fillStyle = '#4a2e1a';
      ctx.fillRect(7, 1, 2, 14);
      ctx.fillRect(1, 7, 14, 2);
    }, 465),
  );

  const redstoneLampEmissiveTex = trackTex(
    createPixelTexture((ctx) => {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(2, 2, 5, 5);
      ctx.fillRect(9, 2, 5, 5);
      ctx.fillRect(2, 9, 5, 5);
      ctx.fillRect(9, 9, 5, 5);
    }, 466, 16, false),
  );

  // === 10E. SUGAR CANE (Crossed-Plane Alpha-Cutout Stalks!) ===
  const sugarCaneTex = trackTex(
    createPixelTexture((ctx) => {
      const grid = [
        '..ab...ba...ab..',
        '..bc...cb...bc..',
        '..cd...dc...cd..',
        '..ab..cba...ab..',
        '..bc...cb...bc..',
        '.abc...cb..abc..',
        '..ab...ba...ab..',
        '..cd...dc...cd..',
        '..bc...cb...bc..',
        '..bc..dcb...bc..',
        '..ab...ba...ab..',
        '..cd...dc...cd..',
        '..bc...cb..abc..',
        '..ab...ba...ab..',
        '..bc...cb...bc..',
        '..ab...ba...ab..',
      ];
      drawGrid(ctx, grid, {
        a: '#3f7d28', // shaded cane edge
        b: '#63b33e', // core sugar cane green
        c: '#86d658', // bright cane ridge
        d: '#b9eb8c', // pale jointed node band
      });
    }, 467),
  );

  // === 11. NETHER PORTAL CORE ===
  const portalCoreTex = trackTex(
    createPixelTexture((ctx, rng) => {
      const cols = ['#7e22ce', '#9333ea', '#a855f7', '#6b21a8', '#c084fc'];
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          const wave = Math.floor((Math.sin(x * 0.7 + y * 0.5) + 1) * 2.4) % cols.length;
          ctx.fillStyle = rng() > 0.35 ? cols[wave] : cols[Math.floor(rng() * cols.length)];
          ctx.fillRect(x, y, 1, 1);
        }
      }
      ctx.fillStyle = '#e879f9';
      for (let i = 0; i < 14; i++) {
        ctx.fillRect(Math.floor(rng() * 14) + 1, Math.floor(rng() * 14) + 1, 2, 1);
      }
    }, 402),
  );

  // === 12. COTTAGE WINDOW GLASS (Pale Cyan Tint + Light Pixel Frame + Diagonal White Glints) ===
  const windowColorTex = trackTex(
    createPixelTexture((ctx) => {
      // Crisp outer wooden/pale-glass frame
      ctx.fillStyle = '#5c3c22';
      ctx.fillRect(0, 0, 16, 16);
      // Light inner glass bezel
      ctx.fillStyle = '#ccebf7';
      ctx.fillRect(1, 1, 14, 14);
      // Translucent pale cyan glass pane body
      ctx.fillStyle = '#9dd8ed';
      ctx.fillRect(2, 2, 12, 12);
      // Subtle mullion cross
      ctx.fillStyle = '#6c492a';
      ctx.fillRect(7, 1, 2, 14);
      ctx.fillRect(1, 7, 14, 2);
      // Iconic Minecraft diagonal white reflection pixels
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(3, 3, 1, 1);
      ctx.fillRect(4, 4, 1, 1);
      ctx.fillRect(5, 3, 1, 1);
      ctx.fillRect(11, 10, 1, 1);
      ctx.fillRect(12, 11, 1, 1);
      ctx.fillRect(10, 4, 1, 1);
      ctx.fillRect(11, 3, 1, 1);
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
    }, 404, 16, false),
  );

  // === 13. LANTERN (Crisp Iron Cage Frame + Glowing Golden Flame Core) ===
  const lanternColorTex = trackTex(
    createPixelTexture((ctx) => {
      const grid = [
        'aaaaaaaaaaaaaaaa',
        'abbbbbbbbbbbbbba',
        'abccddddddccbbba',
        'abcdeeeeeedcbbaa',
        'abcdeffffedcbbba',
        'abcdeffffedcbbaa',
        'abcdeffffedcbbba',
        'abbbbbbbbbbbbbba',
        'abcdeffffedcbbaa',
        'abcdeffffedcbbba',
        'abcdeeeeeedcbbaa',
        'abccddddddccbbba',
        'abbbbbbbbbbbbbba',
        'aabbccccccccbbaa',
        'aaaaaaaaaaaaaaaa',
        'aaaaaaaaaaaaaaaa',
      ];
      drawGrid(ctx, grid, {
        a: '#1c2028', // dark forged iron rim
        b: '#353c4a', // iron cage bar
        c: '#b45309', // warm deep orange glow edge
        d: '#f59e0b', // bright amber lantern glass
        e: '#fde047', // golden inner flame
        f: '#fffbeb', // hot white-yellow flame core
      });
    }, 405),
  );

  const lanternEmissiveTex = trackTex(
    createPixelTexture((ctx) => {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(3, 2, 10, 5);
      ctx.fillRect(3, 8, 10, 4);
    }, 406, 16, false),
  );

  // === 14. WATERFALL ===
  const waterfallTex = trackTex(
    createPixelTexture((ctx) => {
      const cols = ['#2580e8', '#339af0', '#4dabf7', '#1c7ed6'];
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          ctx.fillStyle = cols[(x * 2 + Math.floor(y / 2)) % cols.length];
          ctx.fillRect(x, y, 1, 1);
        }
      }
      ctx.fillStyle = '#d0ebff';
      for (let x = 1; x < 16; x += 3) {
        ctx.fillRect(x, (x * 5) % 13, 1, 3);
      }
    }, 407),
  );
  waterfallTex.wrapS = THREE.RepeatWrapping;
  waterfallTex.wrapT = THREE.RepeatWrapping;

  // === 15. CAMPFIRE LOG & GLOWING EMBER ===
  const campfireLogTex = makeBarkSide(
    { a: '#1b1109', b: '#2b1c10', c: '#3d2817', d: '#4f3520' },
    408,
  );
  const campfireEmberTex = trackTex(
    createPixelTexture((ctx) => {
      const grid = [
        'aabccbaaaabccbaa',
        'abcddcbabbcddcba',
        'bcdeedcbcdeeedcb',
        'abccddcccddeccba',
        'aaabccdddeccbaaa',
        'abbcdeeeeedcbbaa',
        'bcddfffffffddcba',
        'bcdefffffffedcba',
        'abccdeeeeedccbaa',
        'aaabccddddccbaaa',
        'abccdeeeeedccbaa',
        'bcdeffffffeedcba',
        'bcddfffffffddcba',
        'abccddeeeddccbaa',
        'aabccddddccbaaaa',
        'aaabbbccbbbaaaaa',
      ];
      drawGrid(ctx, grid, {
        a: '#261812',
        b: '#7c2d12',
        c: '#c2410c',
        d: '#f97316',
        e: '#facc15',
        f: '#fef9c3',
      });
    }, 409),
  );

  // === 16. CROSSED-PLANE PIXEL FLORA (Poppy, Dandelion, Short Meadow Grass — alphaTest: 0.5) ===
  const poppyTex = trackTex(
    createPixelTexture((ctx) => {
      const grid = [
        '................',
        '......rrrr......',
        '.....rRRRRr.....',
        '....rRRddRRr....',
        '....rRddddRr....',
        '.....rRRRRr.....',
        '......rrrr......',
        '.......gg.......',
        '......gG........',
        '.....gGg..g.....',
        '......gG.gG.....',
        '.......ggG......',
        '......gGg.......',
        '.......gG.......',
        '.......gg.......',
        '......ggg.......',
      ];
      drawGrid(ctx, grid, {
        r: '#be123c', // deep crimson petal edge
        R: '#f43f5e', // vibrant poppy red
        d: '#4c0519', // dark poppy center
        g: '#2f6f20', // dark green stem
        G: '#53a636', // bright green leaf
      });
    }, 410),
  );

  const dandelionTex = trackTex(
    createPixelTexture((ctx) => {
      const grid = [
        '................',
        '................',
        '......yyyy......',
        '.....yYYYYy.....',
        '.....yYwwYy.....',
        '.....yYYYYy.....',
        '......yyyy......',
        '.......gg.......',
        '.......gG.......',
        '.....g.gG.......',
        '.....GgG..g.....',
        '......gG.Gg.....',
        '.......ggG......',
        '.......gG.......',
        '.......gg.......',
        '......ggg.......',
      ];
      drawGrid(ctx, grid, {
        y: '#ca8a04', // golden edge
        Y: '#facc15', // bright dandelion yellow
        w: '#fef08a', // sunny center highlight
        g: '#2f6f20',
        G: '#58ad3a',
      });
    }, 411),
  );

  const grassTuftTex = trackTex(
    createPixelTexture((ctx) => {
      const grid = [
        '................',
        '................',
        '................',
        '....c......c....',
        '....b..c...b....',
        '.c..b..b..b..c..',
        '.b..a.cb..b..b..',
        '.b.cb.ba..a.cb..',
        '..bba.ba.cb.ba..',
        '..baa.ba.ba.ba..',
        '..bab.aa.ba.aa..',
        '.cbab.ab.aa.ab..',
        '.bbaa.ab.ab.ab..',
        '..aaa.aa.aa.aa..',
        '..aaa.aa.aa.aa..',
        '..aaaaaaaaaaaa..',
      ];
      drawGrid(ctx, grid, {
        a: '#397c24', // shaded blade base
        b: '#52a334', // mid grass blade
        c: '#72c445', // bright sunlit tip
      });
    }, 412),
  );

  // === 17. CREEPER ===
  const creeperSkinTex = trackTex(
    createPixelTexture((ctx, rng) => {
      const greens = ['#47ad35', '#57be44', '#3d992d', '#68cc54', '#348826'];
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          ctx.fillStyle = greens[Math.floor(rng() * greens.length)];
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }, 501),
  );

  const creeperFaceTex = trackTex(
    createPixelTexture((ctx, rng) => {
      const greens = ['#47ad35', '#57be44', '#3d992d', '#68cc54', '#348826'];
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          ctx.fillStyle = greens[Math.floor(rng() * greens.length)];
          ctx.fillRect(x, y, 1, 1);
        }
      }
      ctx.fillStyle = '#0d130d';
      ctx.fillRect(2, 4, 4, 4);
      ctx.fillRect(10, 4, 4, 4);
      ctx.fillRect(6, 8, 4, 4);
      ctx.fillRect(4, 10, 2, 5);
      ctx.fillRect(10, 10, 2, 5);
      ctx.fillRect(6, 10, 4, 3);
    }, 502),
  );

  // === 18. CELESTIAL PIXEL ART: SUN & MOON ===
  const sunTexture = trackTex(
    createPixelTexture((ctx) => {
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
    }, 601),
  );

  const sunGlowTexture = trackTex(
    createRadialGlowTexture('rgba(255, 240, 160, 0.85)', 'rgba(255, 196, 72, 0.28)'),
  );

  const moonTexture = trackTex(
    createPixelTexture((ctx) => {
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(1, 1, 14, 14);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(2, 2, 11, 11);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(13, 1, 2, 14);
      ctx.fillRect(12, 2, 1, 12);
      ctx.fillRect(2, 13, 13, 2);
      ctx.fillRect(3, 3, 3, 3);
      ctx.fillRect(9, 4, 2, 2);
      ctx.fillRect(5, 9, 4, 3);
      ctx.fillRect(10, 9, 2, 2);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(4, 4, 2, 2);
      ctx.fillRect(6, 10, 2, 2);
      ctx.fillRect(10, 5, 1, 1);
    }, 602),
  );

  const moonGlowTexture = trackTex(
    createRadialGlowTexture('rgba(210, 232, 255, 0.55)', 'rgba(148, 188, 255, 0.16)'),
  );

  // === BUILD MATERIALS WITH AUTHENTIC MC ROUGHNESS & FANCY ALPHA-CUTOUT ===
  const grassSideMat = trackMat(
    new THREE.MeshStandardMaterial({ map: grassSideTex, roughness: 0.92, metalness: 0.0 }),
  );
  const grassTopMat = trackMat(
    new THREE.MeshStandardMaterial({ map: grassTopTex, roughness: 0.88, metalness: 0.0 }),
  );
  const dirtMat = trackMat(
    new THREE.MeshStandardMaterial({ map: dirtTex, roughness: 0.95, metalness: 0.0 }),
  );
  const sandMat = trackMat(
    new THREE.MeshStandardMaterial({ map: sandTex, roughness: 0.92, metalness: 0.0 }),
  );
  const gravelMat = trackMat(
    new THREE.MeshStandardMaterial({ map: gravelTex, roughness: 0.94, metalness: 0.0 }),
  );
  const stoneMat = trackMat(
    new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.9, metalness: 0.02 }),
  );
  const cobbleMat = trackMat(
    new THREE.MeshStandardMaterial({ map: cobbleTex, roughness: 0.91, metalness: 0.02 }),
  );

  const oakSideMat = trackMat(
    new THREE.MeshStandardMaterial({ map: oakLogSideTex, roughness: 0.91, metalness: 0.0 }),
  );
  const oakTopMat = trackMat(
    new THREE.MeshStandardMaterial({ map: oakLogTopTex, roughness: 0.89, metalness: 0.0 }),
  );
  const oakPlanks = trackMat(
    new THREE.MeshStandardMaterial({ map: oakPlanksTex, roughness: 0.88, metalness: 0.0 }),
  );

  const spruceSideMat = trackMat(
    new THREE.MeshStandardMaterial({ map: spruceLogSideTex, roughness: 0.92, metalness: 0.0 }),
  );
  const spruceTopMat = trackMat(
    new THREE.MeshStandardMaterial({ map: spruceLogTopTex, roughness: 0.9, metalness: 0.0 }),
  );
  const sprucePlanks = trackMat(
    new THREE.MeshStandardMaterial({ map: sprucePlanksTex, roughness: 0.89, metalness: 0.0 }),
  );

  // Fancy Leaves: alphaTest: 0.5, transparent: false, DoubleSide + matching customDepthMaterial!
  const oakLeaves = trackMat(
    new THREE.MeshStandardMaterial({
      map: oakLeavesTex,
      alphaTest: 0.5,
      transparent: false,
      side: THREE.DoubleSide,
      roughness: 0.88,
      metalness: 0.0,
    }),
  );
  const oakLeavesDepth = trackMat(
    new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
      map: oakLeavesTex,
      alphaTest: 0.5,
      side: THREE.DoubleSide,
    }),
  );

  const spruceLeaves = trackMat(
    new THREE.MeshStandardMaterial({
      map: spruceLeavesTex,
      alphaTest: 0.5,
      transparent: false,
      side: THREE.DoubleSide,
      roughness: 0.89,
      metalness: 0.0,
    }),
  );
  const spruceLeavesDepth = trackMat(
    new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
      map: spruceLeavesTex,
      alphaTest: 0.5,
      side: THREE.DoubleSide,
    }),
  );

  const obsidian = trackMat(
    new THREE.MeshStandardMaterial({ map: obsidianTex, roughness: 0.58, metalness: 0.28 }),
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
      emissiveIntensity: 0.06,
      roughness: 0.26,
      metalness: 0.14,
    }),
  );

  const lantern = trackMat(
    new THREE.MeshStandardMaterial({
      map: lanternColorTex,
      emissive: new THREE.Color('#ffae38'),
      emissiveMap: lanternEmissiveTex,
      emissiveIntensity: 0.45,
      roughness: 0.52,
      metalness: 0.24,
    }),
  );

  const waterfall = trackMat(
    new THREE.MeshStandardMaterial({
      map: waterfallTex,
      color: new THREE.Color('#7dd3fc'),
      transparent: true,
      opacity: 0.82,
      roughness: 0.16,
      metalness: 0.08,
    }),
  );

  const campfireLog = trackMat(
    new THREE.MeshStandardMaterial({ map: campfireLogTex, roughness: 0.94, metalness: 0.0 }),
  );
  const campfireEmber = trackMat(
    new THREE.MeshBasicMaterial({ map: campfireEmberTex }),
  );

  const flowerPoppy = trackMat(
    new THREE.MeshStandardMaterial({
      map: poppyTex,
      alphaTest: 0.5,
      transparent: false,
      side: THREE.DoubleSide,
      roughness: 0.88,
      metalness: 0.0,
    }),
  );

  const flowerDandelion = trackMat(
    new THREE.MeshStandardMaterial({
      map: dandelionTex,
      alphaTest: 0.5,
      transparent: false,
      side: THREE.DoubleSide,
      roughness: 0.88,
      metalness: 0.0,
    }),
  );

  const grassTuft = trackMat(
    new THREE.MeshStandardMaterial({
      map: grassTuftTex,
      alphaTest: 0.5,
      transparent: false,
      side: THREE.DoubleSide,
      roughness: 0.9,
      metalness: 0.0,
    }),
  );

  const sugarCane = trackMat(
    new THREE.MeshStandardMaterial({
      map: sugarCaneTex,
      alphaTest: 0.5,
      transparent: false,
      side: THREE.DoubleSide,
      roughness: 0.88,
      metalness: 0.0,
    }),
  );

  const stoneBricks = trackMat(
    new THREE.MeshStandardMaterial({ map: stoneBricksTex, roughness: 0.9, metalness: 0.02 }),
  );
  const crackedStoneBricks = trackMat(
    new THREE.MeshStandardMaterial({ map: crackedStoneBricksTex, roughness: 0.91, metalness: 0.02 }),
  );
  const mossyStoneBricks = trackMat(
    new THREE.MeshStandardMaterial({ map: mossyStoneBricksTex, roughness: 0.91, metalness: 0.02 }),
  );
  const andesite = trackMat(
    new THREE.MeshStandardMaterial({ map: andesiteTex, roughness: 0.9, metalness: 0.02 }),
  );
  const deepslate = trackMat(
    new THREE.MeshStandardMaterial({ map: deepslateTex, roughness: 0.92, metalness: 0.04 }),
  );
  const cobbledDeepslate = trackMat(
    new THREE.MeshStandardMaterial({ map: cobbledDeepslateTex, roughness: 0.93, metalness: 0.04 }),
  );
  const deepslateTiles = trackMat(
    new THREE.MeshStandardMaterial({ map: deepslateTilesTex, roughness: 0.86, metalness: 0.06 }),
  );
  const craftingTopMat = trackMat(
    new THREE.MeshStandardMaterial({ map: craftingTopTex, roughness: 0.88, metalness: 0.0 }),
  );
  const craftingSideMat = trackMat(
    new THREE.MeshStandardMaterial({ map: craftingSideTex, roughness: 0.88, metalness: 0.0 }),
  );
  const furnaceEmissiveTex = trackTex(
    createPixelTexture((ctx) => {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 16, 16);
      // Warm ember glow inside the lower furnace firebox
      ctx.fillStyle = '#ff9922';
      ctx.fillRect(4, 11, 8, 3);
      ctx.fillStyle = '#ffdd66';
      ctx.fillRect(5, 12, 6, 2);
    }, 510, 16, false),
  );
  const furnaceFrontMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: furnaceFrontTex,
      emissive: new THREE.Color('#ff8822'),
      emissiveMap: furnaceEmissiveTex,
      emissiveIntensity: 0.15,
      roughness: 0.88,
      metalness: 0.04,
    }),
  );

  // === V0.5 VANILLA BLOCKS: RED/WHITE CONCRETE, SEA LANTERN, WET FARMLAND, WHEAT, CHEST, WOOL ===
  const redConcreteTex = trackTex(
    createPixelTexture((ctx, rng) => {
      const shades = ['#96231e', '#8e201b', '#9e2722', '#871d19'];
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          ctx.fillStyle = shades[Math.floor(rng() * shades.length)];
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }, 701),
  );
  const redConcrete = trackMat(
    new THREE.MeshStandardMaterial({ map: redConcreteTex, roughness: 0.88, metalness: 0.02 }),
  );

  const whiteConcreteTex = trackTex(
    createPixelTexture((ctx, rng) => {
      const shades = ['#dce0e4', '#d4d8dd', '#e3e7eb', '#cfd4da'];
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          ctx.fillStyle = shades[Math.floor(rng() * shades.length)];
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }, 702),
  );
  const whiteConcrete = trackMat(
    new THREE.MeshStandardMaterial({ map: whiteConcreteTex, roughness: 0.86, metalness: 0.02 }),
  );

  const seaLanternTex = trackTex(
    createPixelTexture((ctx) => {
      const grid = [
        'aabbbccccccbbbaa',
        'abccddddddddccba',
        'bcdddeeeeeedddcb',
        'bcdeeeffffeeedcb',
        'bdeeffffffffeedb',
        'cdeeffffffffeedc',
        'cdefffffffffffdc',
        'cdefffffffffffdc',
        'cdefffffffffffdc',
        'cdefffffffffffdc',
        'cdeeffffffffeedc',
        'bdeeffffffffeedb',
        'bcdeeeffffeeedcb',
        'bcdddeeeeeedddcb',
        'abccddddddddccba',
        'aabbbccccccbbbaa',
      ];
      drawGrid(ctx, grid, {
        a: '#6b9ea0',
        b: '#88bab8',
        c: '#a9d6d0',
        d: '#c9ece6',
        e: '#e3f9f2',
        f: '#f7fffd',
      });
    }, 703),
  );
  const seaLantern = trackMat(
    new THREE.MeshStandardMaterial({
      map: seaLanternTex,
      emissive: new THREE.Color('#fff3c4'),
      emissiveMap: seaLanternTex,
      emissiveIntensity: 1.25,
      roughness: 0.28,
      metalness: 0.05,
    }),
  );

  const farmlandWetTopTex = trackTex(
    createPixelTexture((ctx) => {
      // Classic vanilla hydrated furrowed dark soil
      for (let y = 0; y < 16; y++) {
        const furrow = y % 4 === 0;
        const ridge = y % 4 === 2;
        for (let x = 0; x < 16; x++) {
          ctx.fillStyle = furrow
            ? '#331f10'
            : ridge
              ? '#5a3a21'
              : (x + y) % 3 === 0
                ? '#452b17'
                : '#4e311b';
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }, 704),
  );
  const farmlandWetTopMat = trackMat(
    new THREE.MeshStandardMaterial({ map: farmlandWetTopTex, roughness: 0.94, metalness: 0.0 }),
  );

  const wheatTex = trackTex(
    createPixelTexture((ctx) => {
      // Golden ripe vanilla Minecraft wheat stalks (alphaTest cutout)
      const grid = [
        '................',
        '..d...d...d...d.',
        '.dcd.dcd.dcd.dcd',
        '.cdb.cdb.cdb.cdb',
        '.dcd.dcd.dcd.dcd',
        '.cdb.cdb.cdb.cdb',
        '.bab.bab.bab.bab',
        '..a..bab..a..bab',
        '.bab..a..bab..a.',
        '..a..bab..a..bab',
        '.bab..a..bab..a.',
        '..g...g...g...g.',
        '..g..gg...g..gg.',
        '.gg...g..gg...g.',
        '..g..gg...g..gg.',
        '.gg...g..gg...g.',
      ];
      drawGrid(ctx, grid, {
        d: '#facc15', // sunlit wheat grain
        c: '#eab308', // golden ear
        b: '#ca8a04', // warm stalk
        a: '#a16207', // shaded stalk
        g: '#65a30d', // lower green stem
      });
    }, 705),
  );
  const wheat = trackMat(
    new THREE.MeshStandardMaterial({
      map: wheatTex,
      alphaTest: 0.5,
      transparent: false,
      side: THREE.DoubleSide,
      roughness: 0.88,
      metalness: 0.0,
    }),
  );

  const farmWater = trackMat(
    new THREE.MeshStandardMaterial({
      map: waterfallTex,
      color: new THREE.Color('#38bdf8'),
      transparent: true,
      opacity: 0.84,
      roughness: 0.14,
      metalness: 0.08,
    }),
  );

  const chestSideTex = trackTex(
    createPixelTexture((ctx) => {
      ctx.fillStyle = '#3b2610';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#9c6b2d';
      ctx.fillRect(1, 1, 14, 14);
      ctx.fillStyle = '#b47f38';
      ctx.fillRect(2, 2, 12, 12);
      // Horizontal lid seam
      ctx.fillStyle = '#2d1c0b';
      ctx.fillRect(0, 5, 16, 1);
      // Plank grain accents
      ctx.fillStyle = '#855822';
      ctx.fillRect(2, 3, 12, 1);
      ctx.fillRect(2, 9, 12, 1);
      ctx.fillRect(2, 12, 12, 1);
    }, 706),
  );
  const chestFrontTex = trackTex(
    createPixelTexture((ctx) => {
      ctx.fillStyle = '#3b2610';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#9c6b2d';
      ctx.fillRect(1, 1, 14, 14);
      ctx.fillStyle = '#b47f38';
      ctx.fillRect(2, 2, 12, 12);
      ctx.fillStyle = '#2d1c0b';
      ctx.fillRect(0, 5, 16, 1);
      // Classic silver iron latch
      ctx.fillStyle = '#475569';
      ctx.fillRect(6, 4, 4, 4);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(7, 4, 2, 3);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(7, 4, 2, 1);
    }, 707),
  );
  const chestTopTex = trackTex(
    createPixelTexture((ctx) => {
      ctx.fillStyle = '#3b2610';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#a87632';
      ctx.fillRect(1, 1, 14, 14);
      ctx.fillStyle = '#be8a42';
      ctx.fillRect(2, 2, 12, 12);
      ctx.fillStyle = '#8d6026';
      ctx.fillRect(2, 6, 12, 1);
      ctx.fillRect(2, 10, 12, 1);
    }, 708),
  );
  const chestSideMat = trackMat(
    new THREE.MeshStandardMaterial({ map: chestSideTex, roughness: 0.86, metalness: 0.04 }),
  );
  const chestFrontMat = trackMat(
    new THREE.MeshStandardMaterial({ map: chestFrontTex, roughness: 0.84, metalness: 0.08 }),
  );
  const chestTopMat = trackMat(
    new THREE.MeshStandardMaterial({ map: chestTopTex, roughness: 0.86, metalness: 0.04 }),
  );

  const makeWoolTex = (pal: string[], seed: number) =>
    trackTex(
      createPixelTexture((ctx, rng) => {
        for (let y = 0; y < 16; y++) {
          for (let x = 0; x < 16; x++) {
            const weave = (x + y) % 2 === 0 ? 0 : 1;
            const pick = Math.min(pal.length - 1, weave + Math.floor(rng() * (pal.length - 1)));
            ctx.fillStyle = pal[pick];
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }, seed),
    );
  const redWool = trackMat(
    new THREE.MeshStandardMaterial({
      map: makeWoolTex(['#a9231f', '#bd2b26', '#971e1a', '#cd3832'], 709),
      roughness: 0.94,
      metalness: 0.0,
    }),
  );
  const whiteWool = trackMat(
    new THREE.MeshStandardMaterial({
      map: makeWoolTex(['#eceff1', '#e2e6e9', '#f7f9fa', '#d8dde2'], 710),
      roughness: 0.94,
      metalness: 0.0,
    }),
  );

  // === V0.6 MASTER-BUILDER BLOCKS: CALCITE, BARREL, HAY BALE, SPRUCE TRAPDOOR ===
  const calciteTex = trackTex(
    createPixelTexture((ctx) => {
      const grid = [
        'ccccddddccccbbcc',
        'ccddccccbbccddcc',
        'bbccccddccccddcb',
        'ccccddccccbbcccc',
        'ddccccbbccccddcc',
        'ccccbbccccddcccc',
        'ccbbccccddccccdd',
        'bbccccddccccbbcc',
        'ccccddccccbbccdd',
        'ddccccbbccccddcc',
        'ccccbbccccddccbb',
        'ccddccccbbccccdd',
        'bbccccddccccbbcc',
        'ccccddccccbbcccc',
        'ddccccbbccccddcc',
        'ccbbccccddccccdd',
      ];
      drawGrid(ctx, grid, {
        b: '#cfd2ce', // soft pale warm-grey calcite vein
        c: '#e2e4e0', // crisp plaster ivory
        d: '#eff1ed', // bright mineral highlight
      });
    }, 721),
  );
  const calcite = trackMat(
    new THREE.MeshStandardMaterial({ map: calciteTex, roughness: 0.88, metalness: 0.02 }),
  );

  const barrelSideTex = trackTex(
    createPixelTexture((ctx) => {
      for (let y = 0; y < 16; y++) {
        const isHoop = y === 2 || y === 3 || y === 12 || y === 13;
        for (let x = 0; x < 16; x++) {
          if (isHoop) {
            ctx.fillStyle = y % 2 === 0 ? '#475569' : '#334155';
          } else {
            const seam = x % 4 === 0;
            ctx.fillStyle = seam ? '#4e331b' : (x + y) % 3 === 0 ? '#7b532f' : '#8d6139';
          }
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }, 722),
  );
  const barrelTopTex = trackTex(
    createPixelTexture((ctx) => {
      ctx.fillStyle = '#5a3b1f';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#8b5e35';
      ctx.fillRect(1, 1, 14, 14);
      ctx.fillStyle = '#6f4a28';
      ctx.fillRect(4, 1, 1, 14);
      ctx.fillRect(8, 1, 1, 14);
      ctx.fillRect(12, 1, 1, 14);
      // Lid handle & metal latch
      ctx.fillStyle = '#27272a';
      ctx.fillRect(6, 5, 4, 2);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(7, 5, 2, 1);
    }, 723),
  );
  const barrelSideMat = trackMat(
    new THREE.MeshStandardMaterial({ map: barrelSideTex, roughness: 0.88, metalness: 0.12 }),
  );
  const barrelTopMat = trackMat(
    new THREE.MeshStandardMaterial({ map: barrelTopTex, roughness: 0.88, metalness: 0.06 }),
  );

  const haySideTex = trackTex(
    createPixelTexture((ctx, rng) => {
      const straw = ['#d4a72c', '#c39522', '#e0b73c', '#b4841b'];
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          ctx.fillStyle = straw[Math.floor(rng() * straw.length)];
          ctx.fillRect(x, y, 1, 1);
        }
      }
      // Classic crimson twine bands
      ctx.fillStyle = '#991b1b';
      ctx.fillRect(0, 4, 16, 2);
      ctx.fillRect(0, 11, 16, 2);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(0, 4, 16, 1);
      ctx.fillRect(0, 11, 16, 1);
    }, 724),
  );
  const hayTopTex = trackTex(
    createPixelTexture((ctx, rng) => {
      const straw = ['#cfa128', '#be8e1e', '#dfb438', '#ad7e19'];
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          ctx.fillStyle = straw[Math.floor(rng() * straw.length)];
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }, 725),
  );
  const haySideMat = trackMat(
    new THREE.MeshStandardMaterial({ map: haySideTex, roughness: 0.94, metalness: 0.0 }),
  );
  const hayTopMat = trackMat(
    new THREE.MeshStandardMaterial({ map: hayTopTex, roughness: 0.94, metalness: 0.0 }),
  );

  const spruceTrapdoorTex = trackTex(
    createPixelTexture((ctx) => {
      ctx.fillStyle = '#3b2413';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#5e3d21';
      ctx.fillRect(1, 1, 14, 14);
      // Plank seams
      ctx.fillStyle = '#472d17';
      ctx.fillRect(1, 5, 14, 1);
      ctx.fillRect(1, 10, 14, 1);
      // Forged iron strap hinges
      ctx.fillStyle = '#334155';
      ctx.fillRect(2, 2, 12, 2);
      ctx.fillRect(2, 12, 12, 2);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(3, 2, 2, 1);
      ctx.fillRect(11, 2, 2, 1);
      ctx.fillRect(3, 12, 2, 1);
      ctx.fillRect(11, 12, 2, 1);
    }, 726),
  );
  const spruceTrapdoor = trackMat(
    new THREE.MeshStandardMaterial({ map: spruceTrapdoorTex, roughness: 0.86, metalness: 0.14 }),
  );
  const oakDoorLower = trackMat(
    new THREE.MeshStandardMaterial({ map: oakDoorLowerTex, roughness: 0.86, metalness: 0.02 }),
  );
  const oakDoorUpper = trackMat(
    new THREE.MeshStandardMaterial({ map: oakDoorUpperTex, roughness: 0.82, metalness: 0.04 }),
  );
  const copperRod = trackMat(
    new THREE.MeshStandardMaterial({ color: '#c8734b', roughness: 0.4, metalness: 0.72 }),
  );

  const cherrySideMat = trackMat(
    new THREE.MeshStandardMaterial({ map: cherryLogSideTex, roughness: 0.9, metalness: 0.0 }),
  );
  const cherryTopMat = trackMat(
    new THREE.MeshStandardMaterial({ map: cherryLogTopTex, roughness: 0.88, metalness: 0.0 }),
  );

  const cherryLeaves = trackMat(
    new THREE.MeshStandardMaterial({
      map: cherryLeavesTex,
      alphaTest: 0.5,
      transparent: false,
      side: THREE.DoubleSide,
      roughness: 0.86,
      metalness: 0.0,
    }),
  );
  const cherryLeavesDepth = trackMat(
    new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
      map: cherryLeavesTex,
      alphaTest: 0.5,
      side: THREE.DoubleSide,
    }),
  );

  const cryingObsidian = trackMat(
    new THREE.MeshStandardMaterial({
      map: cryingObsidianTex,
      emissive: new THREE.Color('#c084fc'),
      emissiveMap: cryingObsidianEmissiveTex,
      emissiveIntensity: 0.45,
      roughness: 0.55,
      metalness: 0.25,
    }),
  );

  const ironBlock = trackMat(
    new THREE.MeshStandardMaterial({ map: ironBlockTex, roughness: 0.42, metalness: 0.55 }),
  );
  const diamondBlock = trackMat(
    new THREE.MeshStandardMaterial({ map: diamondBlockTex, roughness: 0.32, metalness: 0.35 }),
  );
  const goldBlock = trackMat(
    new THREE.MeshStandardMaterial({ map: goldBlockTex, roughness: 0.36, metalness: 0.62 }),
  );

  const beaconBlock = trackMat(
    new THREE.MeshStandardMaterial({
      map: beaconTex,
      emissive: new THREE.Color('#7dd3fc'),
      emissiveMap: beaconEmissiveTex,
      emissiveIntensity: 1.15,
      roughness: 0.22,
      metalness: 0.15,
    }),
  );

  const redstoneLamp = trackMat(
    new THREE.MeshStandardMaterial({
      map: redstoneLampTex,
      emissive: new THREE.Color('#ffba52'),
      emissiveMap: redstoneLampEmissiveTex,
      emissiveIntensity: 0.35,
      roughness: 0.55,
      metalness: 0.1,
    }),
  );

  const creeperBody = trackMat(
    new THREE.MeshStandardMaterial({ map: creeperSkinTex, roughness: 0.86, metalness: 0.0 }),
  );
  const creeperFaceMat = trackMat(
    new THREE.MeshStandardMaterial({ map: creeperFaceTex, roughness: 0.86, metalness: 0.0 }),
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
    andesite,
    cobblestone: cobbleMat,
    stoneBricks,
    crackedStoneBricks,
    mossyStoneBricks,
    deepslate,
    cobbledDeepslate,
    deepslateTiles,
    craftingTable: [
      craftingSideMat,
      craftingSideMat,
      craftingTopMat,
      oakPlanks,
      craftingSideMat,
      craftingSideMat,
    ],
    furnace: [furnaceFrontMat, stoneMat, stoneMat, stoneMat, stoneMat, stoneMat],
    furnaceFront: furnaceFrontMat,
    chest: [chestSideMat, chestSideMat, chestTopMat, chestTopMat, chestFrontMat, chestSideMat],
    redConcrete,
    whiteConcrete,
    seaLantern,
    farmlandWet: [dirtMat, dirtMat, farmlandWetTopMat, dirtMat, dirtMat, dirtMat],
    wheat,
    farmWater,
    redWool,
    whiteWool,
    calcite,
    barrel: [barrelSideMat, barrelSideMat, barrelTopMat, barrelTopMat, barrelSideMat, barrelSideMat],
    hayBlock: [haySideMat, haySideMat, hayTopMat, hayTopMat, haySideMat, haySideMat],
    spruceTrapdoor,
    oakDoorLower,
    oakDoorUpper,
    copperRod,
    oakLog: [oakSideMat, oakSideMat, oakTopMat, oakTopMat, oakSideMat, oakSideMat],
    oakPlanks,
    spruceLog: [spruceSideMat, spruceSideMat, spruceTopMat, spruceTopMat, spruceSideMat, spruceSideMat],
    sprucePlanks,
    cherryLog: [cherrySideMat, cherrySideMat, cherryTopMat, cherryTopMat, cherrySideMat, cherrySideMat],
    oakLeaves,
    oakLeavesDepth,
    spruceLeaves,
    spruceLeavesDepth,
    cherryLeaves,
    cherryLeavesDepth,
    coalOre,
    ironOre,
    diamondOre,
    emeraldOre,
    goldOre,
    redstoneOre,
    obsidian,
    cryingObsidian,
    ironBlock,
    diamondBlock,
    goldBlock,
    beaconBlock,
    redstoneLamp,
    portalCore,
    windowGlass,
    lantern,
    waterfall,
    campfireLog,
    campfireEmber,
    flowerPoppy,
    flowerDandelion,
    grassTuft,
    sugarCane,
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
