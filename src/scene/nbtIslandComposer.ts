import type { ParsedNbtStructure } from './nbtLoader';
import type {
  CardinalDir,
  DirectionalConn,
  DoorPlacement,
  LanternPlacement,
  LightningRodPlacement,
  SlabPlacement,
  StairPlacement,
  StairShape,
  TrapdoorPlacement,
  Vec3,
} from './subVoxelMeshes';

export type SolidBlockType =
  | 'grass'
  | 'dirt'
  | 'sand'
  | 'gravel'
  | 'stone'
  | 'andesite'
  | 'cobblestone'
  | 'stoneBricks'
  | 'crackedStoneBricks'
  | 'mossyStoneBricks'
  | 'deepslate'
  | 'cobbledDeepslate'
  | 'deepslateTiles'
  | 'oakLog'
  | 'oakPlanks'
  | 'spruceLog'
  | 'sprucePlanks'
  | 'cherryLog'
  | 'oakLeaves'
  | 'spruceLeaves'
  | 'cherryLeaves'
  | 'coalOre'
  | 'ironOre'
  | 'diamondOre'
  | 'emeraldOre'
  | 'goldOre'
  | 'redstoneOre'
  | 'obsidian'
  | 'cryingObsidian'
  | 'ironBlock'
  | 'diamondBlock'
  | 'goldBlock'
  | 'craftingTable'
  | 'furnace'
  | 'chest'
  | 'barrel'
  | 'hayBlock'
  | 'calcite'
  | 'redConcrete'
  | 'whiteConcrete'
  | 'seaLantern'
  | 'farmlandWet'
  | 'farmWater'
  | 'waterfall';

export type LandmarkId = 'main' | 'lighthouse' | 'workshop';

export interface IslandMeta {
  id: LandmarkId;
  center: [number, number];
  collisionRadius: number;
  detectRadius: number;
  focusCamPos: Vec3;
  focusTarget: Vec3;
  hitboxCenter: Vec3;
  hitboxSize: Vec3;
}

export interface MultiIslandNbtInput {
  citadel: ParsedNbtStructure;
  waterfallPortal: ParsedNbtStructure;
  manor: ParsedNbtStructure;
  harbor: ParsedNbtStructure;
  lighthouse: ParsedNbtStructure;
  workshop: ParsedNbtStructure;
}

export interface ComposedIslandWorld {
  blocks: Record<SolidBlockType, Vec3[]>;
  meadowGrassTop: Vec3[];
  stairs: StairPlacement[];
  slabs: SlabPlacement[];
  fences: DirectionalConn[];
  glassPanes: DirectionalConn[];
  walls: DirectionalConn[];
  ironBars: DirectionalConn[];
  doors: DoorPlacement[];
  lightningRods: LightningRodPlacement[];
  trapdoors: TrapdoorPlacement[];
  lanterns: LanternPlacement[];
  beaconPos: Vec3;
  portalCoreCenter: Vec3;
  portalCoreSize: [number, number];
  portalAxis: 'x' | 'z';
  campfirePos: Vec3;
  chimneyTopPos: Vec3;
  bedPos: Vec3;
  lighthouseLanternCenter: Vec3;
  windmillHubPos: Vec3;
  cherryCanopyCenter: Vec3;
  waterfallBases: Vec3[];
  boatAnchor: Vec3;
  creeperPos: Vec3;
  sheepSpawns: Array<{ center: Vec3; radius: number }>;
  flowersRed: Vec3[];
  flowersYellow: Vec3[];
  grassTufts: Vec3[];
  sugarCanes: Vec3[];
  wheatCrops: Vec3[];
  islands: IslandMeta[];
  zonePointLights: Array<{ pos: Vec3; color: string; maxIntensity: number; distance: number }>;
  nbtBlockCount: number;
  totalVisibleCount: number;
  totalCulledCount: number;
}

const TRANSPARENT_OR_CUTOUT = new Set<SolidBlockType>([
  'oakLeaves',
  'spruceLeaves',
  'cherryLeaves',
  'waterfall',
  'farmWater',
]);

const NBT_TO_SOLID: Record<string, SolidBlockType> = {
  'minecraft:grass_block': 'grass',
  'minecraft:dirt': 'dirt',
  'minecraft:sand': 'sand',
  'minecraft:gravel': 'gravel',
  'minecraft:stone': 'stone',
  'minecraft:andesite': 'andesite',
  'minecraft:cobblestone': 'cobblestone',
  'minecraft:stone_bricks': 'stoneBricks',
  'minecraft:cracked_stone_bricks': 'crackedStoneBricks',
  'minecraft:mossy_stone_bricks': 'mossyStoneBricks',
  'minecraft:deepslate': 'deepslate',
  'minecraft:cobbled_deepslate': 'cobbledDeepslate',
  'minecraft:deepslate_tiles': 'deepslateTiles',
  'minecraft:oak_log': 'oakLog',
  'minecraft:oak_planks': 'oakPlanks',
  'minecraft:spruce_log': 'spruceLog',
  'minecraft:spruce_planks': 'sprucePlanks',
  'minecraft:cherry_log': 'cherryLog',
  'minecraft:oak_leaves': 'oakLeaves',
  'minecraft:spruce_leaves': 'spruceLeaves',
  'minecraft:cherry_leaves': 'cherryLeaves',
  'minecraft:coal_ore': 'coalOre',
  'minecraft:iron_ore': 'ironOre',
  'minecraft:diamond_ore': 'diamondOre',
  'minecraft:emerald_ore': 'emeraldOre',
  'minecraft:gold_ore': 'goldOre',
  'minecraft:redstone_ore': 'redstoneOre',
  'minecraft:obsidian': 'obsidian',
  'minecraft:crying_obsidian': 'cryingObsidian',
  'minecraft:iron_block': 'ironBlock',
  'minecraft:diamond_block': 'diamondBlock',
  'minecraft:gold_block': 'goldBlock',
  'minecraft:crafting_table': 'craftingTable',
  'minecraft:furnace': 'furnace',
  'minecraft:chest': 'chest',
  'minecraft:barrel': 'barrel',
  'minecraft:hay_block': 'hayBlock',
  'minecraft:calcite': 'calcite',
  'minecraft:red_concrete': 'redConcrete',
  'minecraft:white_concrete': 'whiteConcrete',
  'minecraft:sea_lantern': 'seaLantern',
  'minecraft:farmland': 'farmlandWet',
};

function keyOf(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}

function hash2D(x: number, z: number): number {
  const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

function toCardinal(dir?: string): CardinalDir {
  if (dir === 'south') return 's';
  if (dir === 'east') return 'e';
  if (dir === 'west') return 'w';
  return 'n';
}

function toStairShape(shape?: string): StairShape {
  if (
    shape === 'outer_left' ||
    shape === 'outer_right' ||
    shape === 'inner_left' ||
    shape === 'inner_right'
  ) {
    return shape;
  }
  return 'straight';
}

function toStairMaterial(name: string): StairPlacement['material'] {
  if (name.includes('spruce')) return 'sprucePlanks';
  if (name.includes('deepslate')) return 'deepslateTiles';
  if (name.includes('oak')) return 'oakPlanks';
  return 'stoneBricks';
}

function toSlabMaterial(name: string): SlabPlacement['material'] {
  if (name.includes('spruce')) return 'sprucePlanks';
  if (name.includes('deepslate')) return 'deepslateTiles';
  if (name.includes('oak')) return 'oakPlanks';
  return 'stoneBricks';
}

/**
 * v0.6 Master Archipelago Composer:
 * Stitches 6 high-precision Minecraft 1.20.1 NBT structures into a spacious ~58x58 Main Sanctuary Island
 * plus expanded Left Lighthouse Isle (22x30x22) and Right Windmill Millhouse Isle (24x24x24).
 */
export function composeNbtIslandWorld(input: MultiIslandNbtInput): ComposedIslandWorld {
  const world = new Map<string, SolidBlockType>();
  const nbtOccupied = new Set<string>();
  const subOccupied = new Set<string>();

  const stairs: StairPlacement[] = [];
  const slabs: SlabPlacement[] = [];
  const fences: DirectionalConn[] = [];
  const glassPanes: DirectionalConn[] = [];
  const walls: DirectionalConn[] = [];
  const ironBars: DirectionalConn[] = [];
  const doors: DoorPlacement[] = [];
  const lightningRods: LightningRodPlacement[] = [];
  const trapdoors: TrapdoorPlacement[] = [];
  const lanterns: LanternPlacement[] = [];
  const wheatCrops: Vec3[] = [];

  // Master Coordinate Grid (0-block alignment across all 4 Main Island modules!)
  const MAIN_CITADEL_OFF: Vec3 = [-18, 0, -21];   // wx: -18..+5, wz: -21..-2
  const MAIN_WATERFALL_OFF: Vec3 = [6, 0, -18];   // wx: +6..+27, wz: -18..+1
  const MAIN_MANOR_OFF: Vec3 = [-20, 0, 1];       // wx: -20..-3, wz: +1..+16
  const MAIN_HARBOR_OFF: Vec3 = [-3, 0, 2];       // wx: -3..+22, wz: +2..+23
  const LIGHTHOUSE_OFF: Vec3 = [-64, 0, 4];       // center (-55, y, 12)
  const WORKSHOP_OFF: Vec3 = [44, 0, -30];        // center (56, y, -18)

  let beaconPos: Vec3 = [-7, 14, -7];
  let campfirePos: Vec3 = [-8, 4, 13];
  const portalBlocks: Vec3[] = [];
  let portalAxis: 'x' | 'z' = 'x';
  const mainColumnMaxY = new Map<string, number>();

  const ingestNbt = (
    nbt: ParsedNbtStructure,
    off: Vec3,
    kind: 'main' | 'waterfall' | 'satellite',
  ) => {
    for (const b of nbt.blocks) {
      const entry = nbt.palette[b.state];
      if (!entry) continue;
      const name = entry.name;
      if (name === 'minecraft:air' || name === 'minecraft:structure_void') continue;

      const wx = b.pos[0] + off[0];
      const wy = b.pos[1] + off[1];
      const wz = b.pos[2] + off[2];
      const k = keyOf(wx, wy, wz);
      const props = entry.properties;

      nbtOccupied.add(k);

      if (name === 'minecraft:beacon') {
        if (kind !== 'satellite') beaconPos = [wx, wy, wz];
        subOccupied.add(k);
        continue;
      }

      if (name === 'minecraft:campfire') {
        if (kind !== 'satellite') campfirePos = [wx, wy, wz];
        subOccupied.add(k);
        continue;
      }

      if (name === 'minecraft:nether_portal') {
        if (kind !== 'satellite') {
          portalBlocks.push([wx, wy, wz]);
          portalAxis = props.axis === 'z' ? 'z' : 'x';
        }
        subOccupied.add(k);
        continue;
      }

      if (name === 'minecraft:wheat') {
        wheatCrops.push([wx, wy, wz]);
        subOccupied.add(k);
        continue;
      }

      if (name === 'minecraft:water') {
        // Vertical cascade water (wy >= 1 in waterfall module) uses animated scrolling waterfall shader;
        // spring pool, plunge pool & irrigated farmland water uses calm shimmering aqua farmWater!
        const isFallingCascade = kind === 'waterfall' && wy >= 1 && wy <= 10;
        world.set(k, isFallingCascade ? 'waterfall' : 'farmWater');
        continue;
      }

      if (name.endsWith('_stairs')) {
        stairs.push({
          pos: [wx, wy, wz],
          facing: toCardinal(props.facing),
          half: props.half === 'top' ? 'top' : 'bottom',
          shape: toStairShape(props.shape),
          material: toStairMaterial(name),
        });
        subOccupied.add(k);
        continue;
      }

      if (name.endsWith('_slab')) {
        if (props.type === 'double') {
          const solid = name.includes('oak')
            ? 'oakPlanks'
            : name.includes('spruce')
              ? 'sprucePlanks'
              : 'stoneBricks';
          world.set(k, solid);
        } else {
          slabs.push({
            pos: [wx, wy, wz],
            half: props.type === 'top' ? 'top' : 'bottom',
            material: toSlabMaterial(name),
          });
          subOccupied.add(k);
        }
        continue;
      }

      if (name === 'minecraft:oak_fence') {
        fences.push({
          pos: [wx, wy, wz],
          north: props.north === 'true',
          south: props.south === 'true',
          east: props.east === 'true',
          west: props.west === 'true',
        });
        subOccupied.add(k);
        continue;
      }

      if (name === 'minecraft:glass_pane') {
        glassPanes.push({
          pos: [wx, wy, wz],
          north: props.north === 'true',
          south: props.south === 'true',
          east: props.east === 'true',
          west: props.west === 'true',
        });
        subOccupied.add(k);
        continue;
      }

      if (name === 'minecraft:deepslate_tile_wall') {
        walls.push({
          pos: [wx, wy, wz],
          north: props.north !== undefined && props.north !== 'none',
          south: props.south !== undefined && props.south !== 'none',
          east: props.east !== undefined && props.east !== 'none',
          west: props.west !== undefined && props.west !== 'none',
        });
        subOccupied.add(k);
        continue;
      }

      if (name === 'minecraft:iron_bars') {
        ironBars.push({
          pos: [wx, wy, wz],
          north: props.north === 'true',
          south: props.south === 'true',
          east: props.east === 'true',
          west: props.west === 'true',
        });
        subOccupied.add(k);
        continue;
      }

      if (name === 'minecraft:oak_door') {
        doors.push({
          pos: [wx, wy, wz],
          facing: toCardinal(props.facing),
          half: props.half === 'upper' ? 'upper' : 'lower',
        });
        subOccupied.add(k);
        continue;
      }

      if (name === 'minecraft:spruce_trapdoor') {
        trapdoors.push({
          pos: [wx, wy, wz],
          facing: toCardinal(props.facing),
          open: props.open === 'true',
          half: props.half === 'top' ? 'top' : 'bottom',
        });
        subOccupied.add(k);
        continue;
      }

      if (name === 'minecraft:lightning_rod') {
        const f = props.facing;
        lightningRods.push({
          pos: [wx, wy, wz],
          facing:
            f === 'down'
              ? 'down'
              : f === 'north'
                ? 'n'
                : f === 'south'
                  ? 's'
                  : f === 'east'
                    ? 'e'
                    : f === 'west'
                      ? 'w'
                      : 'up',
        });
        subOccupied.add(k);
        continue;
      }

      if (name === 'minecraft:lantern') {
        lanterns.push({
          pos: [wx, wy, wz],
          hanging: props.hanging === 'true',
        });
        subOccupied.add(k);
        continue;
      }

      const mapped = NBT_TO_SOLID[name];
      if (mapped) {
        world.set(k, mapped);
        if (kind !== 'satellite') {
          const colKey = `${wx},${wz}`;
          const prev = mainColumnMaxY.get(colKey);
          if (prev === undefined || wy > prev) mainColumnMaxY.set(colKey, wy);
        }
      }
    }
  };

  // === 1. INGEST ALL 6 VERIFIED MASTER NBT STRUCTURES ===
  ingestNbt(input.citadel, MAIN_CITADEL_OFF, 'main');
  ingestNbt(input.waterfallPortal, MAIN_WATERFALL_OFF, 'waterfall');
  ingestNbt(input.manor, MAIN_MANOR_OFF, 'main');
  ingestNbt(input.harbor, MAIN_HARBOR_OFF, 'main');
  ingestNbt(input.lighthouse, LIGHTHOUSE_OFF, 'satellite');
  ingestNbt(input.workshop, WORKSHOP_OFF, 'satellite');

  // Exact Nether Portal bounds
  let portalCoreCenter: Vec3 = [20, 10.5, -13];
  let portalCoreSize: [number, number] = [3, 4];
  if (portalBlocks.length > 0) {
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity,
      minZ = Infinity,
      maxZ = -Infinity;
    for (const [px, py, pz] of portalBlocks) {
      minX = Math.min(minX, px);
      maxX = Math.max(maxX, px);
      minY = Math.min(minY, py);
      maxY = Math.max(maxY, py);
      minZ = Math.min(minZ, pz);
      maxZ = Math.max(maxZ, pz);
    }
    portalCoreCenter = [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2];
    const spanW = portalAxis === 'x' ? maxX - minX + 1 : maxZ - minZ + 1;
    const spanH = maxY - minY + 1;
    portalCoreSize = [spanW, spanH];
  }

  // Safe wrapper helpers (NEVER overwrite any NBT block!)
  const setWrapBlock = (x: number, y: number, z: number, type: SolidBlockType) => {
    const rx = Math.round(x);
    const ry = Math.round(y);
    const rz = Math.round(z);
    const k = keyOf(rx, ry, rz);
    if (nbtOccupied.has(k) || subOccupied.has(k)) return;
    world.set(k, type);
  };

  const getBlock = (x: number, y: number, z: number) =>
    world.get(keyOf(Math.round(x), Math.round(y), Math.round(z)));

  // === 2. EXPANDED ~58x58 MAIN SANCTUARY ISLAND ORGANIC COASTAL WRAPPER ===
  // Keep Plunge Pool outflow, Stone-Wood Arch Bridge channel & Harbor Slip 100% open water!
  const isMainOpenWaterChannel = (x: number, z: number): boolean => {
    // Plunge pool outflow passing directly under the Stone-Wood Arch Bridge (wx: 3..10, wz: 1..15)
    if (x >= 3 && x <= 10 && z >= 1 && z <= 16) return true;
    // Sheltered Harbor Cove & L-Pier Slip (wx: 1..20, wz: 13..29)
    if (x >= 1 && x <= 20 && z >= 13 && z <= 29) return true;
    // South cove opening
    if (Math.hypot(x - 9.5, z - 21.0) < 10.5) return true;
    return false;
  };

  const isInsideMainNbtArea = (x: number, z: number): boolean => {
    if (mainColumnMaxY.has(`${x},${z}`)) return true;
    if (x >= -17 && x <= 5 && z >= -20 && z <= -3) return true;  // Citadel
    if (x >= 6 && x <= 26 && z >= -16 && z <= 1) return true;    // Waterfall & Portal
    if (x >= -19 && x <= -3 && z >= 2 && z <= 15) return true;   // Coastal Manor
    if (x >= -3 && x <= 20 && z >= 2 && z <= 12) return true;    // Bridge & East Quay
    return false;
  };

  const wrapHeightMap = new Map<string, number>();

  for (let x = -32; x <= 32; x++) {
    for (let z = -29; z <= 29; z++) {
      if (isMainOpenWaterChannel(x, z)) {
        setWrapBlock(x, -1, z, z <= 5 ? 'gravel' : 'sand');
        setWrapBlock(x, -2, z, 'deepslate');
        continue;
      }

      if (isInsideMainNbtArea(x, z)) {
        setWrapBlock(x, -1, z, 'deepslate');
        setWrapBlock(x, -2, z, 'deepslate');
        continue;
      }

      const angle = Math.atan2(z + 2, x - 1);
      const outerR =
        28.4 +
        Math.sin(angle * 2.0 + 0.4) * 2.4 +
        Math.cos(angle * 3.0 - 0.7) * 1.6 +
        Math.sin(angle * 5.0) * 0.75;
      const dist = Math.hypot((x - 0.5) * 0.96, (z + 1.5) * 1.02);

      if (dist > outerR) {
        if (dist <= outerR + 3.4) {
          setWrapBlock(x, -1, z, 'sand');
          setWrapBlock(x, -2, z, 'deepslate');
          if (dist < outerR + 2.4 && hash2D(x * 3, z * 5) > 0.96) {
            setWrapBlock(x, 0, z, hash2D(x, z) > 0.5 ? 'stone' : 'deepslate');
          }
        }
        continue;
      }

      // Smooth talus slopes hugging all 4 NBT districts down to wide meadows & sandy beaches
      const dCit = Math.hypot(Math.max(-17 - x, 0, x - 5), Math.max(-20 - z, 0, z - -3));
      const dWf = Math.hypot(Math.max(6 - x, 0, x - 25), Math.max(-16 - z, 0, z - 0));
      const dManor = Math.hypot(Math.max(-19 - x, 0, x - -3), Math.max(2 - z, 0, z - 15));
      const dEast = Math.hypot(Math.max(11 - x, 0, x - 20), Math.max(2 - z, 0, z - 12));

      const noise = Math.sin(x * 0.22) * Math.cos(z * 0.22) * 0.9 + (hash2D(x, z) - 0.5) * 0.4;

      let h = Math.max(
        Math.max(0, 11.4 - dCit * 1.15 + noise * 0.9),
        Math.max(0, 7.0 - dWf * 1.05 + noise * 0.75),
        Math.max(0, 3.3 - dManor * 0.48 + noise * 0.4),
        Math.max(0, 3.2 - dEast * 0.48 + noise * 0.4),
      );

      // Sculpted Western Cherry Blossom Promontory (-24, y=8, -3)
      const cherryDist = Math.hypot((x + 24) * 0.92, (z + 3) * 0.92);
      if (cherryDist < 6.4) {
        h = Math.max(h, Math.max(0, 1 - cherryDist / 6.6) * 8.6);
      }

      const beachFade = Math.max(0, Math.min(1, (outerR - dist) / 4.8));
      let topY = Math.round(h * beachFade);
      if (x >= -26 && x <= -22 && z >= -5 && z <= -1) topY = 8;

      wrapHeightMap.set(`${x},${z}`, topY);

      for (let y = -2; y <= topY; y++) {
        if (y === topY) {
          if (topY <= 1) {
            setWrapBlock(x, y, z, hash2D(x + 7, z - 3) > 0.9 ? 'gravel' : 'sand');
          } else {
            const rockPatch = topY >= 9 && hash2D(x * 3, z * 5) > 0.84;
            setWrapBlock(x, y, z, rockPatch ? 'stone' : 'grass');
          }
        } else if (y === topY - 1 && topY >= 2) {
          setWrapBlock(x, y, z, 'dirt');
        } else if (topY <= 1 && y >= -1) {
          setWrapBlock(x, y, z, 'sand');
        } else if (y <= 2) {
          setWrapBlock(x, y, z, hash2D(x + y, z) > 0.65 ? 'cobbledDeepslate' : 'deepslate');
        } else {
          const oh = Math.abs(x * 37 + y * 19 + z * 59) % 43;
          if (oh === 3) setWrapBlock(x, y, z, 'diamondOre');
          else if (oh === 11) setWrapBlock(x, y, z, 'ironOre');
          else if (oh === 19) setWrapBlock(x, y, z, 'coalOre');
          else if (oh === 27) setWrapBlock(x, y, z, 'andesite');
          else if (oh === 35) setWrapBlock(x, y, z, 'cobblestone');
          else setWrapBlock(x, y, z, 'stone');
        }
      }
    }
  }

  // === 3. ORGANIC COASTAL WRAPPERS FOR EXPANDED LIGHTHOUSE ISLE & WORKSHOP ISLE ===
  // 3A. Left Cliff Lighthouse Isle (22x30x22 at [-64, 0, 4], center (-53, 14))
  const lhCenterX = LIGHTHOUSE_OFF[0] + 10; // -54
  const lhCenterZ = LIGHTHOUSE_OFF[2] + 10; // +14
  for (let x = lhCenterX - 15; x <= lhCenterX + 15; x++) {
    for (let z = lhCenterZ - 14; z <= lhCenterZ + 16; z++) {
      // Keep Lighthouse Oak Supply Dock (x: -57..-53, z: 22..27) open water!
      if (x >= LIGHTHOUSE_OFF[0] + 6 && x <= LIGHTHOUSE_OFF[0] + 12 && z >= LIGHTHOUSE_OFF[2] + 18 && z <= LIGHTHOUSE_OFF[2] + 24) {
        setWrapBlock(x, -1, z, 'sand');
        setWrapBlock(x, -2, z, 'deepslate');
        continue;
      }
      if (
        x >= LIGHTHOUSE_OFF[0] + 2 &&
        x <= LIGHTHOUSE_OFF[0] + 19 &&
        z >= LIGHTHOUSE_OFF[2] + 2 &&
        z <= LIGHTHOUSE_OFF[2] + 17
      ) {
        setWrapBlock(x, -1, z, 'deepslate');
        setWrapBlock(x, -2, z, 'deepslate');
        continue;
      }

      const angle = Math.atan2(z - lhCenterZ, x - lhCenterX);
      const reefR =
        13.2 + Math.sin(angle * 3.0 + 0.8) * 1.5 + Math.cos(angle * 2.0 - 0.5) * 1.1;
      const dist = Math.hypot((x - lhCenterX) * 0.96, (z - lhCenterZ) * 1.02);
      if (dist > reefR) {
        if (dist <= reefR + 2.8) {
          setWrapBlock(x, -1, z, 'sand');
          setWrapBlock(x, -2, z, 'deepslate');
        }
        continue;
      }

      const dxBox = Math.max(LIGHTHOUSE_OFF[0] + 2 - x, 0, x - (LIGHTHOUSE_OFF[0] + 19));
      const dzBox = Math.max(LIGHTHOUSE_OFF[2] + 2 - z, 0, z - (LIGHTHOUSE_OFF[2] + 17));
      const dBox = Math.hypot(dxBox, dzBox);
      const fade = Math.max(0, Math.min(1, (reefR - dist) / 3.2));
      const topY = Math.round(Math.max(0, 4.6 - dBox * 1.1 + (hash2D(x * 3, z * 5) - 0.5) * 0.7) * fade);

      for (let y = -2; y <= topY; y++) {
        if (y === topY) {
          if (topY === 0) setWrapBlock(x, y, z, hash2D(x + 2, z) > 0.45 ? 'sand' : 'deepslate');
          else if (topY === 1 && hash2D(x, z * 3) > 0.65) setWrapBlock(x, y, z, 'gravel');
          else setWrapBlock(x, y, z, topY >= 3 && hash2D(x * 5, z) > 0.5 ? 'grass' : 'stone');
        } else if (y <= 1) {
          setWrapBlock(x, y, z, hash2D(x, z + y) > 0.5 ? 'deepslate' : 'cobbledDeepslate');
        } else {
          setWrapBlock(x, y, z, hash2D(x + y, z) > 0.6 ? 'cobblestone' : 'stone');
        }
      }
    }
  }
  for (const [sx, sz, sh] of [
    [lhCenterX - 13, lhCenterZ + 7, 3],
    [lhCenterX + 12, lhCenterZ - 9, 3],
  ] as Array<[number, number, number]>) {
    for (let y = -1; y <= sh; y++) setWrapBlock(sx, y, sz, y <= 0 ? 'deepslate' : 'stone');
    setWrapBlock(sx + 1, 0, sz, 'cobblestone');
  }

  // 3B. Right Windmill Millhouse Isle (24x24x24 at [44, 0, -30], center (56, -18))
  const wsCenterX = WORKSHOP_OFF[0] + 12; // 56
  const wsCenterZ = WORKSHOP_OFF[2] + 12; // -18
  const wsWrapHeight = new Map<string, number>();
  for (let x = wsCenterX - 16; x <= wsCenterX + 16; x++) {
    for (let z = wsCenterZ - 16; z <= wsCenterZ + 16; z++) {
      // Keep West Harbor Jetty (x: 40..47, z: -23..-18) open water!
      if (
        x >= WORKSHOP_OFF[0] - 4 &&
        x <= WORKSHOP_OFF[0] + 3 &&
        z >= WORKSHOP_OFF[2] + 7 &&
        z <= WORKSHOP_OFF[2] + 12
      ) {
        setWrapBlock(x, -1, z, 'sand');
        setWrapBlock(x, -2, z, 'deepslate');
        continue;
      }
      if (
        x >= WORKSHOP_OFF[0] + 3 &&
        x <= WORKSHOP_OFF[0] + 21 &&
        z >= WORKSHOP_OFF[2] + 2 &&
        z <= WORKSHOP_OFF[2] + 21
      ) {
        setWrapBlock(x, -1, z, 'deepslate');
        setWrapBlock(x, -2, z, 'deepslate');
        continue;
      }

      const angle = Math.atan2(z - wsCenterZ, x - wsCenterX);
      const outerR =
        14.6 + Math.sin(angle * 2.0 - 0.3) * 1.6 + Math.cos(angle * 3.0 + 0.7) * 1.0;
      const dist = Math.hypot((x - wsCenterX) * 0.96, (z - wsCenterZ) * 1.0);
      if (dist > outerR) {
        if (dist <= outerR + 2.8) {
          setWrapBlock(x, -1, z, 'sand');
          setWrapBlock(x, -2, z, 'deepslate');
        }
        continue;
      }

      const dxBox = Math.max(WORKSHOP_OFF[0] + 3 - x, 0, x - (WORKSHOP_OFF[0] + 21));
      const dzBox = Math.max(WORKSHOP_OFF[2] + 2 - z, 0, z - (WORKSHOP_OFF[2] + 21));
      const dBox = Math.hypot(dxBox, dzBox);
      const fade = Math.max(0, Math.min(1, (outerR - dist) / 3.4));
      const topY = Math.round(Math.max(0, 3.4 - dBox * 0.78 + (hash2D(x, z) - 0.5) * 0.45) * fade);
      wsWrapHeight.set(`${x},${z}`, topY);

      for (let y = -2; y <= topY; y++) {
        if (y === topY) setWrapBlock(x, y, z, topY <= 1 ? 'sand' : 'grass');
        else if (y === topY - 1 && topY >= 2) setWrapBlock(x, y, z, 'dirt');
        else if (topY <= 1 && y >= -1) setWrapBlock(x, y, z, 'sand');
        else setWrapBlock(x, y, z, y <= 0 ? 'deepslate' : 'stone');
      }
    }
  }

  // === 4. GRAND WEEPING CHERRY BLOSSOM TREE & DIVERSE COASTAL FOREST ===
  const chBase = 8;
  const cherryTrunk: Vec3[] = [
    [-25, chBase + 1, -3],
    [-24, chBase + 1, -3],
    [-24, chBase + 1, -2],
    [-24, chBase + 2, -3],
    [-24, chBase + 3, -3],
    [-23, chBase + 3, -3],
    [-23, chBase + 4, -3],
    [-23, chBase + 5, -2],
    [-22, chBase + 5, -2],
    [-22, chBase + 6, -2],
    [-21, chBase + 6, -2],
    [-24, chBase + 5, -4],
    [-25, chBase + 6, -4],
    [-26, chBase + 6, -4],
    [-22, chBase + 7, -2],
    [-23, chBase + 7, -3],
    [-24, chBase + 7, -2],
  ];
  for (const [cx, cy, cz] of cherryTrunk) setWrapBlock(cx, cy, cz, 'cherryLog');

  const cherryLobes: Array<{ center: Vec3; rx: number; ry: number; rz: number }> = [
    { center: [-22.5, chBase + 8.5, -2.5], rx: 4.5, ry: 2.5, rz: 4.2 },
    { center: [-26.0, chBase + 7.5, -4.0], rx: 3.3, ry: 2.1, rz: 3.1 },
    { center: [-19.8, chBase + 7.4, -1.0], rx: 3.1, ry: 2.0, rz: 3.0 },
    { center: [-23.5, chBase + 10.0, -3.0], rx: 2.9, ry: 1.8, rz: 2.8 },
  ];
  for (let x = -30; x <= -15; x++) {
    for (let y = chBase + 5; y <= chBase + 12; y++) {
      for (let z = -9; z <= 4; z++) {
        if (getBlock(x, y, z) || nbtOccupied.has(keyOf(x, y, z))) continue;
        for (const lobe of cherryLobes) {
          const d = Math.hypot(
            (x - lobe.center[0]) / lobe.rx,
            (y - lobe.center[1]) / lobe.ry,
            (z - lobe.center[2]) / lobe.rz,
          );
          if (d <= 0.96 + (hash2D(x * 3 + y, z * 5) - 0.5) * 0.24) {
            setWrapBlock(x, y, z, 'cherryLeaves');
            break;
          }
        }
      }
    }
  }
  const cherryCanopyCenter: Vec3 = [-23.0, chBase + 8.0, -2.5];

  const placeOakTree = (tx: number, tz: number, trunkHeight: number, hMap: Map<string, number>) => {
    const baseY = hMap.get(`${tx},${tz}`);
    if (baseY === undefined || baseY < 2) return;
    for (let y = 1; y <= trunkHeight; y++) setWrapBlock(tx, baseY + y, tz, 'oakLog');
    const crownBase = baseY + trunkHeight - 1;
    for (let dy = 0; dy <= 3; dy++) {
      const r = dy <= 1 ? 2 : 1;
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          if (dx === 0 && dz === 0 && dy <= 1) continue;
          if (dy === 3 && Math.abs(dx) + Math.abs(dz) > 1) continue;
          if (dy <= 1 && Math.abs(dx) === 2 && Math.abs(dz) === 2 && (dx + dz + dy) % 2 === 0) continue;
          if (!getBlock(tx + dx, crownBase + dy, tz + dz)) {
            setWrapBlock(tx + dx, crownBase + dy, tz + dz, 'oakLeaves');
          }
        }
      }
    }
  };

  const placeSpruceTree = (tx: number, tz: number, trunkHeight: number, hMap: Map<string, number>) => {
    const baseY = hMap.get(`${tx},${tz}`);
    if (baseY === undefined || baseY < 2) return;
    for (let y = 1; y <= trunkHeight; y++) setWrapBlock(tx, baseY + y, tz, 'spruceLog');
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
          if (!getBlock(tx + dx, startY + layer.dy, tz + dz)) {
            setWrapBlock(tx + dx, startY + layer.dy, tz + dz, 'spruceLeaves');
          }
        }
      }
    }
  };

  // Generously spaced multi-species forest framing the ~58x58 Main Island with open sightlines!
  placeOakTree(-23, 8, 5, wrapHeightMap);
  placeOakTree(-15, 20, 4, wrapHeightMap);
  placeOakTree(24, 5, 5, wrapHeightMap);
  placeOakTree(26, -5, 4, wrapHeightMap);
  placeSpruceTree(-22, -16, 7, wrapHeightMap);
  placeSpruceTree(-10, -24, 8, wrapHeightMap);
  placeSpruceTree(6, -23, 7, wrapHeightMap);
  placeSpruceTree(25, -16, 6, wrapHeightMap);
  // 2 scenic trees framing the expanded Windmill Millhouse Isle
  placeOakTree(WORKSHOP_OFF[0] + 24, WORKSHOP_OFF[2] + 7, 5, wsWrapHeight);
  placeSpruceTree(WORKSHOP_OFF[0] + 22, WORKSHOP_OFF[2] - 1, 6, wsWrapHeight);

  // Key interactive landmark coordinates
  const creeperPos: Vec3 = [-18, 3.5, 13];
  const bedPos: Vec3 = [-13.5, 3.5, 13.0]; // Sunny Manor stone terrace beside campfire!
  const chimneyTopPos: Vec3 = [4 + MAIN_MANOR_OFF[0], 15.6, 3 + MAIN_MANOR_OFF[2]]; // [-16, 15.6, 4]
  const boatAnchor: Vec3 = [10.0, 0.52, 24.0]; // Moored cleanly in sheltered Harbor T-Pier slip!
  const waterfallBases: Vec3[] = [
    [MAIN_WATERFALL_OFF[0] + 4.0, 6.4, MAIN_WATERFALL_OFF[2] + 15.2], // Mid-tier divider boulder mist
    [MAIN_WATERFALL_OFF[0] + 2.5, 0.6, MAIN_WATERFALL_OFF[2] + 16.5], // Left ribbon plunge pool mist
    [MAIN_WATERFALL_OFF[0] + 5.5, 0.6, MAIN_WATERFALL_OFF[2] + 16.5], // Right ribbon plunge pool mist
  ];
  const lighthouseLanternCenter: Vec3 = [
    LIGHTHOUSE_OFF[0] + 9,
    LIGHTHOUSE_OFF[1] + 24.6,
    LIGHTHOUSE_OFF[2] + 8,
  ]; // [-55, 24.6, 12]
  const windmillHubPos: Vec3 = [
    WORKSHOP_OFF[0] + 4.6,
    WORKSHOP_OFF[1] + 15.0,
    WORKSHOP_OFF[2] + 9.0,
  ]; // [48.6, 15.0, -21.0]

  // === 5. STRICT VANILLA SUGAR CANE (WATERLINE y=0 ONLY!), WILDFLOWERS & GRASS TUFTS ===
  const flowersRed: Vec3[] = [];
  const flowersYellow: Vec3[] = [];
  const grassTufts: Vec3[] = [];
  const sugarCanes: Vec3[] = [];

  for (let x = -29; x <= 29; x++) {
    for (let z = -26; z <= 26; z++) {
      const fy = wrapHeightMap.get(`${x},${z}`) ?? mainColumnMaxY.get(`${x},${z}`);
      if (fy === undefined) continue;
      if (Math.hypot(x - creeperPos[0], z - creeperPos[2]) < 1.8) continue;
      if (Math.hypot(x - bedPos[0], z - bedPos[2]) < 2.2) continue;
      if (Math.hypot(x - campfirePos[0], z - campfirePos[2]) < 2.2) continue;

      const topBlock = getBlock(x, fy, z);
      if (
        getBlock(x, fy + 1, z) ||
        nbtOccupied.has(keyOf(x, fy + 1, z)) ||
        subOccupied.has(keyOf(x, fy + 1, z))
      ) {
        continue;
      }

      // STRICT VANILLA RULE: Sugar Cane ONLY on waterline (fy === 0) directly orthogonally adjacent to water!
      if ((topBlock === 'sand' || topBlock === 'grass') && fy === 0) {
        const isWaterAt = (cx: number, cz: number) => {
          const b = getBlock(cx, 0, cz);
          return b === undefined || b === 'farmWater' || b === 'waterfall';
        };
        const orthogonallyTouchingWater =
          isWaterAt(x + 1, z) || isWaterAt(x - 1, z) || isWaterAt(x, z + 1) || isWaterAt(x, z - 1);
        if (orthogonallyTouchingWater && hash2D(x * 13 + 5, z * 17 - 3) > 0.72) {
          const caneH = hash2D(x, z) > 0.4 ? 3 : 2;
          for (let cy = 0; cy < caneH; cy++) {
            sugarCanes.push([x, fy + 0.5 + cy * 0.92, z]);
          }
          continue;
        }
      }

      if (topBlock === 'grass') {
        const hv = hash2D(x * 7 + 19, z * 11 - 7);
        if (hv > 0.96) flowersRed.push([x, fy + 0.5, z]);
        else if (hv > 0.92) flowersYellow.push([x, fy + 0.5, z]);
        else if (hv > 0.81) grassTufts.push([x, fy + 0.5, z]);
      }
    }
  }

  // Wildflowers on Workshop Isle's lush grass border
  for (let x = wsCenterX - 8; x <= wsCenterX + 12; x++) {
    for (let z = wsCenterZ - 8; z <= wsCenterZ + 11; z++) {
      const topY = wsWrapHeight.get(`${x},${z}`);
      if (topY === undefined || topY < 2) continue;
      if (getBlock(x, topY, z) !== 'grass') continue;
      if (getBlock(x, topY + 1, z) || nbtOccupied.has(keyOf(x, topY + 1, z))) continue;
      const hv = hash2D(x * 11 + 3, z * 19 + 7);
      if (hv > 0.93) flowersYellow.push([x, topY + 0.5, z]);
      else if (hv > 0.88) flowersRed.push([x, topY + 0.5, z]);
    }
  }

  // === 6. UNIFIED 6-NEIGHBOR SURFACE CULLING ===
  const blocks: Record<SolidBlockType, Vec3[]> = {
    grass: [],
    dirt: [],
    sand: [],
    gravel: [],
    stone: [],
    andesite: [],
    cobblestone: [],
    stoneBricks: [],
    crackedStoneBricks: [],
    mossyStoneBricks: [],
    deepslate: [],
    cobbledDeepslate: [],
    deepslateTiles: [],
    oakLog: [],
    oakPlanks: [],
    spruceLog: [],
    sprucePlanks: [],
    cherryLog: [],
    oakLeaves: [],
    spruceLeaves: [],
    cherryLeaves: [],
    coalOre: [],
    ironOre: [],
    diamondOre: [],
    emeraldOre: [],
    goldOre: [],
    redstoneOre: [],
    obsidian: [],
    cryingObsidian: [],
    ironBlock: [],
    diamondBlock: [],
    goldBlock: [],
    craftingTable: [],
    furnace: [],
    chest: [],
    barrel: [],
    hayBlock: [],
    calcite: [],
    redConcrete: [],
    whiteConcrete: [],
    seaLantern: [],
    farmlandWet: [],
    farmWater: [],
    waterfall: [],
  };

  const meadowGrassTop: Vec3[] = [];
  const isOpaque = (x: number, y: number, z: number): boolean => {
    const t = world.get(keyOf(x, y, z));
    return t !== undefined && !TRANSPARENT_OR_CUTOUT.has(t);
  };

  let totalCulledCount = 0;
  let totalVisibleCount = 0;

  for (const [k, type] of world.entries()) {
    const [xs, ys, zs] = k.split(',');
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
    if (type === 'grass' && Math.hypot(x, z) < 30) {
      meadowGrassTop.push([x, y, z]);
    }
  }

  // Updated collision boundaries & tailored close-up focus views for the expanded v0.6 Archipelago!
  const islands: IslandMeta[] = [
    {
      id: 'main',
      center: [0, -1],
      collisionRadius: 31.5,
      detectRadius: 38,
      focusCamPos: [2, 26, 14],
      focusTarget: [-8, 16, -12],
      hitboxCenter: [-9, 19, -15],
      hitboxSize: [18, 16, 14],
    },
    {
      id: 'lighthouse',
      center: [lhCenterX, lhCenterZ],
      collisionRadius: 15.2,
      detectRadius: 24.5,
      focusCamPos: [lhCenterX + 24, 21, lhCenterZ + 22],
      focusTarget: [lhCenterX - 1, 14.5, lhCenterZ - 1],
      hitboxCenter: [lhCenterX - 1, 15, lhCenterZ - 1],
      hitboxSize: [18, 28, 18],
    },
    {
      id: 'workshop',
      center: [wsCenterX, wsCenterZ],
      collisionRadius: 16.5,
      detectRadius: 26.0,
      focusCamPos: [wsCenterX - 24, 17, wsCenterZ + 22],
      focusTarget: [wsCenterX + 1, 10.5, wsCenterZ - 2],
      hitboxCenter: [wsCenterX + 1, 11, wsCenterZ - 2],
      hitboxSize: [20, 20, 20],
    },
  ];

  // 2 grazing Pixel Sheep on spacious flat meadows of the expanded Main Island
  const sheepSpawns: Array<{ center: Vec3; radius: number }> = [
    { center: [-14.0, 3.5, 16.5], radius: 2.2 },
    { center: [22.0, 3.5, 9.0], radius: 2.0 },
  ];

  // 6 strategic Zone PointLights (plus 1 Portal PointLight = 7 total for 60fps PBR!)
  const zonePointLights: Array<{
    pos: Vec3;
    color: string;
    maxIntensity: number;
    distance: number;
  }> = [
    { pos: [-9, 18.5, -14], color: '#ffae42', maxIntensity: 6.8, distance: 22 }, // Twin-Tower Citadel
    { pos: [beaconPos[0], beaconPos[1] + 1.5, beaconPos[2]], color: '#7dd3fc', maxIntensity: 6.2, distance: 24 }, // Summit Beacon
    { pos: [-11, 6.5, 11], color: '#ffbd59', maxIntensity: 6.4, distance: 20 }, // Coastal Manor & Campfire
    { pos: [10, 5.5, 15], color: '#ffaa3b', maxIntensity: 6.2, distance: 24 }, // Harbor Pier, Crane & Arch Bridge
    { pos: [lighthouseLanternCenter[0], lighthouseLanternCenter[1], lighthouseLanternCenter[2]], color: '#ffe599', maxIntensity: 9.5, distance: 32 }, // Expanded Lighthouse Lantern Room
    { pos: [WORKSHOP_OFF[0] + 10, 10.5, WORKSHOP_OFF[2] + 10], color: '#ffbd59', maxIntensity: 6.8, distance: 24 }, // 2-Story Windmill Millhouse
  ];

  return {
    blocks,
    meadowGrassTop,
    stairs,
    slabs,
    fences,
    glassPanes,
    walls,
    ironBars,
    doors,
    lightningRods,
    trapdoors,
    lanterns,
    beaconPos,
    portalCoreCenter,
    portalCoreSize,
    portalAxis,
    campfirePos,
    chimneyTopPos,
    bedPos,
    lighthouseLanternCenter,
    windmillHubPos,
    cherryCanopyCenter,
    waterfallBases,
    boatAnchor,
    creeperPos,
    sheepSpawns,
    flowersRed,
    flowersYellow,
    grassTufts,
    sugarCanes,
    wheatCrops,
    islands,
    zonePointLights,
    nbtBlockCount:
      input.citadel.blocks.length +
      input.waterfallPortal.blocks.length +
      input.manor.blocks.length +
      input.harbor.blocks.length +
      input.lighthouse.blocks.length +
      input.workshop.blocks.length,
    totalVisibleCount,
    totalCulledCount,
  };
}
