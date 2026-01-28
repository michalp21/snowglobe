import * as THREE from 'three';
import { RenderPixelatedPass } from 'three/addons/postprocessing/RenderPixelatedPass.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { createSnowglobe } from './snowglobe.js';
import { createBillboard } from './mapping.js';
import { createBackground } from './background.js';

// ── Renderer ──────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0xF5F5F5);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);

// ── Scene & Camera ────────────────────────────────────────
const scene = new THREE.Scene();
const bg = createBackground();
scene.background = bg.texture;

const camera = new THREE.PerspectiveCamera(
  40, window.innerWidth / window.innerHeight, 0.1, 100
);
camera.position.set(0, 1.5, 7.5);

// ── Lighting ──────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0x8090b0, 0.7));

const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
dirLight.position.set(4, 6, 3);
scene.add(dirLight);

// const backLight = new THREE.DirectionalLight(0x4060a0, 0.5);
// backLight.position.set(-3, 2, -4);
// scene.add(backLight);

const sideLight = new THREE.PointLight(0xddeeff, 40, 15, 2);
sideLight.position.set(-2.5, 0.3, 2.5);
scene.add(sideLight);

// ── Snowglobe ─────────────────────────────────────────────
const { globe, SPHERE_Y, SPHERE_RADIUS, updateSnow } = createSnowglobe();
scene.add(globe);
camera.lookAt(0, SPHERE_Y + 0.2, 0);

// ── Billboard ─────────────────────────────────────────────
const { update: updateBillboard } = createBillboard(scene, SPHERE_Y, SPHERE_RADIUS);

// ── Mouse drag rotation ───────────────────────────────────
let dragging = false;
let prevX = 0, prevY = 0;
let rotY = 0, rotX = 0;
let velY = 0, velX = 0;
let forceY = 0, forceX = 0;
const DAMPING = 0.92;
const REVERSE_BRAKE = 0.8;
const FORCE_SCALE_Y = 0.002;
const FORCE_SCALE_X = 0.001;
const MAX_SPEED_Y = 0.05;
const MAX_SPEED_X = 0.025;
const MAX_ROT_X = Math.PI / 2 - .01;

function onPointerDown(e) {
  dragging = true;
  prevX = e.clientX;
  prevY = e.clientY;
}

function onPointerMove(e) {
  if (!dragging) return;
  forceY += (e.clientX - prevX) * FORCE_SCALE_Y;
  forceX += (e.clientY - prevY) * FORCE_SCALE_X;
  prevX = e.clientX;
  prevY = e.clientY;
}

function onPointerUp() {
  dragging = false;
}

renderer.domElement.addEventListener('pointerdown', onPointerDown);
window.addEventListener('pointermove', onPointerMove);
window.addEventListener('pointerup', onPointerUp);

// ── Post-processing ──────────────────────────────────────
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const pixelSize = 4;
const pixelPass = new RenderPixelatedPass(pixelSize, scene, camera);
composer.addPass(pixelPass);

// ── Animation loop ────────────────────────────────────────
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  const t = clock.elapsedTime;

  if (forceY * velY < 0) velY *= REVERSE_BRAKE;
  if (forceX * velX < 0) velX *= REVERSE_BRAKE;
  velY += forceY;
  velX += forceX;
  forceY = 0;
  forceX = 0;
  velY = Math.max(-MAX_SPEED_Y, Math.min(MAX_SPEED_Y, velY));
  velX = Math.max(-MAX_SPEED_X, Math.min(MAX_SPEED_X, velX));
  rotY += velY;
  rotX = Math.max(0, Math.min(MAX_ROT_X, rotX + velX));
  velY *= DAMPING;
  velX *= DAMPING;

  bg.update(dt);
  updateSnow(t);
  updateBillboard(rotX, rotY, camera);

  globe.rotation.order = 'XYZ';
  globe.rotation.y = rotY;
  globe.rotation.x = rotX;

  composer.render();
}
animate();

// ── Resize ────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  bg.resize(window.innerWidth, window.innerHeight);
});
