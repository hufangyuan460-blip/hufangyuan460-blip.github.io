export type Vec3 = [number, number, number];

export type SolidBlockType =
  | 'grass'
  | 'dirt'
  | 'sand'
  | 'gravel'
  | 'stone'
  | 'cobblestone'
  | 'oakLog'
  | 'oakPlanks'
  | 'spruceLog'
  | 'sprucePlanks'
  | 'oakLeaves'
  | 'spruceLeaves'
  | 'coalOre'
  | 'ironOre'
  | 'diamondOre'
  | 'emeraldOre'
  | 'goldOre'
  | 'redstoneOre'
  | 'obsidian'
  | 'windowGlass'
  | 'lantern'
  | 'waterfall';

export interface IslandLayout {
  blocks: Record<SolidBlockType, Vec3[]>;
  meadowGrassTop: Vec3[];
  portalCoreCenter: Vec3;
  portalCoreSize: [number, number];
  campfirePos: Vec3;
  cottageLightPos: Vec3;
  lanternLights: Vec3[];
  waterfallBases: Vec3[];
  boatAnchor: Vec3;
  creeperPos: Vec3;
  flowersRed: Vec3[];
  flowersYellow: Vec3[];
  grassTufts: Vec3[];
  totalCulledCount: number;
  totalVisibleCount: number;
}

const TRANSPARENT_OR_CUTOUT = new Set<SolidBlockType>([
  'oakLeaves',
  'spruceLeaves',
  'windowGlass',
  'lantern',
  'waterfall',
]);

function keyOf(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}

function hash2D(x: number, z: number): number {
  const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

function smoothNoise(x: number, z: number): number {
  return (
    Math.sin(x * 0.24) * Math.cos(z * 0.22) * 0.55 +
    Math.sin((x + z) * 0.17 + 1.2) * 0.35 +
    Math.cos((x - z) * 0.31 - 0.6) * 0.2
  );
}

export function buildIslandLayout(): IslandLayout {
  const world = new Map<string, SolidBlockType>();
  const heightMap = new Map<string, number>();

  const setBlock = (x: number, y: number, z: number, type: SolidBlockType) => {
    world.set(keyOf(Math.round(x), Math.round(y), Math.round(z)), type);
  };

  const clearBlock = (x: number, y: number, z: number) => {
    world.delete(keyOf(Math.round(x), Math.round(y), Math.round(z)));
  };

  const getBlock = (x: number, y: number, z: number) =>
    world.get(keyOf(Math.round(x), Math.round(y), Math.round(z)));

  // === 1. MAIN 30x30 ISLAND TERRAIN SCULPTING ===
  for (let x = -15; x <= 15; x++) {
    for (let z = -15; z <= 15; z++) {
      // Organic island footprint (~28-30 blocks wide) with a scenic southern-east cove
      const angle = Math.atan2(z, x);
      const radiusLobe =
        13.2 +
        Math.sin(angle * 2.0 + 0.4) * 1.1 +
        Math.cos(angle * 3.0 - 0.8) * 0.95 +
        Math.sin(angle * 5.0) * 0.45;

      // Carve a graceful bay cove near the pier & waterfall (east-south quadrant)
      const coveDist = Math.hypot(x - 8.5, z - 8.5);
      const coveIndent = Math.max(0, 1 - coveDist / 7.5) * 4.2;

      const dist = Math.hypot(x * 0.98, z * 1.02);
      const effectiveRadius = radiusLobe - coveIndent;

      // Shallow submerged sandbar around the coastline
      if (dist > effectiveRadius) {
        if (dist <= effectiveRadius + 2.4) {
          setBlock(x, -1, z, 'sand');
          // Occasional shallow rocky reef peeking through turquoise water
          if (hash2D(x * 3, z * 3) > 0.945 && dist < effectiveRadius + 1.8) {
            setBlock(x, 0, z, hash2D(x, z) > 0.5 ? 'stone' : 'gravel');
          }
        }
        continue;
      }

      const normDist = dist / Math.max(effectiveRadius, 0.1);
      const edgeFalloff = Math.max(0, 1 - Math.pow(normDist, 2.35));

      // Base rolling hills
      let h = edgeFalloff * 3.8 + smoothNoise(x, z) * 1.15 * edgeFalloff;

      // Northeast rocky mountain peak (centered around x=6, z=-6)
      const mtnDist = Math.hypot((x - 5.5) * 0.9, (z + 5.5) * 0.95);
      const mtnLift = Math.max(0, 1 - mtnDist / 8.8);
      h += Math.pow(mtnLift, 1.45) * 8.2;

      // Secondary northwest highland plateau for the Obsidian Nether Portal (x=-5.5, z=-6)
      const portalDist = Math.hypot((x + 5.5) * 0.95, (z + 6.0) * 0.95);
      const portalLift = Math.max(0, 1 - portalDist / 6.2);
      h += Math.pow(portalLift, 1.3) * 4.4;

      let topY = Math.max(0, Math.round(h));

      // Flatten hillside cottage & camp terrace (x in [-8..-1], z in [-1..6]) to y = 3
      if (x >= -8 && x <= -1 && z >= -1 && z <= 6) {
        topY = 3;
      }

      // Flatten Nether Portal stone terrace (x in [-8..-3], z in [-8..-4]) to y = 6
      if (x >= -8 && x <= -3 && z >= -8 && z <= -4) {
        topY = 6;
      }

      // Smooth front meadow slope for Creeper & cobblestone fork (x in [-1..3], z in [3..7])
      if (x >= -1 && x <= 3 && z >= 3 && z <= 7) {
        topY = Math.min(topY, 2);
      }

      // Carve small plunge pool basin right beneath the cliff waterfall (x in [6..8], z in [1..3])
      if (x >= 6 && x <= 8 && z >= 1 && z <= 3) {
        topY = 0;
        setBlock(x, -1, z, 'sand');
        setBlock(x, -2, z, 'stone');
        heightMap.set(`${x},${z}`, -1);
        continue;
      }

      heightMap.set(`${x},${z}`, topY);

      // Fill terrain column from seabed y=-2 up to topY
      for (let y = -2; y <= topY; y++) {
        if (y === topY) {
          if (topY <= 1) {
            setBlock(x, y, z, hash2D(x + 7, z - 3) > 0.88 ? 'gravel' : 'sand');
          } else if (topY >= 7 || (mtnDist < 5.6 && topY >= 5)) {
            // Rocky mountain summit & exposed cliff stone
            const isGrassyLedge = topY === 7 && hash2D(x * 2, z * 2) > 0.65;
            setBlock(x, y, z, isGrassyLedge ? 'grass' : 'stone');
          } else {
            setBlock(x, y, z, 'grass');
          }
        } else if (y >= topY - 2 && topY < 7 && topY > 1) {
          setBlock(x, y, z, 'dirt');
        } else if (topY <= 1 && y >= -1) {
          setBlock(x, y, z, 'sand');
        } else {
          // Stone interior & cliff walls with classic vanilla Minecraft ore seams
          const oreHash = Math.abs(x * 37 + y * 19 + z * 59) % 47;
          if (y >= 2 && oreHash === 3) {
            setBlock(x, y, z, 'diamondOre');
          } else if (y >= 2 && oreHash === 9) {
            setBlock(x, y, z, 'coalOre');
          } else if (y >= 1 && oreHash === 16) {
            setBlock(x, y, z, 'ironOre');
          } else if (y >= 2 && oreHash === 23) {
            setBlock(x, y, z, 'emeraldOre');
          } else if (y >= 1 && oreHash === 31) {
            setBlock(x, y, z, 'goldOre');
          } else if (y >= 1 && oreHash === 39) {
            setBlock(x, y, z, 'redstoneOre');
          } else {
            setBlock(x, y, z, 'stone');
          }
        }
      }
    }
  }

  // Guarantee crisp visible vanilla ores (Coal, Iron, Gold, Diamond + Emerald) on the mountain cliff!
  const cliffShowcaseOres: Array<{ pos: Vec3; type: SolidBlockType }> = [
    { pos: [4, 5, -1], type: 'diamondOre' },
    { pos: [5, 6, -1], type: 'goldOre' },
    { pos: [3, 4, -2], type: 'ironOre' },
    { pos: [9, 4, -2], type: 'coalOre' },
    { pos: [6, 8, -2], type: 'coalOre' },
    { pos: [2, 6, -3], type: 'ironOre' },
    { pos: [8, 5, -1], type: 'diamondOre' },
    { pos: [5, 8, -3], type: 'emeraldOre' },
  ];
  for (const ore of cliffShowcaseOres) {
    const [ox, oy, oz] = ore.pos;
    if (getBlock(ox, oy, oz)) {
      setBlock(ox, oy, oz, ore.type);
    }
  }

  // === 2. CLIFF SPRING & WATERFALL INTO BAY ===
  // Mountain spring basin at (6..7, 7, -2..-1) spilling down front face into bay (6..7, 0..6, 0..1)
  const springBasin: Vec3[] = [
    [6, 7, -2],
    [7, 7, -2],
    [6, 7, -1],
    [7, 7, -1],
  ];
  for (const [sx, sy, sz] of springBasin) {
    setBlock(sx, sy, sz, 'waterfall');
    setBlock(sx, sy - 1, sz, 'stone');
    clearBlock(sx, sy + 1, sz);
    clearBlock(sx, sy + 2, sz);
  }
  // Vertical waterfall curtain cascading into bay at z=0 and z=1
  for (let y = 7; y >= 0; y--) {
    setBlock(6, y, 0, 'waterfall');
    setBlock(7, y, 0, 'waterfall');
    if (y <= 4) {
      setBlock(7, y, 1, 'waterfall');
    }
  }
  const waterfallBases: Vec3[] = [
    [6.5, 0.35, 0.7],
    [7.2, 0.35, 1.4],
  ];

  // === 3. COBBLESTONE FOOTPATH & STEPS ===
  const pathPoints: Array<[number, number]> = [
    // From pier beach entrance up toward camp & Creeper meadow
    [3, 9], [3, 8], [2, 8], [2, 7], [1, 7], [0, 7], [-1, 7], [-2, 7],
    [-3, 6], [-4, 6], [-5, 5],
    // Branch from camp fork up to Nether Portal ruin
    [-3, 5], [-3, 4], [-2, 3], [-2, 2], [-2, 1], [-2, 0],
    [-3, -1], [-4, -2], [-5, -3], [-5, -4],
    // Scenic branch toward waterfall overlook
    [2, 6], [3, 5], [4, 4], [4, 3],
  ];
  for (const [px, pz] of pathPoints) {
    const py = heightMap.get(`${px},${pz}`);
    if (py !== undefined && py >= 1) {
      setBlock(px, py, pz, 'cobblestone');
    }
  }

  // === 4. COASTAL OAK PIER & HANGING LANTERNS ===
  // Extends south from beach (z=10..17, x=2..4)
  for (let z = 10; z <= 17; z++) {
    for (let x = 2; x <= 4; x++) {
      setBlock(x, 1, z, 'oakPlanks');
      // Clear any sand sticking up through the boardwalk
      clearBlock(x, 2, z);
    }
  }
  // Pier pilings sunk into the seabed
  const pilingCoords: Array<[number, number]> = [
    [2, 11], [4, 11],
    [2, 14], [4, 14],
    [2, 17], [4, 17],
  ];
  for (const [px, pz] of pilingCoords) {
    setBlock(px, 1, pz, 'oakLog');
    setBlock(px, 0, pz, 'oakLog');
    setBlock(px, -1, pz, 'oakLog');
    setBlock(px, -2, pz, 'oakLog');
  }
  // Lamp post at pier end (x=4, z=17) with hanging lantern at (4, 3, 16)
  setBlock(4, 2, 17, 'oakLog');
  setBlock(4, 3, 17, 'oakLog');
  setBlock(4, 4, 17, 'oakPlanks');
  setBlock(4, 4, 16, 'oakPlanks');
  setBlock(4, 3, 16, 'lantern');

  // Second lantern post at beach pier entrance (x=1, z=10)
  const entranceY = heightMap.get('1,10') ?? 1;
  setBlock(1, entranceY + 1, 10, 'oakLog');
  setBlock(1, entranceY + 2, 10, 'oakLog');
  setBlock(1, entranceY + 3, 10, 'lantern');

  // === 5. HILLSIDE OAK & SPRUCE COTTAGE + CAMPFIRE ===
  // Footprint x in [-7..-3], z in [0..4], resting on terrace y = 3
  const cBaseY = 3;
  // Cobblestone foundation
  for (let x = -7; x <= -3; x++) {
    for (let z = 0; z <= 4; z++) {
      setBlock(x, cBaseY, z, 'cobblestone');
    }
  }
  // Walls (y = 4..6)
  for (let y = cBaseY + 1; y <= cBaseY + 3; y++) {
    for (let x = -7; x <= -3; x++) {
      for (let z = 0; z <= 4; z++) {
        const isEdgeX = x === -7 || x === -3;
        const isEdgeZ = z === 0 || z === 4;
        if (!isEdgeX && !isEdgeZ) {
          clearBlock(x, y, z);
          continue;
        }
        if (isEdgeX && isEdgeZ) {
          setBlock(x, y, z, 'oakLog');
        } else {
          setBlock(x, y, z, 'oakPlanks');
        }
      }
    }
  }
  // Doorway facing front (+Z) at x = -5, z = 4 (y = 4..5)
  clearBlock(-5, cBaseY + 1, 4);
  clearBlock(-5, cBaseY + 2, 4);
  // Warm glowing glass windows on front, sides, and back
  setBlock(-6, cBaseY + 2, 4, 'windowGlass');
  setBlock(-4, cBaseY + 2, 4, 'windowGlass');
  setBlock(-3, cBaseY + 2, 2, 'windowGlass');
  setBlock(-7, cBaseY + 2, 2, 'windowGlass');
  setBlock(-5, cBaseY + 2, 0, 'windowGlass');

  // Pitched spruce timber roof with 1-block overhang (ridge runs along Z)
  for (let z = -1; z <= 5; z++) {
    // Eaves layer y = 7
    for (let x = -8; x <= -2; x++) {
      if (x === -8 || x === -2 || z === -1 || z === 5) {
        setBlock(x, cBaseY + 4, z, 'sprucePlanks');
      } else {
        setBlock(x, cBaseY + 4, z, 'oakPlanks');
      }
    }
    // Mid roof layer y = 8
    for (let x = -7; x <= -3; x++) {
      setBlock(x, cBaseY + 5, z, 'sprucePlanks');
    }
    // Roof ridge layer y = 9
    for (let x = -6; x <= -4; x++) {
      setBlock(x, cBaseY + 6, z, 'sprucePlanks');
    }
    setBlock(-5, cBaseY + 7, z, 'spruceLog');
  }
  // Cozy porch lantern beside the front door
  setBlock(-3, cBaseY + 3, 5, 'lantern');

  const cottageLightPos: Vec3 = [-5, cBaseY + 2.2, 2.5];
  const campfirePos: Vec3 = [-5, cBaseY + 1, 6.2];

  // === 6. HIGHLAND OBSIDIAN NETHER PORTAL RUIN ===
  // Terrace at y = 6, portal frame at x in [-7..-4], y in [7..11], z = -6
  for (let x = -8; x <= -3; x++) {
    for (let z = -8; z <= -4; z++) {
      setBlock(x, 6, z, (x + z) % 2 === 0 ? 'cobblestone' : 'stone');
      // Keep portal plaza clear above
      for (let y = 7; y <= 13; y++) {
        clearBlock(x, y, z);
      }
    }
  }
  // Obsidian 4x5 portal frame
  for (let x = -7; x <= -4; x++) {
    setBlock(x, 7, -6, 'obsidian');
    setBlock(x, 11, -6, 'obsidian');
  }
  for (let y = 7; y <= 11; y++) {
    setBlock(-7, y, -6, 'obsidian');
    setBlock(-4, y, -6, 'obsidian');
  }
  // Ruin flanking stone pillars + lantern
  setBlock(-8, 7, -5, 'cobblestone');
  setBlock(-8, 8, -5, 'lantern');
  setBlock(-3, 7, -5, 'cobblestone');
  setBlock(-3, 8, -5, 'cobblestone');

  const portalCoreCenter: Vec3 = [-5.5, 9.0, -6.0];
  const portalCoreSize: [number, number] = [2.0, 3.0];

  // === 7. VARIED OAK & SPRUCE TREES (Trunks extend 1-2 blocks into Fancy Leaf canopies) ===
  const placeOakTree = (tx: number, tz: number, trunkHeight: number) => {
    const baseY = heightMap.get(`${tx},${tz}`);
    if (baseY === undefined || baseY < 2) return;
    // Trunk rises all the way up inside the lower 2 layers of the canopy so logs peek through cutouts!
    for (let y = 1; y <= trunkHeight; y++) {
      setBlock(tx, baseY + y, tz, 'oakLog');
    }
    const crownBase = baseY + trunkHeight - 1;
    for (let dy = 0; dy <= 3; dy++) {
      const r = dy <= 1 ? 2 : 1;
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          if (dx === 0 && dz === 0 && dy <= 1) continue;
          if (dy === 3 && Math.abs(dx) + Math.abs(dz) > 1) continue;
          if (dy <= 1 && Math.abs(dx) === 2 && Math.abs(dz) === 2 && (dx + dz + dy) % 2 === 0) {
            continue;
          }
          const lx = tx + dx;
          const ly = crownBase + dy;
          const lz = tz + dz;
          if (!getBlock(lx, ly, lz)) {
            setBlock(lx, ly, lz, 'oakLeaves');
          }
        }
      }
    }
  };

  const placeSpruceTree = (tx: number, tz: number, trunkHeight: number) => {
    const baseY = heightMap.get(`${tx},${tz}`);
    if (baseY === undefined || baseY < 2) return;
    // Tall spruce trunk runs cleanly up through the pine tiers, visible through cutout leaves
    for (let y = 1; y <= trunkHeight; y++) {
      setBlock(tx, baseY + y, tz, 'spruceLog');
    }
    const layers = [
      { dy: 2, r: 2 },
      { dy: 3, r: 2 },
      { dy: 4, r: 1 },
      { dy: 5, r: 2 },
      { dy: 6, r: 1 },
      { dy: 7, r: 0 },
    ];
    const startY = baseY + Math.max(1, trunkHeight - 5);
    for (const layer of layers) {
      for (let dx = -layer.r; dx <= layer.r; dx++) {
        for (let dz = -layer.r; dz <= layer.r; dz++) {
          if (dx === 0 && dz === 0 && startY + layer.dy <= baseY + trunkHeight) continue;
          if (layer.r === 2 && Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;
          const lx = tx + dx;
          const ly = startY + layer.dy;
          const lz = tz + dz;
          if (!getBlock(lx, ly, lz)) {
            setBlock(lx, ly, lz, 'spruceLeaves');
          }
        }
      }
    }
  };

  // 3 Oak trees on sunny meadows
  placeOakTree(-10, 4, 4);
  placeOakTree(10, -4, 5);
  placeOakTree(-1, -10, 4);

  // 3 Spruce trees around highland & cottage backdrop
  placeSpruceTree(-10, -2, 6);
  placeSpruceTree(1, -8, 7);
  placeSpruceTree(11, 0, 5);

  // === 8. TWO ASYMMETRIC DISTANT ISLETS FOR NATURAL DEPTH ===
  // Right Islet (34, -26): Natural asymmetric crescent sandy cay with curved sand spit & lone oak tree
  const buildRightTreeCay = (cx: number, cz: number) => {
    for (let dx = -6; dx <= 5; dx++) {
      for (let dz = -5; dz <= 6; dz++) {
        // Asymmetric teardrop + southwestern sand spit
        const mainBlob = Math.hypot((dx - 0.6) * 0.9, (dz + 0.4) * 1.15);
        const spitBlob = Math.hypot((dx + 3.6) * 0.95, (dz - 2.6) * 1.05);
        const wobble = Math.sin(dx * 0.8 + dz * 0.6) * 0.45;
        const inMain = mainBlob < 4.1 + wobble;
        const inSpit = spitBlob < 2.25 + wobble * 0.5;
        if (!inMain && !inSpit) continue;

        const x = cx + dx;
        const z = cz + dz;
        let topY = 0;
        if (inMain) {
          const lift = Math.max(0, 1 - mainBlob / (4.2 + wobble));
          topY = Math.round(lift * 2.8 + (dx > 0 && dz < 0 ? 0.45 : 0));
        } else {
          topY = spitBlob < 1.3 ? 1 : 0;
        }

        for (let y = -1; y <= topY; y++) {
          if (y === topY) {
            setBlock(x, y, z, topY <= 1 ? 'sand' : 'grass');
          } else {
            setBlock(x, y, z, topY <= 1 ? 'sand' : 'dirt');
          }
        }
      }
    }

    // Offset lone oak tree on the grassy eastern mound (trunk reaches 2 blocks into canopy!)
    const tx = cx + 1;
    const tz = cz - 1;
    const base = 2;
    for (let y = 1; y <= 5; y++) setBlock(tx, base + y, tz, 'oakLog');
    for (let dy = 4; dy <= 6; dy++) {
      const r = dy === 6 ? 1 : 2;
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          if (Math.abs(dx) === 2 && Math.abs(dz) === 2 && (dx + dz) % 2 === 0) continue;
          if (dx === 0 && dz === 0 && dy <= 5) continue;
          setBlock(tx + dx, base + dy, tz + dz, 'oakLeaves');
        }
      }
    }
    // Warm beach lantern + a couple of shore pebbles
    setBlock(cx - 2, 2, cz + 2, 'lantern');
    setBlock(cx - 4, 0, cz + 3, 'gravel');
  };

  // Left Islet (-34, 17.5): Rugged asymmetric sea-eroded limestone reef cluster + beacon lantern + 3 low skerries
  const buildLeftSeaStackReef = () => {
    const placeColumn = (
      x: number,
      z: number,
      topY: number,
      topType: SolidBlockType = 'stone',
      oreAtY?: { y: number; type: SolidBlockType },
    ) => {
      for (let y = -1; y <= topY; y++) {
        if (oreAtY && y === oreAtY.y) {
          setBlock(x, y, z, oreAtY.type);
        } else if (y === topY) {
          setBlock(x, y, z, topType);
        } else {
          setBlock(x, y, z, (x + y + z) % 5 === 0 ? 'cobblestone' : 'stone');
        }
      }
    };

    // Main asymmetric jagged sea-stack outcrop (steeper crags on west/south, stepped ledges on east)
    const stackColumns: Array<[number, number, number, SolidBlockType?, { y: number; type: SolidBlockType }?]> = [
      // Tall irregular western pinnacle
      [-36, 17, 5, 'stone'],
      [-36, 18, 6, 'stone', { y: 3, type: 'emeraldOre' }],
      [-35, 17, 6, 'stone'],
      [-35, 18, 5, 'grass'],
      [-35, 19, 4, 'stone'],
      [-37, 17, 3, 'cobblestone'],
      [-37, 18, 4, 'stone'],
      [-36, 16, 3, 'stone'],
      [-36, 19, 2, 'cobblestone'],
      // Mid stepped rocky shoulder & side ledge
      [-34, 16, 2, 'cobblestone'],
      [-34, 17, 4, 'stone', { y: 2, type: 'diamondOre' }],
      [-34, 18, 3, 'grass'],
      [-34, 19, 2, 'stone'],
      [-33, 17, 2, 'cobblestone'],
      [-33, 18, 3, 'stone'],
      [-33, 19, 1, 'gravel'],
      // Low wave-washed eastern apron & sea-beacon terrace
      [-32, 17, 1, 'cobblestone'],
      [-32, 18, 2, 'cobblestone'],
      [-32, 19, 0, 'gravel'],
      [-35, 16, 1, 'gravel'],
      [-33, 16, 0, 'sand'],
    ];

    for (const [x, z, h, topType, ore] of stackColumns) {
      placeColumn(x, z, h, topType ?? 'stone', ore);
    }

    // Small wooden sea-beacon lantern post on the eastern rock ledge (-32, y=3..5, z=18)
    setBlock(-32, 3, 18, 'oakLog');
    setBlock(-32, 4, 18, 'oakLog');
    setBlock(-32, 5, 18, 'oakPlanks');
    setBlock(-31, 5, 18, 'oakPlanks');
    setBlock(-31, 4, 18, 'lantern');

    // Scattered low reef skerry A (north-east shallow water)
    placeColumn(-29, 14, 1, 'stone');
    placeColumn(-28, 14, 0, 'cobblestone');
    placeColumn(-29, 15, 0, 'gravel');

    // Scattered low reef skerry B (south-west wave breaker)
    placeColumn(-38, 22, 2, 'stone');
    placeColumn(-39, 22, 1, 'cobblestone');
    placeColumn(-38, 21, 0, 'gravel');

    // Scattered low reef skerry C (south lone rock)
    placeColumn(-31, 23, 1, 'cobblestone');
    placeColumn(-30, 23, 0, 'gravel');
  };

  buildRightTreeCay(34, -26);
  buildLeftSeaStackReef();

  // === 9. WILDFLOWERS & MEADOW GRASS TUFTS (Crossed Planes) ===
  const flowersRed: Vec3[] = [];
  const flowersYellow: Vec3[] = [];
  const grassTufts: Vec3[] = [];
  const flowerOccupied = new Set<string>();
  const flowerSpots: Array<[number, number, 'red' | 'yellow']> = [
    [-8, 7, 'red'],
    [-7, 8, 'yellow'],
    [-1, 8, 'yellow'],
    [1, 4, 'red'],
    [3, 3, 'yellow'],
    [5, 4, 'red'],
    [-9, 1, 'yellow'],
    [-11, 2, 'red'],
    [-3, -2, 'red'],
    [0, -4, 'yellow'],
    [4, 6, 'yellow'],
    [-6, 8, 'red'],
    [9, -1, 'yellow'],
    [-9, -6, 'red'],
  ];
  for (const [fx, fz, color] of flowerSpots) {
    const fy = heightMap.get(`${fx},${fz}`);
    if (fy !== undefined && getBlock(fx, fy, fz) === 'grass' && !getBlock(fx, fy + 1, fz)) {
      flowerOccupied.add(`${fx},${fz}`);
      if (color === 'red') flowersRed.push([fx, fy + 0.5, fz]);
      else flowersYellow.push([fx, fy + 0.5, fz]);
    }
  }

  // Scatter natural crossed-plane grass tufts on open meadow grass blocks (avoiding Creeper & path)
  for (let x = -12; x <= 12; x++) {
    for (let z = -12; z <= 10; z++) {
      if (flowerOccupied.has(`${x},${z}`)) continue;
      if (Math.hypot(x - 1, z - 5) < 2.2) continue; // Keep Creeper clear
      const fy = heightMap.get(`${x},${z}`);
      if (
        fy !== undefined &&
        getBlock(x, fy, z) === 'grass' &&
        !getBlock(x, fy + 1, z) &&
        hash2D(x * 7 + 13, z * 11 - 5) > 0.84
      ) {
        grassTufts.push([x, fy + 0.5, z]);
      }
    }
  }

  // === 10. CREEPER PROMINENT GRASSY SLOPE POSITION ===
  const creeperX = 1;
  const creeperZ = 5;
  const creeperBaseY = heightMap.get(`${creeperX},${creeperZ}`) ?? 2;
  // Ensure Creeper spot is clean grass and unobstructed
  setBlock(creeperX, creeperBaseY, creeperZ, 'grass');
  clearBlock(creeperX, creeperBaseY + 1, creeperZ);
  clearBlock(creeperX, creeperBaseY + 2, creeperZ);
  const creeperPos: Vec3 = [creeperX, creeperBaseY + 0.5, creeperZ];

  // === 11. 6-NEIGHBOR SURFACE CULLING ===
  const blocks: Record<SolidBlockType, Vec3[]> = {
    grass: [],
    dirt: [],
    sand: [],
    gravel: [],
    stone: [],
    cobblestone: [],
    oakLog: [],
    oakPlanks: [],
    spruceLog: [],
    sprucePlanks: [],
    oakLeaves: [],
    spruceLeaves: [],
    coalOre: [],
    ironOre: [],
    diamondOre: [],
    emeraldOre: [],
    goldOre: [],
    redstoneOre: [],
    obsidian: [],
    windowGlass: [],
    lantern: [],
    waterfall: [],
  };

  const meadowGrassTop: Vec3[] = [];
  const isOpaque = (x: number, y: number, z: number): boolean => {
    const t = world.get(keyOf(x, y, z));
    return t !== undefined && !TRANSPARENT_OR_CUTOUT.has(t);
  };

  let totalCulledCount = 0;
  let totalVisibleCount = 0;

  for (const [key, type] of world.entries()) {
    const [xs, ys, zs] = key.split(',');
    const x = Number(xs);
    const y = Number(ys);
    const z = Number(zs);

    const opaqueSelf = !TRANSPARENT_OR_CUTOUT.has(type);
    if (
      opaqueSelf &&
      isOpaque(x + 1, y, z) &&
      isOpaque(x - 1, y, z) &&
      isOpaque(x, y + 1, z) &&
      isOpaque(x, y - 1, z) &&
      isOpaque(x, y, z + 1) &&
      isOpaque(x, y, z - 1)
    ) {
      totalCulledCount++;
      continue;
    }

    totalVisibleCount++;
    blocks[type].push([x, y, z]);
    if (type === 'grass' && Math.hypot(x, z) < 16) {
      meadowGrassTop.push([x, y, z]);
    }
  }

  const lanternLights: Vec3[] = [
    [4, 2.7, 16], // Pier tip hanging lantern
    [1, entranceY + 3.2, 10], // Beach entrance lantern
    [-3, cBaseY + 3.1, 5.2], // Cottage porch lantern
    [-8, 8.2, -5], // Nether Portal terrace lantern
    [-31, 3.8, 18], // Left sea-stack reef beacon lantern
    [32, 2.5, -24], // Right tree cay beach lantern
  ];

  const boatAnchor: Vec3 = [6.6, 0.36, 14.8];

  return {
    blocks,
    meadowGrassTop,
    portalCoreCenter,
    portalCoreSize,
    campfirePos,
    cottageLightPos,
    lanternLights,
    waterfallBases,
    boatAnchor,
    creeperPos,
    flowersRed,
    flowersYellow,
    grassTufts,
    totalCulledCount,
    totalVisibleCount,
  };
}
