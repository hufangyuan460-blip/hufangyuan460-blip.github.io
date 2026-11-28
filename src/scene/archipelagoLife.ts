import * as THREE from 'three';
import type { Vec3 } from './subVoxelMeshes';

// ============================================================================
// 1. LIGHTHOUSE DUAL ROTATING VOLUMETRIC LIGHT BEAMS
// ============================================================================
export interface LighthouseBeamSystem {
  group: THREE.Group;
  update: (elapsed: number, nightFactor: number, sunsetFactor: number) => void;
  dispose: () => void;
}

const BEAM_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalDir;
  varying vec3 vViewDir;
  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vNormalDir = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const BEAM_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  varying vec2 vUv;
  varying vec3 vNormalDir;
  varying vec3 vViewDir;
  void main() {
    // vUv.y = 1 at cone apex (lantern room), 0 at far wide end
    float axial = pow(clamp(vUv.y, 0.0, 1.0), 1.55);
    float edgeSoft = pow(abs(dot(normalize(vNormalDir), normalize(vViewDir))), 1.35);
    float alpha = axial * edgeSoft * uIntensity;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

export function createLighthouseBeams(origin: Vec3): LighthouseBeamSystem {
  const group = new THREE.Group();
  group.position.set(origin[0], origin[1], origin[2]);

  const beamLength = 46;
  const beamRadius = 6.8;
  const coneGeo = new THREE.ConeGeometry(beamRadius, beamLength, 20, 1, true);
  // Shift so apex sits at local origin and cone flares outward along -Y, then rotate into ±X
  coneGeo.translate(0, -beamLength * 0.5, 0);

  const beamMat = new THREE.ShaderMaterial({
    vertexShader: BEAM_VERTEX_SHADER,
    fragmentShader: BEAM_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    fog: false,
    uniforms: {
      uColor: { value: new THREE.Color('#ffe08a') },
      uIntensity: { value: 0.12 },
    },
  });

  const beamA = new THREE.Mesh(coneGeo, beamMat);
  beamA.rotation.z = Math.PI * 0.5 + 0.16; // sweeps slightly downward toward ocean
  beamA.position.x = 0.6;

  const beamB = new THREE.Mesh(coneGeo, beamMat);
  beamB.rotation.z = -Math.PI * 0.5 - 0.16;
  beamB.position.x = -0.6;

  group.add(beamA, beamB);

  return {
    group,
    update: (elapsed, nightFactor, sunsetFactor) => {
      group.rotation.y = elapsed * 0.42;
      const strength = 0.06 + sunsetFactor * 0.14 + nightFactor * 0.36;
      beamMat.uniforms.uIntensity.value = strength;
    },
    dispose: () => {
      coneGeo.dispose();
      beamMat.dispose();
    },
  };
}

// ============================================================================
// 2. WORKSHOP GIANT ROTATING PIXEL-VOXEL WINDMILL SAILS
// ============================================================================
export interface WindmillSystem {
  group: THREE.Group;
  update: (dt: number, elapsed: number) => void;
  dispose: () => void;
}

export function createWindmillSails(
  hubPos: Vec3,
  oakMat: THREE.Material,
  spruceMat: THREE.Material,
  clothMat: THREE.Material,
): WindmillSystem {
  const group = new THREE.Group();
  group.position.set(hubPos[0], hubPos[1], hubPos[2]);

  const disposables: THREE.BufferGeometry[] = [];
  const track = <T extends THREE.BufferGeometry>(g: T): T => {
    disposables.push(g);
    return g;
  };

  // Sturdy pixel hub cap protruding on the West (-X) millhouse gable
  const hubGeo = track(new THREE.BoxGeometry(0.76, 1.04, 1.04));
  const hubMesh = new THREE.Mesh(hubGeo, spruceMat);
  hubMesh.castShadow = true;
  hubMesh.receiveShadow = true;
  group.add(hubMesh);

  // 4 sleek, elongated pixel-voxel windmill sails in the YZ plane (radius ~7.2 blocks!)
  const sparGeo = track(new THREE.BoxGeometry(0.24, 7.1, 0.28));
  const crossGeo = track(new THREE.BoxGeometry(0.18, 0.2, 1.82));
  const clothStripGeo = track(new THREE.BoxGeometry(0.1, 5.55, 1.56));

  for (let i = 0; i < 4; i++) {
    const blade = new THREE.Group();
    blade.rotation.x = (i * Math.PI) / 2;

    const spar = new THREE.Mesh(sparGeo, oakMat);
    spar.position.set(-0.2, 3.7, 0);
    spar.castShadow = true;
    blade.add(spar);

    // 5 crisp timber lattice cross-battens along the sail frame
    for (const cy of [1.6, 2.95, 4.3, 5.65, 7.0]) {
      const batten = new THREE.Mesh(crossGeo, spruceMat);
      batten.position.set(-0.24, cy, 0.72);
      batten.castShadow = true;
      blade.add(batten);
    }

    // Crisp white wool canvas sail angled slightly to catch the ocean wind
    const sail = new THREE.Mesh(clothStripGeo, clothMat);
    sail.position.set(-0.28, 4.35, 0.84);
    sail.rotation.y = 0.16;
    sail.castShadow = true;
    sail.receiveShadow = true;
    blade.add(sail);

    group.add(blade);
  }

  return {
    group,
    update: (dt, elapsed) => {
      const breeze = 0.62 + Math.sin(elapsed * 0.35) * 0.12;
      group.rotation.x += dt * breeze;
    },
    dispose: () => {
      disposables.forEach((g) => g.dispose());
    },
  };
}

// ============================================================================
// 3. CLASSIC 2-BLOCK VANILLA MINECRAFT RED BED (INTERACTIVE)
// ============================================================================
export interface RedBedSystem {
  group: THREE.Group;
  hitTargets: THREE.Object3D[];
  dispose: () => void;
}

export function createClassicRedBed(
  pos: Vec3,
  redWoolMat: THREE.Material,
  whiteWoolMat: THREE.Material,
  oakMat: THREE.Material,
): RedBedSystem {
  const group = new THREE.Group();
  // pos is the center of the 2-block-long bed resting on top of y=2 grass (surface y = 2.5)
  group.position.set(pos[0], pos[1], pos[2]);

  const disposables: THREE.BufferGeometry[] = [];
  const track = <T extends THREE.BufferGeometry>(g: T): T => {
    disposables.push(g);
    return g;
  };

  const hitTargets: THREE.Object3D[] = [];

  // 4 corner oak legs (0.19 x 0.19 x 0.19) resting flush on grass
  const legGeo = track(new THREE.BoxGeometry(0.19, 0.19, 0.19));
  const legOffsets: Vec3[] = [
    [-0.86, 0.095, -0.38],
    [0.86, 0.095, -0.38],
    [-0.86, 0.095, 0.38],
    [0.86, 0.095, 0.38],
  ];
  for (const [lx, ly, lz] of legOffsets) {
    const leg = new THREE.Mesh(legGeo, oakMat);
    leg.position.set(lx, ly, lz);
    leg.castShadow = true;
    leg.receiveShadow = true;
    group.add(leg);
    hitTargets.push(leg);
  }

  // Oak wooden base plank frame
  const baseGeo = track(new THREE.BoxGeometry(1.94, 0.12, 0.96));
  const base = new THREE.Mesh(baseGeo, oakMat);
  base.position.set(0, 0.24, 0);
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);
  hitTargets.push(base);

  // White wool head section & raised pillow (-X end)
  const headMatGeo = track(new THREE.BoxGeometry(0.56, 0.24, 0.96));
  const headMat = new THREE.Mesh(headMatGeo, whiteWoolMat);
  headMat.position.set(-0.69, 0.42, 0);
  headMat.castShadow = true;
  headMat.receiveShadow = true;
  group.add(headMat);
  hitTargets.push(headMat);

  const pillowGeo = track(new THREE.BoxGeometry(0.42, 0.08, 0.78));
  const pillow = new THREE.Mesh(pillowGeo, whiteWoolMat);
  pillow.position.set(-0.7, 0.56, 0);
  pillow.castShadow = true;
  group.add(pillow);
  hitTargets.push(pillow);

  // Classic Minecraft Red Wool Blanket covering the remaining 1.38 blocks
  const blanketGeo = track(new THREE.BoxGeometry(1.38, 0.26, 0.96));
  const blanket = new THREE.Mesh(blanketGeo, redWoolMat);
  blanket.position.set(0.28, 0.43, 0);
  blanket.castShadow = true;
  blanket.receiveShadow = true;
  group.add(blanket);
  hitTargets.push(blanket);

  return {
    group,
    hitTargets,
    dispose: () => {
      disposables.forEach((g) => g.dispose());
    },
  };
}

// ============================================================================
// 4. PIXEL SHEEP (WANDERING & GRAZING ON THE MAIN MEADOW)
// ============================================================================
export interface SheepSystem {
  group: THREE.Group;
  update: (dt: number, elapsed: number) => void;
  dispose: () => void;
}

interface SheepActor {
  root: THREE.Group;
  headPivot: THREE.Group;
  legs: THREE.Mesh[];
  home: Vec3;
  radius: number;
  x: number;
  z: number;
  yaw: number;
  targetX: number;
  targetZ: number;
  state: 'walk' | 'graze' | 'idle';
  stateTimer: number;
  walkPhase: number;
}

export function createVoxelSheep(
  spawns: Array<{ center: Vec3; radius: number }>,
  whiteWoolMat: THREE.Material,
): SheepSystem {
  const group = new THREE.Group();
  const disposables: Array<{ dispose: () => void }> = [];

  const faceMat = new THREE.MeshStandardMaterial({ color: '#e6c5a3', roughness: 0.92 });
  const hoofMat = new THREE.MeshStandardMaterial({ color: '#5c4b3c', roughness: 0.94 });
  const eyeMat = new THREE.MeshBasicMaterial({ color: '#111827' });
  const noseMat = new THREE.MeshStandardMaterial({ color: '#dba49c', roughness: 0.9 });
  disposables.push(faceMat, hoofMat, eyeMat, noseMat);

  const woolBodyGeo = new THREE.BoxGeometry(0.72, 0.64, 1.02);
  const headWoolGeo = new THREE.BoxGeometry(0.46, 0.42, 0.44);
  const faceGeo = new THREE.BoxGeometry(0.36, 0.34, 0.24);
  const eyeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.04);
  const noseGeo = new THREE.BoxGeometry(0.18, 0.08, 0.05);
  const legGeo = new THREE.BoxGeometry(0.2, 0.46, 0.2);
  const hoofGeo = new THREE.BoxGeometry(0.21, 0.14, 0.21);
  disposables.push(woolBodyGeo, headWoolGeo, faceGeo, eyeGeo, noseGeo, legGeo, hoofGeo);

  const actors: SheepActor[] = spawns.map((sp, idx) => {
    const root = new THREE.Group();
    root.position.set(sp.center[0], sp.center[1], sp.center[2]);

    const body = new THREE.Mesh(woolBodyGeo, whiteWoolMat);
    body.position.set(0, 0.72, 0);
    body.castShadow = true;
    body.receiveShadow = true;
    root.add(body);

    const headPivot = new THREE.Group();
    headPivot.position.set(0, 0.94, 0.5);
    const headWool = new THREE.Mesh(headWoolGeo, whiteWoolMat);
    headWool.position.set(0, 0.04, 0.1);
    headWool.castShadow = true;
    headPivot.add(headWool);

    const face = new THREE.Mesh(faceGeo, faceMat);
    face.position.set(0, 0.0, 0.26);
    headPivot.add(face);

    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.1, 0.05, 0.39);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.1, 0.05, 0.39);
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.set(0, -0.08, 0.39);
    headPivot.add(eyeL, eyeR, nose);
    root.add(headPivot);

    const legs: THREE.Mesh[] = [];
    const legPos: Array<[number, number]> = [
      [-0.2, 0.32],
      [0.2, 0.32],
      [-0.2, -0.32],
      [0.2, -0.32],
    ];
    for (const [lx, lz] of legPos) {
      const leg = new THREE.Mesh(legGeo, faceMat);
      leg.position.set(lx, 0.26, lz);
      leg.castShadow = true;
      const hoof = new THREE.Mesh(hoofGeo, hoofMat);
      hoof.position.set(0, -0.18, 0);
      leg.add(hoof);
      root.add(leg);
      legs.push(leg);
    }

    group.add(root);

    const startYaw = idx === 0 ? 0.8 : -1.2;
    root.rotation.y = startYaw;

    return {
      root,
      headPivot,
      legs,
      home: sp.center,
      radius: sp.radius,
      x: sp.center[0],
      z: sp.center[2],
      yaw: startYaw,
      targetX: sp.center[0] + (idx === 0 ? 1.1 : -1.0),
      targetZ: sp.center[2] + (idx === 0 ? 0.9 : -0.8),
      state: idx === 0 ? 'walk' : 'graze',
      stateTimer: 2.5 + idx * 1.8,
      walkPhase: idx * 2.1,
    };
  });

  return {
    group,
    update: (dt, elapsed) => {
      for (let i = 0; i < actors.length; i++) {
        const a = actors[i];
        a.stateTimer -= dt;

        if (a.state === 'walk') {
          const dx = a.targetX - a.x;
          const dz = a.targetZ - a.z;
          const dist = Math.hypot(dx, dz);
          if (dist < 0.15 || a.stateTimer <= 0) {
            a.state = Math.random() > 0.35 ? 'graze' : 'idle';
            a.stateTimer = 2.6 + Math.random() * 2.8;
          } else {
            const desiredYaw = Math.atan2(dx, dz);
            let diff = desiredYaw - a.yaw;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            a.yaw += diff * Math.min(1, dt * 3.8);

            const step = Math.min(dist, dt * 0.72);
            a.x += Math.sin(a.yaw) * step;
            a.z += Math.cos(a.yaw) * step;
            a.walkPhase += dt * 7.2;

            a.legs[0].rotation.x = Math.sin(a.walkPhase) * 0.42;
            a.legs[3].rotation.x = Math.sin(a.walkPhase) * 0.42;
            a.legs[1].rotation.x = -Math.sin(a.walkPhase) * 0.42;
            a.legs[2].rotation.x = -Math.sin(a.walkPhase) * 0.42;
          }
          a.headPivot.rotation.x = THREE.MathUtils.lerp(a.headPivot.rotation.x, 0.04, dt * 4.5);
        } else {
          // Smoothly relax legs
          for (const leg of a.legs) {
            leg.rotation.x = THREE.MathUtils.lerp(leg.rotation.x, 0, dt * 6);
          }

          if (a.state === 'graze') {
            const chew = Math.sin(elapsed * 8.5 + i * 2) * 0.08;
            a.headPivot.rotation.x = THREE.MathUtils.lerp(a.headPivot.rotation.x, 0.78 + chew, dt * 4.0);
          } else {
            a.headPivot.rotation.x = THREE.MathUtils.lerp(a.headPivot.rotation.x, -0.04, dt * 3.5);
            a.headPivot.rotation.y = Math.sin(elapsed * 1.1 + i * 3) * 0.25;
          }

          if (a.stateTimer <= 0) {
            const ang = Math.random() * Math.PI * 2;
            const r = 0.5 + Math.random() * (a.radius - 0.5);
            a.targetX = a.home[0] + Math.cos(ang) * r;
            a.targetZ = a.home[2] + Math.sin(ang) * r;
            a.state = 'walk';
            a.stateTimer = 4.0 + Math.random() * 3.0;
            a.headPivot.rotation.y = 0;
          }
        }

        a.root.position.set(a.x, a.home[1], a.z);
        a.root.rotation.y = a.yaw;
      }
    },
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}

// ============================================================================
// 5. PIXEL BEES (FLUTTERING AROUND THE CHERRY BLOSSOM TREE)
// ============================================================================
export interface BeeSystem {
  group: THREE.Group;
  update: (elapsed: number) => void;
  dispose: () => void;
}

export function createVoxelBees(cherryCenter: Vec3): BeeSystem {
  const group = new THREE.Group();
  const disposables: Array<{ dispose: () => void }> = [];

  const yellowMat = new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.78 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: '#291c11', roughness: 0.88 });
  const eyeMat = new THREE.MeshBasicMaterial({ color: '#38bdf8' });
  const wingMat = new THREE.MeshBasicMaterial({
    color: '#f1f5f9',
    transparent: true,
    opacity: 0.74,
    side: THREE.DoubleSide,
  });
  disposables.push(yellowMat, stripeMat, eyeMat, wingMat);

  const bodyGeo = new THREE.BoxGeometry(0.32, 0.3, 0.44);
  const stripeGeo = new THREE.BoxGeometry(0.33, 0.31, 0.11);
  const eyeGeo = new THREE.BoxGeometry(0.08, 0.09, 0.04);
  const antennaGeo = new THREE.BoxGeometry(0.03, 0.03, 0.12);
  const wingGeo = new THREE.PlaneGeometry(0.32, 0.22);
  wingGeo.translate(0.16, 0, 0);
  disposables.push(bodyGeo, stripeGeo, eyeGeo, antennaGeo, wingGeo);

  const bees = [0, 1, 2].map((i) => {
    const bee = new THREE.Group();
    const body = new THREE.Mesh(bodyGeo, yellowMat);
    bee.add(body);

    const stripe1 = new THREE.Mesh(stripeGeo, stripeMat);
    stripe1.position.z = -0.02;
    const stripe2 = new THREE.Mesh(stripeGeo, stripeMat);
    stripe2.position.z = -0.17;
    bee.add(stripe1, stripe2);

    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.09, 0.02, 0.22);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.09, 0.02, 0.22);
    bee.add(eyeL, eyeR);

    const antL = new THREE.Mesh(antennaGeo, stripeMat);
    antL.position.set(-0.07, 0.09, 0.27);
    const antR = new THREE.Mesh(antennaGeo, stripeMat);
    antR.position.set(0.07, 0.09, 0.27);
    bee.add(antL, antR);

    const wingL = new THREE.Mesh(wingGeo, wingMat);
    wingL.position.set(0.05, 0.16, 0.02);
    wingL.rotation.x = Math.PI / 2;
    const wingR = new THREE.Mesh(wingGeo, wingMat);
    wingR.position.set(-0.05, 0.16, 0.02);
    wingR.rotation.x = Math.PI / 2;
    wingR.scale.x = -1;
    bee.add(wingL, wingR);

    group.add(bee);
    return {
      bee,
      wingL,
      wingR,
      orbitR: 3.4 + i * 1.15,
      speed: (i % 2 === 0 ? 0.52 : -0.44) + i * 0.08,
      yOffset: -0.9 + i * 0.95,
      phase: i * 2.15,
    };
  });

  return {
    group,
    update: (elapsed) => {
      for (let i = 0; i < bees.length; i++) {
        const b = bees[i];
        const ang = elapsed * b.speed + b.phase;
        const nextAng = ang + Math.sign(b.speed) * 0.06;
        const r = b.orbitR + Math.sin(elapsed * 1.3 + b.phase) * 0.65;

        const x = cherryCenter[0] + Math.cos(ang) * r;
        const z = cherryCenter[2] + Math.sin(ang) * r;
        const y = cherryCenter[1] + b.yOffset + Math.sin(elapsed * 2.8 + b.phase) * 0.55;

        const nx = cherryCenter[0] + Math.cos(nextAng) * r;
        const nz = cherryCenter[2] + Math.sin(nextAng) * r;

        b.bee.position.set(x, y, z);
        b.bee.rotation.y = Math.atan2(nx - x, nz - z);
        b.bee.rotation.z = Math.sin(elapsed * 3.0 + i) * 0.08;

        const flap = Math.sin(elapsed * 38.0 + i * 1.7) * 0.65;
        b.wingL.rotation.z = 0.25 + flap;
        b.wingR.rotation.z = -0.25 - flap;
      }
    },
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}

// ============================================================================
// 6. PIXEL DOLPHIN LEAPING BETWEEN THE 3 ISLANDS + SPLASH BURST
// ============================================================================
export interface DolphinSystem {
  group: THREE.Group;
  update: (dt: number, elapsed: number, onSplash?: () => void) => void;
  dispose: () => void;
}

interface SplashDrop {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
}

export function createVoxelDolphin(): DolphinSystem {
  const group = new THREE.Group();
  const disposables: Array<{ dispose: () => void }> = [];

  const dolphinTopMat = new THREE.MeshStandardMaterial({ color: '#6b9ac4', roughness: 0.45, metalness: 0.08 });
  const dolphinBellyMat = new THREE.MeshStandardMaterial({ color: '#d8e9f5', roughness: 0.5 });
  const eyeMat = new THREE.MeshBasicMaterial({ color: '#0f172a' });
  const splashMat = new THREE.MeshBasicMaterial({ color: '#f0f9ff', transparent: true, opacity: 0.9 });
  disposables.push(dolphinTopMat, dolphinBellyMat, eyeMat, splashMat);

  const dolphin = new THREE.Group();
  const bodyGeo = new THREE.BoxGeometry(0.56, 0.44, 1.35);
  const bellyGeo = new THREE.BoxGeometry(0.5, 0.16, 1.28);
  const headGeo = new THREE.BoxGeometry(0.46, 0.36, 0.44);
  const snoutGeo = new THREE.BoxGeometry(0.24, 0.16, 0.38);
  const dorsalGeo = new THREE.BoxGeometry(0.1, 0.34, 0.42);
  const finGeo = new THREE.BoxGeometry(0.48, 0.08, 0.26);
  const tailGeo = new THREE.BoxGeometry(0.24, 0.2, 0.65);
  const flukeGeo = new THREE.BoxGeometry(0.76, 0.08, 0.34);
  const eyeGeo = new THREE.BoxGeometry(0.06, 0.07, 0.06);
  const splashGeo = new THREE.BoxGeometry(0.24, 0.24, 0.24);
  disposables.push(bodyGeo, bellyGeo, headGeo, snoutGeo, dorsalGeo, finGeo, tailGeo, flukeGeo, eyeGeo, splashGeo);

  const body = new THREE.Mesh(bodyGeo, dolphinTopMat);
  body.castShadow = true;
  dolphin.add(body);

  const belly = new THREE.Mesh(bellyGeo, dolphinBellyMat);
  belly.position.set(0, -0.18, 0.02);
  dolphin.add(belly);

  const head = new THREE.Mesh(headGeo, dolphinTopMat);
  head.position.set(0, -0.02, 0.85);
  dolphin.add(head);

  const snout = new THREE.Mesh(snoutGeo, dolphinTopMat);
  snout.position.set(0, -0.1, 1.22);
  dolphin.add(snout);

  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.23, 0.0, 0.92);
  const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
  eyeR.position.set(0.23, 0.0, 0.92);
  dolphin.add(eyeL, eyeR);

  const dorsal = new THREE.Mesh(dorsalGeo, dolphinTopMat);
  dorsal.position.set(0, 0.34, 0.0);
  dorsal.rotation.x = -0.35;
  dolphin.add(dorsal);

  const finL = new THREE.Mesh(finGeo, dolphinTopMat);
  finL.position.set(-0.46, -0.12, 0.32);
  finL.rotation.z = -0.32;
  const finR = new THREE.Mesh(finGeo, dolphinTopMat);
  finR.position.set(0.46, -0.12, 0.32);
  finR.rotation.z = 0.32;
  dolphin.add(finL, finR);

  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, -0.02, -0.68);
  const tail = new THREE.Mesh(tailGeo, dolphinTopMat);
  tail.position.set(0, 0, -0.3);
  const fluke = new THREE.Mesh(flukeGeo, dolphinTopMat);
  fluke.position.set(0, 0, -0.64);
  tailPivot.add(tail, fluke);
  dolphin.add(tailPivot);

  dolphin.scale.setScalar(1.35);
  dolphin.visible = false;
  group.add(dolphin);

  // Open-water leap routes nestled cleanly across the expanded v0.6 sea lanes
  const routes: Array<{ start: [number, number]; end: [number, number]; peakY: number }> = [
    { start: [-36, 26], end: [-24, 34], peakY: 4.8 }, // Between Main & Lighthouse Isle
    { start: [30, 18], end: [40, 4], peakY: 4.6 },    // Between Main & Workshop Isle
    { start: [-36, -24], end: [-46, -12], peakY: 4.5 }, // North-West open channel
    { start: [22, -34], end: [36, -38], peakY: 4.6 },  // North-East open channel
  ];

  const maxDrops = 28;
  const splashMesh = new THREE.InstancedMesh(splashGeo, splashMat, maxDrops);
  splashMesh.visible = false;
  group.add(splashMesh);

  const drops: SplashDrop[] = [];
  const dummy = new THREE.Object3D();

  const triggerSplash = (x: number, z: number, onSplash?: () => void) => {
    drops.length = 0;
    for (let i = 0; i < maxDrops; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 1.6 + Math.random() * 3.4;
      drops.push({
        pos: new THREE.Vector3(x + (Math.random() - 0.5) * 0.9, 0.55, z + (Math.random() - 0.5) * 0.9),
        vel: new THREE.Vector3(Math.cos(a) * spd, 2.8 + Math.random() * 3.2, Math.sin(a) * spd),
        life: 0,
        maxLife: 0.65 + Math.random() * 0.45,
      });
    }
    splashMesh.visible = true;
    onSplash?.();
  };

  let cooldown = 4.5; // First leap soon after load so user sees it quickly!
  let leaping = false;
  let leapT = 0;
  const leapDuration = 2.05;
  let activeRoute = routes[0];
  let routeIdx = 0;
  let entrySplashed = false;

  return {
    group,
    update: (dt, elapsed, onSplash) => {
      if (!leaping) {
        cooldown -= dt;
        if (cooldown <= 0) {
          leaping = true;
          leapT = 0;
          entrySplashed = false;
          activeRoute = routes[routeIdx % routes.length];
          routeIdx++;
          dolphin.visible = true;
          triggerSplash(activeRoute.start[0], activeRoute.start[1], onSplash);
        }
      } else {
        leapT += dt / leapDuration;
        if (leapT >= 1) {
          leaping = false;
          dolphin.visible = false;
          cooldown = 8.0 + Math.random() * 4.0;
        } else {
          const x = THREE.MathUtils.lerp(activeRoute.start[0], activeRoute.end[0], leapT);
          const z = THREE.MathUtils.lerp(activeRoute.start[1], activeRoute.end[1], leapT);
          // Smooth parabola dipping below water at t=0 and t=1
          const arc = 4 * leapT * (1 - leapT);
          const y = -0.75 + arc * (activeRoute.peakY + 0.75);

          // Tangent for realistic nose pitch along parabolic trajectory
          const dx = activeRoute.end[0] - activeRoute.start[0];
          const dz = activeRoute.end[1] - activeRoute.start[1];
          const horizDist = Math.hypot(dx, dz);
          const dy = 4 * (1 - 2 * leapT) * (activeRoute.peakY + 0.75);

          dolphin.position.set(x, y, z);
          dolphin.rotation.order = 'YXZ';
          dolphin.rotation.y = Math.atan2(dx, dz);
          dolphin.rotation.x = -Math.atan2(dy, horizDist);
          tailPivot.rotation.x = Math.sin(elapsed * 16) * 0.35;

          if (!entrySplashed && leapT > 0.88) {
            entrySplashed = true;
            triggerSplash(activeRoute.end[0], activeRoute.end[1], onSplash);
          }
        }
      }

      if (splashMesh.visible) {
        let alive = 0;
        for (let i = 0; i < drops.length; i++) {
          const d = drops[i];
          d.life += dt;
          if (d.life < d.maxLife) {
            alive++;
            d.vel.y -= 10.5 * dt;
            d.pos.addScaledVector(d.vel, dt);
            const s = Math.max(0.02, (1 - d.life / d.maxLife) * 1.15);
            dummy.position.copy(d.pos);
            dummy.rotation.set(d.life * 4, d.life * 3, 0);
            dummy.scale.setScalar(s);
          } else {
            dummy.scale.setScalar(0);
          }
          dummy.updateMatrix();
          splashMesh.setMatrixAt(i, dummy.matrix);
        }
        splashMesh.instanceMatrix.needsUpdate = true;
        if (alive === 0) splashMesh.visible = false;
      }
    },
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}

// ============================================================================
// 7. NIGHT SHOOTING STARS (EVERY 10-15 SECONDS AT NIGHT)
// ============================================================================
export interface ShootingStarSystem {
  group: THREE.Group;
  update: (dt: number, nightFactor: number) => void;
  dispose: () => void;
}

export function createShootingStarSystem(): ShootingStarSystem {
  const group = new THREE.Group();
  const tailSegments = 7;

  const headGeo = new THREE.BoxGeometry(0.95, 0.95, 0.95);
  const headMat = new THREE.MeshBasicMaterial({
    color: '#fffbeb',
    transparent: true,
    opacity: 0,
    fog: false,
  });
  const headMesh = new THREE.Mesh(headGeo, headMat);
  group.add(headMesh);

  const tailGeo = new THREE.BoxGeometry(0.55, 0.55, 0.55);
  const tailMats: THREE.MeshBasicMaterial[] = [];
  const tailMeshes: THREE.Mesh[] = [];
  for (let i = 0; i < tailSegments; i++) {
    const m = new THREE.MeshBasicMaterial({
      color: i < 3 ? '#fef08a' : '#bae6fd',
      transparent: true,
      opacity: 0,
      fog: false,
    });
    const mesh = new THREE.Mesh(tailGeo, m);
    tailMats.push(m);
    tailMeshes.push(mesh);
    group.add(mesh);
  }
  group.visible = false;

  let active = false;
  let timer = 5.0; // First shooting star arrives promptly once night falls
  let progress = 0;
  const duration = 1.35;
  const startPos = new THREE.Vector3();
  const endPos = new THREE.Vector3();
  const currPos = new THREE.Vector3();
  const dirVec = new THREE.Vector3();

  return {
    group,
    update: (dt, nightFactor) => {
      if (nightFactor < 0.45) {
        if (active) {
          active = false;
          group.visible = false;
        }
        return;
      }

      if (!active) {
        timer -= dt;
        if (timer <= 0) {
          active = true;
          progress = 0;
          const az = Math.random() * Math.PI * 2;
          const r = 165;
          startPos.set(Math.cos(az) * r, 72 + Math.random() * 44, Math.sin(az) * r);
          const endAz = az + (Math.random() > 0.5 ? 0.55 : -0.55);
          endPos.set(Math.cos(endAz) * r, 34 + Math.random() * 24, Math.sin(endAz) * r);
          dirVec.subVectors(endPos, startPos).normalize();
          group.visible = true;
        }
      } else {
        progress += dt / duration;
        if (progress >= 1) {
          active = false;
          group.visible = false;
          timer = 10.0 + Math.random() * 5.0;
        } else {
          const alpha = Math.sin(progress * Math.PI) * nightFactor;
          currPos.lerpVectors(startPos, endPos, progress);
          headMesh.position.copy(currPos);
          headMat.opacity = alpha;

          for (let i = 0; i < tailSegments; i++) {
            const back = (i + 1) * 2.1;
            tailMeshes[i].position.copy(currPos).addScaledVector(dirVec, -back);
            const s = 1 - i / (tailSegments + 1);
            tailMeshes[i].scale.setScalar(s);
            tailMats[i].opacity = alpha * s * 0.78;
          }
        }
      }
    },
    dispose: () => {
      headGeo.dispose();
      headMat.dispose();
      tailGeo.dispose();
      tailMats.forEach((m) => m.dispose());
    },
  };
}
