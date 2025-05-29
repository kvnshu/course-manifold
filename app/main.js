import Papa from "papaparse";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xeeeeee);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(10, 10, 20); 
camera.lookAt(8, 8, 0); 

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);

// Load CSV
let parsedData = null;

await fetch("/data/eecs_courses_umap3d.csv")
  .then((res) => res.text())
  .then((text) => {
    parsedData = Papa.parse(text, { header: true });
    console.log(parsedData);
  });

const geometry = new THREE.SphereGeometry(0.1, 32, 32);
const material = new THREE.MeshBasicMaterial({ color: 0x0077ff });
const points = [];

if (parsedData === null || parsedData.data.length === 0) {
  console.error("No data found in the CSV file.");
} else {
  console.log(`Parsed ${parsedData.data.length} courses.`);
}

for (let i = 0; i < parsedData.data.length; i++) {
  const sphere = new THREE.Mesh(geometry, material);
  sphere.position.set(
    parseFloat(parsedData.data[i].UMAP_1),
    parseFloat(parsedData.data[i].UMAP_2),
    parseFloat(parsedData.data[i].UMAP_3)
  );
  sphere.userData = { number: `${parsedData.data[i].course_number}` };
  scene.add(sphere);
  points.push(sphere);
}

// Axes helper
const axesHelper = new THREE.AxesHelper(50);
scene.add(axesHelper);

// Raycaster setup
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const tooltip = document.getElementById("tooltip");

function onMouseMove(event) {
  // Convert mouse position to normalized device coordinates (-1 to +1)
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(points);

  if (intersects.length > 0) {
    const intersected = intersects[0].object;
    tooltip.style.display = "block";
    tooltip.style.left = `${event.clientX + 10}px`;
    tooltip.style.top = `${event.clientY + 10}px`;
    tooltip.textContent = intersected.userData.number;
  } else {
    tooltip.style.display = "none";
  }
}

window.addEventListener("mousemove", onMouseMove, false);

// Render loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

// Handle window resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
