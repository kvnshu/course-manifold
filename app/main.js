import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";

// CONSTANTS
const SCALE_FACTOR = 5;

// SCENE SETUP
const scene = new THREE.Scene();
// scene.background = new THREE.Color(0xffffff);
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Camera controls
const controls = new PointerLockControls(camera, renderer.domElement);
// Click anywhere to lock pointer
document.body.addEventListener("click", () => {
  if (!controls.isLocked) controls.lock();
});
camera.position.z = 100;

// Movement controls
const clock = new THREE.Clock();
const moveSpeed = 50; // units per second
const keys = { w: false, a: false, s: false, d: false };

function onKeyDown(event) {
  switch (event.code) {
    case "KeyW":
    case "ArrowUp":
      keys.w = true;
      break;
    case "KeyA":
    case "ArrowLeft":
      keys.a = true;
      break;
    case "KeyS":
    case "ArrowDown":
      keys.s = true;
      break;
    case "KeyD":
    case "ArrowRight":
      keys.d = true;
      break;
  }
}

function onKeyUp(event) {
  switch (event.code) {
    case "KeyW":
    case "ArrowUp":
      keys.w = false;
      break;
    case "KeyA":
    case "ArrowLeft":
      keys.a = false;
      break;
    case "KeyS":
    case "ArrowDown":
      keys.s = false;
      break;
    case "KeyD":
    case "ArrowRight":
      keys.d = false;
      break;
  }
}

document.addEventListener("keydown", onKeyDown);
document.addEventListener("keyup", onKeyUp);

// DATA LOADING
const response = await fetch("course_points.json");
const data = await response.json();

// COLOR MAPPING
const uniqueSubjects = [...new Set(data.map((p) => p.course_subj))].sort();
const colorMap = {};
uniqueSubjects.forEach((subj) => {
  colorMap[subj] = new THREE.Color(Math.random(), Math.random(), Math.random());
});

// POPULATE LEGEND
const legend = document.getElementById("legend");
uniqueSubjects.forEach((subj) => {
  const item = document.createElement("div");
  item.className = "legend-item";

  const colorBox = document.createElement("span");
  colorBox.className = "legend-color";
  const color = colorMap[subj];
  colorBox.style.backgroundColor = `rgb(${Math.floor(
    color.r * 255
  )}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)})`;

  const label = document.createElement("span");
  label.className = "legend-label";
  label.textContent = subj;

  item.appendChild(colorBox);
  item.appendChild(label);
  legend.appendChild(item);
});

// CREATE SPHERES
const sphereGeometry = new THREE.SphereGeometry(0.1, 16, 16);
const spheres = [];

data.forEach((p, i) => {
  const sphereMaterial = new THREE.MeshBasicMaterial({
    color: colorMap[p.course_subj],
    // sizeAttenuation: true,
    transparent: true,
    opacity: 0.9,
    // blending: THREE.AdditiveBlending // Makes points glow
  });
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphere.position.set(
    p.x * SCALE_FACTOR,
    p.y * SCALE_FACTOR,
    p.z * SCALE_FACTOR
  );
  sphere.userData = { index: i };
  scene.add(sphere);
  spheres.push(sphere);
});

// === HOVER INTERACTION ===
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const label = document.getElementById("labels");

window.addEventListener("mousemove", (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

const direction = new THREE.Vector3();

// --- Animation Loop ---
function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  // Apply movement when pointer is locked
  if (controls.isLocked) {
    if (keys.w){
        camera.getWorldDirection( direction );
        camera.position.addScaledVector( direction, moveSpeed * delta );
    }
    if (keys.s) {
        camera.getWorldDirection( direction );
        camera.position.addScaledVector( direction, -moveSpeed * delta );
    }
    if (keys.a) controls.moveRight(-moveSpeed * delta);
    if (keys.d) controls.moveRight(moveSpeed * delta);
  }

  // Raycast for hover
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(spheres);
  if (intersects.length > 0) {
    const idx = intersects[0].object.userData.index;
    const course = data[idx];
    label.innerHTML = `<strong>${course.course_subj} ${course.course_number}: ${course.course_name}</strong><br>${course.course_description}`;
    label.style.opacity = 1;
  } else {
    label.innerHTML = "Hover over a point";
    label.style.opacity = 0.4;
  }

  renderer.render(scene, camera);
}
animate();

// Handle Resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
