import * as THREE from 'three';

export function createSnowglobe() {
  // ── Constants ─────────────────────────────────────────────
  const SPHERE_RADIUS = 1.5;
  const DOME_THETA = Math.PI * 0.7;      // keep top 70% of arc
  const CUT_Y = SPHERE_RADIUS * Math.cos(DOME_THETA);   // ~-0.88
  const CUT_RADIUS = SPHERE_RADIUS * Math.sin(DOME_THETA); // ~1.21
  const SPHERE_Y = 1.2;
  const GROUND_Y = CUT_Y + 0.05;

  // ── Globe group ───────────────────────────────────────────
  const globe = new THREE.Group();
  globe.position.y = SPHERE_Y;

  // Inner point light
  const innerLight = new THREE.PointLight(0xffeedd, 0.5, 8);
  innerLight.position.set(0, 0.08, 0);
  globe.add(innerLight);

  // ── Glass sphere ──────────────────────────────────────────
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 0.02,
    transmission: 0.92,
    thickness: 0.4,
    transparent: true,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    ior: 1.45,
    side: THREE.FrontSide,
    depthWrite: false,
  });
  const glassSphere = new THREE.Mesh(
    new THREE.SphereGeometry(SPHERE_RADIUS, 64, 64, 0, Math.PI * 2, 0, DOME_THETA),
    glassMat
  );
  glassSphere.position.y = 0;
  glassSphere.renderOrder = 10;
  globe.add(glassSphere);

  // ── Solid base ────────────────────────────────────────────
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0xe8e8f0,
    roughness: 0.25,
    metalness: 0.85,
  });

//   const baseDisk = new THREE.Mesh(
//     new THREE.CircleGeometry(CUT_RADIUS + 0.03, 64),
//     baseMat
//   );
//   baseDisk.rotation.x = -Math.PI / 2;
//   baseDisk.position.y = CUT_Y;
//   globe.add(baseDisk);

  const BASE_HEIGHT = 0.5;
  const baseStem = new THREE.Mesh(
    new THREE.CylinderGeometry(CUT_RADIUS, CUT_RADIUS * 0.35, BASE_HEIGHT, 32),
    baseMat
  );
  baseStem.position.y = CUT_Y - BASE_HEIGHT / 2;
  globe.add(baseStem);

  const baseFoot = new THREE.Mesh(
    new THREE.CylinderGeometry(CUT_RADIUS * 0.35, CUT_RADIUS * 0.48, 0.1, 32),
    baseMat
  );
  baseFoot.position.y = CUT_Y - BASE_HEIGHT - 0.05;
  globe.add(baseFoot);

//   // Gold rim at dome-base junction
//   const rimMat = new THREE.MeshStandardMaterial({
//     color: 0xc9a84c,
//     roughness: 0.25,
//     metalness: 0.85,
//   });
//   const rim = new THREE.Mesh(
//     new THREE.TorusGeometry(CUT_RADIUS + 0.01, 0.025, 16, 64),
//     rimMat
//   );
//   rim.rotation.x = Math.PI / 2;
//   rim.position.y = CUT_Y;
//   globe.add(rim);

  // ── Ground (inside dome) ──────────────────────────────────
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(CUT_RADIUS * 0.88, 64),
    new THREE.MeshStandardMaterial({ color: 0xe8e8f0, roughness: 0.95 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = GROUND_Y;
  globe.add(ground);

  // ── Snow particles ────────────────────────────────────────
  const SNOW_COUNT = 20;
  const snowPos = new Float32Array(SNOW_COUNT * 3);
  const snowVel = new Float32Array(SNOW_COUNT);
  const snowDrift = new Float32Array(SNOW_COUNT * 2);
  const innerR = SPHERE_RADIUS * 0.85;

  function randomInsideSphere(i) {
    let x, y, z;
    for (;;) {
      x = (Math.random() * 2 - 1) * innerR;
      y = (Math.random() * 2 - 1) * innerR;
      z = (Math.random() * 2 - 1) * innerR;
      if (x * x + y * y + z * z <= innerR * innerR && y > GROUND_Y + 0.05) break;
    }
    snowPos[i * 3]     = x;
    snowPos[i * 3 + 1] = y;
    snowPos[i * 3 + 2] = z;
  }

  function resetSnowflake(i) {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * innerR * 0.6;
    snowPos[i * 3]     = Math.cos(angle) * r;
    snowPos[i * 3 + 1] = innerR * (0.5 + Math.random() * 0.4);
    snowPos[i * 3 + 2] = Math.sin(angle) * r;
  }

  for (let i = 0; i < SNOW_COUNT; i++) {
    randomInsideSphere(i);
    snowVel[i] = 0.002 + Math.random() * 0.004;
    snowDrift[i * 2]     = Math.random() * Math.PI * 2;
    snowDrift[i * 2 + 1] = Math.random() * Math.PI * 2;
  }

  const snowGeom = new THREE.BufferGeometry();
  snowGeom.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));

  const snowMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.035,
    transparent: true,
    opacity: 0.85,
    sizeAttenuation: true,
    depthWrite: false,
  });

  const snowPoints = new THREE.Points(snowGeom, snowMat);
  snowPoints.renderOrder = 6;
  globe.add(snowPoints);

  // ── Snow update (called each frame) ───────────────────────
  function updateSnow(t) {
    const pos = snowGeom.attributes.position.array;
    for (let i = 0; i < SNOW_COUNT; i++) {
      const i3 = i * 3;
      pos[i3 + 1] -= snowVel[i];
      pos[i3]     += Math.sin(t * 0.5 + snowDrift[i * 2])     * 0.0004;
      pos[i3 + 2] += Math.cos(t * 0.5 + snowDrift[i * 2 + 1]) * 0.0004;

      const sx = pos[i3], sy = pos[i3 + 1], sz = pos[i3 + 2];
      if (sx * sx + sy * sy + sz * sz > innerR * innerR || sy < GROUND_Y + 0.05) {
        resetSnowflake(i);
      }
    }
    snowGeom.attributes.position.needsUpdate = true;
  }

  return { globe, SPHERE_Y, SPHERE_RADIUS, updateSnow };
}
