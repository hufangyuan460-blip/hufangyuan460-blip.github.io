import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useWorld } from '../context/WorldContext';
import { UI_TEXT } from '../i18n';
import { buildIslandLayout, type SolidBlockType, type Vec3 } from './islandLayout';
import { createOceanSystem, createSkySystem } from './skyAndOcean';
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
  const hullGeo = new THREE.BoxGeometry(1.5, 0.24, 2.5);
  const hull = new THREE.Mesh(hullGeo, plankMat);
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

  const seatGeo = new THREE.BoxGeometry(1.2, 0.12, 0.36);
  const seat = new THREE.Mesh(seatGeo, logMat);
  seat.position.set(0, 0.34, -0.1);
  boat.add(seat);

  const oarGeo = new THREE.BoxGeometry(0.1, 0.08, 1.5);
  const oar = new THREE.Mesh(oarGeo, logMat);
  oar.position.set(0.32, 0.46, 0.2);
  oar.rotation.y = 0.24;
  boat.add(oar);

  return boat;
}

function createCampfireGroup(
  logMat: THREE.Material,
  emberMat: THREE.Material,
  stoneMat: THREE.Material,
): THREE.Group {
  const group = new THREE.Group();

  // Crossed charred logs
  const logGeo = new THREE.BoxGeometry(0.92, 0.2, 0.22);
  for (let i = 0; i < 4; i++) {
    const log = new THREE.Mesh(logGeo, logMat);
    log.position.y = 0.1 + (i >= 2 ? 0.14 : 0);
    log.rotation.y = (i * Math.PI) / 4 + 0.2;
    log.castShadow = true;
    group.add(log);
  }

  // Glowing ember core
  const emberGeo = new THREE.BoxGeometry(0.46, 0.22, 0.46);
  const ember = new THREE.Mesh(emberGeo, emberMat);
  ember.position.y = 0.16;
  group.add(ember);

  // Small stone ring around hearth
  const rockGeo = new THREE.BoxGeometry(0.26, 0.18, 0.26);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const rock = new THREE.Mesh(rockGeo, stoneMat);
    rock.position.set(Math.cos(a) * 0.62, 0.09, Math.sin(a) * 0.62);
    rock.rotation.y = a;
    group.add(rock);
  }

  return group;
}

export function OverworldScene() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { timeOfDay, motion, unlockAchievement, locale } = useWorld();
  const [hoveringCreeper, setHoveringCreeper] = useState(false);

  const timeOfDayRef = useRef(timeOfDay);
  timeOfDayRef.current = timeOfDay;

  const motionRef = useRef(motion);
  motionRef.current = motion;

  const unlockRef = useRef(unlockAchievement);
  unlockRef.current = unlockAchievement;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const fog = new THREE.Fog('#d2f0ff', 64, 166);
    scene.fog = fog;

    // Closer hero framing (~20% closer): cottage, pier, waterfall, portal & Creeper take center stage
    const camera = new THREE.PerspectiveCamera(
      48,
      container.clientWidth / Math.max(container.clientHeight, 1),
      0.2,
      360,
    );
    camera.position.set(20.2, 14.5, 22.6);

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
    controls.minDistance = 13;
    controls.maxDistance = 64;
    // Strictly keep camera above sea level so dragging never clips underwater
    controls.minPolarAngle = Math.PI * 0.14;
    controls.maxPolarAngle = Math.PI * 0.455;
    controls.target.set(-0.4, 4.5, 1.0);
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.22;

    const onControlStart = () => {
      controls.autoRotate = false;
    };
    controls.addEventListener('start', onControlStart);

    // === MATERIALS (MAX ANISOTROPY), SKY DOME, SUN/MOON RIG & CIRCULAR OCEAN ===
    const materials = createVoxelMaterialPack(renderer.capabilities.getMaxAnisotropy());

    const sky = createSkySystem({
      sunTexture: materials.sunTexture,
      sunGlowTexture: materials.sunGlowTexture,
      moonTexture: materials.moonTexture,
      moonGlowTexture: materials.moonGlowTexture,
    });
    scene.add(sky.dome, sky.sunGroup, sky.moonGroup);

    const ocean = createOceanSystem();
    scene.add(ocean.mesh);

    // === LUMINOUS DAY / NIGHT LIGHTING RIG ===
    const hemiLight = new THREE.HemisphereLight('#dcf3ff', '#74a096', 1.14);
    scene.add(hemiLight);

    // Subtle front-right sea-reflection bounce fill so cottage facade, pier & foliage never crush to black
    const fillLight = new THREE.DirectionalLight('#daf2ff', 0.56);
    fillLight.position.set(22, 16, 26);
    scene.add(fillLight);

    const sunLight = new THREE.DirectionalLight('#fff7e6', 1.9);
    sunLight.position.set(-20, 32, -24);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(2048, 2048);
    sunLight.shadow.camera.near = 6;
    sunLight.shadow.camera.far = 96;
    // Tight shadow frustum around the main 30x30 island for crisp, high-density shadow texels
    const shadowBound = 18.5;
    sunLight.shadow.camera.left = -shadowBound;
    sunLight.shadow.camera.right = shadowBound;
    sunLight.shadow.camera.top = shadowBound;
    sunLight.shadow.camera.bottom = -shadowBound;
    sunLight.shadow.bias = -0.0004;
    sunLight.shadow.normalBias = 0.032;
    scene.add(sunLight);

    const moonLight = new THREE.DirectionalLight('#8eb8ff', 0.0);
    moonLight.position.set(20, 30, -22);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.set(1024, 1024);
    moonLight.shadow.camera.near = 6;
    moonLight.shadow.camera.far = 96;
    moonLight.shadow.camera.left = -shadowBound;
    moonLight.shadow.camera.right = shadowBound;
    moonLight.shadow.camera.top = shadowBound;
    moonLight.shadow.camera.bottom = -shadowBound;
    moonLight.shadow.bias = -0.0005;
    moonLight.shadow.normalBias = 0.032;
    scene.add(moonLight);

    // === 30x30 SURFACE-CULLED VOXEL ISLAND & DISTANT ISLETS ===
    const layout = buildIslandLayout();
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    const worldGroup = new THREE.Group();
    scene.add(worldGroup);

    const blockMaterials: Record<SolidBlockType, THREE.Material | THREE.Material[]> = {
      grass: materials.grass,
      dirt: materials.dirt,
      sand: materials.sand,
      gravel: materials.gravel,
      stone: materials.stone,
      cobblestone: materials.cobblestone,
      oakLog: materials.oakLog,
      oakPlanks: materials.oakPlanks,
      spruceLog: materials.spruceLog,
      sprucePlanks: materials.sprucePlanks,
      oakLeaves: materials.oakLeaves,
      spruceLeaves: materials.spruceLeaves,
      diamondOre: materials.diamondOre,
      emeraldOre: materials.emeraldOre,
      goldOre: materials.goldOre,
      redstoneOre: materials.redstoneOre,
      obsidian: materials.obsidian,
      windowGlass: materials.windowGlass,
      lantern: materials.lantern,
      waterfall: materials.waterfall,
    };

    const instancedByType: Partial<Record<SolidBlockType, THREE.InstancedMesh>> = {};
    (Object.keys(layout.blocks) as SolidBlockType[]).forEach((type) => {
      const coords = layout.blocks[type];
      if (coords.length === 0) return;
      const isWater = type === 'waterfall';
      const mesh = createInstancedBlocks(
        coords,
        boxGeo,
        blockMaterials[type],
        !isWater,
        true,
      );
      instancedByType[type] = mesh;
      worldGroup.add(mesh);
    });

    // Build index map for meadow grass so Motion Lab "Block Breathing Wave" smoothly animates them
    const grassPositions = layout.blocks.grass;
    const meadowIndices: Array<{ idx: number; pos: Vec3 }> = [];
    grassPositions.forEach((pos, idx) => {
      if (Math.hypot(pos[0], pos[2]) < 15.5) {
        meadowIndices.push({ idx, pos });
      }
    });

    // === WILDFLOWERS (RED POPPIES & YELLOW DANDELIONS) ===
    const allFlowers = [...layout.flowersRed, ...layout.flowersYellow];
    const stemGeo = new THREE.BoxGeometry(0.12, 0.42, 0.12);
    const petalGeo = new THREE.BoxGeometry(0.32, 0.22, 0.32);

    const stemMesh = new THREE.InstancedMesh(stemGeo, materials.flowerStem, Math.max(allFlowers.length, 1));
    const redPetalMesh = new THREE.InstancedMesh(
      petalGeo,
      materials.flowerRed,
      Math.max(layout.flowersRed.length, 1),
    );
    const yellowPetalMesh = new THREE.InstancedMesh(
      petalGeo,
      materials.flowerYellow,
      Math.max(layout.flowersYellow.length, 1),
    );

    const initDummy = new THREE.Object3D();
    allFlowers.forEach(([x, y, z], i) => {
      initDummy.position.set(x, y + 0.21, z);
      initDummy.rotation.set(0, i * 0.7, 0);
      initDummy.scale.set(1, 1, 1);
      initDummy.updateMatrix();
      stemMesh.setMatrixAt(i, initDummy.matrix);
    });
    stemMesh.count = allFlowers.length;
    stemMesh.instanceMatrix.needsUpdate = true;

    layout.flowersRed.forEach(([x, y, z], i) => {
      initDummy.position.set(x, y + 0.45, z);
      initDummy.rotation.set(0, i * 0.9, 0);
      initDummy.updateMatrix();
      redPetalMesh.setMatrixAt(i, initDummy.matrix);
    });
    redPetalMesh.count = layout.flowersRed.length;
    redPetalMesh.instanceMatrix.needsUpdate = true;

    layout.flowersYellow.forEach(([x, y, z], i) => {
      initDummy.position.set(x, y + 0.45, z);
      initDummy.rotation.set(0, i * 1.1, 0);
      initDummy.updateMatrix();
      yellowPetalMesh.setMatrixAt(i, initDummy.matrix);
    });
    yellowPetalMesh.count = layout.flowersYellow.length;
    yellowPetalMesh.instanceMatrix.needsUpdate = true;

    worldGroup.add(stemMesh, redPetalMesh, yellowPetalMesh);

    // === MOORED PIXEL BOAT BY THE PIER ===
    const boat = createPixelBoat(materials.oakPlanks, materials.oakLog);
    boat.position.set(...layout.boatAnchor);
    boat.rotation.y = 0.28;
    worldGroup.add(boat);

    // === HILLSIDE CAMPFIRE + SPARKS & SMOKE ===
    const campfire = createCampfireGroup(
      materials.campfireLog,
      materials.campfireEmber,
      materials.cobblestone,
    );
    campfire.position.set(layout.campfirePos[0], layout.campfirePos[1] - 0.5, layout.campfirePos[2]);
    worldGroup.add(campfire);

    const campfireLight = new THREE.PointLight('#ff842b', 0.4, 15, 1.55);
    campfireLight.position.set(layout.campfirePos[0], layout.campfirePos[1] + 0.7, layout.campfirePos[2]);
    worldGroup.add(campfireLight);

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

    // === COTTAGE WARM INTERIOR LIGHT & LANTERN LIGHTS ===
    const cottageLight = new THREE.PointLight('#ffbd59', 0, 14, 1.5);
    cottageLight.position.set(...layout.cottageLightPos);
    worldGroup.add(cottageLight);

    const lanternPointLights = layout.lanternLights.map(([lx, ly, lz]) => {
      const light = new THREE.PointLight('#ffaa3b', 0, 13, 1.6);
      light.position.set(lx, ly - 0.2, lz);
      worldGroup.add(light);
      return light;
    });

    // === HIGHLAND OBSIDIAN NETHER PORTAL CORE & AMBIENT PARTICLES ===
    const [pcx, pcy, pcz] = layout.portalCoreCenter;
    const [pw, ph] = layout.portalCoreSize;
    const portalPlaneGeo = new THREE.PlaneGeometry(pw, ph);
    const portalPlane = new THREE.Mesh(portalPlaneGeo, materials.portalCore);
    portalPlane.position.set(pcx, pcy, pcz);
    worldGroup.add(portalPlane);

    const portalAmbientLight = new THREE.PointLight('#a855f7', 0.4, 15, 1.5);
    portalAmbientLight.position.set(pcx, pcy, pcz + 1.0);
    worldGroup.add(portalAmbientLight);

    const portalAmbientCount = 26;
    const portalSparkGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
    const portalSparkMat = new THREE.MeshBasicMaterial({ color: '#d8b4fe' });
    const portalSparkMesh = new THREE.InstancedMesh(portalSparkGeo, portalSparkMat, portalAmbientCount);
    const portalSparkSeeds = Array.from({ length: portalAmbientCount }, (_, i) => ({
      phase: i / portalAmbientCount,
      ox: (Math.random() - 0.5) * 2.1,
      oy: (Math.random() - 0.5) * 2.8,
      oz: (Math.random() - 0.5) * 1.4,
      speed: 0.45 + Math.random() * 0.35,
    }));
    worldGroup.add(portalSparkMesh);

    // === WATERFALL BAY WHITE SPLASH FOAM PARTICLES ===
    const splashCount = 36;
    const splashGeo = new THREE.BoxGeometry(0.22, 0.22, 0.22);
    const splashMat = new THREE.MeshBasicMaterial({
      color: '#f0f9ff',
      transparent: true,
      opacity: 0.85,
    });
    const splashMesh = new THREE.InstancedMesh(splashGeo, splashMat, splashCount);
    const splashSeeds = Array.from({ length: splashCount }, (_, i) => ({
      base: layout.waterfallBases[i % layout.waterfallBases.length],
      phase: i / splashCount,
      angle: Math.random() * Math.PI * 2,
      spread: 0.35 + Math.random() * 1.1,
      speed: 0.75 + Math.random() * 0.65,
    }));
    worldGroup.add(splashMesh);

    // === MULTI-LAYERED 3D VOLUMETRIC PIXEL CLOUDS ===
    const cloudClusters: CloudCluster[] = [];
    const cloudVoxelGeo = new THREE.BoxGeometry(2.6, 1.05, 2.6);
    const cloudDefs = [
      { x: -48, y: 26, z: -38, speed: 0.65, shape: [[0,0,0],[1,0,0],[2,0,0],[3,0,0],[1,0,1],[2,0,1],[1,1,0],[2,1,0]] },
      { x: 26, y: 29, z: -44, speed: 0.5, shape: [[0,0,0],[1,0,0],[2,0,0],[1,0,1],[2,0,1],[3,0,1],[1,1,0],[2,1,1]] },
      { x: -24, y: 31, z: 24, speed: 0.72, shape: [[0,0,0],[1,0,0],[2,0,0],[0,0,1],[1,0,1],[1,1,0]] },
      { x: 46, y: 27, z: 18, speed: 0.58, shape: [[0,0,0],[1,0,0],[2,0,0],[3,0,0],[1,0,-1],[2,0,-1],[2,1,0]] },
      { x: -64, y: 33, z: -6, speed: 0.45, shape: [[0,0,0],[1,0,0],[2,0,0],[1,0,1],[2,0,1],[1,1,0]] },
      { x: 8, y: 34, z: -62, speed: 0.6, shape: [[0,0,0],[1,0,0],[2,0,0],[3,0,0],[4,0,0],[1,0,1],[2,0,1],[3,0,1],[2,1,0]] },
      { x: 64, y: 30, z: -22, speed: 0.52, shape: [[0,0,0],[1,0,0],[2,0,0],[1,0,1],[1,1,0]] },
      { x: -12, y: 25, z: 54, speed: 0.68, shape: [[0,0,0],[1,0,0],[2,0,0],[1,0,1],[2,0,1],[1,1,0]] },
    ];
    cloudDefs.forEach((def, idx) => {
      const grp = new THREE.Group();
      def.shape.forEach(([bx, by, bz]) => {
        const v = new THREE.Mesh(cloudVoxelGeo, materials.cloud);
        v.position.set(bx * 2.6, by * 1.0, bz * 2.6);
        grp.add(v);
      });
      grp.position.set(def.x, def.y, def.z);
      scene.add(grp);
      cloudClusters.push({ mesh: grp, speed: def.speed, baseY: def.y, phase: idx * 1.4 });
    });

    // === VOXEL CREEPER EASTER EGG ===
    const creeperGroup = new THREE.Group();
    const [cx, cy, cz] = layout.creeperPos;
    creeperGroup.position.set(cx, cy, cz);
    creeperGroup.rotation.y = 0.48;
    // Slight scale bump (1.18x) so it pops cleanly on the larger 30x30 island
    const creeperBaseScale = 1.18;
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

    // Creeper explosion particles
    const explosionCount = 64;
    const explosionGeo = new THREE.BoxGeometry(0.26, 0.26, 0.26);
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

    const explosionParticles: ParticleState[] = [];
    let creeperState: 'idle' | 'fuse' | 'exploded' | 'respawn' = 'idle';
    let creeperTimer = 0;
    let cameraShake = 0;

    // === MOTION LAB PRESET 1: ISLAND-SCALE ORE ORBIT ===
    const maxOreCrystals = 48;
    const oreCrystalGeo = new THREE.BoxGeometry(0.52, 0.52, 0.52);
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
        radius: 14.5 + (i % 6) * 1.15,
        angle: (i / maxOreCrystals) * Math.PI * 2,
        yOffset: 6.2 + ((i % 7) - 3) * 1.05,
        tilt: ((i % 3) - 1) * 0.26,
        speedMul: 0.55 + (i % 4) * 0.18,
      };
    });
    if (oreOrbitMesh.instanceColor) oreOrbitMesh.instanceColor.needsUpdate = true;
    scene.add(oreOrbitMesh);

    // === MOTION LAB PRESET 2: PORTAL PARTICLE VORTEX ===
    const maxPortalParticles = 220;
    const portalParticleGeo = new THREE.BoxGeometry(0.26, 0.26, 0.26);
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
        radiusJitter: (Math.random() - 0.5) * 2.2,
        riseSpeed: 0.16 + Math.random() * 0.14,
      };
    });
    if (portalVortexMesh.instanceColor) portalVortexMesh.instanceColor.needsUpdate = true;
    portalVortexMesh.visible = false;
    scene.add(portalVortexMesh);

    const vortexLight = new THREE.PointLight('#c084fc', 0, 26, 1.4);
    vortexLight.position.set(pcx, pcy + 4, pcz);
    scene.add(vortexLight);

    // === MOTION LAB PRESET 3: BLOCK BREATHING WAVE SATELLITES ===
    const maxWaveCubes = 42;
    const waveCubeGeo = new THREE.BoxGeometry(0.55, 0.55, 0.55);
    const waveCubeMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.72,
      metalness: 0.08,
    });
    const waveSatellitesMesh = new THREE.InstancedMesh(waveCubeGeo, waveCubeMat, maxWaveCubes);
    const waveColors = [
      new THREE.Color('#5da636'),
      new THREE.Color('#38bdf8'),
      new THREE.Color('#fbbf24'),
      new THREE.Color('#86efac'),
    ];
    const waveSatellites = Array.from({ length: maxWaveCubes }, (_, i) => {
      waveSatellitesMesh.setColorAt(i, waveColors[i % waveColors.length]);
      const angle = (i / maxWaveCubes) * Math.PI * 2;
      const ring = 13.8 + (i % 3) * 1.4;
      return {
        x: Math.cos(angle) * ring,
        z: Math.sin(angle) * ring,
        baseY: 2.2 + (i % 4) * 1.15,
        phase: angle * 2 + i * 0.32,
      };
    });
    if (waveSatellitesMesh.instanceColor) waveSatellitesMesh.instanceColor.needsUpdate = true;
    waveSatellitesMesh.visible = false;
    worldGroup.add(waveSatellitesMesh);

    // === RAYCASTING FOR CREEPER ===
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDownPos: { x: number; y: number } | null = null;
    let isHoveringCreeperNow = false;

    const updatePointer = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const hitCreeper = (): boolean => {
      if (creeperState !== 'idle') return false;
      raycaster.setFromCamera(pointer, camera);
      return raycaster.intersectObjects(creeperParts, false).length > 0;
    };

    const onPointerMove = (event: PointerEvent) => {
      updatePointer(event);
      const hit = hitCreeper();
      if (hit !== isHoveringCreeperNow) {
        isHoveringCreeperNow = hit;
        setHoveringCreeper(hit);
        renderer.domElement.style.cursor = hit ? 'pointer' : 'grab';
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      pointerDownPos = { x: event.clientX, y: event.clientY };
      if (!isHoveringCreeperNow) {
        renderer.domElement.style.cursor = 'grabbing';
      }
    };

    const onPointerUp = (event: PointerEvent) => {
      renderer.domElement.style.cursor = isHoveringCreeperNow ? 'pointer' : 'grab';
      if (!pointerDownPos) return;
      const dist = Math.hypot(event.clientX - pointerDownPos.x, event.clientY - pointerDownPos.y);
      pointerDownPos = null;
      if (dist < 6) {
        updatePointer(event);
        if (hitCreeper()) {
          creeperState = 'fuse';
          creeperTimer = 0;
          isHoveringCreeperNow = false;
          setHoveringCreeper(false);
        }
      }
    };

    renderer.domElement.style.cursor = 'grab';
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

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

    const dayHemiSky = new THREE.Color('#dcf3ff');
    const sunsetHemiSky = new THREE.Color('#ffb58f');
    const nightHemiSky = new THREE.Color('#22356b');
    const dayHemiGround = new THREE.Color('#74a096');
    const nightHemiGround = new THREE.Color('#101b33');

    const dayFillCol = new THREE.Color('#daf2ff');
    const sunsetFillCol = new THREE.Color('#ffc099');
    const nightFillCol = new THREE.Color('#35528f');

    const daySunCol = new THREE.Color('#fff7e6');
    const sunsetSunCol = new THREE.Color('#ff925c');
    const dayCloudCol = new THREE.Color('#ffffff');
    const sunsetCloudCol = new THREE.Color('#ffc4a3');
    const nightCloudCol = new THREE.Color('#27355e');

    const creeperFlashColor = new THREE.Color('#ffffff');
    const creeperNormalEmissive = new THREE.Color('#000000');

    let cycleT = timeOfDayRef.current === 'night' ? 1 : 0;
    let waveWasActive = false;
    let frameId = 0;

    const spawnExplosion = () => {
      explosionParticles.length = 0;
      const origin = new THREE.Vector3(cx, cy + 1.0, cz);
      for (let i = 0; i < explosionCount; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const spd = 3.2 + Math.random() * 5.8;
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
      cameraShake = 0.34;
      unlockRef.current('creeper', { forceNotify: true });
    };

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.elapsedTime;
      const { presets, speed, density } = motionRef.current;

      // 1. Smooth Day <-> Sunset/Sunrise <-> Night cycle
      const targetCycle = timeOfDayRef.current === 'night' ? 1 : 0;
      const step = dt * 0.62;
      if (Math.abs(targetCycle - cycleT) <= step) {
        cycleT = targetCycle;
      } else {
        cycleT += Math.sign(targetCycle - cycleT) * step;
      }

      const { sunsetFactor, nightFactor, activeCelestialDir, activeCelestialColor } = sky.update(
        cycleT,
        elapsed,
      );

      // Sync atmospheric distance fog & circular stylized ocean with the Sky Dome
      fog.color.copy(sky.horizonColor);
      ocean.update({
        elapsed,
        nightFactor,
        sunsetFactor,
        celestialDir: activeCelestialDir,
        celestialColor: activeCelestialColor,
        fogColor: sky.horizonColor,
        zenithColor: sky.zenithColor,
      });

      // Directional sunlight & moonlight keep crisp shadow angles while tracking sky direction
      sunLight.position.set(
        sky.sunDirection.x * 34,
        Math.max(16, sky.sunDirection.y * 92 + 16),
        sky.sunDirection.z * 34,
      );
      moonLight.position.set(
        sky.moonDirection.x * 34,
        Math.max(16, sky.moonDirection.y * 92 + 16),
        sky.moonDirection.z * 34,
      );

      const sunAbove = Math.max(0, sky.sunDirection.y);
      const moonAbove = Math.max(0, sky.moonDirection.y);
      sunLight.intensity = THREE.MathUtils.smoothstep(sunAbove, 0.01, 0.15) * 1.9;
      sunLight.color.copy(daySunCol).lerp(sunsetSunCol, sunsetFactor);
      sunLight.castShadow = sunLight.intensity > 0.08;

      moonLight.intensity = THREE.MathUtils.smoothstep(moonAbove, 0.01, 0.15) * 0.68;
      moonLight.castShadow = moonLight.intensity > 0.08 && !sunLight.castShadow;

      hemiLight.color
        .copy(dayHemiSky)
        .lerp(sunsetHemiSky, sunsetFactor * 0.6)
        .lerp(nightHemiSky, nightFactor);
      hemiLight.groundColor.copy(dayHemiGround).lerp(nightHemiGround, nightFactor);
      hemiLight.intensity = THREE.MathUtils.lerp(1.14, 0.42, nightFactor);

      fillLight.color
        .copy(dayFillCol)
        .lerp(sunsetFillCol, sunsetFactor * 0.55)
        .lerp(nightFillCol, nightFactor);
      fillLight.intensity = THREE.MathUtils.lerp(0.56, 0.18, nightFactor);

      // Night cozy warm glows (windows, lanterns, campfire, portal, subtle ore flecks)
      const nightGlow = THREE.MathUtils.smoothstep(cycleT, 0.32, 0.78);
      materials.windowGlass.emissiveIntensity = THREE.MathUtils.lerp(0.05, 1.35, nightGlow);
      materials.lantern.emissiveIntensity = THREE.MathUtils.lerp(0.3, 1.45, nightGlow);

      const oreGlow = THREE.MathUtils.lerp(0.18, 0.85, nightGlow);
      materials.diamondOre.emissiveIntensity = oreGlow;
      materials.emeraldOre.emissiveIntensity = oreGlow;
      materials.goldOre.emissiveIntensity = oreGlow * 0.85;
      materials.redstoneOre.emissiveIntensity = oreGlow * 1.1;

      cottageLight.intensity = nightGlow * 4.5;
      lanternPointLights.forEach((l, i) => {
        const flicker = 0.92 + Math.sin(elapsed * 8.5 + i * 2.1) * 0.08;
        l.intensity = nightGlow * 5.2 * flicker;
      });
      const fireFlicker = 0.85 + Math.sin(elapsed * 14.5) * 0.12 + Math.cos(elapsed * 23.0) * 0.06;
      campfireLight.intensity = THREE.MathUtils.lerp(0.55, 6.2, nightGlow) * fireFlicker;
      portalAmbientLight.intensity =
        THREE.MathUtils.lerp(0.45, 4.4, nightGlow) * (0.9 + Math.sin(elapsed * 3.8) * 0.1);

      // Cloud tinting (day white -> sunset peach -> night slate)
      materials.cloud.color
        .copy(dayCloudCol)
        .lerp(sunsetCloudCol, sunsetFactor * 0.72)
        .lerp(nightCloudCol, nightFactor);

      // 2. Drifting 3D volumetric pixel clouds
      cloudClusters.forEach((c) => {
        c.mesh.position.x += c.speed * dt * (0.7 + speed * 0.3);
        if (c.mesh.position.x > 84) c.mesh.position.x = -84;
        c.mesh.position.y = c.baseY + Math.sin(elapsed * 0.45 + c.phase) * 0.35;
      });

      // 3. Moored pixel boat gentle wave bobbing
      boat.position.y = layout.boatAnchor[1] + Math.sin(elapsed * 1.6 + 0.5) * 0.11;
      boat.rotation.z = Math.sin(elapsed * 1.35) * 0.055;
      boat.rotation.x = Math.cos(elapsed * 1.15) * 0.04;

      // 4. Campfire sparks & smoke particles
      emberSeeds.forEach((e, idx) => {
        const p = (e.phase + elapsed * e.speed) % 1;
        dummy.position.set(
          layout.campfirePos[0] + e.dx * (1 + p * 0.9) + Math.sin(elapsed * 4 + idx) * 0.1,
          layout.campfirePos[1] - 0.15 + p * 2.6,
          layout.campfirePos[2] + e.dz * (1 + p * 0.9),
        );
        const sc = Math.max(0.05, Math.sin(p * Math.PI) * 1.15);
        dummy.scale.setScalar(sc);
        dummy.rotation.set(elapsed * 2, elapsed * 3, idx);
        dummy.updateMatrix();
        emberMesh.setMatrixAt(idx, dummy.matrix);
      });
      emberMesh.instanceMatrix.needsUpdate = true;

      smokeSeeds.forEach((s, idx) => {
        const p = (s.phase + elapsed * s.speed) % 1;
        dummy.position.set(
          layout.campfirePos[0] + s.dx + p * 0.85,
          layout.campfirePos[1] + 0.4 + p * 4.4,
          layout.campfirePos[2] + s.dz + Math.sin(elapsed * 1.3 + idx) * 0.2,
        );
        const sc = Math.sin(p * Math.PI) * (0.8 + p * 1.1);
        dummy.scale.setScalar(Math.max(0.04, sc));
        dummy.rotation.set(elapsed * 0.4, elapsed * 0.5 + idx, 0);
        dummy.updateMatrix();
        smokeMesh.setMatrixAt(idx, dummy.matrix);
      });
      smokeMesh.instanceMatrix.needsUpdate = true;

      // 5. Waterfall scrolling sheen & bay white foam splashes
      if (materials.waterfall.map) {
        materials.waterfall.map.offset.y = (elapsed * 0.85) % 1;
      }
      splashSeeds.forEach((sp, idx) => {
        const p = (sp.phase + elapsed * sp.speed) % 1;
        const arcY = Math.sin(p * Math.PI) * 1.25;
        const r = p * sp.spread;
        dummy.position.set(
          sp.base[0] + Math.cos(sp.angle) * r,
          sp.base[1] + arcY,
          sp.base[2] + Math.sin(sp.angle) * r,
        );
        const sc = Math.max(0.05, (1 - p) * 1.15);
        dummy.scale.setScalar(sc);
        dummy.rotation.set(elapsed * 2 + idx, elapsed * 1.5, 0);
        dummy.updateMatrix();
        splashMesh.setMatrixAt(idx, dummy.matrix);
      });
      splashMesh.instanceMatrix.needsUpdate = true;

      // 6. Highland Nether Portal ambient shimmer & swirling particles
      materials.portalCore.opacity = 0.72 + Math.sin(elapsed * 4.2) * 0.12;
      portalSparkSeeds.forEach((ps, idx) => {
        const p = (ps.phase + elapsed * ps.speed) % 1;
        const swirl = elapsed * 2.2 + idx;
        dummy.position.set(
          pcx + ps.ox * (1 - p * 0.5) + Math.cos(swirl) * 0.25,
          pcy + ps.oy * (1 - p * 0.4) + Math.sin(p * Math.PI) * 0.5,
          pcz + ps.oz + Math.sin(swirl) * 0.35,
        );
        const sc = Math.max(0.04, Math.sin(p * Math.PI) * 1.1);
        dummy.scale.setScalar(sc);
        dummy.rotation.set(elapsed * 2, swirl, 0);
        dummy.updateMatrix();
        portalSparkMesh.setMatrixAt(idx, dummy.matrix);
      });
      portalSparkMesh.instanceMatrix.needsUpdate = true;

      // 7. Creeper Easter Egg state machine
      if (creeperState === 'idle') {
        creeperGroup.visible = true;
        creeperGroup.scale.set(
          creeperBaseScale,
          creeperBaseScale * (1 + Math.sin(elapsed * 2.8) * 0.025),
          creeperBaseScale,
        );
        creeperHead.rotation.y = Math.sin(elapsed * 1.25) * 0.38;
        materials.creeperBody.emissive.copy(creeperNormalEmissive);
        materials.creeperHead.forEach((m) => m.emissive.copy(creeperNormalEmissive));
      } else if (creeperState === 'fuse') {
        creeperTimer += dt;
        const flashOn = Math.floor(creeperTimer * 18) % 2 === 0;
        const swell = creeperBaseScale * (1 + Math.sin(creeperTimer * 28) * 0.1 + creeperTimer * 0.32);
        creeperGroup.scale.set(swell, swell * 0.96, swell);
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
          creeperGroup.visible = false;
          materials.creeperBody.emissive.copy(creeperNormalEmissive);
          materials.creeperBody.emissiveIntensity = 0;
          materials.creeperHead.forEach((m) => {
            m.emissive.copy(creeperNormalEmissive);
            m.emissiveIntensity = 0;
          });
          spawnExplosion();
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
          explosionMesh.setMatrixAt(idx, dummy.matrix);
        });
        explosionMesh.instanceMatrix.needsUpdate = true;
        if (aliveCount === 0) explosionMesh.visible = false;
        if (creeperTimer >= 2.3) {
          creeperState = 'respawn';
          creeperTimer = 0;
          creeperGroup.visible = true;
        }
      } else if (creeperState === 'respawn') {
        creeperTimer += dt;
        const tNorm = Math.min(1, creeperTimer / 0.45);
        const bounce = 1 + Math.sin(tNorm * Math.PI) * 0.22;
        const sc = Math.min(1.18, tNorm * bounce) * creeperBaseScale;
        creeperGroup.scale.setScalar(Math.max(0.01, sc));
        if (tNorm >= 1) {
          creeperGroup.scale.setScalar(creeperBaseScale);
          creeperState = 'idle';
        }
      }

      // 8. Motion Lab Preset 1: Ore Orbit (Island Scale)
      oreOrbitMesh.visible = presets.oreOrbit;
      if (presets.oreOrbit) {
        const activeCount = Math.max(8, Math.round(8 + density * (maxOreCrystals - 8)));
        oreOrbitMesh.count = activeCount;
        for (let i = 0; i < activeCount; i++) {
          const track = oreTracks[i];
          const a = track.angle + elapsed * 0.45 * speed * track.speedMul;
          const x = Math.cos(a) * track.radius;
          const z = Math.sin(a) * track.radius;
          const y = track.yOffset + Math.sin(a * 2 + i) * 1.1 + Math.cos(a) * track.tilt * 3.0;
          dummy.position.set(x, y, z);
          dummy.rotation.set(elapsed * speed + i, elapsed * 1.2 * speed, i * 0.4);
          dummy.scale.setScalar(0.85 + Math.sin(elapsed * 3 * speed + i) * 0.18);
          dummy.updateMatrix();
          oreOrbitMesh.setMatrixAt(i, dummy.matrix);
        }
        oreOrbitMesh.instanceMatrix.needsUpdate = true;
      }

      // 9. Motion Lab Preset 2: Portal Particle Vortex (Rising from Highland Portal)
      portalVortexMesh.visible = presets.portalVortex;
      vortexLight.intensity = presets.portalVortex
        ? (3.2 + Math.sin(elapsed * 4.5 * speed) * 0.8) * (0.6 + density * 0.6)
        : 0;
      if (presets.portalVortex) {
        const activeCount = Math.max(40, Math.round(40 + density * (maxPortalParticles - 40)));
        portalVortexMesh.count = activeCount;
        for (let i = 0; i < activeCount; i++) {
          const p = portalTracks[i];
          const progress = (p.heightPhase + elapsed * p.riseSpeed * speed) % 1;
          const swirlAngle = p.angleOffset + elapsed * 2.0 * speed + progress * Math.PI * 4.0;
          const radius = 2.4 + progress * 9.5 + p.radiusJitter * (0.4 + progress);
          const y = pcy - 1.5 + progress * 15.5;
          dummy.position.set(
            pcx + Math.cos(swirlAngle) * radius,
            y,
            pcz + Math.sin(swirlAngle) * radius,
          );
          dummy.rotation.set(elapsed * 2, swirlAngle, elapsed * 1.5);
          dummy.scale.setScalar(Math.max(0.05, Math.sin(progress * Math.PI) * 1.3));
          dummy.updateMatrix();
          portalVortexMesh.setMatrixAt(i, dummy.matrix);
        }
        portalVortexMesh.instanceMatrix.needsUpdate = true;
      }

      // 10. Motion Lab Preset 3: Block Breathing Wave
      waveSatellitesMesh.visible = presets.blockWave;
      const grassMesh = instancedByType.grass;
      if (presets.blockWave && grassMesh) {
        waveWasActive = true;
        const amp = 0.14 + density * 0.24;
        for (let i = 0; i < meadowIndices.length; i++) {
          const { idx, pos } = meadowIndices[i];
          const wave = Math.sin(elapsed * 2.4 * speed + pos[0] * 0.38 + pos[2] * 0.38) * amp;
          dummy.position.set(pos[0], pos[1] + wave, pos[2]);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          grassMesh.setMatrixAt(idx, dummy.matrix);
        }
        grassMesh.instanceMatrix.needsUpdate = true;

        const activeCubes = Math.max(10, Math.round(10 + density * (maxWaveCubes - 10)));
        waveSatellitesMesh.count = activeCubes;
        for (let i = 0; i < activeCubes; i++) {
          const sat = waveSatellites[i];
          const lift = Math.sin(elapsed * 2.2 * speed + sat.phase) * (0.9 + density * 0.8);
          dummy.position.set(sat.x, sat.baseY + lift, sat.z);
          dummy.rotation.set(elapsed * 0.6 * speed, elapsed * 0.8 * speed + sat.phase, 0);
          dummy.scale.setScalar(0.85 + Math.sin(elapsed * 3 * speed + i) * 0.2);
          dummy.updateMatrix();
          waveSatellitesMesh.setMatrixAt(i, dummy.matrix);
        }
        waveSatellitesMesh.instanceMatrix.needsUpdate = true;
      } else if (waveWasActive && grassMesh) {
        waveWasActive = false;
        for (let i = 0; i < meadowIndices.length; i++) {
          const { idx, pos } = meadowIndices[i];
          dummy.position.set(pos[0], pos[1], pos[2]);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          grassMesh.setMatrixAt(idx, dummy.matrix);
        }
        grassMesh.instanceMatrix.needsUpdate = true;
      }

      controls.update();

      if (cameraShake > 0.002) {
        const shakeOffset = new THREE.Vector3(
          (Math.random() - 0.5) * cameraShake,
          (Math.random() - 0.5) * cameraShake,
          (Math.random() - 0.5) * cameraShake,
        );
        camera.position.add(shakeOffset);
        renderer.render(scene, camera);
        camera.position.sub(shakeOffset);
        cameraShake *= Math.pow(0.05, dt);
      } else {
        renderer.render(scene, camera);
      }
    };

    animate();

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      controls.removeEventListener('start', onControlStart);
      controls.dispose();
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);

      sky.dispose();
      ocean.dispose();
      boxGeo.dispose();
      stemGeo.dispose();
      petalGeo.dispose();
      emberGeo.dispose();
      emberMat.dispose();
      smokeGeo.dispose();
      smokeMat.dispose();
      portalPlaneGeo.dispose();
      portalSparkGeo.dispose();
      portalSparkMat.dispose();
      splashGeo.dispose();
      splashMat.dispose();
      cloudVoxelGeo.dispose();
      footGeo.dispose();
      torsoGeo.dispose();
      headGeo.dispose();
      explosionGeo.dispose();
      explosionMat.dispose();
      oreCrystalGeo.dispose();
      oreCrystalMat.dispose();
      portalParticleGeo.dispose();
      portalParticleMat.dispose();
      waveCubeGeo.dispose();
      waveCubeMat.dispose();
      boat.traverse((obj) => {
        if (obj instanceof THREE.Mesh) obj.geometry.dispose();
      });
      campfire.traverse((obj) => {
        if (obj instanceof THREE.Mesh) obj.geometry.dispose();
      });
      materials.dispose();

      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="scene-root" ref={containerRef} aria-label="3D Minecraft island world scene">
      {hoveringCreeper && (
        <div className="creeper-hover-pill" role="status" aria-live="polite">
          {UI_TEXT.creeperHint[locale]}
        </div>
      )}
    </div>
  );
}
