import * as THREE from 'three';

export type Vec3 = [number, number, number];
export type CardinalDir = 'n' | 's' | 'e' | 'w';
export type StairShape = 'straight' | 'outer_left' | 'outer_right' | 'inner_left' | 'inner_right';

export interface LanternPlacement {
  pos: Vec3;
  hanging: boolean;
}

export interface StairPlacement {
  pos: Vec3;
  facing: CardinalDir;
  half: 'bottom' | 'top';
  shape: StairShape;
  material: 'stoneBricks' | 'sprucePlanks' | 'deepslateTiles' | 'oakPlanks';
}

export interface SlabPlacement {
  pos: Vec3;
  half: 'bottom' | 'top';
  material: 'stoneBricks' | 'oakPlanks' | 'sprucePlanks' | 'deepslateTiles';
}

export interface DirectionalConn {
  pos: Vec3;
  north: boolean;
  south: boolean;
  east: boolean;
  west: boolean;
}

export interface DoorPlacement {
  pos: Vec3;
  facing: CardinalDir;
  half: 'lower' | 'upper';
}

export interface LightningRodPlacement {
  pos: Vec3;
  facing: 'up' | 'down' | CardinalDir;
}

export interface TrapdoorPlacement {
  pos: Vec3;
  facing: CardinalDir;
  open: boolean;
  half: 'bottom' | 'top';
}

const DIR_TO_YAW: Record<CardinalDir, number> = {
  n: 0,
  e: -Math.PI / 2,
  s: Math.PI,
  w: Math.PI / 2,
};

function mergeBoxParts(parts: Array<{ size: Vec3; offset: Vec3 }>): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  let vertexOffset = 0;

  for (const part of parts) {
    const g = new THREE.BoxGeometry(part.size[0], part.size[1], part.size[2]);
    g.translate(part.offset[0], part.offset[1], part.offset[2]);

    const posAttr = g.getAttribute('position');
    const normAttr = g.getAttribute('normal');
    const uvAttr = g.getAttribute('uv');
    const idxAttr = g.getIndex();

    for (let i = 0; i < posAttr.count; i++) {
      positions.push(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
      normals.push(normAttr.getX(i), normAttr.getY(i), normAttr.getZ(i));
      uvs.push(uvAttr.getX(i), uvAttr.getY(i));
    }
    if (idxAttr) {
      for (let i = 0; i < idxAttr.count; i++) {
        indices.push(idxAttr.getX(i) + vertexOffset);
      }
    }
    vertexOffset += posAttr.count;
    g.dispose();
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  merged.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  merged.setIndex(indices);
  return merged;
}

/**
 * Full-fidelity Minecraft Java 1.20.1 Stair Geometry Library:
 * Exact outward-normal meshes for bottom/top x straight/outer_left/outer_right/inner_left/inner_right.
 */
function buildStairVariantGeometry(
  half: 'bottom' | 'top',
  shape: StairShape,
): THREE.BufferGeometry {
  const baseY = half === 'bottom' ? -0.25 : 0.25;
  const stepY = half === 'bottom' ? 0.25 : -0.25;
  const parts: Array<{ size: Vec3; offset: Vec3 }> = [
    { size: [1.0, 0.5, 1.0], offset: [0, baseY, 0] },
  ];

  // Canonical facing = north (-Z back step) matching Minecraft 1.20.1 & MCP render convention:
  // outer_left -> NE (+X, -Z) quarter; outer_right -> NW (-X, -Z) quarter
  if (shape === 'straight') {
    parts.push({ size: [1.0, 0.5, 0.5], offset: [0, stepY, -0.25] });
  } else if (shape === 'outer_left') {
    parts.push({ size: [0.5, 0.5, 0.5], offset: [0.25, stepY, -0.25] });
  } else if (shape === 'outer_right') {
    parts.push({ size: [0.5, 0.5, 0.5], offset: [-0.25, stepY, -0.25] });
  } else if (shape === 'inner_left') {
    parts.push({ size: [1.0, 0.5, 0.5], offset: [0, stepY, -0.25] });
    parts.push({ size: [0.5, 0.5, 0.5], offset: [0.25, stepY, 0.25] });
  } else if (shape === 'inner_right') {
    parts.push({ size: [1.0, 0.5, 0.5], offset: [0, stepY, -0.25] });
    parts.push({ size: [0.5, 0.5, 0.5], offset: [-0.25, stepY, 0.25] });
  }

  return mergeBoxParts(parts);
}

export function createStairSystem(
  stairs: StairPlacement[],
  materials: Record<StairPlacement['material'], THREE.Material>,
): { group: THREE.Group; dispose: () => void } {
  const group = new THREE.Group();
  const geoCache = new Map<string, THREE.BufferGeometry>();
  const buckets = new Map<string, StairPlacement[]>();

  for (const s of stairs) {
    const key = `${s.material}|${s.half}|${s.shape}`;
    const arr = buckets.get(key);
    if (arr) arr.push(s);
    else buckets.set(key, [s]);
  }

  const dummy = new THREE.Object3D();
  for (const [key, list] of buckets.entries()) {
    const [matKey, half, shape] = key.split('|') as [
      StairPlacement['material'],
      'bottom' | 'top',
      StairShape,
    ];
    const geoKey = `${half}|${shape}`;
    let geo = geoCache.get(geoKey);
    if (!geo) {
      geo = buildStairVariantGeometry(half, shape);
      geoCache.set(geoKey, geo);
    }

    const mesh = new THREE.InstancedMesh(geo, materials[matKey], list.length);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    list.forEach((item, idx) => {
      dummy.position.set(item.pos[0], item.pos[1], item.pos[2]);
      dummy.rotation.set(0, DIR_TO_YAW[item.facing], 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(idx, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);
  }

  return {
    group,
    dispose: () => {
      geoCache.forEach((g) => g.dispose());
    },
  };
}

export function createSlabSystem(
  slabs: SlabPlacement[],
  materials: Record<SlabPlacement['material'], THREE.Material>,
): { group: THREE.Group; dispose: () => void } {
  const group = new THREE.Group();
  const slabGeo = new THREE.BoxGeometry(1.0, 0.5, 1.0);
  const byMat: Record<SlabPlacement['material'], SlabPlacement[]> = {
    stoneBricks: [],
    oakPlanks: [],
    sprucePlanks: [],
    deepslateTiles: [],
  };
  for (const s of slabs) byMat[s.material].push(s);

  const dummy = new THREE.Object3D();
  (Object.keys(byMat) as SlabPlacement['material'][]).forEach((matKey) => {
    const list = byMat[matKey];
    if (list.length === 0) return;
    const mesh = new THREE.InstancedMesh(slabGeo, materials[matKey], list.length);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    list.forEach((item, idx) => {
      const yOff = item.half === 'bottom' ? -0.25 : 0.25;
      dummy.position.set(item.pos[0], item.pos[1] + yOff, item.pos[2]);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(idx, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);
  });

  return {
    group,
    dispose: () => slabGeo.dispose(),
  };
}

/**
 * Exact NBT-property-driven Oak Fence:
 * Center post (0.25 x 1.0 x 0.25) + double 0.12-thick half-span rails for each true cardinal connection.
 */
export function createVanillaFenceGroup(
  fences: DirectionalConn[],
  woodMat: THREE.Material,
): { group: THREE.Group; dispose: () => void } {
  const group = new THREE.Group();
  const postGeo = new THREE.BoxGeometry(0.25, 1.0, 0.25);
  const railXGeo = new THREE.BoxGeometry(0.5, 0.15, 0.12);
  const railZGeo = new THREE.BoxGeometry(0.12, 0.15, 0.5);

  const dummy = new THREE.Object3D();
  if (fences.length > 0) {
    const postMesh = new THREE.InstancedMesh(postGeo, woodMat, fences.length);
    postMesh.castShadow = true;
    postMesh.receiveShadow = true;
    fences.forEach((f, i) => {
      dummy.position.set(f.pos[0], f.pos[1], f.pos[2]);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      postMesh.setMatrixAt(i, dummy.matrix);
    });
    postMesh.instanceMatrix.needsUpdate = true;
    group.add(postMesh);
  }

  const xRails: Vec3[] = [];
  const zRails: Vec3[] = [];
  for (const f of fences) {
    const [x, y, z] = f.pos;
    if (f.east) {
      xRails.push([x + 0.25, y - 0.12, z], [x + 0.25, y + 0.24, z]);
    }
    if (f.west) {
      xRails.push([x - 0.25, y - 0.12, z], [x - 0.25, y + 0.24, z]);
    }
    if (f.south) {
      zRails.push([x, y - 0.12, z + 0.25], [x, y + 0.24, z + 0.25]);
    }
    if (f.north) {
      zRails.push([x, y - 0.12, z - 0.25], [x, y + 0.24, z - 0.25]);
    }
  }

  if (xRails.length > 0) {
    const meshX = new THREE.InstancedMesh(railXGeo, woodMat, xRails.length);
    meshX.castShadow = true;
    meshX.receiveShadow = true;
    xRails.forEach(([x, y, z], i) => {
      dummy.position.set(x, y, z);
      dummy.updateMatrix();
      meshX.setMatrixAt(i, dummy.matrix);
    });
    meshX.instanceMatrix.needsUpdate = true;
    group.add(meshX);
  }

  if (zRails.length > 0) {
    const meshZ = new THREE.InstancedMesh(railZGeo, woodMat, zRails.length);
    meshZ.castShadow = true;
    meshZ.receiveShadow = true;
    zRails.forEach(([x, y, z], i) => {
      dummy.position.set(x, y, z);
      dummy.updateMatrix();
      meshZ.setMatrixAt(i, dummy.matrix);
    });
    meshZ.instanceMatrix.needsUpdate = true;
    group.add(meshZ);
  }

  return {
    group,
    dispose: () => {
      postGeo.dispose();
      railXGeo.dispose();
      railZGeo.dispose();
    },
  };
}

/**
 * Exact NBT-property-driven Glass Panes, Deepslate Tile Walls, Iron Bars, Oak Doors & Lightning Rods!
 */
export function createArchitecturalDetailsGroup(params: {
  glassPanes: DirectionalConn[];
  walls: DirectionalConn[];
  ironBars: DirectionalConn[];
  doors: DoorPlacement[];
  lightningRods: LightningRodPlacement[];
  trapdoors?: TrapdoorPlacement[];
  glassMat: THREE.Material;
  wallMat: THREE.Material;
  doorLowerMat: THREE.Material;
  doorUpperMat: THREE.Material;
  copperMat: THREE.Material;
  trapdoorMat?: THREE.Material;
}): { group: THREE.Group; dispose: () => void } {
  const group = new THREE.Group();
  const disposables: Array<{ dispose: () => void }> = [];
  const dummy = new THREE.Object3D();

  // 1. Directional Glass Panes (0.14 thick, glowing warm at night via windowGlass material!)
  if (params.glassPanes.length > 0) {
    const paneCoreGeo = new THREE.BoxGeometry(0.14, 1.0, 0.14);
    const paneXGeo = new THREE.BoxGeometry(0.5, 1.0, 0.14);
    const paneZGeo = new THREE.BoxGeometry(0.14, 1.0, 0.5);
    disposables.push(paneCoreGeo, paneXGeo, paneZGeo);

    const coreMesh = new THREE.InstancedMesh(paneCoreGeo, params.glassMat, params.glassPanes.length);
    const xWings: Vec3[] = [];
    const zWings: Vec3[] = [];
    params.glassPanes.forEach((p, i) => {
      const [x, y, z] = p.pos;
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      coreMesh.setMatrixAt(i, dummy.matrix);
      if (p.east) xWings.push([x + 0.25, y, z]);
      if (p.west) xWings.push([x - 0.25, y, z]);
      if (p.south) zWings.push([x, y, z + 0.25]);
      if (p.north) zWings.push([x, y, z - 0.25]);
    });
    coreMesh.instanceMatrix.needsUpdate = true;
    group.add(coreMesh);

    if (xWings.length > 0) {
      const mx = new THREE.InstancedMesh(paneXGeo, params.glassMat, xWings.length);
      xWings.forEach(([x, y, z], i) => {
        dummy.position.set(x, y, z);
        dummy.updateMatrix();
        mx.setMatrixAt(i, dummy.matrix);
      });
      mx.instanceMatrix.needsUpdate = true;
      group.add(mx);
    }
    if (zWings.length > 0) {
      const mz = new THREE.InstancedMesh(paneZGeo, params.glassMat, zWings.length);
      zWings.forEach(([x, y, z], i) => {
        dummy.position.set(x, y, z);
        dummy.updateMatrix();
        mz.setMatrixAt(i, dummy.matrix);
      });
      mz.instanceMatrix.needsUpdate = true;
      group.add(mz);
    }
  }

  // 2. Deepslate Tile Walls (0.5 x 1.0 x 0.5 post + directional wings)
  if (params.walls.length > 0) {
    const wallPostGeo = new THREE.BoxGeometry(0.5, 1.0, 0.5);
    const wallXGeo = new THREE.BoxGeometry(0.5, 0.85, 0.36);
    const wallZGeo = new THREE.BoxGeometry(0.36, 0.85, 0.5);
    disposables.push(wallPostGeo, wallXGeo, wallZGeo);

    const postMesh = new THREE.InstancedMesh(wallPostGeo, params.wallMat, params.walls.length);
    postMesh.castShadow = true;
    postMesh.receiveShadow = true;
    const xW: Vec3[] = [];
    const zW: Vec3[] = [];
    params.walls.forEach((w, i) => {
      const [x, y, z] = w.pos;
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      postMesh.setMatrixAt(i, dummy.matrix);
      if (w.east) xW.push([x + 0.25, y - 0.075, z]);
      if (w.west) xW.push([x - 0.25, y - 0.075, z]);
      if (w.south) zW.push([x, y - 0.075, z + 0.25]);
      if (w.north) zW.push([x, y - 0.075, z - 0.25]);
    });
    postMesh.instanceMatrix.needsUpdate = true;
    group.add(postMesh);

    if (xW.length > 0) {
      const mx = new THREE.InstancedMesh(wallXGeo, params.wallMat, xW.length);
      xW.forEach(([x, y, z], i) => {
        dummy.position.set(x, y, z);
        dummy.updateMatrix();
        mx.setMatrixAt(i, dummy.matrix);
      });
      mx.instanceMatrix.needsUpdate = true;
      group.add(mx);
    }
    if (zW.length > 0) {
      const mz = new THREE.InstancedMesh(wallZGeo, params.wallMat, zW.length);
      zW.forEach(([x, y, z], i) => {
        dummy.position.set(x, y, z);
        dummy.updateMatrix();
        mz.setMatrixAt(i, dummy.matrix);
      });
      mz.instanceMatrix.needsUpdate = true;
      group.add(mz);
    }
  }

  // 3. Iron Bars (0.14 forged iron shaft + directional crossbars)
  if (params.ironBars.length > 0) {
    const ironMat = new THREE.MeshStandardMaterial({
      color: '#4b5563',
      roughness: 0.45,
      metalness: 0.72,
    });
    const barGeo = new THREE.BoxGeometry(0.14, 1.0, 0.14);
    const barXGeo = new THREE.BoxGeometry(0.5, 0.96, 0.1);
    const barZGeo = new THREE.BoxGeometry(0.1, 0.96, 0.5);
    disposables.push(ironMat, barGeo, barXGeo, barZGeo);

    const mesh = new THREE.InstancedMesh(barGeo, ironMat, params.ironBars.length);
    mesh.castShadow = true;
    const xB: Vec3[] = [];
    const zB: Vec3[] = [];
    params.ironBars.forEach((b, i) => {
      const [x, y, z] = b.pos;
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      if (b.east) xB.push([x + 0.25, y, z]);
      if (b.west) xB.push([x - 0.25, y, z]);
      if (b.south) zB.push([x, y, z + 0.25]);
      if (b.north) zB.push([x, y, z - 0.25]);
    });
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);

    if (xB.length > 0) {
      const mx = new THREE.InstancedMesh(barXGeo, ironMat, xB.length);
      xB.forEach(([x, y, z], i) => {
        dummy.position.set(x, y, z);
        dummy.updateMatrix();
        mx.setMatrixAt(i, dummy.matrix);
      });
      mx.instanceMatrix.needsUpdate = true;
      group.add(mx);
    }
    if (zB.length > 0) {
      const mz = new THREE.InstancedMesh(barZGeo, ironMat, zB.length);
      zB.forEach(([x, y, z], i) => {
        dummy.position.set(x, y, z);
        dummy.updateMatrix();
        mz.setMatrixAt(i, dummy.matrix);
      });
      mz.instanceMatrix.needsUpdate = true;
      group.add(mz);
    }
  }

  // 4. Oak Doors (0.18-thick leaf placed flush along doorway edge by facing)
  if (params.doors.length > 0) {
    const doorGeo = new THREE.BoxGeometry(1.0, 1.0, 0.18);
    disposables.push(doorGeo);

    const lowerDoors = params.doors.filter((d) => d.half === 'lower');
    const upperDoors = params.doors.filter((d) => d.half === 'upper');

    const placeDoors = (list: DoorPlacement[], mat: THREE.Material) => {
      if (list.length === 0) return;
      const mesh = new THREE.InstancedMesh(doorGeo, mat, list.length);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      list.forEach((d, i) => {
        let ox = 0;
        let oz = 0;
        let yaw = 0;
        if (d.facing === 'w') {
          ox = 0.41;
          yaw = Math.PI / 2;
        } else if (d.facing === 'e') {
          ox = -0.41;
          yaw = -Math.PI / 2;
        } else if (d.facing === 'n') {
          oz = 0.41;
          yaw = 0;
        } else {
          oz = -0.41;
          yaw = Math.PI;
        }
        dummy.position.set(d.pos[0] + ox, d.pos[1], d.pos[2] + oz);
        dummy.rotation.set(0, yaw, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      group.add(mesh);
    };

    placeDoors(lowerDoors, params.doorLowerMat);
    placeDoors(upperDoors, params.doorUpperMat);
  }

  // 5. Vanilla Copper Lightning Rods
  if (params.lightningRods.length > 0) {
    const rodGeo = mergeBoxParts([
      { size: [0.14, 0.76, 0.14], offset: [0, -0.12, 0] },
      { size: [0.26, 0.24, 0.26], offset: [0, 0.38, 0] },
    ]);
    disposables.push(rodGeo);
    const mesh = new THREE.InstancedMesh(rodGeo, params.copperMat, params.lightningRods.length);
    mesh.castShadow = true;
    params.lightningRods.forEach((r, i) => {
      dummy.position.set(r.pos[0], r.pos[1], r.pos[2]);
      dummy.rotation.set(0, 0, 0);
      if (r.facing === 'down') dummy.rotation.x = Math.PI;
      else if (r.facing === 'n') dummy.rotation.x = -Math.PI / 2;
      else if (r.facing === 's') dummy.rotation.x = Math.PI / 2;
      else if (r.facing === 'e') dummy.rotation.z = -Math.PI / 2;
      else if (r.facing === 'w') dummy.rotation.z = Math.PI / 2;
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);
  }

  // 6. Vanilla Spruce Trapdoors (0.18-thick flush shutters & hatches)
  if (params.trapdoors && params.trapdoors.length > 0 && params.trapdoorMat) {
    const tdGeo = new THREE.BoxGeometry(1.0, 1.0, 0.18);
    disposables.push(tdGeo);
    const mesh = new THREE.InstancedMesh(tdGeo, params.trapdoorMat, params.trapdoors.length);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    params.trapdoors.forEach((td, i) => {
      if (td.open) {
        let ox = 0;
        let oz = 0;
        let yaw = 0;
        // Open trapdoor hugs the back face opposite its facing direction!
        if (td.facing === 's') {
          oz = -0.41;
          yaw = 0;
        } else if (td.facing === 'n') {
          oz = 0.41;
          yaw = Math.PI;
        } else if (td.facing === 'e') {
          ox = -0.41;
          yaw = Math.PI / 2;
        } else {
          ox = 0.41;
          yaw = -Math.PI / 2;
        }
        dummy.position.set(td.pos[0] + ox, td.pos[1], td.pos[2] + oz);
        dummy.rotation.set(0, yaw, 0);
      } else {
        const oy = td.half === 'top' ? 0.41 : -0.41;
        dummy.position.set(td.pos[0], td.pos[1] + oy, td.pos[2]);
        dummy.rotation.set(Math.PI / 2, 0, 0);
      }
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);
  }

  return {
    group,
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}

/**
 * Delicate Vanilla Minecraft Lantern Sub-Voxel Model (0.38 wide x 0.48 tall).
 */
export function createVanillaLanternSystem(placements: LanternPlacement[]): {
  group: THREE.Group;
  coreMat: THREE.MeshStandardMaterial;
  dispose: () => void;
} {
  const group = new THREE.Group();

  const ironMat = new THREE.MeshStandardMaterial({
    color: '#252a34',
    roughness: 0.52,
    metalness: 0.65,
  });

  const coreMat = new THREE.MeshStandardMaterial({
    color: '#ffd978',
    emissive: new THREE.Color('#ffaa33'),
    emissiveIntensity: 0.45,
    roughness: 0.25,
    metalness: 0.05,
  });

  const ironBodyGeo = mergeBoxParts([
    { size: [0.38, 0.07, 0.38], offset: [0, -0.205, 0] },
    { size: [0.38, 0.07, 0.38], offset: [0, 0.145, 0] },
    { size: [0.24, 0.06, 0.24], offset: [0, 0.21, 0] },
    { size: [0.05, 0.3, 0.05], offset: [-0.16, -0.03, -0.16] },
    { size: [0.05, 0.3, 0.05], offset: [0.16, -0.03, -0.16] },
    { size: [0.05, 0.3, 0.05], offset: [-0.16, -0.03, 0.16] },
    { size: [0.05, 0.3, 0.05], offset: [0.16, -0.03, 0.16] },
  ]);

  const coreGeo = new THREE.BoxGeometry(0.3, 0.29, 0.3);
  const ringGeo = new THREE.BoxGeometry(0.09, 0.1, 0.09);
  const chainGeo = new THREE.BoxGeometry(0.08, 0.28, 0.08);

  const count = Math.max(placements.length, 1);
  const ironMesh = new THREE.InstancedMesh(ironBodyGeo, ironMat, count);
  ironMesh.castShadow = true;
  ironMesh.receiveShadow = true;
  const coreMesh = new THREE.InstancedMesh(coreGeo, coreMat, count);

  const hangingItems: Vec3[] = [];
  const standingItems: Vec3[] = [];
  const dummy = new THREE.Object3D();

  placements.forEach((item, i) => {
    const [x, y, z] = item.pos;
    const cy = item.hanging ? y + 0.02 : y - 0.26;
    dummy.position.set(x, cy, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    ironMesh.setMatrixAt(i, dummy.matrix);

    dummy.position.set(x, cy - 0.03, z);
    dummy.updateMatrix();
    coreMesh.setMatrixAt(i, dummy.matrix);

    if (item.hanging) hangingItems.push([x, cy + 0.34, z]);
    else standingItems.push([x, cy + 0.27, z]);
  });
  ironMesh.count = placements.length;
  coreMesh.count = placements.length;
  ironMesh.instanceMatrix.needsUpdate = true;
  coreMesh.instanceMatrix.needsUpdate = true;
  group.add(ironMesh, coreMesh);

  if (hangingItems.length > 0) {
    const chainMesh = new THREE.InstancedMesh(chainGeo, ironMat, hangingItems.length);
    hangingItems.forEach(([x, y, z], i) => {
      dummy.position.set(x, y, z);
      dummy.updateMatrix();
      chainMesh.setMatrixAt(i, dummy.matrix);
    });
    chainMesh.instanceMatrix.needsUpdate = true;
    group.add(chainMesh);
  }

  if (standingItems.length > 0) {
    const ringMesh = new THREE.InstancedMesh(ringGeo, ironMat, standingItems.length);
    standingItems.forEach(([x, y, z], i) => {
      dummy.position.set(x, y, z);
      dummy.updateMatrix();
      ringMesh.setMatrixAt(i, dummy.matrix);
    });
    ringMesh.instanceMatrix.needsUpdate = true;
    group.add(ringMesh);
  }

  return {
    group,
    coreMat,
    dispose: () => {
      ironBodyGeo.dispose();
      coreGeo.dispose();
      ringGeo.dispose();
      chainGeo.dispose();
      ironMat.dispose();
      coreMat.dispose();
    },
  };
}

/**
 * Builds a single seamless face-culled water BufferGeometry from voxel coordinates,
 * omitting internal faces shared between adjacent water blocks (eliminating cube grid seams!).
 */
export function buildSeamlessWaterGeometry(
  positions: Vec3[],
  allWaterSet: Set<string>,
  lowerExposedTop = false,
): THREE.BufferGeometry {
  const posArr: number[] = [];
  const normArr: number[] = [];
  const idxArr: number[] = [];
  let vertCount = 0;

  const pushQuad = (
    v0: Vec3,
    v1: Vec3,
    v2: Vec3,
    v3: Vec3,
    n: Vec3,
  ) => {
    posArr.push(...v0, ...v1, ...v2, ...v3);
    normArr.push(...n, ...n, ...n, ...n);
    idxArr.push(vertCount, vertCount + 1, vertCount + 2, vertCount, vertCount + 2, vertCount + 3);
    vertCount += 4;
  };

  const hasWater = (x: number, y: number, z: number) => allWaterSet.has(`${x},${y},${z}`);

  for (const [x, y, z] of positions) {
    const x0 = x - 0.5;
    const x1 = x + 0.5;
    const y0 = y - 0.5;
    const waterAbove = hasWater(x, y + 1, z);
    // Calm pool surface sits slightly recessed (just like vanilla Minecraft water!) unless water flows directly above
    const y1 = !waterAbove && lowerExposedTop ? y + 0.42 : y + 0.5;
    const z0 = z - 0.5;
    const z1 = z + 0.5;

    // +Y top face
    if (!waterAbove) {
      pushQuad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0]);
    }
    // -Y bottom face
    if (!hasWater(x, y - 1, z)) {
      pushQuad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0]);
    }
    // +Z south face
    if (!hasWater(x, y, z + 1)) {
      pushQuad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1]);
    }
    // -Z north face
    if (!hasWater(x, y, z - 1)) {
      pushQuad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1]);
    }
    // +X east face
    if (!hasWater(x + 1, y, z)) {
      pushQuad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0]);
    }
    // -X west face
    if (!hasWater(x - 1, y, z)) {
      pushQuad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0]);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normArr, 3));
  geo.setIndex(idxArr);
  return geo;
}
