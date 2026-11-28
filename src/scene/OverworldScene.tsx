import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { soundEngine } from '../audio/soundEngine';
import { useWorld } from '../context/WorldContext';
import { UI_TEXT } from '../i18n';
import type { LandmarkTarget } from '../worlds/types';
import {
  createClassicRedBed,
  createLighthouseBeams,
  createShootingStarSystem,
  createVoxelBees,
  createVoxelDolphin,
  createVoxelSheep,
  createWindmillSails,
  type BeeSystem,
  type DolphinSystem,
  type LighthouseBeamSystem,
  type RedBedSystem,
  type SheepSystem,
  type WindmillSystem,
} from './archipelagoLife';
import {
  composeNbtIslandWorld,
  type ComposedIslandWorld,
  type SolidBlockType,
} from './nbtIslandComposer';
import { fetchNbtStructure } from './nbtLoader';
import { createIslandWaterShaders, createOceanSystem, createSkySystem } from './skyAndOcean';
import {
  buildSeamlessWaterGeometry,
  createArchitecturalDetailsGroup,
  createSlabSystem,
  createStairSystem,
  createVanillaFenceGroup,
  createVanillaLanternSystem,
  type Vec3,
} from './subVoxelMeshes';
import { createVoxelMaterialPack } from './voxelTextures';

interface ParticleState {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  rot: THREE.Euler;
  rotSpeed: THREE.Vector3;
  scale: number;
  life: number;
  maxLife: number;
}

interface CloudCluster {
  mesh: THREE.Group;
  speed: number;
  baseY: number;
  phase: number;
}

type HoverTarget = 'none' | 'creeper' | 'beacon' | 'boat' | 'bed' | 'lighthouse' | 'workshop';

const BEACON_COLORS = [
  '#38bdf8', // Sky Blue
  '#34d399', // Emerald Green
  '#c084fc', // Amethyst Purple
  '#facc15', // Golden Yellow
  '#f8fafc', // Pure White
];

function createCrossedPlanesGeometry(width = 0.86, height = 0.86): THREE.BufferGeometry {
  const hw = (width * 0.5) / Math.SQRT2;
  const positions = new Float32Array([
    -hw, 0, -hw,
    hw, 0, hw,
    hw, height, hw,
    -hw, 0, -hw,
    hw, height, hw,
    -hw, height, -hw,
    -hw, 0, hw,
    hw, 0, -hw,
    hw, height, -hw,
    -hw, 0, hw,
    hw, height, -hw,
    -hw, height, hw,
  ]);
  const normals = new Float32Array([
    0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
    0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
  ]);
  const uvs = new Float32Array([
    0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1,
  ]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  return geo;
}

function createInstancedBlocks(
  positions: Vec3[],
  geometry: THREE.BoxGeometry,
  material: THREE.Material | THREE.Material[],
  castShadow = true,
  receiveShadow = true,
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(positions.length, 1));
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;
  const dummy = new THREE.Object3D();
  positions.forEach(([x, y, z], index) => {
    dummy.position.set(x, y, z);
    dummy.scale.set(1, 1, 1);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  });
  mesh.count = positions.length;
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

function createPixelBoat(plankMat: THREE.Material, logMat: THREE.Material[]): THREE.Group {
  const boat = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.24, 2.5), plankMat);
  hull.position.y = 0.12;
  hull.castShadow = true;
  hull.receiveShadow = true;
  boat.add(hull);

  const sideGeo = new THREE.BoxGeometry(0.18, 0.42, 2.5);
  const leftSide = new THREE.Mesh(sideGeo, plankMat);
  leftSide.position.set(-0.68, 0.36, 0);
  leftSide.castShadow = true;
  const rightSide = new THREE.Mesh(sideGeo, plankMat);
  rightSide.position.set(0.68, 0.36, 0);
  rightSide.castShadow = true;
  boat.add(leftSide, rightSide);

  const endGeo = new THREE.BoxGeometry(1.5, 0.42, 0.22);
  const bow = new THREE.Mesh(endGeo, plankMat);
  bow.position.set(0, 0.36, 1.15);
  bow.castShadow = true;
  const stern = new THREE.Mesh(endGeo, plankMat);
  stern.position.set(0, 0.36, -1.15);
  stern.castShadow = true;
  boat.add(bow, stern);

  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 0.36), logMat);
  seat.position.set(0, 0.34, -0.1);
  boat.add(seat);

  const oarL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 1.5), logMat);
  oarL.position.set(0.55, 0.48, 0.1);
  oarL.rotation.y = 0.32;
  const oarR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 1.5), logMat);
  oarR.position.set(-0.55, 0.48, 0.1);
  oarR.rotation.y = -0.32;
  boat.add(oarL, oarR);

  return boat;
}

function createCampfireGroup(
  logMat: THREE.Material,
  emberMat: THREE.Material,
  stoneMat: THREE.Material,
): THREE.Group {
  const group = new THREE.Group();
  const logGeo = new THREE.BoxGeometry(0.92, 0.2, 0.22);
  for (let i = 0; i < 4; i++) {
    const log = new THREE.Mesh(logGeo, logMat);
    log.position.y = 0.1 + (i >= 2 ? 0.14 : 0);
    log.rotation.y = (i * Math.PI) / 4 + 0.2;
    log.castShadow = true;
    group.add(log);
  }
  const ember = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.22, 0.46), emberMat);
  ember.position.y = 0.16;
  group.add(ember);

  const rockGeo = new THREE.BoxGeometry(0.24, 0.16, 0.24);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const rock = new THREE.Mesh(rockGeo, stoneMat);
    rock.position.set(Math.cos(a) * 0.56, 0.08, Math.sin(a) * 0.56);
    rock.rotation.y = a;
    group.add(rock);
  }
  return group;
}

export function OverworldScene() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const {
    motion,
    unlockAchievement,
    locale,
    syncTimePhase,
    timeJumpSeq,
    timeJumpTo,
    sailingMode,
    setSailingMode,
    setFocusedLandmark,
    setNearbyLandmark,
    cameraCommand,
    showHotbarNotice,
    setSleepFade,
  } = useWorld();

  const [hoverTarget, setHoverTarget] = useState<HoverTarget>('none');
  const [loadingSlow, setLoadingSlow] = useState(false);

  const motionRef = useRef(motion);
  motionRef.current = motion;
  const localeRef = useRef(locale);
  localeRef.current = locale;
  const unlockRef = useRef(unlockAchievement);
  unlockRef.current = unlockAchievement;
  const syncTimePhaseRef = useRef(syncTimePhase);
  syncTimePhaseRef.current = syncTimePhase;
  const sailingModeRef = useRef(sailingMode);
  sailingModeRef.current = sailingMode;
  const setSailingModeRef = useRef(setSailingMode);
  setSailingModeRef.current = setSailingMode;
  const setFocusedLandmarkRef = useRef(setFocusedLandmark);
  setFocusedLandmarkRef.current = setFocusedLandmark;
  const setNearbyLandmarkRef = useRef(setNearbyLandmark);
  setNearbyLandmarkRef.current = setNearbyLandmark;
  const showHotbarNoticeRef = useRef(showHotbarNotice);
  showHotbarNoticeRef.current = showHotbarNotice;
  const setSleepFadeRef = useRef(setSleepFade);
  setSleepFadeRef.current = setSleepFade;

  const timeJumpSignalRef = useRef({ seq: timeJumpSeq, to: timeJumpTo });
  timeJumpSignalRef.current = { seq: timeJumpSeq, to: timeJumpTo };

  const cameraCommandRef = useRef(cameraCommand);
  cameraCommandRef.current = cameraCommand;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;

    const scene = new THREE.Scene();
    const fog = new THREE.Fog('#d2f0ff', 108, 258);
    scene.fog = fog;

    // Wide cinematic archipelago framing showcasing the ~58x58 Main Island, Lighthouse Isle & Windmill Millhouse Isle!
    const introStartPos = new THREE.Vector3(-56, 17.0, 62);
    const introStartTarget = new THREE.Vector3(-1.0, 9.0, -3.0);
    const heroPos = new THREE.Vector3(46, 33.0, 54);
    const heroTarget = new THREE.Vector3(-1.0, 8.5, -2.5);

    const camera = new THREE.PerspectiveCamera(
      46,
      container.clientWidth / Math.max(container.clientHeight, 1),
      0.2,
      540,
    );
    camera.position.copy(introStartPos);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.minDistance = 16;
    controls.maxDistance = 152;
    controls.minPolarAngle = Math.PI * 0.12;
    controls.maxPolarAngle = Math.PI * 0.455;
    controls.target.copy(introStartTarget);
    controls.autoRotate = false;
    controls.autoRotateSpeed = 0.16;

    let introActive = false;
    let introElapsed = 0;
    const introDuration = 2.8;

    // Smooth landmark camera fly-to state (user pointer drag immediately cancels & restores free OrbitControls!)
    let flyActive = false;
    let flyElapsed = 0;
    const flyDuration = 1.15;
    const flyStartPos = new THREE.Vector3();
    const flyEndPos = new THREE.Vector3();
    const flyStartTarget = new THREE.Vector3();
    const flyEndTarget = new THREE.Vector3();

    const startCameraFlyTo = (endPos: THREE.Vector3, endTarget: THREE.Vector3) => {
      introActive = false;
      controls.autoRotate = false;
      flyStartPos.copy(camera.position);
      flyEndPos.copy(endPos);
      flyStartTarget.copy(controls.target);
      flyEndTarget.copy(endTarget);
      flyElapsed = 0;
      flyActive = true;
    };

    const cancelCameraAutomation = () => {
      introActive = false;
      flyActive = false;
      controls.autoRotate = false;
    };
    const onControlStart = () => cancelCameraAutomation();
    controls.addEventListener('start', onControlStart);

    // === IMMEDIATE FRAME-0 ENVIRONMENT ===
    const materials = createVoxelMaterialPack();

    const sky = createSkySystem({
      sunTexture: materials.sunTexture,
      sunGlowTexture: materials.sunGlowTexture,
      moonTexture: materials.moonTexture,
      moonGlowTexture: materials.moonGlowTexture,
    });
    scene.add(sky.dome, sky.sunGroup, sky.moonGroup);

    const ocean = createOceanSystem();
    scene.add(ocean.mesh);

    const islandWater = createIslandWaterShaders();

    const shootingStars = createShootingStarSystem();
    scene.add(shootingStars.group);

    const hemiLight = new THREE.HemisphereLight('#e0f4ff', '#6b948a', 1.12);
    scene.add(hemiLight);

    const fillLight = new THREE.DirectionalLight('#daf2ff', 0.44);
    fillLight.position.set(28, 18, 32);
    scene.add(fillLight);

    // Single permanent shadow-casting celestial light (zero castShadow toggling!)
    const celestialLight = new THREE.DirectionalLight('#fff7e6', 1.92);
    celestialLight.position.set(-24, 38, -28);
    celestialLight.castShadow = true;
    celestialLight.shadow.mapSize.set(2048, 2048);
    celestialLight.shadow.camera.near = 6;
    celestialLight.shadow.camera.far = 195;
    const shadowBound = 72;
    celestialLight.shadow.camera.left = -shadowBound;
    celestialLight.shadow.camera.right = shadowBound;
    celestialLight.shadow.camera.top = shadowBound;
    celestialLight.shadow.camera.bottom = -shadowBound;
    celestialLight.shadow.bias = -0.0005;
    celestialLight.shadow.normalBias = 0.04;
    scene.add(celestialLight);

    // Volumetric 3D pixel clouds
    const cloudClusters: CloudCluster[] = [];
    const cloudVoxelGeo = new THREE.BoxGeometry(3.1, 1.2, 3.1);
    const cloudDefs = [
      { x: -62, y: 36, z: -48, speed: 0.68, shape: [[0,0,0],[1,0,0],[2,0,0],[3,0,0],[1,0,1],[2,0,1],[1,1,0],[2,1,0]] },
      { x: 34, y: 40, z: -56, speed: 0.52, shape: [[0,0,0],[1,0,0],[2,0,0],[1,0,1],[2,0,1],[3,0,1],[1,1,0],[2,1,1]] },
      { x: -28, y: 41, z: 32, speed: 0.74, shape: [[0,0,0],[1,0,0],[2,0,0],[0,0,1],[1,0,1],[1,1,0]] },
      { x: 58, y: 37, z: 24, speed: 0.58, shape: [[0,0,0],[1,0,0],[2,0,0],[3,0,0],[1,0,-1],[2,0,-1],[2,1,0]] },
      { x: -78, y: 43, z: -8, speed: 0.46, shape: [[0,0,0],[1,0,0],[2,0,0],[1,0,1],[2,0,1],[1,1,0]] },
      { x: 10, y: 44, z: -76, speed: 0.62, shape: [[0,0,0],[1,0,0],[2,0,0],[3,0,0],[4,0,0],[1,0,1],[2,0,1],[3,0,1],[2,1,0]] },
      { x: 76, y: 39, z: -26, speed: 0.54, shape: [[0,0,0],[1,0,0],[2,0,0],[1,0,1],[1,1,0]] },
      { x: -16, y: 35, z: 68, speed: 0.66, shape: [[0,0,0],[1,0,0],[2,0,0],[1,0,1],[2,0,1],[1,1,0]] },
    ];
    cloudDefs.forEach((def, idx) => {
      const grp = new THREE.Group();
      def.shape.forEach(([bx0, by0, bz0]) => {
        const v = new THREE.Mesh(cloudVoxelGeo, materials.cloud);
        v.position.set(bx0 * 3.1, by0 * 1.15, bz0 * 3.1);
        grp.add(v);
      });
      grp.position.set(def.x, def.y, def.z);
      scene.add(grp);
      cloudClusters.push({ mesh: grp, speed: def.speed, baseY: def.y, phase: idx * 1.4 });
    });

    // Boat keyboard controls
    const sailKeys = { forward: false, back: false, left: false, right: false };
    const onKeyDown = (e: KeyboardEvent) => {
      if (!sailingModeRef.current) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      const k = e.key.toLowerCase();
      if (k === 'w' || e.key === 'ArrowUp') sailKeys.forward = true;
      if (k === 's' || e.key === 'ArrowDown') sailKeys.back = true;
      if (k === 'a' || e.key === 'ArrowLeft') sailKeys.left = true;
      if (k === 'd' || e.key === 'ArrowRight') sailKeys.right = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || e.key === 'ArrowUp') sailKeys.forward = false;
      if (k === 's' || e.key === 'ArrowDown') sailKeys.back = false;
      if (k === 'a' || e.key === 'ArrowLeft') sailKeys.left = false;
      if (k === 'd' || e.key === 'ArrowRight') sailKeys.right = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    interface MountedWorld {
      layout: ComposedIslandWorld;
      worldGroup: THREE.Group;
      instancedByType: Partial<Record<SolidBlockType, THREE.InstancedMesh>>;
      meadowIndices: Array<{ idx: number; pos: Vec3 }>;
      beaconMesh: THREE.Mesh;
      beamInnerMesh: THREE.Mesh;
      beamOuterMesh: THREE.Mesh;
      beamInnerMat: THREE.MeshBasicMaterial;
      beamOuterMat: THREE.MeshBasicMaterial;
      lanternCoreMat: THREE.MeshStandardMaterial;
      lanternHaloMat: THREE.SpriteMaterial;
      lanternHaloSprites: THREE.Sprite[];
      zoneLights: Array<{ light: THREE.PointLight; maxIntensity: number }>;
      beaconZoneLight?: THREE.PointLight;
      portalAmbientLight: THREE.PointLight;
      boat: THREE.Group;
      boatHitMeshes: THREE.Object3D[];
      wakeMesh: THREE.InstancedMesh;
      wakeDrops: Array<{ pos: THREE.Vector3; life: number; maxLife: number; size: number }>;
      bedSystem: RedBedSystem;
      lighthouseBeams: LighthouseBeamSystem;
      windmill: WindmillSystem;
      sheepSystem: SheepSystem;
      beeSystem: BeeSystem;
      dolphinSystem: DolphinSystem;
      landmarkHitboxes: Array<{ id: LandmarkTarget; mesh: THREE.Mesh }>;
      emberMesh: THREE.InstancedMesh;
      emberSeeds: Array<{ phase: number; dx: number; dz: number; speed: number }>;
      smokeMesh: THREE.InstancedMesh;
      smokeSeeds: Array<{ phase: number; dx: number; dz: number; speed: number }>;
      chimneySmokeMesh: THREE.InstancedMesh;
      chimneySmokeSeeds: Array<{ phase: number; dx: number; dz: number; speed: number }>;
      petalMesh: THREE.InstancedMesh;
      petalSeeds: Array<{
        phase: number;
        ox: number;
        oy: number;
        oz: number;
        fallSpeed: number;
        swayFreq: number;
        swayAmp: number;
      }>;
      splashMesh: THREE.InstancedMesh;
      splashSeeds: Array<{
        base: Vec3;
        phase: number;
        angle: number;
        spread: number;
        speed: number;
      }>;
      portalSparkMesh: THREE.InstancedMesh;
      portalSparkSeeds: Array<{
        phase: number;
        ox: number;
        oy: number;
        oz: number;
        speed: number;
      }>;
      creeperGroup: THREE.Group;
      creeperHead: THREE.Mesh;
      creeperParts: THREE.Mesh[];
      explosionMesh: THREE.InstancedMesh;
      oreOrbitMesh: THREE.InstancedMesh;
      oreTracks: Array<{
        radius: number;
        angle: number;
        yOffset: number;
        tilt: number;
        speedMul: number;
      }>;
      portalVortexMesh: THREE.InstancedMesh;
      portalTracks: Array<{
        heightPhase: number;
        angleOffset: number;
        radiusJitter: number;
        riseSpeed: number;
      }>;
      waveSatellitesMesh: THREE.InstancedMesh;
      waveSatellites: Array<{ x: number; z: number; baseY: number; phase: number }>;
      dispose: () => void;
    }

    let mounted: MountedWorld | null = null;
    const beaconColorCurrent = new THREE.Color(BEACON_COLORS[0]);
    const beaconColorTarget = new THREE.Color(BEACON_COLORS[0]);
    let beaconColorIndex = 0;

    // Boat sailing dynamic physics state
    const boatPos = new THREE.Vector3(10.4, 0.52, 13.5);
    let boatYaw = 0.28;
    let boatSpeed = 0;
    let wakeCooldown = 0;
    let lastNearby: 'lighthouse' | 'workshop' | null = null;

    // Creeper Easter Egg state
    const explosionParticles: ParticleState[] = [];
    const explosionCount = 64;
    const creeperBaseScale = 1.24;
    let creeperState: 'idle' | 'fuse' | 'exploded' | 'respawn' = 'idle';
    let creeperTimer = 0;
    let cameraShake = 0;

    // Natural Time Cycle & Vanilla Red Bed Sleep state
    // 0.00 = Dawn, 0.25 = Noon, 0.50 = Dusk, 0.75 = Midnight
    let dayPhase = 0.22; // Start in crisp sunlit morning-day!
    const FULL_DAY_SECONDS = 210; // ~3.5 minutes per full 24h cycle
    let lastHandledTimeJumpSeq = timeJumpSignalRef.current.seq;
    let timeJumpTargetPhase: number | null = null;

    let sleepStage: 'none' | 'fadeOut' | 'hold' | 'fadeIn' = 'none';
    let sleepTimer = 0;

    let lastHandledCameraSeq = cameraCommandRef.current?.seq ?? 0;

    const slowTimer = window.setTimeout(() => {
      if (!mounted && !disposed) setLoadingSlow(true);
    }, 180);

    // === PARALLEL FETCH ALL 6 VERIFIED MASTER NBT STRUCTURES (BASE_URL safe for GitHub Pages!) ===
    const base = import.meta.env.BASE_URL;
    Promise.all([
      fetchNbtStructure(`${base}structures/main_citadel.nbt`),
      fetchNbtStructure(`${base}structures/main_waterfall_portal.nbt`),
      fetchNbtStructure(`${base}structures/main_manor.nbt`),
      fetchNbtStructure(`${base}structures/main_harbor.nbt`),
      fetchNbtStructure(`${base}structures/lighthouse_isle.nbt`),
      fetchNbtStructure(`${base}structures/workshop_isle.nbt`),
    ])
      .then(([citadel, waterfallPortal, manor, harbor, lighthouse, workshop]) => {
        if (disposed) return;
        window.clearTimeout(slowTimer);
        setLoadingSlow(false);

        const layout = composeNbtIslandWorld({
          citadel,
          waterfallPortal,
          manor,
          harbor,
          lighthouse,
          workshop,
        });
        boatPos.set(...layout.boatAnchor);

        const worldGroup = new THREE.Group();
        scene.add(worldGroup);

        const localDisposables: Array<{ dispose: () => void }> = [];
        const boxGeo = new THREE.BoxGeometry(1, 1, 1);
        localDisposables.push(boxGeo);

        const blockMaterials: Record<SolidBlockType, THREE.Material | THREE.Material[]> = {
          grass: materials.grass,
          dirt: materials.dirt,
          sand: materials.sand,
          gravel: materials.gravel,
          stone: materials.stone,
          andesite: materials.andesite,
          cobblestone: materials.cobblestone,
          stoneBricks: materials.stoneBricks,
          crackedStoneBricks: materials.crackedStoneBricks,
          mossyStoneBricks: materials.mossyStoneBricks,
          deepslate: materials.deepslate,
          cobbledDeepslate: materials.cobbledDeepslate,
          deepslateTiles: materials.deepslateTiles,
          oakLog: materials.oakLog,
          oakPlanks: materials.oakPlanks,
          spruceLog: materials.spruceLog,
          sprucePlanks: materials.sprucePlanks,
          cherryLog: materials.cherryLog,
          oakLeaves: materials.oakLeaves,
          spruceLeaves: materials.spruceLeaves,
          cherryLeaves: materials.cherryLeaves,
          coalOre: materials.coalOre,
          ironOre: materials.ironOre,
          diamondOre: materials.diamondOre,
          emeraldOre: materials.emeraldOre,
          goldOre: materials.goldOre,
          redstoneOre: materials.redstoneOre,
          obsidian: materials.obsidian,
          cryingObsidian: materials.cryingObsidian,
          ironBlock: materials.ironBlock,
          diamondBlock: materials.diamondBlock,
          goldBlock: materials.goldBlock,
          craftingTable: materials.craftingTable,
          furnace: materials.furnace,
          chest: materials.chest,
          barrel: materials.barrel,
          hayBlock: materials.hayBlock,
          calcite: materials.calcite,
          redConcrete: materials.redConcrete,
          whiteConcrete: materials.whiteConcrete,
          seaLantern: materials.seaLantern,
          farmlandWet: materials.farmlandWet,
          farmWater: materials.farmWater,
          waterfall: materials.waterfall,
        };

        const instancedByType: Partial<Record<SolidBlockType, THREE.InstancedMesh>> = {};
        (Object.keys(layout.blocks) as SolidBlockType[]).forEach((type) => {
          // Waterfall & pools use seamless face-culled ocean-matching GLSL water meshes below!
          if (type === 'waterfall' || type === 'farmWater') return;
          const coords = layout.blocks[type];
          if (coords.length === 0) return;
          const mesh = createInstancedBlocks(coords, boxGeo, blockMaterials[type], true, true);
          if (type === 'oakLeaves') mesh.customDepthMaterial = materials.oakLeavesDepth;
          else if (type === 'spruceLeaves') mesh.customDepthMaterial = materials.spruceLeavesDepth;
          else if (type === 'cherryLeaves') mesh.customDepthMaterial = materials.cherryLeavesDepth;
          instancedByType[type] = mesh;
          worldGroup.add(mesh);
        });

        // Seamless ocean-matching GLSL Water Meshes (0 internal cube seams between adjacent water blocks!)
        const allWaterSet = new Set<string>();
        for (const [wx, wy, wz] of layout.blocks.waterfall) allWaterSet.add(`${wx},${wy},${wz}`);
        for (const [wx, wy, wz] of layout.blocks.farmWater) allWaterSet.add(`${wx},${wy},${wz}`);

        if (layout.blocks.waterfall.length > 0) {
          const cascadeGeo = buildSeamlessWaterGeometry(layout.blocks.waterfall, allWaterSet, false);
          const cascadeMesh = new THREE.Mesh(cascadeGeo, islandWater.cascadeMat);
          cascadeMesh.renderOrder = 2;
          worldGroup.add(cascadeMesh);
          localDisposables.push(cascadeGeo);
        }
        if (layout.blocks.farmWater.length > 0) {
          const poolGeo = buildSeamlessWaterGeometry(layout.blocks.farmWater, allWaterSet, true);
          const poolMesh = new THREE.Mesh(poolGeo, islandWater.poolMat);
          poolMesh.renderOrder = 2;
          worldGroup.add(poolMesh);
          localDisposables.push(poolGeo);
        }

        const meadowIndices: Array<{ idx: number; pos: Vec3 }> = [];
        layout.blocks.grass.forEach((pos, idx) => {
          if (Math.hypot(pos[0], pos[2]) < 30) meadowIndices.push({ idx, pos });
        });

        // Full-fidelity NBT Sub-Voxel Architecture across all 3 islands
        const stairSystem = createStairSystem(layout.stairs, {
          stoneBricks: materials.stoneBricks,
          sprucePlanks: materials.sprucePlanks,
          deepslateTiles: materials.deepslateTiles,
          oakPlanks: materials.oakPlanks,
        });
        const slabSystem = createSlabSystem(layout.slabs, {
          stoneBricks: materials.stoneBricks,
          oakPlanks: materials.oakPlanks,
          sprucePlanks: materials.sprucePlanks,
          deepslateTiles: materials.deepslateTiles,
        });
        const fenceSystem = createVanillaFenceGroup(layout.fences, materials.oakPlanks);
        const detailSystem = createArchitecturalDetailsGroup({
          glassPanes: layout.glassPanes,
          walls: layout.walls,
          ironBars: layout.ironBars,
          doors: layout.doors,
          lightningRods: layout.lightningRods,
          trapdoors: layout.trapdoors,
          glassMat: materials.windowGlass,
          wallMat: materials.deepslateTiles,
          doorLowerMat: materials.oakDoorLower,
          doorUpperMat: materials.oakDoorUpper,
          copperMat: materials.copperRod,
          trapdoorMat: materials.spruceTrapdoor,
        });
        const lanternSystem = createVanillaLanternSystem(layout.lanterns);

        worldGroup.add(
          stairSystem.group,
          slabSystem.group,
          fenceSystem.group,
          detailSystem.group,
          lanternSystem.group,
        );
        localDisposables.push(stairSystem, slabSystem, fenceSystem, detailSystem, lanternSystem);

        // Crossed-Plane Flora & Golden Workshop Wheat Crops
        const crossedFloraGeo = createCrossedPlanesGeometry(0.86, 0.86);
        localDisposables.push(crossedFloraGeo);
        const initDummy = new THREE.Object3D();
        const buildFlora = (positions: Vec3[], mat: THREE.Material, scaleBase: number, yShift = 0) => {
          const mesh = new THREE.InstancedMesh(crossedFloraGeo, mat, Math.max(positions.length, 1));
          mesh.receiveShadow = true;
          positions.forEach(([x, y, z], i) => {
            initDummy.position.set(x, y + yShift, z);
            initDummy.rotation.set(0, (i * 0.95) % Math.PI, 0);
            const s = scaleBase + (i % 3) * 0.05;
            initDummy.scale.set(s, s, s);
            initDummy.updateMatrix();
            mesh.setMatrixAt(i, initDummy.matrix);
          });
          mesh.count = positions.length;
          mesh.instanceMatrix.needsUpdate = true;
          return mesh;
        };
        worldGroup.add(
          buildFlora(layout.flowersRed, materials.flowerPoppy, 0.92),
          buildFlora(layout.flowersYellow, materials.flowerDandelion, 0.9),
          buildFlora(layout.grassTufts, materials.grassTuft, 0.85),
          buildFlora(layout.sugarCanes, materials.sugarCane, 1.05),
          buildFlora(layout.wheatCrops, materials.wheat, 1.06, -0.5),
        );

        // === V0.5 LIVING WORLD & SATELLITE ISLAND FEATURES ===
        const lighthouseBeams = createLighthouseBeams(layout.lighthouseLanternCenter);
        worldGroup.add(lighthouseBeams.group);
        localDisposables.push(lighthouseBeams);

        const windmill = createWindmillSails(
          layout.windmillHubPos,
          materials.oakPlanks,
          materials.sprucePlanks,
          materials.whiteWool,
        );
        worldGroup.add(windmill.group);
        localDisposables.push(windmill);

        const bedSystem = createClassicRedBed(
          layout.bedPos,
          materials.redWool,
          materials.whiteWool,
          materials.oakPlanks,
        );
        worldGroup.add(bedSystem.group);
        localDisposables.push(bedSystem);

        const sheepSystem = createVoxelSheep(layout.sheepSpawns, materials.whiteWool);
        worldGroup.add(sheepSystem.group);
        localDisposables.push(sheepSystem);

        const beeSystem = createVoxelBees(layout.cherryCanopyCenter);
        worldGroup.add(beeSystem.group);
        localDisposables.push(beeSystem);

        const dolphinSystem = createVoxelDolphin();
        worldGroup.add(dolphinSystem.group);
        localDisposables.push(dolphinSystem);

        // Invisible clickable hitboxes for smooth Landmark Click-to-Focus (Lighthouse, Workshop, Main Tower)
        const hitboxMat = new THREE.MeshBasicMaterial({ visible: false });
        localDisposables.push(hitboxMat);
        const landmarkHitboxes: Array<{ id: LandmarkTarget; mesh: THREE.Mesh }> = [];
        for (const isle of layout.islands) {
          const g = new THREE.BoxGeometry(...isle.hitboxSize);
          localDisposables.push(g);
          const m = new THREE.Mesh(g, hitboxMat);
          m.position.set(...isle.hitboxCenter);
          worldGroup.add(m);
          landmarkHitboxes.push({ id: isle.id, mesh: m });
        }

        // Interactive Beacon Block & Dual-Layer Rotating Sky Beam
        const [bx, by, bz] = layout.beaconPos;
        const beaconMesh = new THREE.Mesh(boxGeo, materials.beaconBlock);
        beaconMesh.position.set(bx, by, bz);
        beaconMesh.castShadow = true;
        beaconMesh.receiveShadow = true;
        worldGroup.add(beaconMesh);

        const beamHeight = 98;
        const beamInnerGeo = new THREE.BoxGeometry(0.42, beamHeight, 0.42);
        const beamOuterGeo = new THREE.BoxGeometry(0.86, beamHeight, 0.86);
        const beamInnerMat = new THREE.MeshBasicMaterial({
          color: beaconColorCurrent.clone().lerp(new THREE.Color('#ffffff'), 0.45),
          transparent: true,
          opacity: 0.82,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          fog: false,
        });
        const beamOuterMat = new THREE.MeshBasicMaterial({
          color: beaconColorCurrent.clone(),
          transparent: true,
          opacity: 0.34,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          fog: false,
        });
        const beamInnerMesh = new THREE.Mesh(beamInnerGeo, beamInnerMat);
        beamInnerMesh.position.set(bx, by + beamHeight * 0.5 + 0.35, bz);
        const beamOuterMesh = new THREE.Mesh(beamOuterGeo, beamOuterMat);
        beamOuterMesh.position.set(bx, by + beamHeight * 0.5 + 0.35, bz);
        worldGroup.add(beamInnerMesh, beamOuterMesh);
        localDisposables.push(beamInnerGeo, beamOuterGeo, beamInnerMat, beamOuterMat);

        // Playable Oak Boat & White Foam Stern Wake Particles
        const boat = createPixelBoat(materials.oakPlanks, materials.oakLog);
        boat.position.copy(boatPos);
        boat.rotation.y = boatYaw;
        worldGroup.add(boat);
        const boatHitMeshes: THREE.Object3D[] = [];
        boat.traverse((obj) => {
          if (obj instanceof THREE.Mesh) boatHitMeshes.push(obj);
        });

        const maxWake = 36;
        const wakeGeo = new THREE.BoxGeometry(0.28, 0.08, 0.28);
        const wakeMat = new THREE.MeshBasicMaterial({
          color: '#f0f9ff',
          transparent: true,
          opacity: 0.85,
        });
        const wakeMesh = new THREE.InstancedMesh(wakeGeo, wakeMat, maxWake);
        wakeMesh.count = 0;
        worldGroup.add(wakeMesh);
        localDisposables.push(wakeGeo, wakeMat);
        const wakeDrops: Array<{ pos: THREE.Vector3; life: number; maxLife: number; size: number }> = [];

        // Campfire & Cottage Stone-Brick Chimney Smoke
        const campfire = createCampfireGroup(
          materials.campfireLog,
          materials.campfireEmber,
          materials.cobblestone,
        );
        campfire.position.set(layout.campfirePos[0], layout.campfirePos[1] - 0.5, layout.campfirePos[2]);
        worldGroup.add(campfire);

        const emberCount = 16;
        const emberGeo = new THREE.BoxGeometry(0.11, 0.11, 0.11);
        const emberMat = new THREE.MeshBasicMaterial({ color: '#ffae38' });
        const emberMesh = new THREE.InstancedMesh(emberGeo, emberMat, emberCount);
        const emberSeeds = Array.from({ length: emberCount }, (_, i) => ({
          phase: i / emberCount,
          dx: (Math.random() - 0.5) * 0.48,
          dz: (Math.random() - 0.5) * 0.48,
          speed: 0.42 + Math.random() * 0.38,
        }));
        worldGroup.add(emberMesh);
        localDisposables.push(emberGeo, emberMat);

        const smokeCount = 12;
        const smokeGeo = new THREE.BoxGeometry(0.26, 0.26, 0.26);
        const smokeMat = new THREE.MeshStandardMaterial({
          color: '#cbd5e1',
          transparent: true,
          opacity: 0.48,
          roughness: 1,
        });
        const smokeMesh = new THREE.InstancedMesh(smokeGeo, smokeMat, smokeCount);
        const smokeSeeds = Array.from({ length: smokeCount }, (_, i) => ({
          phase: i / smokeCount,
          dx: (Math.random() - 0.5) * 0.4,
          dz: (Math.random() - 0.5) * 0.4,
          speed: 0.2 + Math.random() * 0.12,
        }));
        worldGroup.add(smokeMesh);

        // Rising gentle pixel smoke puffs from the Cottage Stone-Brick Chimney!
        const chimneySmokeCount = 14;
        const chimneySmokeMesh = new THREE.InstancedMesh(smokeGeo, smokeMat, chimneySmokeCount);
        const chimneySmokeSeeds = Array.from({ length: chimneySmokeCount }, (_, i) => ({
          phase: i / chimneySmokeCount,
          dx: (Math.random() - 0.5) * 0.26,
          dz: (Math.random() - 0.5) * 0.26,
          speed: 0.14 + Math.random() * 0.08,
        }));
        worldGroup.add(chimneySmokeMesh);
        localDisposables.push(smokeGeo, smokeMat);

        // Strategic Zone PointLights + Warm Halo Sprites on NBT Lanterns
        const zoneLights = layout.zonePointLights.map((cfg) => {
          const light = new THREE.PointLight(cfg.color, 0, cfg.distance, 1.45);
          light.position.set(...cfg.pos);
          worldGroup.add(light);
          return { light, maxIntensity: cfg.maxIntensity };
        });
        const beaconZoneLight = zoneLights[1]?.light;

        const lanternHaloMat = new THREE.SpriteMaterial({
          map: materials.sunGlowTexture,
          color: '#ffba52',
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const lanternHaloSprites = layout.lanterns.map(({ pos: [lx, ly, lz], hanging }) => {
          const sp = new THREE.Sprite(lanternHaloMat);
          sp.position.set(lx, hanging ? ly : ly - 0.25, lz);
          sp.scale.set(2.3, 2.3, 1);
          worldGroup.add(sp);
          return sp;
        });
        localDisposables.push(lanternHaloMat);

        // Nether Portal Surface & Purple Particles
        const [pcx, pcy, pcz] = layout.portalCoreCenter;
        const [pw, ph] = layout.portalCoreSize;
        const portalPlaneGeo = new THREE.PlaneGeometry(pw, ph);
        const portalPlane = new THREE.Mesh(portalPlaneGeo, materials.portalCore);
        portalPlane.position.set(pcx, pcy, pcz);
        if (layout.portalAxis === 'z') portalPlane.rotation.y = Math.PI / 2;
        worldGroup.add(portalPlane);
        localDisposables.push(portalPlaneGeo);

        const portalAmbientLight = new THREE.PointLight('#a855f7', 0.45, 18, 1.45);
        portalAmbientLight.position.set(pcx, pcy, pcz + 1.2);
        worldGroup.add(portalAmbientLight);

        const portalAmbientCount = 32;
        const portalSparkGeo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
        const portalSparkMat = new THREE.MeshBasicMaterial({ color: '#d8b4fe' });
        const portalSparkMesh = new THREE.InstancedMesh(portalSparkGeo, portalSparkMat, portalAmbientCount);
        const portalSparkSeeds = Array.from({ length: portalAmbientCount }, (_, i) => ({
          phase: i / portalAmbientCount,
          ox: (Math.random() - 0.5) * 3.1,
          oy: (Math.random() - 0.5) * 3.8,
          oz: (Math.random() - 0.5) * 1.8,
          speed: 0.42 + Math.random() * 0.35,
        }));
        worldGroup.add(portalSparkMesh);
        localDisposables.push(portalSparkGeo, portalSparkMat);

        // Drifting Pink Cherry Blossom Petals
        const petalCount = 56;
        const petalGeo = new THREE.BoxGeometry(0.18, 0.05, 0.18);
        const petalMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
        const petalMesh = new THREE.InstancedMesh(petalGeo, petalMat, petalCount);
        const petalPalette = [
          new THREE.Color('#fbcfe8'),
          new THREE.Color('#f9a8d4'),
          new THREE.Color('#fce7f3'),
          new THREE.Color('#f472b6'),
        ];
        const petalSeeds = Array.from({ length: petalCount }, (_, i) => {
          petalMesh.setColorAt(i, petalPalette[i % petalPalette.length]);
          return {
            phase: Math.random(),
            ox: (Math.random() - 0.5) * 8.5,
            oy: (Math.random() - 0.5) * 3.0,
            oz: (Math.random() - 0.5) * 8.0,
            fallSpeed: 0.075 + Math.random() * 0.055,
            swayFreq: 1.2 + Math.random() * 1.4,
            swayAmp: 0.9 + Math.random() * 1.2,
          };
        });
        if (petalMesh.instanceColor) petalMesh.instanceColor.needsUpdate = true;
        worldGroup.add(petalMesh);
        localDisposables.push(petalGeo, petalMat);

        // Waterfall White Splash Mist
        const splashCount = 42;
        const splashGeo = new THREE.BoxGeometry(0.24, 0.24, 0.24);
        const splashMat = new THREE.MeshBasicMaterial({
          color: '#f0f9ff',
          transparent: true,
          opacity: 0.86,
        });
        const splashMesh = new THREE.InstancedMesh(splashGeo, splashMat, splashCount);
        const splashSeeds = Array.from({ length: splashCount }, (_, i) => ({
          base: layout.waterfallBases[i % layout.waterfallBases.length],
          phase: i / splashCount,
          angle: Math.random() * Math.PI * 2,
          spread: 0.45 + Math.random() * 1.35,
          speed: 0.72 + Math.random() * 0.65,
        }));
        worldGroup.add(splashMesh);
        localDisposables.push(splashGeo, splashMat);

        // Voxel Creeper Easter Egg
        const creeperGroup = new THREE.Group();
        creeperGroup.position.set(...layout.creeperPos);
        creeperGroup.rotation.y = 0.62;
        creeperGroup.scale.setScalar(creeperBaseScale);

        const creeperParts: THREE.Mesh[] = [];
        const footGeo = new THREE.BoxGeometry(0.26, 0.38, 0.26);
        const footOffsets: Vec3[] = [
          [-0.14, 0.19, 0.16],
          [0.14, 0.19, 0.16],
          [-0.14, 0.19, -0.16],
          [0.14, 0.19, -0.16],
        ];
        footOffsets.forEach(([fx, fy, fz]) => {
          const foot = new THREE.Mesh(footGeo, materials.creeperBody);
          foot.position.set(fx, fy, fz);
          foot.castShadow = true;
          foot.receiveShadow = true;
          creeperGroup.add(foot);
          creeperParts.push(foot);
        });
        const torsoGeo = new THREE.BoxGeometry(0.52, 0.88, 0.34);
        const torso = new THREE.Mesh(torsoGeo, materials.creeperBody);
        torso.position.set(0, 0.8, 0);
        torso.castShadow = true;
        torso.receiveShadow = true;
        creeperGroup.add(torso);
        creeperParts.push(torso);

        const headGeo = new THREE.BoxGeometry(0.58, 0.58, 0.58);
        const creeperHead = new THREE.Mesh(headGeo, materials.creeperHead);
        creeperHead.position.set(0, 1.53, 0);
        creeperHead.castShadow = true;
        creeperHead.receiveShadow = true;
        creeperGroup.add(creeperHead);
        creeperParts.push(creeperHead);
        worldGroup.add(creeperGroup);
        localDisposables.push(footGeo, torsoGeo, headGeo);

        const explosionGeo = new THREE.BoxGeometry(0.28, 0.28, 0.28);
        const explosionMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
        const explosionMesh = new THREE.InstancedMesh(explosionGeo, explosionMat, explosionCount);
        const explosionColors = [
          new THREE.Color('#4ade80'),
          new THREE.Color('#22c55e'),
          new THREE.Color('#f8fafc'),
          new THREE.Color('#bef264'),
          new THREE.Color('#94a3b8'),
        ];
        for (let i = 0; i < explosionCount; i++) {
          explosionMesh.setColorAt(i, explosionColors[i % explosionColors.length]);
        }
        if (explosionMesh.instanceColor) explosionMesh.instanceColor.needsUpdate = true;
        explosionMesh.visible = false;
        worldGroup.add(explosionMesh);
        localDisposables.push(explosionGeo, explosionMat);

        // Motion Lab Presets
        const maxOreCrystals = 48;
        const oreCrystalGeo = new THREE.BoxGeometry(0.58, 0.58, 0.58);
        const oreCrystalMat = new THREE.MeshStandardMaterial({
          color: '#ffffff',
          emissive: '#38bdf8',
          emissiveIntensity: 0.55,
          roughness: 0.3,
          metalness: 0.25,
        });
        const oreOrbitMesh = new THREE.InstancedMesh(oreCrystalGeo, oreCrystalMat, maxOreCrystals);
        const orePalette = [
          new THREE.Color('#38bdf8'),
          new THREE.Color('#34d399'),
          new THREE.Color('#fbbf24'),
          new THREE.Color('#fb7185'),
        ];
        const oreTracks = Array.from({ length: maxOreCrystals }, (_, i) => {
          oreOrbitMesh.setColorAt(i, orePalette[i % orePalette.length]);
          return {
            radius: 31.5 + (i % 6) * 1.6,
            angle: (i / maxOreCrystals) * Math.PI * 2,
            yOffset: 14.5 + ((i % 7) - 3) * 1.6,
            tilt: ((i % 3) - 1) * 0.24,
            speedMul: 0.52 + (i % 4) * 0.16,
          };
        });
        if (oreOrbitMesh.instanceColor) oreOrbitMesh.instanceColor.needsUpdate = true;
        worldGroup.add(oreOrbitMesh);
        localDisposables.push(oreCrystalGeo, oreCrystalMat);

        const maxPortalParticles = 220;
        const portalParticleGeo = new THREE.BoxGeometry(0.28, 0.28, 0.28);
        const portalParticleMat = new THREE.MeshBasicMaterial({
          color: '#ffffff',
          transparent: true,
          opacity: 0.92,
        });
        const portalVortexMesh = new THREE.InstancedMesh(
          portalParticleGeo,
          portalParticleMat,
          maxPortalParticles,
        );
        const portalPalette = [
          new THREE.Color('#a855f7'),
          new THREE.Color('#c084fc'),
          new THREE.Color('#7e22ce'),
          new THREE.Color('#e879f9'),
          new THREE.Color('#581c87'),
        ];
        const portalTracks = Array.from({ length: maxPortalParticles }, (_, i) => {
          portalVortexMesh.setColorAt(i, portalPalette[i % portalPalette.length]);
          return {
            heightPhase: Math.random(),
            angleOffset: (i / maxPortalParticles) * Math.PI * 2 * 4,
            radiusJitter: (Math.random() - 0.5) * 2.5,
            riseSpeed: 0.16 + Math.random() * 0.14,
          };
        });
        if (portalVortexMesh.instanceColor) portalVortexMesh.instanceColor.needsUpdate = true;
        portalVortexMesh.visible = false;
        worldGroup.add(portalVortexMesh);
        localDisposables.push(portalParticleGeo, portalParticleMat);

        const maxWaveCubes = 42;
        const waveCubeGeo = new THREE.BoxGeometry(0.62, 0.62, 0.62);
        const waveCubeMat = new THREE.MeshStandardMaterial({
          color: '#ffffff',
          roughness: 0.72,
          metalness: 0.08,
        });
        const waveSatellitesMesh = new THREE.InstancedMesh(waveCubeGeo, waveCubeMat, maxWaveCubes);
        const waveColors = [
          new THREE.Color('#5da636'),
          new THREE.Color('#38bdf8'),
          new THREE.Color('#f9a8d4'),
          new THREE.Color('#fbbf24'),
        ];
        const waveSatellites = Array.from({ length: maxWaveCubes }, (_, i) => {
          waveSatellitesMesh.setColorAt(i, waveColors[i % waveColors.length]);
          const angle = (i / maxWaveCubes) * Math.PI * 2;
          const ring = 30.5 + (i % 3) * 2.0;
          return {
            x: Math.cos(angle) * ring,
            z: Math.sin(angle) * ring,
            baseY: 3.2 + (i % 4) * 1.4,
            phase: angle * 2 + i * 0.32,
          };
        });
        if (waveSatellitesMesh.instanceColor) waveSatellitesMesh.instanceColor.needsUpdate = true;
        waveSatellitesMesh.visible = false;
        worldGroup.add(waveSatellitesMesh);
        localDisposables.push(waveCubeGeo, waveCubeMat);

        // GPU Pre-Warming so first night transition, Creeper, dolphin & Motion Lab never hitch!
        sky.moonGroup.visible = true;
        shootingStars.group.visible = true;
        explosionMesh.visible = true;
        oreOrbitMesh.visible = true;
        portalVortexMesh.visible = true;
        waveSatellitesMesh.visible = true;
        renderer.initTexture(materials.moonTexture);
        renderer.initTexture(materials.moonGlowTexture);
        renderer.compile(scene, camera);
        sky.moonGroup.visible = false;
        shootingStars.group.visible = false;
        explosionMesh.visible = false;
        oreOrbitMesh.visible = motionRef.current.presets.oreOrbit;
        portalVortexMesh.visible = motionRef.current.presets.portalVortex;
        waveSatellitesMesh.visible = motionRef.current.presets.blockWave;

        mounted = {
          layout,
          worldGroup,
          instancedByType,
          meadowIndices,
          beaconMesh,
          beamInnerMesh,
          beamOuterMesh,
          beamInnerMat,
          beamOuterMat,
          lanternCoreMat: lanternSystem.coreMat,
          lanternHaloMat,
          lanternHaloSprites,
          zoneLights,
          beaconZoneLight,
          portalAmbientLight,
          boat,
          boatHitMeshes,
          wakeMesh,
          wakeDrops,
          bedSystem,
          lighthouseBeams,
          windmill,
          sheepSystem,
          beeSystem,
          dolphinSystem,
          landmarkHitboxes,
          emberMesh,
          emberSeeds,
          smokeMesh,
          smokeSeeds,
          chimneySmokeMesh,
          chimneySmokeSeeds,
          petalMesh,
          petalSeeds,
          splashMesh,
          splashSeeds,
          portalSparkMesh,
          portalSparkSeeds,
          creeperGroup,
          creeperHead,
          creeperParts,
          explosionMesh,
          oreOrbitMesh,
          oreTracks,
          portalVortexMesh,
          portalTracks,
          waveSatellitesMesh,
          waveSatellites,
          dispose: () => {
            scene.remove(worldGroup);
            boat.traverse((o) => {
              if (o instanceof THREE.Mesh) o.geometry.dispose();
            });
            campfire.traverse((o) => {
              if (o instanceof THREE.Mesh) o.geometry.dispose();
            });
            localDisposables.forEach((d) => d.dispose());
          },
        };

        introActive = true;
        introElapsed = 0;
      })
      .catch((err) => {
        console.error('Failed to load archipelago NBT structures:', err);
        window.clearTimeout(slowTimer);
        if (!disposed) setLoadingSlow(false);
      });

    // === RAYCASTING FOR BEACON, CREEPER, RED BED, OAK BOAT & SATELLITE ISLANDS ===
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDownPos: { x: number; y: number } | null = null;
    let currentHover: HoverTarget = 'none';

    const updatePointer = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const detectInteractiveHit = (): HoverTarget => {
      if (!mounted) return 'none';
      raycaster.setFromCamera(pointer, camera);

      // Highest priority: specific interactive props
      if (raycaster.intersectObject(mounted.beaconMesh, false).length > 0) return 'beacon';
      if (
        creeperState === 'idle' &&
        raycaster.intersectObjects(mounted.creeperParts, false).length > 0
      ) {
        return 'creeper';
      }
      if (raycaster.intersectObjects(mounted.bedSystem.hitTargets, false).length > 0) return 'bed';
      if (!sailingModeRef.current && raycaster.intersectObjects(mounted.boatHitMeshes, false).length > 0) {
        return 'boat';
      }

      // Satellite islands click-to-focus (only when not sailing)
      if (!sailingModeRef.current) {
        const lhBox = mounted.landmarkHitboxes.find((h) => h.id === 'lighthouse');
        if (lhBox && raycaster.intersectObject(lhBox.mesh, false).length > 0) return 'lighthouse';
        const wsBox = mounted.landmarkHitboxes.find((h) => h.id === 'workshop');
        if (wsBox && raycaster.intersectObject(wsBox.mesh, false).length > 0) return 'workshop';
      }

      return 'none';
    };

    const onPointerMove = (event: PointerEvent) => {
      updatePointer(event);
      const hit = detectInteractiveHit();
      if (hit !== currentHover) {
        currentHover = hit;
        setHoverTarget(hit);
        renderer.domElement.style.cursor = hit !== 'none' ? 'pointer' : 'grab';
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      cancelCameraAutomation();
      pointerDownPos = { x: event.clientX, y: event.clientY };
      if (currentHover === 'none') renderer.domElement.style.cursor = 'grabbing';
    };

    const onWheel = () => cancelCameraAutomation();

    const onPointerUp = (event: PointerEvent) => {
      renderer.domElement.style.cursor = currentHover !== 'none' ? 'pointer' : 'grab';
      if (!pointerDownPos) return;
      const dist = Math.hypot(event.clientX - pointerDownPos.x, event.clientY - pointerDownPos.y);
      pointerDownPos = null;
      if (dist >= 6 || !mounted) return;

      updatePointer(event);
      const hit = detectInteractiveHit();
      if (hit === 'beacon') {
        soundEngine.playUiClick();
        beaconColorIndex = (beaconColorIndex + 1) % BEACON_COLORS.length;
        beaconColorTarget.set(BEACON_COLORS[beaconColorIndex]);
        unlockRef.current('beacon-master', { forceNotify: true });
      } else if (hit === 'creeper') {
        soundEngine.playUiClick();
        creeperState = 'fuse';
        creeperTimer = 0;
        currentHover = 'none';
        setHoverTarget('none');
      } else if (hit === 'bed') {
        soundEngine.playUiClick();
        const p = ((dayPhase % 1) + 1) % 1;
        const canSleep = p >= 0.45 || p < 0.03; // Dusk or Night!
        if (!canSleep) {
          showHotbarNoticeRef.current(UI_TEXT.bedDaytimeOnly[localeRef.current], 2100);
        } else if (sleepStage === 'none') {
          sleepStage = 'fadeOut';
          sleepTimer = 0;
        }
      } else if (hit === 'boat') {
        setSailingModeRef.current(true);
        currentHover = 'none';
        setHoverTarget('none');
      } else if (hit === 'lighthouse' || hit === 'workshop') {
        const meta = mounted.layout.islands.find((i) => i.id === hit);
        if (meta) {
          soundEngine.playUiClick();
          setFocusedLandmarkRef.current(hit);
          startCameraFlyTo(
            new THREE.Vector3(...meta.focusCamPos),
            new THREE.Vector3(...meta.focusTarget),
          );
        }
      } else {
        // Also allow clicking Main Watchtower hitbox to smoothly focus Watchtower
        raycaster.setFromCamera(pointer, camera);
        const mainBox = mounted.landmarkHitboxes.find((h) => h.id === 'main');
        if (mainBox && raycaster.intersectObject(mainBox.mesh, false).length > 0 && !sailingModeRef.current) {
          const meta = mounted.layout.islands.find((i) => i.id === 'main');
          if (meta) {
            soundEngine.playUiClick();
            setFocusedLandmarkRef.current('main');
            startCameraFlyTo(
              new THREE.Vector3(...meta.focusCamPos),
              new THREE.Vector3(...meta.focusTarget),
            );
          }
        }
      }
    };

    renderer.domElement.style.cursor = 'grab';
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: true });

    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      const w = container.clientWidth;
      const h = Math.max(container.clientHeight, 1);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    // === ANIMATION LOOP ===
    const clock = new THREE.Clock();
    const dummy = new THREE.Object3D();

    const dayHemiSky = new THREE.Color('#e0f4ff');
    const sunsetHemiSky = new THREE.Color('#ffb58f');
    const nightHemiSky = new THREE.Color('#1c2e60');
    const dayHemiGround = new THREE.Color('#6b948a');
    const nightHemiGround = new THREE.Color('#0c152b');

    const dayFillCol = new THREE.Color('#daf2ff');
    const sunsetFillCol = new THREE.Color('#ffc099');
    const nightFillCol = new THREE.Color('#2c4780');

    const daySunCol = new THREE.Color('#fff7e6');
    const sunsetSunCol = new THREE.Color('#ff925c');
    const nightMoonCol = new THREE.Color('#8eb8ff');
    const dayCloudCol = new THREE.Color('#ffffff');
    const sunsetCloudCol = new THREE.Color('#ffc4a3');
    const nightCloudCol = new THREE.Color('#25335c');

    const whiteCol = new THREE.Color('#ffffff');
    const creeperFlashColor = new THREE.Color('#ffffff');
    const creeperNormalEmissive = new THREE.Color('#000000');

    const chaseCamDesired = new THREE.Vector3();
    const chaseTargetDesired = new THREE.Vector3();

    let waveWasActive = false;
    let frameId = 0;

    const spawnExplosion = (creeperPos: Vec3, explosionMesh: THREE.InstancedMesh) => {
      explosionParticles.length = 0;
      const origin = new THREE.Vector3(creeperPos[0], creeperPos[1] + 1.0, creeperPos[2]);
      for (let i = 0; i < explosionCount; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const spd = 3.4 + Math.random() * 6.0;
        explosionParticles.push({
          pos: origin.clone().add(
            new THREE.Vector3(
              (Math.random() - 0.5) * 0.6,
              (Math.random() - 0.5) * 1.0,
              (Math.random() - 0.5) * 0.6,
            ),
          ),
          vel: new THREE.Vector3(
            Math.sin(phi) * Math.cos(theta) * spd,
            Math.abs(Math.cos(phi)) * spd + 2.8,
            Math.sin(phi) * Math.sin(theta) * spd,
          ),
          rot: new THREE.Euler(Math.random() * 3, Math.random() * 3, Math.random() * 3),
          rotSpeed: new THREE.Vector3(
            (Math.random() - 0.5) * 8,
            (Math.random() - 0.5) * 8,
            (Math.random() - 0.5) * 8,
          ),
          scale: 0.75 + Math.random() * 0.9,
          life: 0,
          maxLife: 1.1 + Math.random() * 0.55,
        });
      }
      explosionMesh.visible = true;
      cameraShake = 0.36;
      unlockRef.current('creeper', { forceNotify: true });
    };

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.elapsedTime;
      const { presets, speed, density } = motionRef.current;

      // Handle HUD Camera Focus Commands (e.g. "返回全景 / Overview")
      const cmd = cameraCommandRef.current;
      if (cmd && cmd.seq !== lastHandledCameraSeq) {
        lastHandledCameraSeq = cmd.seq;
        if (cmd.target === 'overview') {
          startCameraFlyTo(heroPos, heroTarget);
        } else if (mounted) {
          const meta = mounted.layout.islands.find((i) => i.id === cmd.target);
          if (meta) {
            startCameraFlyTo(
              new THREE.Vector3(...meta.focusCamPos),
              new THREE.Vector3(...meta.focusTarget),
            );
          }
        }
      }

      // Handle Slot 4 Instant Day / Night Jump
      if (timeJumpSignalRef.current.seq !== lastHandledTimeJumpSeq) {
        lastHandledTimeJumpSeq = timeJumpSignalRef.current.seq;
        timeJumpTargetPhase = timeJumpSignalRef.current.to === 'night' ? 0.75 : 0.25;
      }

      // Natural Time Flow + Fast-Forward Jump + Vanilla Red Bed Sleep Sequence
      if (sleepStage === 'fadeOut') {
        sleepTimer += dt;
        const t = Math.min(1, sleepTimer / 0.85);
        setSleepFadeRef.current(t);
        if (t >= 1) {
          sleepStage = 'hold';
          sleepTimer = 0;
          // Jump smoothly to crisp warm Dawn sunrise!
          dayPhase = 0.065;
          timeJumpTargetPhase = null;
        }
      } else if (sleepStage === 'hold') {
        sleepTimer += dt;
        if (sleepTimer >= 0.35) {
          sleepStage = 'fadeIn';
          sleepTimer = 0;
          unlockRef.current('sweet-dreams');
        }
      } else if (sleepStage === 'fadeIn') {
        sleepTimer += dt;
        const t = Math.min(1, sleepTimer / 0.9);
        setSleepFadeRef.current(1 - t);
        if (t >= 1) {
          sleepStage = 'none';
          setSleepFadeRef.current(0);
        }
      } else if (timeJumpTargetPhase !== null) {
        // Shortest circular arc toward target noon/midnight
        let diff = timeJumpTargetPhase - dayPhase;
        if (diff > 0.5) diff -= 1;
        if (diff < -0.5) diff += 1;
        const step = dt * 0.42;
        if (Math.abs(diff) <= step) {
          dayPhase = timeJumpTargetPhase;
          timeJumpTargetPhase = null;
        } else {
          dayPhase = (dayPhase + Math.sign(diff) * step + 1) % 1;
        }
      } else {
        // Continuous vanilla time passage (~3.5 minutes per full day-night cycle)
        dayPhase = (dayPhase + dt / FULL_DAY_SECONDS) % 1;
      }

      // 0. Camera Automation (Intro Fly-In / Landmark Fly-To / Boat Chase-Cam)
      if (sailingModeRef.current && mounted) {
        introActive = false;
        flyActive = false;
        controls.enabled = false;
      } else {
        controls.enabled = true;
        if (introActive) {
          introElapsed += dt;
          const rawT = Math.min(1, introElapsed / introDuration);
          const eased = 1 - Math.pow(1 - rawT, 3);
          const startAngle = Math.atan2(introStartPos.z, introStartPos.x);
          const endAngle = Math.atan2(heroPos.z, heroPos.x);
          const startR = Math.hypot(introStartPos.x, introStartPos.z);
          const endR = Math.hypot(heroPos.x, heroPos.z);
          const currAngle = THREE.MathUtils.lerp(startAngle, endAngle, eased);
          const currR = THREE.MathUtils.lerp(startR, endR, eased);
          const currY = THREE.MathUtils.lerp(introStartPos.y, heroPos.y, eased);

          camera.position.set(Math.cos(currAngle) * currR, currY, Math.sin(currAngle) * currR);
          controls.target.lerpVectors(introStartTarget, heroTarget, eased);

          if (rawT >= 1) {
            introActive = false;
            camera.position.copy(heroPos);
            controls.target.copy(heroTarget);
            controls.autoRotate = true;
          }
        } else if (flyActive) {
          flyElapsed += dt;
          const rawT = Math.min(1, flyElapsed / flyDuration);
          const eased = 1 - Math.pow(1 - rawT, 3);
          camera.position.lerpVectors(flyStartPos, flyEndPos, eased);
          controls.target.lerpVectors(flyStartTarget, flyEndTarget, eased);
          if (rawT >= 1) {
            flyActive = false;
            camera.position.copy(flyEndPos);
            controls.target.copy(flyEndTarget);
          }
        }
      }

      // 1. Continuous Dawn -> Day -> Dusk -> Night Sky & Ocean
      const { sunsetFactor, nightFactor, phase, activeCelestialDir, activeCelestialColor } =
        sky.update(dayPhase, elapsed);
      syncTimePhaseRef.current(phase);
      const nightGlow = THREE.MathUtils.smoothstep(nightFactor, 0.08, 0.72);

      beaconColorCurrent.lerp(beaconColorTarget, Math.min(1, dt * 7.5));
      fog.color.copy(sky.horizonColor);
      ocean.update({
        elapsed,
        nightFactor,
        sunsetFactor,
        celestialDir: activeCelestialDir,
        celestialColor: activeCelestialColor,
        fogColor: sky.horizonColor,
        zenithColor: sky.zenithColor,
        beaconColor: beaconColorCurrent,
      });

      islandWater.update({
        elapsed,
        nightFactor,
        sunsetFactor,
        celestialDir: activeCelestialDir,
        celestialColor: activeCelestialColor,
        fogColor: sky.horizonColor,
        zenithColor: sky.zenithColor,
      });

      shootingStars.update(dt, nightFactor);

      const sunAbove = Math.max(0, sky.sunDirection.y);
      const moonAbove = Math.max(0, sky.moonDirection.y);
      if (sunAbove >= moonAbove) {
        celestialLight.position.set(
          sky.sunDirection.x * 54,
          Math.max(22, sky.sunDirection.y * 115 + 18),
          sky.sunDirection.z * 54,
        );
        celestialLight.intensity = THREE.MathUtils.smoothstep(sunAbove, 0.01, 0.14) * 1.92;
        celestialLight.color.copy(daySunCol).lerp(sunsetSunCol, sunsetFactor);
      } else {
        celestialLight.position.set(
          sky.moonDirection.x * 54,
          Math.max(22, sky.moonDirection.y * 115 + 18),
          sky.moonDirection.z * 54,
        );
        celestialLight.intensity = THREE.MathUtils.smoothstep(moonAbove, 0.01, 0.14) * 0.56;
        celestialLight.color.copy(nightMoonCol);
      }

      hemiLight.color
        .copy(dayHemiSky)
        .lerp(sunsetHemiSky, sunsetFactor * 0.6)
        .lerp(nightHemiSky, nightFactor);
      hemiLight.groundColor.copy(dayHemiGround).lerp(nightHemiGround, nightFactor);
      hemiLight.intensity = THREE.MathUtils.lerp(1.12, 0.36, nightFactor);

      fillLight.color
        .copy(dayFillCol)
        .lerp(sunsetFillCol, sunsetFactor * 0.55)
        .lerp(nightFillCol, nightFactor);
      fillLight.intensity = THREE.MathUtils.lerp(0.44, 0.14, nightFactor);

      materials.cloud.color
        .copy(dayCloudCol)
        .lerp(sunsetCloudCol, sunsetFactor * 0.72)
        .lerp(nightCloudCol, nightFactor);
      cloudClusters.forEach((c) => {
        c.mesh.position.x += c.speed * dt * (0.7 + speed * 0.3);
        if (c.mesh.position.x > 115) c.mesh.position.x = -115;
        c.mesh.position.y = c.baseY + Math.sin(elapsed * 0.45 + c.phase) * 0.4;
      });

      // Animate mounted 3-Island Archipelago World
      if (mounted) {
        const w = mounted;
        const { layout } = w;

        // Beacon beam & emissives
        w.beamInnerMat.color.copy(beaconColorCurrent).lerp(whiteCol, 0.45);
        w.beamOuterMat.color.copy(beaconColorCurrent);
        materials.beaconBlock.emissive.copy(beaconColorCurrent);
        if (w.beaconZoneLight) w.beaconZoneLight.color.copy(beaconColorCurrent);

        w.beamInnerMesh.rotation.y = elapsed * 1.45;
        w.beamOuterMesh.rotation.y = -elapsed * 0.82;
        w.beamInnerMat.opacity = THREE.MathUtils.lerp(0.72, 0.92, nightGlow);
        w.beamOuterMat.opacity = THREE.MathUtils.lerp(0.24, 0.44, nightGlow);

        materials.windowGlass.emissiveIntensity = THREE.MathUtils.lerp(0.06, 1.42, nightGlow);
        materials.furnaceFront.emissiveIntensity = THREE.MathUtils.lerp(0.15, 1.35, nightGlow);
        materials.seaLantern.emissiveIntensity = THREE.MathUtils.lerp(0.95, 2.2, nightGlow);
        w.lanternCoreMat.emissiveIntensity = THREE.MathUtils.lerp(0.35, 1.85, nightGlow);
        materials.cryingObsidian.emissiveIntensity = THREE.MathUtils.lerp(0.25, 1.15, nightGlow);
        materials.beaconBlock.emissiveIntensity = THREE.MathUtils.lerp(0.95, 1.65, nightGlow);
        materials.diamondOre.emissiveIntensity = THREE.MathUtils.lerp(0.06, 0.28, nightGlow);
        materials.goldOre.emissiveIntensity = THREE.MathUtils.lerp(0.04, 0.2, nightGlow);

        w.zoneLights.forEach(({ light, maxIntensity }, i) => {
          const flicker = i === 1 || i === 4 ? 1.0 : 0.92 + Math.sin(elapsed * 8.2 + i * 2.1) * 0.08;
          light.intensity = nightGlow * maxIntensity * flicker;
        });
        w.lanternHaloMat.opacity = nightGlow * 0.72;
        w.lanternHaloSprites.forEach((sp, i) => {
          const s = 2.3 + Math.sin(elapsed * 5.2 + i * 1.3) * 0.22;
          sp.scale.set(s, s, 1);
        });

        const vortexBoost = presets.portalVortex
          ? (2.6 + Math.sin(elapsed * 4.5 * speed) * 0.6) * (0.6 + density * 0.6)
          : 0;
        w.portalAmbientLight.intensity =
          THREE.MathUtils.lerp(0.45, 5.2, nightGlow) * (0.9 + Math.sin(elapsed * 3.8) * 0.1) +
          vortexBoost;
        w.portalAmbientLight.distance = presets.portalVortex ? 26 : 18;

        // === V0.5 LIVING WORLD UPDATES ===
        w.lighthouseBeams.update(elapsed, nightFactor, sunsetFactor);
        w.windmill.update(dt, elapsed);
        w.sheepSystem.update(dt, elapsed);
        w.beeSystem.update(elapsed);
        w.dolphinSystem.update(dt, elapsed, () => soundEngine.playSplash());

        // === PLAYABLE WASD OAK BOAT SAILING & WAKE FOAM ===
        if (sailingModeRef.current) {
          const turnRate = 1.95;
          const steerDir = (sailKeys.left ? 1 : 0) - (sailKeys.right ? 1 : 0);
          boatYaw += steerDir * turnRate * dt;

          const accel = 13.5;
          if (sailKeys.forward) boatSpeed += accel * dt;
          else if (sailKeys.back) boatSpeed -= accel * 0.65 * dt;
          else boatSpeed *= Math.pow(0.18, dt);

          boatSpeed = THREE.MathUtils.clamp(boatSpeed, -4.5, 11.5);
          boatPos.x += Math.sin(boatYaw) * boatSpeed * dt;
          boatPos.z += Math.cos(boatYaw) * boatSpeed * dt;

          // Keep boat inside expanded ocean boundary
          const radial = Math.hypot(boatPos.x, boatPos.z);
          if (radial > 112) {
            boatPos.x = (boatPos.x / radial) * 112;
            boatPos.z = (boatPos.z / radial) * 112;
            boatSpeed *= 0.7;
          }

          // Smooth circle collision pushout against all 3 islands + proximity discovery
          let detected: 'lighthouse' | 'workshop' | null = null;
          for (const isle of layout.islands) {
            const dx = boatPos.x - isle.center[0];
            const dz = boatPos.z - isle.center[1];
            const d = Math.hypot(dx, dz);
            if (d < isle.collisionRadius && d > 0.001) {
              boatPos.x = isle.center[0] + (dx / d) * isle.collisionRadius;
              boatPos.z = isle.center[1] + (dz / d) * isle.collisionRadius;
              boatSpeed *= 0.72;
            }
            if ((isle.id === 'lighthouse' || isle.id === 'workshop') && d < isle.detectRadius) {
              detected = isle.id;
            }
          }
          if (detected !== lastNearby) {
            lastNearby = detected;
            setNearbyLandmarkRef.current(detected);
            if (detected) {
              unlockRef.current('sea-explorer');
            }
          }

          // Spawn stern white foam wake while moving
          if (Math.abs(boatSpeed) > 0.8) {
            wakeCooldown -= dt;
            if (wakeCooldown <= 0) {
              wakeCooldown = 0.055;
              const sternX = boatPos.x - Math.sin(boatYaw) * 1.35 + (Math.random() - 0.5) * 0.7;
              const sternZ = boatPos.z - Math.cos(boatYaw) * 1.35 + (Math.random() - 0.5) * 0.7;
              if (w.wakeDrops.length < 36) {
                w.wakeDrops.push({
                  pos: new THREE.Vector3(sternX, 0.5, sternZ),
                  life: 0,
                  maxLife: 1.05,
                  size: 0.9 + Math.random() * 0.55,
                });
              }
            }
          }

          // Smooth 3rd-person chase camera behind & slightly above the oak boat
          const camDist = 11.5;
          const camHeight = 5.4;
          chaseCamDesired.set(
            boatPos.x - Math.sin(boatYaw) * camDist,
            camHeight,
            boatPos.z - Math.cos(boatYaw) * camDist,
          );
          chaseTargetDesired.set(
            boatPos.x + Math.sin(boatYaw) * 4.2,
            1.6,
            boatPos.z + Math.cos(boatYaw) * 4.2,
          );
          camera.position.lerp(chaseCamDesired, Math.min(1, dt * 4.6));
          controls.target.lerp(chaseTargetDesired, Math.min(1, dt * 6.0));
          camera.lookAt(controls.target);

          w.boat.position.set(
            boatPos.x,
            layout.boatAnchor[1] + Math.sin(elapsed * 2.4) * 0.09,
            boatPos.z,
          );
          w.boat.rotation.y = boatYaw;
          w.boat.rotation.z = -steerDir * 0.1 + Math.sin(elapsed * 1.9) * 0.045;
          w.boat.rotation.x = -boatSpeed * 0.012 + Math.cos(elapsed * 1.5) * 0.035;
        } else {
          // Gentle moored bobbing (keeps boat wherever player sailed it!)
          boatSpeed *= Math.pow(0.1, dt);
          w.boat.position.set(
            boatPos.x,
            layout.boatAnchor[1] + Math.sin(elapsed * 1.6 + 0.5) * 0.1,
            boatPos.z,
          );
          w.boat.rotation.y = boatYaw;
          w.boat.rotation.z = Math.sin(elapsed * 1.35) * 0.055;
          w.boat.rotation.x = Math.cos(elapsed * 1.15) * 0.04;
        }

        // Update boat wake foam instances
        let activeWake = 0;
        for (let i = w.wakeDrops.length - 1; i >= 0; i--) {
          const drop = w.wakeDrops[i];
          drop.life += dt;
          if (drop.life >= drop.maxLife) {
            w.wakeDrops.splice(i, 1);
            continue;
          }
          const t = drop.life / drop.maxLife;
          const scale = (1 - t) * drop.size * (1 + t * 0.8);
          dummy.position.copy(drop.pos);
          dummy.rotation.set(0, drop.life * 1.5, 0);
          dummy.scale.set(scale, 0.8, scale);
          dummy.updateMatrix();
          w.wakeMesh.setMatrixAt(activeWake++, dummy.matrix);
        }
        w.wakeMesh.count = activeWake;
        w.wakeMesh.instanceMatrix.needsUpdate = true;

        // Campfire sparks & smoke
        w.emberSeeds.forEach((e, idx) => {
          const p = (e.phase + elapsed * e.speed) % 1;
          dummy.position.set(
            layout.campfirePos[0] + e.dx * (1 + p * 0.9) + Math.sin(elapsed * 4 + idx) * 0.1,
            layout.campfirePos[1] - 0.15 + p * 2.6,
            layout.campfirePos[2] + e.dz * (1 + p * 0.9),
          );
          dummy.scale.setScalar(Math.max(0.05, Math.sin(p * Math.PI) * 1.15));
          dummy.rotation.set(elapsed * 2, elapsed * 3, idx);
          dummy.updateMatrix();
          w.emberMesh.setMatrixAt(idx, dummy.matrix);
        });
        w.emberMesh.instanceMatrix.needsUpdate = true;

        w.smokeSeeds.forEach((s, idx) => {
          const p = (s.phase + elapsed * s.speed) % 1;
          dummy.position.set(
            layout.campfirePos[0] + s.dx + p * 0.85,
            layout.campfirePos[1] + 0.4 + p * 4.6,
            layout.campfirePos[2] + s.dz + Math.sin(elapsed * 1.3 + idx) * 0.2,
          );
          dummy.scale.setScalar(Math.max(0.04, Math.sin(p * Math.PI) * (0.8 + p * 1.1)));
          dummy.rotation.set(elapsed * 0.4, elapsed * 0.5 + idx, 0);
          dummy.updateMatrix();
          w.smokeMesh.setMatrixAt(idx, dummy.matrix);
        });
        w.smokeMesh.instanceMatrix.needsUpdate = true;

        // Cottage Stone-Brick Chimney Rising Smoke
        const [chTopX, chTopY, chTopZ] = layout.chimneyTopPos;
        w.chimneySmokeSeeds.forEach((s, idx) => {
          const p = (s.phase + elapsed * s.speed) % 1;
          dummy.position.set(
            chTopX + s.dx + p * 1.85 + Math.sin(elapsed * 0.9 + idx) * 0.22,
            chTopY + p * 5.8,
            chTopZ + s.dz + p * 0.65,
          );
          dummy.scale.setScalar(Math.max(0.04, Math.sin(p * Math.PI) * (0.9 + p * 1.45)));
          dummy.rotation.set(elapsed * 0.35, elapsed * 0.45 + idx, 0);
          dummy.updateMatrix();
          w.chimneySmokeMesh.setMatrixAt(idx, dummy.matrix);
        });
        w.chimneySmokeMesh.instanceMatrix.needsUpdate = true;

        // Drifting pink Sakura petals
        const [chX, chY, chZ] = layout.cherryCanopyCenter;
        w.petalSeeds.forEach((pt, idx) => {
          const p = (pt.phase + elapsed * pt.fallSpeed) % 1;
          const swayX = Math.sin(elapsed * pt.swayFreq + idx) * pt.swayAmp + p * 3.8;
          const swayZ = Math.cos(elapsed * pt.swayFreq * 0.85 + idx) * pt.swayAmp * 0.75 + p * 1.8;
          dummy.position.set(chX + pt.ox + swayX, chY + pt.oy - p * 11.0, chZ + pt.oz + swayZ);
          dummy.rotation.set(elapsed * 1.6 + idx, elapsed * 2.2, Math.sin(elapsed * 2 + idx));
          dummy.scale.setScalar(Math.max(0.05, Math.sin(p * Math.PI) * 1.15));
          dummy.updateMatrix();
          w.petalMesh.setMatrixAt(idx, dummy.matrix);
        });
        w.petalMesh.instanceMatrix.needsUpdate = true;

        // Waterfall scrolling & white splash mist
        if (materials.waterfall.map) materials.waterfall.map.offset.y = (elapsed * 0.9) % 1;
        w.splashSeeds.forEach((sp, idx) => {
          const p = (sp.phase + elapsed * sp.speed) % 1;
          const arcY = Math.sin(p * Math.PI) * 1.3;
          const r = p * sp.spread;
          dummy.position.set(
            sp.base[0] + Math.cos(sp.angle) * r,
            sp.base[1] + arcY,
            sp.base[2] + Math.sin(sp.angle) * r,
          );
          dummy.scale.setScalar(Math.max(0.05, (1 - p) * 1.2));
          dummy.rotation.set(elapsed * 2 + idx, elapsed * 1.5, 0);
          dummy.updateMatrix();
          w.splashMesh.setMatrixAt(idx, dummy.matrix);
        });
        w.splashMesh.instanceMatrix.needsUpdate = true;

        // Nether Portal shimmer & purple sparks
        const [pcx, pcy, pcz] = layout.portalCoreCenter;
        materials.portalCore.opacity = 0.74 + Math.sin(elapsed * 4.2) * 0.12;
        w.portalSparkSeeds.forEach((ps, idx) => {
          const p = (ps.phase + elapsed * ps.speed) % 1;
          const swirl = elapsed * 2.2 + idx;
          dummy.position.set(
            pcx + ps.ox * (1 - p * 0.45) + Math.cos(swirl) * 0.3,
            pcy + ps.oy * (1 - p * 0.4) + Math.sin(p * Math.PI) * 0.6,
            pcz + ps.oz + Math.sin(swirl) * 0.4,
          );
          dummy.scale.setScalar(Math.max(0.04, Math.sin(p * Math.PI) * 1.15));
          dummy.rotation.set(elapsed * 2, swirl, 0);
          dummy.updateMatrix();
          w.portalSparkMesh.setMatrixAt(idx, dummy.matrix);
        });
        w.portalSparkMesh.instanceMatrix.needsUpdate = true;

        // Creeper Easter Egg
        if (creeperState === 'idle') {
          w.creeperGroup.visible = true;
          w.creeperGroup.scale.set(
            creeperBaseScale,
            creeperBaseScale * (1 + Math.sin(elapsed * 2.8) * 0.025),
            creeperBaseScale,
          );
          w.creeperHead.rotation.y = Math.sin(elapsed * 1.25) * 0.38;
          materials.creeperBody.emissive.copy(creeperNormalEmissive);
          materials.creeperHead.forEach((m) => m.emissive.copy(creeperNormalEmissive));
        } else if (creeperState === 'fuse') {
          creeperTimer += dt;
          const flashOn = Math.floor(creeperTimer * 18) % 2 === 0;
          const swell = creeperBaseScale * (1 + Math.sin(creeperTimer * 28) * 0.1 + creeperTimer * 0.32);
          w.creeperGroup.scale.set(swell, swell * 0.96, swell);
          const emissive = flashOn ? creeperFlashColor : creeperNormalEmissive;
          const intensity = flashOn ? 0.95 : 0;
          materials.creeperBody.emissive.copy(emissive);
          materials.creeperBody.emissiveIntensity = intensity;
          materials.creeperHead.forEach((m) => {
            m.emissive.copy(emissive);
            m.emissiveIntensity = intensity;
          });
          if (creeperTimer >= 0.65) {
            creeperState = 'exploded';
            creeperTimer = 0;
            w.creeperGroup.visible = false;
            materials.creeperBody.emissive.copy(creeperNormalEmissive);
            materials.creeperBody.emissiveIntensity = 0;
            materials.creeperHead.forEach((m) => {
              m.emissive.copy(creeperNormalEmissive);
              m.emissiveIntensity = 0;
            });
            spawnExplosion(layout.creeperPos, w.explosionMesh);
          }
        } else if (creeperState === 'exploded') {
          creeperTimer += dt;
          let aliveCount = 0;
          explosionParticles.forEach((p, idx) => {
            p.life += dt;
            if (p.life < p.maxLife) {
              aliveCount++;
              p.vel.y -= 10.5 * dt;
              p.pos.addScaledVector(p.vel, dt);
              p.rot.x += p.rotSpeed.x * dt;
              p.rot.y += p.rotSpeed.y * dt;
              const shrink = Math.max(0.01, (1 - p.life / p.maxLife) * p.scale);
              dummy.position.copy(p.pos);
              dummy.rotation.copy(p.rot);
              dummy.scale.setScalar(shrink);
            } else {
              dummy.scale.setScalar(0);
            }
            dummy.updateMatrix();
            w.explosionMesh.setMatrixAt(idx, dummy.matrix);
          });
          w.explosionMesh.instanceMatrix.needsUpdate = true;
          if (aliveCount === 0) w.explosionMesh.visible = false;
          if (creeperTimer >= 2.3) {
            creeperState = 'respawn';
            creeperTimer = 0;
            w.creeperGroup.visible = true;
          }
        } else if (creeperState === 'respawn') {
          creeperTimer += dt;
          const tNorm = Math.min(1, creeperTimer / 0.45);
          const bounce = 1 + Math.sin(tNorm * Math.PI) * 0.22;
          w.creeperGroup.scale.setScalar(Math.max(0.01, Math.min(1.18, tNorm * bounce) * creeperBaseScale));
          if (tNorm >= 1) {
            w.creeperGroup.scale.setScalar(creeperBaseScale);
            creeperState = 'idle';
          }
        }

        // Motion Lab Presets
        w.oreOrbitMesh.visible = presets.oreOrbit;
        if (presets.oreOrbit) {
          const activeCount = Math.max(8, Math.round(8 + density * (w.oreTracks.length - 8)));
          w.oreOrbitMesh.count = activeCount;
          for (let i = 0; i < activeCount; i++) {
            const track = w.oreTracks[i];
            const a = track.angle + elapsed * 0.42 * speed * track.speedMul;
            dummy.position.set(
              Math.cos(a) * track.radius,
              track.yOffset + Math.sin(a * 2 + i) * 1.4 + Math.cos(a) * track.tilt * 3.5,
              Math.sin(a) * track.radius,
            );
            dummy.rotation.set(elapsed * speed + i, elapsed * 1.2 * speed, i * 0.4);
            dummy.scale.setScalar(0.85 + Math.sin(elapsed * 3 * speed + i) * 0.18);
            dummy.updateMatrix();
            w.oreOrbitMesh.setMatrixAt(i, dummy.matrix);
          }
          w.oreOrbitMesh.instanceMatrix.needsUpdate = true;
        }

        w.portalVortexMesh.visible = presets.portalVortex;
        if (presets.portalVortex) {
          const activeCount = Math.max(40, Math.round(40 + density * (w.portalTracks.length - 40)));
          w.portalVortexMesh.count = activeCount;
          for (let i = 0; i < activeCount; i++) {
            const tr = w.portalTracks[i];
            const hPhase = (tr.heightPhase + elapsed * tr.riseSpeed * speed) % 1;
            const y = 3.0 + hPhase * 22.0;
            const radius = (4.8 + hPhase * 10.5) + tr.radiusJitter * (1 - hPhase * 0.35);
            const swirlAngle = tr.angleOffset + elapsed * 2.1 * speed + hPhase * 4.8;
            dummy.position.set(
              pcx + Math.cos(swirlAngle) * radius,
              y,
              pcz + Math.sin(swirlAngle) * radius,
            );
            dummy.rotation.set(swirlAngle, elapsed * 2.4 * speed, hPhase * Math.PI);
            dummy.scale.setScalar(Math.max(0.05, Math.sin(hPhase * Math.PI) * 1.4));
            dummy.updateMatrix();
            w.portalVortexMesh.setMatrixAt(i, dummy.matrix);
          }
          w.portalVortexMesh.instanceMatrix.needsUpdate = true;
        }

        w.waveSatellitesMesh.visible = presets.blockWave;
        const grassMesh = w.instancedByType.grass;
        if (presets.blockWave && grassMesh) {
          waveWasActive = true;
          const amp = 0.12 + density * 0.22;
          for (let i = 0; i < w.meadowIndices.length; i++) {
            const item = w.meadowIndices[i];
            const [gx, gy, gz] = item.pos;
            const waveY = Math.sin(gx * 0.36 + gz * 0.32 + elapsed * 2.7 * speed) * amp;
            dummy.position.set(gx, gy + waveY, gz);
            dummy.rotation.set(0, 0, 0);
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();
            grassMesh.setMatrixAt(item.idx, dummy.matrix);
          }
          grassMesh.instanceMatrix.needsUpdate = true;

          const activeSat = Math.max(12, Math.round(12 + density * (w.waveSatellites.length - 12)));
          w.waveSatellitesMesh.count = activeSat;
          for (let i = 0; i < activeSat; i++) {
            const sat = w.waveSatellites[i];
            const bob = Math.sin(elapsed * 2.4 * speed + sat.phase) * (0.9 + density * 0.7);
            dummy.position.set(sat.x, sat.baseY + bob, sat.z);
            dummy.rotation.set(elapsed * 0.6 * speed + i, elapsed * 0.8 * speed, 0);
            dummy.scale.setScalar(0.88 + Math.sin(elapsed * 2.2 * speed + i) * 0.16);
            dummy.updateMatrix();
            w.waveSatellitesMesh.setMatrixAt(i, dummy.matrix);
          }
          w.waveSatellitesMesh.instanceMatrix.needsUpdate = true;
        } else if (waveWasActive && grassMesh) {
          waveWasActive = false;
          for (let i = 0; i < w.meadowIndices.length; i++) {
            const item = w.meadowIndices[i];
            dummy.position.set(item.pos[0], item.pos[1], item.pos[2]);
            dummy.rotation.set(0, 0, 0);
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();
            grassMesh.setMatrixAt(item.idx, dummy.matrix);
          }
          grassMesh.instanceMatrix.needsUpdate = true;
        }
      }

      if (!sailingModeRef.current) {
        controls.update();
      }

      if (cameraShake > 0.005) {
        camera.position.x += (Math.random() - 0.5) * cameraShake;
        camera.position.y += (Math.random() - 0.5) * cameraShake;
        cameraShake *= 0.87;
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      disposed = true;
      window.clearTimeout(slowTimer);
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      controls.removeEventListener('start', onControlStart);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      controls.dispose();
      mounted?.dispose();
      cloudVoxelGeo.dispose();
      sky.dispose();
      ocean.dispose();
      islandWater.dispose();
      shootingStars.dispose();
      materials.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const hoverLabel =
    hoverTarget === 'creeper'
      ? UI_TEXT.creeperHint[locale]
      : hoverTarget === 'beacon'
        ? UI_TEXT.beaconHint[locale]
        : hoverTarget === 'boat'
          ? UI_TEXT.boatHint[locale]
          : hoverTarget === 'bed'
            ? UI_TEXT.bedHint[locale]
            : hoverTarget === 'lighthouse'
              ? UI_TEXT.lighthouseHint[locale]
              : hoverTarget === 'workshop'
                ? UI_TEXT.workshopHint[locale]
                : null;

  return (
    <>
      <div
        ref={containerRef}
        className="scene-root"
        role="img"
        aria-label={
          locale === 'zh'
            ? '3D 星海群岛：主岛圣地、海崖灯塔岛与风车工坊岛'
            : '3D Starlight Archipelago: Sanctuary, Cliff Lighthouse & Windmill Workshop Isles'
        }
      />
      {loadingSlow && (
        <div className="creeper-hover-pill" role="status">
          {locale === 'zh' ? '正在加载星海群岛结构...' : 'Loading Starlight Archipelago NBTs...'}
        </div>
      )}
      {hoverLabel && (
        <div className="creeper-hover-pill" role="status">
          {hoverLabel}
        </div>
      )}
    </>
  );
}
