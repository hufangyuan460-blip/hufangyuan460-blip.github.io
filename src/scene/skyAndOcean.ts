import * as THREE from 'three';
import type { TimePhase } from '../worlds/types';

export interface SkySystem {
  dome: THREE.Mesh;
  sunGroup: THREE.Group;
  moonGroup: THREE.Group;
  sunDirection: THREE.Vector3;
  moonDirection: THREE.Vector3;
  horizonColor: THREE.Color;
  zenithColor: THREE.Color;
  /**
   * Updates the continuous 24-hour vanilla sky cycle.
   * dayPhase in [0, 1):
   *   0.00 = Dawn / Sunrise
   *   0.25 = Noon
   *   0.50 = Dusk / Sunset
   *   0.75 = Starry Midnight
   */
  update: (dayPhase: number, elapsed: number) => {
    sunsetFactor: number;
    nightFactor: number;
    phase: TimePhase;
    activeCelestialDir: THREE.Vector3;
    activeCelestialColor: THREE.Color;
  };
  dispose: () => void;
}

const SKY_VERTEX_SHADER = /* glsl */ `
  varying vec3 vWorldDir;
  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldDir = normalize(position);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const SKY_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uTopColor;
  uniform vec3 uHorizonColor;
  uniform vec3 uBottomColor;
  uniform vec3 uSunDir;
  uniform float uSunsetFactor;
  uniform float uStarIntensity;
  uniform float uTime;

  varying vec3 vWorldDir;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  void main() {
    vec3 dir = normalize(vWorldDir);
    float h = clamp(dir.y, 0.0, 1.0);

    vec3 sky = mix(uHorizonColor, uTopColor, pow(h, 0.54));
    if (dir.y < 0.0) {
      sky = mix(uHorizonColor, uBottomColor, clamp(-dir.y * 4.5, 0.0, 1.0));
    }

    float sunAlign = max(dot(dir, normalize(uSunDir)), 0.0);
    float horizonBand = exp(-abs(dir.y) * 5.2);
    vec3 sunsetTint = vec3(1.0, 0.54, 0.38);
    sky += sunsetTint * uSunsetFactor * horizonBand * (0.36 + 0.44 * pow(sunAlign, 3.0));
    sky += vec3(1.0, 0.94, 0.78) * pow(sunAlign, 22.0) * (1.0 - uStarIntensity) * 0.24;

    if (uStarIntensity > 0.01 && dir.y > 0.04) {
      vec2 uv = dir.xz / (dir.y + 0.35);
      vec2 grid = floor(uv * 54.0);
      vec2 cell = fract(uv * 54.0);
      float rnd = hash21(grid);
      if (rnd > 0.968) {
        float inside = step(0.32, cell.x) * step(cell.x, 0.68) * step(0.32, cell.y) * step(cell.y, 0.68);
        float twinkle = 0.62 + 0.38 * sin(uTime * (1.4 + fract(rnd * 37.0) * 2.2) + rnd * 100.0);
        float horizonFade = smoothstep(0.04, 0.24, dir.y);
        vec3 starColor = mix(vec3(0.84, 0.91, 1.0), vec3(1.0, 0.95, 0.8), fract(rnd * 19.0));
        sky += starColor * inside * twinkle * horizonFade * uStarIntensity * 0.95;
      }
    }

    gl_FragColor = vec4(sky, 1.0);
  }
`;

export function createSkySystem(textures: {
  sunTexture: THREE.CanvasTexture;
  sunGlowTexture: THREE.CanvasTexture;
  moonTexture: THREE.CanvasTexture;
  moonGlowTexture: THREE.CanvasTexture;
}): SkySystem {
  const dayTop = new THREE.Color('#2182e0');
  const dayHorizon = new THREE.Color('#d2f0ff');
  const dayBottom = new THREE.Color('#569ac8');

  const sunsetTop = new THREE.Color('#2e3870');
  const sunsetHorizon = new THREE.Color('#ffa078');
  const sunsetBottom = new THREE.Color('#5d486c');

  const nightTop = new THREE.Color('#05091c');
  const nightHorizon = new THREE.Color('#132044');
  const nightBottom = new THREE.Color('#071024');

  const zenithColor = dayTop.clone();
  const horizonColor = dayHorizon.clone();
  const bottomColor = dayBottom.clone();

  const sunDirection = new THREE.Vector3(0.5, 0.7, -0.5).normalize();
  const moonDirection = sunDirection.clone().negate();

  const domeGeo = new THREE.SphereGeometry(245, 36, 24);
  const domeMat = new THREE.ShaderMaterial({
    vertexShader: SKY_VERTEX_SHADER,
    fragmentShader: SKY_FRAGMENT_SHADER,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTopColor: { value: zenithColor },
      uHorizonColor: { value: horizonColor },
      uBottomColor: { value: bottomColor },
      uSunDir: { value: sunDirection },
      uSunsetFactor: { value: 0 },
      uStarIntensity: { value: 0 },
      uTime: { value: 0 },
    },
  });
  const dome = new THREE.Mesh(domeGeo, domeMat);
  dome.renderOrder = -10;

  // === SUN GROUP ===
  const sunGroup = new THREE.Group();
  const sunPlaneGeo = new THREE.PlaneGeometry(16.0, 16.0);
  const sunPlaneMat = new THREE.MeshBasicMaterial({
    map: textures.sunTexture,
    transparent: true,
    opacity: 1,
    fog: false,
    depthWrite: false,
  });
  sunGroup.add(new THREE.Mesh(sunPlaneGeo, sunPlaneMat));

  const sunGlowMat = new THREE.SpriteMaterial({
    map: textures.sunGlowTexture,
    color: '#ffe28a',
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  });
  const sunGlow = new THREE.Sprite(sunGlowMat);
  sunGlow.scale.set(42, 42, 1);
  sunGroup.add(sunGlow);

  // === MOON GROUP ===
  const moonGroup = new THREE.Group();
  const moonPlaneGeo = new THREE.PlaneGeometry(13.8, 13.8);
  const moonPlaneMat = new THREE.MeshBasicMaterial({
    map: textures.moonTexture,
    transparent: true,
    opacity: 0,
    fog: false,
    depthWrite: false,
  });
  moonGroup.add(new THREE.Mesh(moonPlaneGeo, moonPlaneMat));

  const moonGlowMat = new THREE.SpriteMaterial({
    map: textures.moonGlowTexture,
    color: '#bcd8ff',
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  });
  const moonGlow = new THREE.Sprite(moonGlowMat);
  moonGlow.scale.set(32, 32, 1);
  moonGroup.add(moonGlow);
  moonGroup.visible = false;

  const orbitRadius = 152;
  const activeCelestialDir = new THREE.Vector3();
  const activeCelestialColor = new THREE.Color();
  const sunSpecColor = new THREE.Color('#fff5d4');
  const sunsetSpecColor = new THREE.Color('#ffa06e');
  const moonSpecColor = new THREE.Color('#b0d0ff');

  const update = (rawPhase: number, elapsed: number) => {
    const p = ((rawPhase % 1) + 1) % 1;
    const angle = p * Math.PI * 2; // 0 = sunrise, 0.25 = noon, 0.5 = sunset, 0.75 = midnight
    const sunSin = Math.sin(angle); // +1 at noon, -1 at midnight, 0 at dawn & dusk

    // Continuous 4-phase mapping
    let phase: TimePhase = 'day';
    if (p >= 0.94 || p < 0.08) phase = 'dawn';
    else if (p < 0.43) phase = 'day';
    else if (p < 0.56) phase = 'dusk';
    else phase = 'night';

    // Map sunSin in [-1, 1] cleanly to smooth sunsetFactor & nightFactor
    const dayness = THREE.MathUtils.clamp(sunSin, -1, 1);
    const sunsetFactor = Math.exp(-Math.pow(dayness * 3.1, 2)); // peaks cleanly at dawn & dusk!
    const nightFactor = THREE.MathUtils.smoothstep(-dayness, -0.08, 0.48);

    if (dayness >= 0) {
      const k = 1 - Math.pow(dayness, 0.65);
      zenithColor.copy(dayTop).lerp(sunsetTop, k * 0.85);
      horizonColor.copy(dayHorizon).lerp(sunsetHorizon, k * 0.92);
      bottomColor.copy(dayBottom).lerp(sunsetBottom, k * 0.85);
    } else {
      const k = Math.pow(-dayness, 0.72);
      zenithColor.copy(sunsetTop).lerp(nightTop, k);
      horizonColor.copy(sunsetHorizon).lerp(nightHorizon, k);
      bottomColor.copy(sunsetBottom).lerp(nightBottom, k);
    }

    // Strict opposing orbital arc across the sky: Sun & Moon NEVER co-appear above y = 0
    const sunElev = sunSin * 0.46; // gentle majestic arc visible in camera frame
    const cosE = Math.cos(sunElev);
    const sunAz = 0.25 + Math.cos(angle) * 0.72; // rises east-ish, sweeps across north-west

    const sunX = -Math.sin(sunAz) * cosE * orbitRadius;
    const sunY = Math.sin(sunElev) * orbitRadius;
    const sunZ = -Math.cos(sunAz) * cosE * orbitRadius;
    sunGroup.position.set(sunX, sunY, sunZ);
    sunGroup.lookAt(0, 0, 0);
    sunDirection.set(sunX, sunY, sunZ).normalize();

    const moonX = -sunX * 0.82;
    const moonY = -sunY;
    const moonZ = -Math.abs(sunZ) * 0.95;
    moonGroup.position.set(moonX, moonY, moonZ);
    moonGroup.lookAt(0, 0, 0);
    moonDirection.set(moonX, moonY, moonZ).normalize();

    if (sunY <= 0.0) {
      sunGroup.visible = false;
      sunPlaneMat.opacity = 0;
      sunGlowMat.opacity = 0;
    } else {
      const sunFade = THREE.MathUtils.smoothstep(sunY, 0.0, 11.0);
      sunGroup.visible = true;
      sunPlaneMat.opacity = sunFade;
      sunGlowMat.opacity = sunFade * (0.66 + sunsetFactor * 0.22);
    }

    if (moonY <= 0.0) {
      moonGroup.visible = false;
      moonPlaneMat.opacity = 0;
      moonGlowMat.opacity = 0;
    } else {
      const moonFade = THREE.MathUtils.smoothstep(moonY, 0.0, 11.0);
      moonGroup.visible = true;
      moonPlaneMat.opacity = moonFade;
      moonGlowMat.opacity = moonFade * 0.56;
    }

    domeMat.uniforms.uSunsetFactor.value = sunsetFactor;
    domeMat.uniforms.uStarIntensity.value = nightFactor;
    domeMat.uniforms.uTime.value = elapsed;

    if (sunY > 0) {
      activeCelestialDir.copy(sunDirection);
      activeCelestialColor.copy(sunSpecColor).lerp(sunsetSpecColor, sunsetFactor);
    } else {
      activeCelestialDir.copy(moonDirection);
      activeCelestialColor.copy(moonSpecColor);
    }

    return {
      sunsetFactor,
      nightFactor,
      phase,
      activeCelestialDir,
      activeCelestialColor,
    };
  };

  return {
    dome,
    sunGroup,
    moonGroup,
    sunDirection,
    moonDirection,
    horizonColor,
    zenithColor,
    update,
    dispose: () => {
      domeGeo.dispose();
      domeMat.dispose();
      sunPlaneGeo.dispose();
      sunPlaneMat.dispose();
      sunGlowMat.dispose();
      moonPlaneGeo.dispose();
      moonPlaneMat.dispose();
      moonGlowMat.dispose();
    },
  };
}

// === CIRCULAR SUBDIVIDED OCEAN DISC ===
function createCircularOceanGeometry(
  radius: number,
  radialSegments: number,
  ringSegments: number,
): THREE.BufferGeometry {
  const positions: number[] = [0, 0, 0];
  const indices: number[] = [];

  for (let r = 1; r <= ringSegments; r++) {
    const t = r / ringSegments;
    const dist = radius * Math.pow(t, 1.65);
    for (let s = 0; s < radialSegments; s++) {
      const theta = (s / radialSegments) * Math.PI * 2;
      positions.push(Math.cos(theta) * dist, 0, Math.sin(theta) * dist);
    }
  }

  for (let s = 0; s < radialSegments; s++) {
    const next = (s + 1) % radialSegments;
    indices.push(0, 1 + next, 1 + s);
  }

  for (let r = 1; r < ringSegments; r++) {
    const innerStart = 1 + (r - 1) * radialSegments;
    const outerStart = 1 + r * radialSegments;
    for (let s = 0; s < radialSegments; s++) {
      const next = (s + 1) % radialSegments;
      const a = innerStart + s;
      const b = innerStart + next;
      const c = outerStart + s;
      const d = outerStart + next;
      indices.push(a, b, d);
      indices.push(a, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// === STYLIZED MC-SHADER-PACK DYNAMIC OCEAN FOR 3-ISLAND ARCHIPELAGO ===
export interface OceanSystem {
  mesh: THREE.Mesh;
  update: (params: {
    elapsed: number;
    nightFactor: number;
    sunsetFactor: number;
    celestialDir: THREE.Vector3;
    celestialColor: THREE.Color;
    fogColor: THREE.Color;
    zenithColor: THREE.Color;
    beaconColor: THREE.Color;
  }) => void;
  dispose: () => void;
}

const OCEAN_VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  varying vec3 vWorldPos;

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    float dist = length(worldPosition.xz);
    float atten = smoothstep(185.0, 18.0, dist);

    float w1 = sin(worldPosition.x * 0.38 + uTime * 1.4) * 0.085;
    float w2 = cos(worldPosition.z * 0.44 - uTime * 1.15) * 0.075;
    float w3 = sin((worldPosition.x - worldPosition.z) * 0.62 + uTime * 1.95) * 0.04;
    worldPosition.y += (w1 + w2 + w3) * atten;

    vWorldPos = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const OCEAN_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uNightFactor;
  uniform float uSunsetFactor;
  uniform vec3 uCelestialDir;
  uniform vec3 uCelestialColor;
  uniform vec3 uFogColor;
  uniform vec3 uZenithColor;
  uniform vec3 uBeaconColor;

  varying vec3 vWorldPos;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  // Signed coastline distance for all 3 expanded v0.6 islands: ~58x58 Main Island, Left Lighthouse & Right Workshop
  float crescentIslandShoreDist(vec2 p) {
    float angle = atan(p.y + 2.0, p.x - 1.0);
    float outerRadius =
      28.4 +
      sin(angle * 2.0 + 0.4) * 2.4 +
      cos(angle * 3.0 - 0.7) * 1.6 +
      sin(angle * 5.0) * 0.75;
    float dOuter = length((p - vec2(0.5, -1.5)) * vec2(0.96, 1.02)) - outerRadius;
    float dCove = 10.6 - length(p - vec2(9.5, 21.0));
    float dBridgeChannel = 5.0 - length((p - vec2(6.5, 9.0)) * vec2(1.15, 0.52));
    return max(dOuter, max(dCove, dBridgeChannel));
  }

  float shoreDistance(vec2 p) {
    float dMain = crescentIslandShoreDist(p);

    // Expanded Left Cliff Lighthouse Isle at (-54, 14) + flanking sea stacks
    vec2 pL = p - vec2(-54.0, 14.0);
    float angL = atan(pL.y, pL.x);
    float rL = 13.2 + sin(angL * 3.0 + 0.8) * 1.5 + cos(angL * 2.0 - 0.5) * 1.1;
    float dLeft = length(pL * vec2(0.96, 1.02)) - rL;
    float dStackA = length(p - vec2(-67.0, 21.0)) - 1.6;
    float dStackB = length(p - vec2(-42.0, 5.0)) - 1.6;
    dLeft = min(dLeft, min(dStackA, dStackB));

    // Expanded Right Windmill Millhouse Isle at (56, -18)
    vec2 pR = p - vec2(56.0, -18.0);
    float angR = atan(pR.y, pR.x);
    float rR = 14.6 + sin(angR * 2.0 - 0.3) * 1.6 + cos(angR * 3.0 + 0.7) * 1.0;
    float dRight = length(pR * vec2(0.96, 1.0)) - rR;

    return min(dMain, min(dLeft, dRight));
  }

  void main() {
    vec2 p = vWorldPos.xz;
    float radialDist = length(p);
    float shoreD = shoreDistance(p);

    float shallowMask = 1.0 - smoothstep(-0.3, 8.2, shoreD);
    float midMask = smoothstep(14.0, 76.0, radialDist);

    vec3 dayShallow = vec3(0.16, 0.85, 0.80);
    vec3 dayMid = vec3(0.09, 0.52, 0.80);
    vec3 dayDeep = vec3(0.05, 0.27, 0.56);

    vec3 nightShallow = vec3(0.05, 0.26, 0.36);
    vec3 nightMid = vec3(0.03, 0.13, 0.30);
    vec3 nightDeep = vec3(0.02, 0.06, 0.17);

    vec3 shallowCol = mix(dayShallow, nightShallow, uNightFactor);
    vec3 midCol = mix(dayMid, nightMid, uNightFactor);
    vec3 deepCol = mix(dayDeep, nightDeep, uNightFactor);

    vec3 waterCol = mix(midCol, deepCol, midMask);
    waterCol = mix(waterCol, shallowCol, shallowMask);
    waterCol = mix(waterCol, waterCol + vec3(0.22, 0.10, 0.08), uSunsetFactor * 0.42);

    float camDist = length(cameraPosition - vWorldPos);
    float detailFade = 1.0 - smoothstep(55.0, 185.0, camDist);

    vec2 uvA = p * 1.4 + vec2(uTime * 0.4, -uTime * 0.26);
    vec2 uvB = p * 2.55 + vec2(-uTime * 0.32, uTime * 0.5);
    vec2 uvC = floor(p * 2.8) * 0.357 + vec2(uTime * 0.16, uTime * 0.22);

    float nA = vnoise(uvA);
    float nB = vnoise(uvB);
    float nC = vnoise(uvC * 2.1);

    float eps = 0.22;
    float h0 = nA * 0.55 + nB * 0.35 + nC * 0.10;
    float hx = vnoise(uvA + vec2(eps, 0.0)) * 0.55 + vnoise(uvB + vec2(eps * 1.6, 0.0)) * 0.35;
    float hz = vnoise(uvA + vec2(0.0, eps)) * 0.55 + vnoise(uvB + vec2(0.0, eps * 1.6)) * 0.35;

    float rippleStrength = 0.72 * (0.35 + 0.65 * detailFade);
    vec3 normal = normalize(vec3((h0 - hx) * rippleStrength, 1.0, (h0 - hz) * rippleStrength));

    float caustic = pow(clamp(1.0 - abs(nA - nB) * 3.2, 0.0, 1.0), 3.0);
    waterCol += vec3(0.16, 0.35, 0.36) * caustic * shallowMask * (1.0 - uNightFactor * 0.75) * detailFade;

    float crest = smoothstep(0.66, 0.84, h0) * detailFade;
    waterCol += vec3(0.08, 0.16, 0.20) * crest * (1.0 - uNightFactor * 0.65);

    // Animated white lapping shoreline foam around all 3 islands
    float foamNoise = vnoise(p * 2.2 + vec2(uTime * 0.3, -uTime * 0.25));
    float shoreEdge = 1.0 - smoothstep(-0.15, 1.2 + foamNoise * 0.45, shoreD);
    float waveLap = sin(shoreD * 4.0 - uTime * 3.0 + foamNoise * 2.2) * 0.5 + 0.5;
    float secondaryRing =
      smoothstep(0.55, 1.55, shoreD) *
      (1.0 - smoothstep(1.55, 3.1, shoreD)) *
      smoothstep(0.62, 0.88, waveLap * foamNoise + 0.22);
    float foam = clamp(shoreEdge * (0.72 + 0.28 * foamNoise) + secondaryRing * 0.62, 0.0, 1.0);
    vec3 foamCol = mix(vec3(0.95, 0.99, 1.0), vec3(0.45, 0.62, 0.82), uNightFactor);
    waterCol = mix(waterCol, foamCol, foam * 0.82);

    // Night shimmering reflections: Bridge/Harbor + Lighthouse + Millhouse + Beacon!
    if (uNightFactor > 0.05) {
      float shimmer = 0.55 + 0.45 * sin(p.x * 1.9 + p.y * 2.3 + uTime * 3.4 + nA * 4.0);
      float bridgeGlow = exp(-length(p - vec2(6.0, 6.5)) * 0.12);
      float pierGlow = exp(-length(p - vec2(12.0, 21.0)) * 0.13);
      float lighthouseGlow = exp(-length(p - vec2(-54.0, 22.0)) * 0.09);
      float workshopGlow = exp(-length(p - vec2(45.0, -18.0)) * 0.11);
      float beaconReflect = exp(-length(p - vec2(6.0, 10.0)) * 0.07);
      waterCol += vec3(1.0, 0.68, 0.26) * (bridgeGlow * 0.34 + pierGlow * 0.34 + lighthouseGlow * 0.38 + workshopGlow * 0.32) * shimmer * uNightFactor;
      waterCol += uBeaconColor * beaconReflect * 0.24 * shimmer * uNightFactor;
    }

    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float ndotv = clamp(dot(normal, viewDir), 0.0, 1.0);
    float fresnel = 0.04 + 0.96 * pow(1.0 - ndotv, 4.0);
    vec3 skyReflect = mix(uZenithColor, uFogColor, 0.58);
    waterCol = mix(waterCol, skyReflect, fresnel * 0.56);

    vec3 lightDir = normalize(uCelestialDir);
    vec3 halfVec = normalize(lightDir + viewDir);
    float ndoth = max(dot(normal, halfVec), 0.0);
    float sharpGlint = pow(ndoth, 160.0) * 1.9;
    float softPath = pow(ndoth, 24.0) * 0.28;
    float celestialAbove = smoothstep(0.01, 0.14, lightDir.y);
    waterCol += uCelestialColor * (sharpGlint + softPath) * celestialAbove;

    float horizonFog = smoothstep(115.0, 245.0, radialDist);
    vec3 finalCol = mix(waterCol, uFogColor, horizonFog);

    float alpha = mix(0.86, 0.98, smoothstep(0.0, 5.5, shoreD));
    alpha = max(alpha, max(foam * 0.95, horizonFog));
    gl_FragColor = vec4(finalCol, alpha);
  }
`;

export function createOceanSystem(): OceanSystem {
  const geo = createCircularOceanGeometry(268, 96, 68);

  const mat = new THREE.ShaderMaterial({
    vertexShader: OCEAN_VERTEX_SHADER,
    fragmentShader: OCEAN_FRAGMENT_SHADER,
    transparent: true,
    uniforms: {
      uTime: { value: 0 },
      uNightFactor: { value: 0 },
      uSunsetFactor: { value: 0 },
      uCelestialDir: { value: new THREE.Vector3(0.4, 0.7, -0.5) },
      uCelestialColor: { value: new THREE.Color('#fff5d4') },
      uFogColor: { value: new THREE.Color('#d2f0ff') },
      uZenithColor: { value: new THREE.Color('#2182e0') },
      uBeaconColor: { value: new THREE.Color('#38bdf8') },
    },
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.45;
  mesh.receiveShadow = true;

  return {
    mesh,
    update: ({
      elapsed,
      nightFactor,
      sunsetFactor,
      celestialDir,
      celestialColor,
      fogColor,
      zenithColor,
      beaconColor,
    }) => {
      mat.uniforms.uTime.value = elapsed;
      mat.uniforms.uNightFactor.value = nightFactor;
      mat.uniforms.uSunsetFactor.value = sunsetFactor;
      mat.uniforms.uCelestialDir.value.copy(celestialDir);
      mat.uniforms.uCelestialColor.value.copy(celestialColor);
      mat.uniforms.uFogColor.value.copy(fogColor);
      mat.uniforms.uZenithColor.value.copy(zenithColor);
      mat.uniforms.uBeaconColor.value.copy(beaconColor);
    },
    dispose: () => {
      geo.dispose();
      mat.dispose();
    },
  };
}

// === UNIFIED OCEAN-STYLE ISLAND WATER SHADERS (WATERFALL CASCADES & SPRING/PLUNGE POOLS) ===
export interface IslandWaterShaderSystem {
  cascadeMat: THREE.ShaderMaterial;
  poolMat: THREE.ShaderMaterial;
  update: (params: {
    elapsed: number;
    nightFactor: number;
    sunsetFactor: number;
    celestialDir: THREE.Vector3;
    celestialColor: THREE.Color;
    fogColor: THREE.Color;
    zenithColor: THREE.Color;
  }) => void;
  dispose: () => void;
}

const ISLAND_WATER_VERTEX = /* glsl */ `
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;

  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const ISLAND_WATER_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uNightFactor;
  uniform float uSunsetFactor;
  uniform vec3 uCelestialDir;
  uniform vec3 uCelestialColor;
  uniform vec3 uFogColor;
  uniform vec3 uZenithColor;
  uniform float uIsCascade;

  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  void main() {
    vec3 nBase = normalize(vWorldNormal);
    float isHorizontal = step(0.55, abs(nBase.y));

    // Exact same emerald-turquoise shallow & mid ocean palette!
    vec3 dayShallow = vec3(0.16, 0.85, 0.80);
    vec3 dayMid = vec3(0.09, 0.54, 0.82);
    vec3 nightShallow = vec3(0.05, 0.26, 0.36);
    vec3 nightMid = vec3(0.03, 0.14, 0.32);

    vec3 shallowCol = mix(dayShallow, nightShallow, uNightFactor);
    vec3 midCol = mix(dayMid, nightMid, uNightFactor);
    vec3 waterCol = mix(midCol, shallowCol, mix(0.68, 0.92, isHorizontal));
    waterCol = mix(waterCol, waterCol + vec3(0.20, 0.09, 0.07), uSunsetFactor * 0.40);

    vec3 normal = nBase;
    float foam = 0.0;

    if (isHorizontal > 0.5) {
      // Calm pools, carved stream & waterfall top ledges: exact ocean caustics + ripples
      vec2 p = vWorldPos.xz;
      float flowSpeed = mix(0.42, 1.6, uIsCascade);
      vec2 uvA = p * 1.6 + vec2(uTime * 0.35, -uTime * flowSpeed);
      vec2 uvB = p * 2.8 + vec2(-uTime * 0.28, -uTime * (flowSpeed * 0.85));
      float nA = vnoise(uvA);
      float nB = vnoise(uvB);

      float eps = 0.20;
      float h0 = nA * 0.58 + nB * 0.42;
      float hx = vnoise(uvA + vec2(eps, 0.0)) * 0.58 + vnoise(uvB + vec2(eps * 1.4, 0.0)) * 0.42;
      float hz = vnoise(uvA + vec2(0.0, eps)) * 0.58 + vnoise(uvB + vec2(0.0, eps * 1.4)) * 0.42;
      normal = normalize(vec3((h0 - hx) * 0.65, 1.0, (h0 - hz) * 0.65));

      float caustic = pow(clamp(1.0 - abs(nA - nB) * 3.1, 0.0, 1.0), 2.8);
      waterCol += vec3(0.18, 0.38, 0.38) * caustic * (1.0 - uNightFactor * 0.72);

      // Gentle foam shimmer on waterfall lips & plunge pool edges
      float crest = smoothstep(0.64, 0.86, h0);
      foam = crest * mix(0.22, 0.58, uIsCascade);
    } else {
      // Vertical cascading waterfall face: world-space seamless rushing turquoise + white foam streaks!
      float horizCoord = abs(nBase.x) > 0.5 ? vWorldPos.z : vWorldPos.x;
      vec2 uvFast = vec2(horizCoord * 2.4, vWorldPos.y * 0.78 + uTime * 3.1);
      vec2 uvFine = vec2(horizCoord * 4.8 + 1.7, vWorldPos.y * 1.55 + uTime * 4.4);
      float streakA = vnoise(uvFast);
      float streakB = vnoise(uvFine);
      float combined = streakA * 0.62 + streakB * 0.38;

      // Subtle animated normal ripple along the falling sheet
      float dx = (vnoise(uvFast + vec2(0.2, 0.0)) - streakA) * 0.55;
      float dy = (vnoise(uvFast + vec2(0.0, 0.2)) - streakA) * 0.45;
      normal = normalize(nBase + vec3(dx * nBase.z, dy, dx * nBase.x));

      // Bright aerated vertical whitewater ribbons + extra froth near tier bases (y ~ 1 and y ~ 6)
      float ribbonFoam = smoothstep(0.54, 0.82, combined);
      float baseSplash = exp(-abs(vWorldPos.y - 0.8) * 1.2) * 0.55 + exp(-abs(vWorldPos.y - 6.0) * 1.4) * 0.42;
      foam = clamp(ribbonFoam * 0.72 + baseSplash * (0.45 + 0.55 * streakB), 0.0, 0.92);
      waterCol += vec3(0.10, 0.24, 0.26) * (1.0 - uNightFactor * 0.68) * combined;
    }

    vec3 foamCol = mix(vec3(0.95, 0.99, 1.0), vec3(0.48, 0.66, 0.86), uNightFactor);
    waterCol = mix(waterCol, foamCol, foam * 0.84);

    // Physical Schlick Fresnel sky reflection (matching ocean shader)
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float ndotv = clamp(dot(normal, viewDir), 0.0, 1.0);
    float fresnel = 0.04 + 0.96 * pow(1.0 - ndotv, 3.8);
    vec3 skyReflect = mix(uZenithColor, uFogColor, 0.56);
    waterCol = mix(waterCol, skyReflect, fresnel * 0.48);

    // Sun / Moon specular micro-glint
    vec3 lightDir = normalize(uCelestialDir);
    vec3 halfVec = normalize(lightDir + viewDir);
    float ndoth = max(dot(normal, halfVec), 0.0);
    float celestialAbove = smoothstep(0.01, 0.14, lightDir.y);
    waterCol += uCelestialColor * (pow(ndoth, 110.0) * 1.35 + pow(ndoth, 22.0) * 0.24) * celestialAbove;

    // Atmospheric distance fog
    float camDist = length(cameraPosition - vWorldPos);
    float fogFactor = smoothstep(108.0, 258.0, camDist);
    vec3 finalCol = mix(waterCol, uFogColor, fogFactor);

    float baseAlpha = mix(0.82, 0.86, uIsCascade);
    float alpha = clamp(max(baseAlpha, foam * 0.95), 0.0, 0.96);
    gl_FragColor = vec4(finalCol, alpha);
  }
`;

export function createIslandWaterShaders(): IslandWaterShaderSystem {
  const makeMat = (isCascade: number) =>
    new THREE.ShaderMaterial({
      vertexShader: ISLAND_WATER_VERTEX,
      fragmentShader: ISLAND_WATER_FRAGMENT,
      transparent: true,
      depthWrite: true,
      uniforms: {
        uTime: { value: 0 },
        uNightFactor: { value: 0 },
        uSunsetFactor: { value: 0 },
        uCelestialDir: { value: new THREE.Vector3(0.4, 0.7, -0.5) },
        uCelestialColor: { value: new THREE.Color('#fff5d4') },
        uFogColor: { value: new THREE.Color('#d2f0ff') },
        uZenithColor: { value: new THREE.Color('#2182e0') },
        uIsCascade: { value: isCascade },
      },
    });

  const cascadeMat = makeMat(1.0);
  const poolMat = makeMat(0.0);

  const syncUniforms = (
    mat: THREE.ShaderMaterial,
    params: {
      elapsed: number;
      nightFactor: number;
      sunsetFactor: number;
      celestialDir: THREE.Vector3;
      celestialColor: THREE.Color;
      fogColor: THREE.Color;
      zenithColor: THREE.Color;
    },
  ) => {
    mat.uniforms.uTime.value = params.elapsed;
    mat.uniforms.uNightFactor.value = params.nightFactor;
    mat.uniforms.uSunsetFactor.value = params.sunsetFactor;
    mat.uniforms.uCelestialDir.value.copy(params.celestialDir);
    mat.uniforms.uCelestialColor.value.copy(params.celestialColor);
    mat.uniforms.uFogColor.value.copy(params.fogColor);
    mat.uniforms.uZenithColor.value.copy(params.zenithColor);
  };

  return {
    cascadeMat,
    poolMat,
    update: (params) => {
      syncUniforms(cascadeMat, params);
      syncUniforms(poolMat, params);
    },
    dispose: () => {
      cascadeMat.dispose();
      poolMat.dispose();
    },
  };
}
