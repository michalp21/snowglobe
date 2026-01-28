import * as THREE from 'three';

export function createBillboard(scene, sphereY, SR) {
  // ── Image entries mapped to hemisphere coordinates ────────
  // Filename: video{N}_{FFFF}.png
  //   N  → longitude (evenly spaced around the equator)
  //   FFFF → latitude  (0000 = equator, 0004 = north pole)
  const videoIds = [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const framesPerVideo = 10;
  const imagePoints = [];
  for (let vi = 0; vi < videoIds.length; vi++) {
    const theta = (vi / videoIds.length) * 2 * Math.PI; // longitude
    for (let f = 0; f < framesPerVideo - 1; f++) { // avoid north pole
      const phi = (f / (framesPerVideo - 1)) * (Math.PI / 2); // latitude
      imagePoints.push({
        dir: new THREE.Vector3(
          Math.cos(phi) * Math.sin(theta),
          Math.sin(phi),
          Math.cos(phi) * Math.cos(theta)
        ),
        file: `stills/video${videoIds[vi]}_${String(f).padStart(4, '0')}.png`,
        texture: null,
      });
    }
  }

  // north pole
  imagePoints.push({
    dir: new THREE.Vector3(
        Math.cos(Math.PI / 2) * Math.sin(0),
        Math.sin(Math.PI / 2),
        Math.cos(Math.PI / 2) * Math.cos(0)
    ),
    file: `stills/video0_0009.png`,
    texture: null,
  });

  // ── Display plane sized so the dome circle is inscribed ──
  const sphereRadius = SR - .1
  const planeH = 2 * sphereRadius;
  const defaultAspect = 16 / 9;
  const planeSize = new THREE.Vector2(planeH * defaultAspect, planeH);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      map:     { value: null },
      mapPrev: { value: null },
      mixT:    { value: 1.0 },
      planeSize:    { value: planeSize },
      sphereRadius: { value: sphereRadius },
    },
    vertexShader: `
      uniform vec2 planeSize;
      varying vec2 vUv;
      varying vec2 vPos;
      void main() {
        vUv = position.xy / planeSize + 0.5;
        vPos = position.xy;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D map;
      uniform sampler2D mapPrev;
      uniform float mixT;
      uniform float sphereRadius;
      varying vec2 vUv;
      varying vec2 vPos;
      void main() {
        float dist = length(vPos);
        float edge = smoothstep(sphereRadius, sphereRadius - 0.3, dist);
        vec4 colOld = texture2D(mapPrev, vUv);
        vec4 colNew = texture2D(map, vUv);
        vec4 texColor = mix(colOld, colNew, mixT);
        gl_FragColor = vec4(texColor.rgb, edge);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const imagePlane = new THREE.Mesh(
    new THREE.CircleGeometry(sphereRadius, 64),
    material
  );
  imagePlane.position.set(0, sphereY, 0);
  imagePlane.renderOrder = 5;
  scene.add(imagePlane);

  // ── Load all textures ─────────────────────────────────────
  const texLoader = new THREE.TextureLoader();
  for (const pt of imagePoints) {
    texLoader.load(pt.file, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      pt.texture = tex;
      // Adjust UV mapping from first loaded texture's aspect ratio
      if (!imagePlane.userData.aspectSet && tex.image) {
        const aspect = tex.image.width / tex.image.height;
        planeSize.set(planeH * aspect, planeH);
        imagePlane.userData.aspectSet = true;
      }
    });
  }

  // ── Per-frame update ──────────────────────────────────────
  const northPoleIndex = imagePoints.length - 1;
  let currentImageIndex = -1;
  const FADE_SPEED = 8; // opacity units per second — fade completes in ~0.12s

  function update(rotX, rotY, camera) {
    // Camera-facing direction in globe-local space
    // Globe rotation order XYZ: R = Rx(rotX) * Ry(rotY)
    // Inverse applied to world forward (0,0,1):
    const sinRY = Math.sin(rotY), cosRY = Math.cos(rotY);
    const sinRX = Math.sin(rotX), cosRX = Math.cos(rotX);
    const localFwd = new THREE.Vector3(-cosRX * sinRY, sinRX, cosRX * cosRY);

    let bestDot = -Infinity;
    let bestIdx = -1;
    for (let i = 0; i < imagePoints.length; i++) {
      if (!imagePoints[i].texture) continue;
      const d = imagePoints[i].dir.dot(localFwd);
      if (d > bestDot) { bestDot = d; bestIdx = i; }
    }

    if (bestIdx >= 0 && bestIdx !== currentImageIndex) {
      // Carry current texture into prev slot for crossfade
      material.uniforms.mapPrev.value =
        material.uniforms.map.value || imagePoints[bestIdx].texture;
      material.uniforms.map.value = imagePoints[bestIdx].texture;
      material.uniforms.mixT.value = 0;
      currentImageIndex = bestIdx;
    }

    // Crossfade toward the new image
    const m = material.uniforms.mixT.value;
    if (m < 1) {
      material.uniforms.mixT.value = Math.min(1, m + FADE_SPEED * (1 / 60));
    }

    // Billboard: always face the camera
    imagePlane.lookAt(camera.position);
    // North pole image must spin with the globe's Y rotation
    if (currentImageIndex === northPoleIndex) {
      imagePlane.rotateZ(rotY);
    }
  }

  return { update };
}
