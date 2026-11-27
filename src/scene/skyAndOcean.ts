import * as THREE from 'three';

export interface SkySystem {
  dome: THREE.Mesh;
  sunGroup: THREE.Group;
  moonGroup: THREE.Group;
  sunDirection: THREE.Vector3;
  moonDirection: THREE.Vector3;
  horizonColor: THREE.Color;
  zenithColor: THREE.Color;
  update: (cycleT: number, elapsed: number) => {
    sunsetFactor: number;
    nightFactor: number;
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

  const nightTop = new THREE.Color('#060b20');
  const nightHorizon = new THREE.Color('#16244a');
  const nightBottom = new THREE.Color('#081228');

  const zenithColor = dayTop.clone();
  const horizonColor = dayHorizon.clone();
  const bottomColor = dayBottom.clone();

  const sunDirection = new THREE.Vector3(0.5, 0.7, -0.5).normalize();
  const moonDirection = sunDirection.clone().negate();

  const domeGeo = new THREE.SphereGeometry(200, 36, 24);
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

  // === SUN GROUP (Pixel Square Sun + Soft Golden Glow Sprite) ===
  const sunGroup = new THREE.Group();
  const sunPlaneGeo = new THREE.PlaneGeometry(13.0, 13.0);
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
  sunGlow.scale.set(34, 34, 1);
  sunGroup.add(sunGlow);

  // === MOON GROUP (Pixel Cratered Silver Moon + Cool Subtle Glow Sprite) ===
  const moonGroup = new THREE.Group();
  const moonPlaneGeo = new THREE.PlaneGeometry(11.2, 11.2);
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
  moonGlow.scale.set(26, 26, 1);
  moonGroup.add(moonGlow);
  moonGroup.visible = false;

  const orbitRadius = 118;
  const activeCelestialDir = new THREE.Vector3();
  const activeCelestialColor = new THREE.Color();
  const sunSpecColor = new THREE.Color('#fff5d4');
  const sunsetSpecColor = new THREE.Color('#ffa06e');
  const moonSpecColor = new THREE.Color('#b0d0ff');

  const update = (cycleT: number, elapsed: number) => {
    const t = THREE.MathUtils.clamp(cycleT, 0, 1);
    const sunsetFactor = Math.pow(Math.sin(t * Math.PI), 1.45);
    const nightFactor = THREE.MathUtils.smoothstep(t, 0.36, 0.72);

    if (t <= 0.5) {
      const k = t * 2;
      zenithColor.copy(dayTop).lerp(sunsetTop, Math.pow(k, 1.3));
      horizonColor.copy(dayHorizon).lerp(sunsetHorizon, Math.pow(k, 1.15));
      bottomColor.copy(dayBottom).lerp(sunsetBottom, k);
    } else {
      const k = (t - 0.5) * 2;
      zenithColor.copy(sunsetTop).lerp(nightTop, Math.pow(k, 0.85));
      horizonColor.copy(sunsetHorizon).lerp(nightHorizon, Math.pow(k, 0.85));
      bottomColor.copy(sunsetBottom).lerp(nightBottom, k);
    }

    // Peak ~13.8° keeps Sun & Moon visible right above the horizon in the closer hero camera
    // while strictly crossing y = 0 at t = 0.5 so they NEVER appear simultaneously.
    const elevAngle = (0.5 - t) * Math.PI * 0.154;
    const sunAzimuth = 0.78;
    const moonAzimuth = 0.34;
    const cosE = Math.cos(elevAngle);
    const sinE = Math.sin(elevAngle);

    const sunX = -Math.sin(sunAzimuth) * cosE * orbitRadius;
    const sunY = sinE * orbitRadius;
    const sunZ = -Math.cos(sunAzimuth) * cosE * orbitRadius;
    sunGroup.position.set(sunX, sunY, sunZ);
    sunGroup.lookAt(0, 0, 0);
    sunDirection.set(sunX, sunY, sunZ).normalize();

    const moonX = -Math.sin(moonAzimuth) * cosE * orbitRadius;
    const moonY = -sunY;
    const moonZ = -Math.cos(moonAzimuth) * cosE * orbitRadius;
    moonGroup.position.set(moonX, moonY, moonZ);
    moonGroup.lookAt(0, 0, 0);
    moonDirection.set(moonX, moonY, moonZ).normalize();

    // STRICT HIDE RULE: any body at or below sea level (y <= 0) is hidden completely
    if (sunY <= 0.0) {
      sunGroup.visible = false;
      sunPlaneMat.opacity = 0;
      sunGlowMat.opacity = 0;
    } else {
      const sunFade = THREE.MathUtils.smoothstep(sunY, 0.0, 9.0);
      sunGroup.visible = true;
      sunPlaneMat.opacity = sunFade;
      sunGlowMat.opacity = sunFade * (0.66 + sunsetFactor * 0.2);
    }

    if (moonY <= 0.0) {
      moonGroup.visible = false;
      moonPlaneMat.opacity = 0;
      moonGlowMat.opacity = 0;
    } else {
      const moonFade = THREE.MathUtils.smoothstep(moonY, 0.0, 9.0);
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

// === CIRCULAR SUBDIVIDED OCEAN DISC (Zero square horizon corners!) ===
function createCircularOceanGeometry(
  radius: number,
  radialSegments: number,
  ringSegments: number,
): THREE.BufferGeometry {
  const positions: number[] = [0, 0, 0];
  const indices: number[] = [];

  for (let r = 1; r <= ringSegments; r++) {
    const t = r / ringSegments;
    // Concentrate vertex density near the islands (t^1.65) while stretching cleanly to radius
    const dist = radius * Math.pow(t, 1.65);
    for (let s = 0; s < radialSegments; s++) {
      const theta = (s / radialSegments) * Math.PI * 2;
      positions.push(Math.cos(theta) * dist, 0, Math.sin(theta) * dist);
    }
  }

  // Inner fan from center vertex 0 to first ring
  for (let s = 0; s < radialSegments; s++) {
    const next = (s + 1) % radialSegments;
    indices.push(0, 1 + next, 1 + s);
  }

  // Concentric quad rings
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

// === STYLIZED MC-SHADER-PACK DYNAMIC OCEAN ===
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
  }) => void;
  dispose: () => void;
}

const OCEAN_VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  varying vec3 vWorldPos;

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    float dist = length(worldPosition.xz);
    float atten = smoothstep(155.0, 14.0, dist);

    // Subtle multi-directional surface swell (fine crisp ripples happen per-pixel in fragment)
    float w1 = sin(worldPosition.x * 0.42 + uTime * 1.45) * 0.085;
    float w2 = cos(worldPosition.z * 0.48 - uTime * 1.2) * 0.075;
    float w3 = sin((worldPosition.x - worldPosition.z) * 0.68 + uTime * 2.0) * 0.04;
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

  varying vec3 vWorldPos;

  // Compact crisp value noise for stylized water ripples & foam breakup
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

  // Signed approximate distance outside each coastline for tight, crisp shoreline foam
  float mainIslandShoreDist(vec2 p) {
    float angle = atan(p.y, p.x);
    float radiusLobe =
      13.2 +
      sin(angle * 2.0 + 0.4) * 1.1 +
      cos(angle * 3.0 - 0.8) * 0.95 +
      sin(angle * 5.0) * 0.45;
    float coveIndent = max(0.0, 1.0 - length(p - vec2(8.5, 8.5)) / 7.5) * 4.2;
    return length(p * vec2(0.98, 1.02)) - (radiusLobe - coveIndent);
  }

  float shoreDistance(vec2 p) {
    float d = mainIslandShoreDist(p);
    // Right asymmetric tree cay (34, -26) + sand spit
    float dRight = min(
      length((p - vec2(34.0, -26.0)) * vec2(0.92, 1.15)) - 4.2,
      length(p - vec2(30.2, -23.0)) - 2.3
    );
    // Left natural sea-stack reef (-34, 17.5) + 3 scattered low reef skerries
    float dLeftMain = length((p - vec2(-34.2, 17.6)) * vec2(0.95, 1.18)) - 3.3;
    float dReefA = length(p - vec2(-29.0, 14.0)) - 1.35;
    float dReefB = length(p - vec2(-38.5, 22.0)) - 1.55;
    float dReefC = length(p - vec2(-31.0, 23.2)) - 1.1;
    float dLeft = min(min(dLeftMain, dReefA), min(dReefB, dReefC));
    return min(d, min(dRight, dLeft));
  }

  void main() {
    vec2 p = vWorldPos.xz;
    float radialDist = length(p);
    float shoreD = shoreDistance(p);

    // Crystal turquoise shallows -> vibrant cerulean -> rich sapphire open ocean
    float shallowMask = 1.0 - smoothstep(-0.3, 6.8, shoreD);
    float midMask = smoothstep(4.5, 54.0, radialDist);

    vec3 dayShallow = vec3(0.18, 0.84, 0.80);
    vec3 dayMid = vec3(0.09, 0.52, 0.80);
    vec3 dayDeep = vec3(0.05, 0.28, 0.56);

    vec3 nightShallow = vec3(0.06, 0.28, 0.38);
    vec3 nightMid = vec3(0.04, 0.14, 0.32);
    vec3 nightDeep = vec3(0.02, 0.07, 0.18);

    vec3 shallowCol = mix(dayShallow, nightShallow, uNightFactor);
    vec3 midCol = mix(dayMid, nightMid, uNightFactor);
    vec3 deepCol = mix(dayDeep, nightDeep, uNightFactor);

    vec3 waterCol = mix(midCol, deepCol, midMask);
    waterCol = mix(waterCol, shallowCol, shallowMask);
    waterCol = mix(waterCol, waterCol + vec3(0.22, 0.10, 0.08), uSunsetFactor * 0.42);

    // Fine multi-octave high-frequency stylized ripples (sharp, crisp, non-blurry!)
    float camDist = length(cameraPosition - vWorldPos);
    float detailFade = 1.0 - smoothstep(45.0, 155.0, camDist);

    vec2 uvA = p * 1.45 + vec2(uTime * 0.42, -uTime * 0.28);
    vec2 uvB = p * 2.65 + vec2(-uTime * 0.34, uTime * 0.52);
    vec2 uvC = floor(p * 3.0) * 0.333 + vec2(uTime * 0.18, uTime * 0.24);

    float nA = vnoise(uvA);
    float nB = vnoise(uvB);
    float nC = vnoise(uvC * 2.2);

    // Compute fine crisp normal from high-frequency capillary ripples
    float eps = 0.22;
    float h0 = nA * 0.55 + nB * 0.35 + nC * 0.10;
    float hx = vnoise(uvA + vec2(eps, 0.0)) * 0.55 + vnoise(uvB + vec2(eps * 1.6, 0.0)) * 0.35;
    float hz = vnoise(uvA + vec2(0.0, eps)) * 0.55 + vnoise(uvB + vec2(0.0, eps * 1.6)) * 0.35;

    float rippleStrength = 0.72 * (0.35 + 0.65 * detailFade);
    vec3 normal = normalize(vec3((h0 - hx) * rippleStrength, 1.0, (h0 - hz) * rippleStrength));

    // Subtle sunlit caustic lattice in turquoise shallows
    float caustic = pow(clamp(1.0 - abs(nA - nB) * 3.2, 0.0, 1.0), 3.0);
    waterCol += vec3(0.16, 0.34, 0.36) * caustic * shallowMask * (1.0 - uNightFactor * 0.75) * detailFade;

    // Fine bright capillary wave crest glints
    float crest = smoothstep(0.66, 0.84, h0) * detailFade;
    waterCol += vec3(0.08, 0.16, 0.20) * crest * (1.0 - uNightFactor * 0.65);

    // Crisp animated white lapping shoreline foam around all islands & reefs
    float foamNoise = vnoise(p * 2.3 + vec2(uTime * 0.3, -uTime * 0.25));
    float shoreEdge = 1.0 - smoothstep(-0.1, 1.15 + foamNoise * 0.45, shoreD);
    float waveLap = sin(shoreD * 4.2 - uTime * 3.1 + foamNoise * 2.2) * 0.5 + 0.5;
    float secondaryRing =
      smoothstep(0.5, 1.5, shoreD) *
      (1.0 - smoothstep(1.5, 3.0, shoreD)) *
      smoothstep(0.62, 0.88, waveLap * foamNoise + 0.22);
    float foam = clamp(shoreEdge * (0.72 + 0.28 * foamNoise) + secondaryRing * 0.65, 0.0, 1.0);
    vec3 foamCol = mix(vec3(0.95, 0.99, 1.0), vec3(0.45, 0.62, 0.82), uNightFactor);
    waterCol = mix(waterCol, foamCol, foam * 0.82);

    // Physical Schlick Fresnel sky reflection
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float ndotv = clamp(dot(normal, viewDir), 0.0, 1.0);
    float fresnel = 0.04 + 0.96 * pow(1.0 - ndotv, 4.0);
    vec3 skyReflect = mix(uZenithColor, uFogColor, 0.58);
    waterCol = mix(waterCol, skyReflect, fresnel * 0.58);

    // Crisp Sun / Moon micro-glitter specular reflection
    vec3 lightDir = normalize(uCelestialDir);
    vec3 halfVec = normalize(lightDir + viewDir);
    float ndoth = max(dot(normal, halfVec), 0.0);
    float sharpGlint = pow(ndoth, 160.0) * 1.9;
    float softPath = pow(ndoth, 24.0) * 0.28;
    float celestialAbove = smoothstep(0.01, 0.14, lightDir.y);
    waterCol += uCelestialColor * (sharpGlint + softPath) * celestialAbove;

    // 360° circular horizon blend into sky fog (zero corner artifacts)
    float horizonFog = smoothstep(66.0, 166.0, radialDist);
    vec3 finalCol = mix(waterCol, uFogColor, horizonFog);

    // Slight transparency near shallow sandy shores for MC shader depth feel
    float alpha = mix(0.86, 0.98, smoothstep(0.0, 5.5, shoreD));
    alpha = max(alpha, max(foam * 0.95, horizonFog));
    gl_FragColor = vec4(finalCol, alpha);
  }
`;

export function createOceanSystem(): OceanSystem {
  const geo = createCircularOceanGeometry(190, 96, 60);

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
    },
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.22;
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
    }) => {
      mat.uniforms.uTime.value = elapsed;
      mat.uniforms.uNightFactor.value = nightFactor;
      mat.uniforms.uSunsetFactor.value = sunsetFactor;
      mat.uniforms.uCelestialDir.value.copy(celestialDir);
      mat.uniforms.uCelestialColor.value.copy(celestialColor);
      mat.uniforms.uFogColor.value.copy(fogColor);
      mat.uniforms.uZenithColor.value.copy(zenithColor);
    },
    dispose: () => {
      geo.dispose();
      mat.dispose();
    },
  };
}
