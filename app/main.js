import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

// ================================
// CONSTANTS & CONFIGURATION
// ================================
const CONFIG = {
  SCALE_FACTOR: 50,
  MOVE_SPEED: 20,
  SPHERE_SIZE: 0.15,
  BLOOM: {
    STRENGTH: 1.5,
    RADIUS: 0.4,
    THRESHOLD: 0.3  // Lower threshold = more glow
  },
  EMISSIVE_INTENSITY: 2,
  LABEL_MAX_DISTANCE: 50 // Only show labels for spheres within this distance
};

// ================================
// GLOBAL VARIABLES
// ================================
let scene, camera, renderer, controls, composer;
let data, spheres = [];
let colorMap = {};
const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const direction = new THREE.Vector3();
const keys = { w: false, a: false, s: false, d: false };

// Label management
let sphereLabelsContainer;
const activeSphereLabels = new Map();

// ================================
// SCENE INITIALIZATION
// ================================
function initScene() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
}

function initControls() {
  controls = new PointerLockControls(camera, renderer.domElement);
  const navOverlay = document.getElementById("nav-overlay");

  controls.addEventListener("lock", () => navOverlay.style.display = "none");
  controls.addEventListener("unlock", () => navOverlay.style.display = "block");
  
  document.body.addEventListener("click", () => {
    if (!controls.isLocked) controls.lock();
  });
}

function initPostProcessing() {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    CONFIG.BLOOM.STRENGTH,
    CONFIG.BLOOM.RADIUS,
    CONFIG.BLOOM.THRESHOLD
  );
  composer.addPass(bloomPass);
}

function initLighting() {
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const light = new THREE.PointLight(0xffffff, 1);
  light.position.set(10, 10, 10);
  scene.add(light);
}

// ================================
// DATA PROCESSING
// ================================
async function loadAndProcessData() {
  const response = await fetch("course_points.json");
  data = await response.json();
  
  // Center points around origin
  const meanX = data.reduce((sum, p) => sum + p.x, 0) / data.length;
  const meanY = data.reduce((sum, p) => sum + p.y, 0) / data.length;
  const meanZ = data.reduce((sum, p) => sum + p.z, 0) / data.length;
  
  data.forEach(p => {
    p.x -= meanX;
    p.y -= meanY;
    p.z -= meanZ;
  });
}

function generateColorMap() {
  const uniqueSubjects = [...new Set(data.map(p => p.course_subj))].sort();
  uniqueSubjects.forEach(subj => {
    // Generate brighter colors (0.3-1.0 range) to ensure bloom effect
    const r = 0.3 + Math.random() * 0.7;
    const g = 0.3 + Math.random() * 0.7;
    const b = 0.3 + Math.random() * 0.7;
    colorMap[subj] = new THREE.Color(r, g, b);
  });
}

function createSpheres() {
  const sphereGeometry = new THREE.SphereGeometry(CONFIG.SPHERE_SIZE, 16, 16);
  
  data.forEach((p, i) => {
    // Use MeshBasicMaterial for pure emissive glow without lighting dependency
    const sphereMaterial = new THREE.MeshBasicMaterial({
      color: colorMap[p.course_subj],
      // No emissive needed - the color itself will glow with bloom
    });
    
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.set(
      p.x * CONFIG.SCALE_FACTOR,
      p.y * CONFIG.SCALE_FACTOR,
      p.z * CONFIG.SCALE_FACTOR
    );
    sphere.userData = { index: i };
    
    scene.add(sphere);
    spheres.push(sphere);
  });
}

// ================================
// EVENT HANDLERS
// ================================

function initKeyboardControls() {
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
}

function initMouseControls() {
  window.addEventListener("mousemove", (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  });
}

function initModalControls() {
  const modal = document.getElementById("info-modal");
  const infoIcon = document.getElementById("info-icon");
  const closeBtn = document.getElementsByClassName("close")[0];

  infoIcon.onclick = function (event) {
    event.stopPropagation();
    modal.style.display = "block";
  };

  closeBtn.onclick = function () {
    modal.style.display = "none";
  };

  window.onclick = function (event) {
    if (event.target == modal) {
      modal.style.display = "none";
    }
  };
}

function initResizeHandler() {
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

// ================================
// SPHERE LABELING
// ================================
function initSphereLabels() {
  sphereLabelsContainer = document.getElementById("sphere-labels");
}

function updateSphereLabels() {
  // Clear existing labels
  activeSphereLabels.clear();
  sphereLabelsContainer.innerHTML = '';
  
  // Create frustum for visibility culling
  const frustum = new THREE.Frustum();
  const cameraMatrix = new THREE.Matrix4();
  cameraMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  frustum.setFromProjectionMatrix(cameraMatrix);
  
  // Vector for screen projection and distance calculations
  const vector = new THREE.Vector3();
  
  spheres.forEach((sphere, index) => {
    // Calculate distance from camera to sphere
    const distance = camera.position.distanceTo(sphere.position);
    
    // Only process spheres within the specified distance and camera frustum
    if (distance <= CONFIG.LABEL_MAX_DISTANCE && frustum.containsPoint(sphere.position)) {
      // Project 3D position to screen coordinates
      vector.copy(sphere.position);
      vector.project(camera);
      
      // Convert to screen pixels
      const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
      const y = (vector.y * -0.5 + 0.5) * window.innerHeight;
      
      // Check if sphere is not behind camera and within reasonable distance
      if (vector.z < 1 && vector.z > -1) {
        const course = data[index];
        createSphereLabel(course.course_subj, course.course_number, x, y, index);
      }
    }
  });
}

function createSphereLabel(subject, number, x, y, index) {
  const label = document.createElement('div');
  label.className = 'sphere-label';
  label.textContent = `${subject} ${number}`;
  label.style.left = `${x}px`;
  label.style.top = `${y}px`;
  
  sphereLabelsContainer.appendChild(label);
  activeSphereLabels.set(index, label);
}

// ================================
// ANIMATION & RENDERING
// ================================
function handleMovement(delta) {
  if (!controls.isLocked) return;
  
  if (keys.w) {
    camera.getWorldDirection(direction);
    camera.position.addScaledVector(direction, CONFIG.MOVE_SPEED * delta);
  }
  if (keys.s) {
    camera.getWorldDirection(direction);
    camera.position.addScaledVector(direction, -CONFIG.MOVE_SPEED * delta);
  }
  if (keys.a) controls.moveRight(-CONFIG.MOVE_SPEED * delta);
  if (keys.d) controls.moveRight(CONFIG.MOVE_SPEED * delta);
}

function handleHover() {
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(spheres);
  const label = document.getElementById("labels");
  
  if (intersects.length > 0 && !controls.isLocked) {
    const idx = intersects[0].object.userData.index;
    const course = data[idx];
    label.innerHTML = `<strong>${course.course_subj} ${course.course_number}: ${course.course_name}</strong><br>${course.course_description}`;
    label.style.opacity = 1;
  } else {
    label.style.color = "lightgrey";
    label.style.opacity = 0.7;
  }
}

function animate() {
  requestAnimationFrame(animate);
  
  const delta = clock.getDelta();
  handleMovement(delta);
  handleHover();
  updateSphereLabels(); // Update sphere labels each frame
  
  composer.render();
}

// ================================
// INITIALIZATION
// ================================
async function init() {
  // Initialize core systems
  initScene();
  initControls();
  initLighting();
  initPostProcessing();
  
  // Load and process data
  await loadAndProcessData();
  generateColorMap();
  createSpheres();
  
  // Setup UI
  initSphereLabels();
  
  // Setup event handlers
  initKeyboardControls();
  initMouseControls();
  initModalControls();
  initResizeHandler();
  
  // Start animation
  animate();
}

// Start the application
init().catch(console.error);
