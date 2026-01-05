import * as THREE from 'three';
import { OrbitControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js';

// CONSTANTS
const SCALE_FACTOR = 10;

// SCENE SETUP
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Camera controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.minDistance = 0;
controls.maxDistance = 2000;
camera.position.z = 100;

// DATA LOADING
const response = await fetch('../data/course_points.json');
const data = await response.json();

// COLOR MAPPING
const uniqueSubjects = [...new Set(data.map(p => p.course_subj))].sort();
const colorMap = {};
uniqueSubjects.forEach((subj) => {
    colorMap[subj] = new THREE.Color(Math.random(), Math.random(), Math.random());
});

// POPULATE LEGEND
const legend = document.getElementById('legend');
uniqueSubjects.forEach((subj) => {
    const item = document.createElement('div');
    item.className = 'legend-item';
    
    const colorBox = document.createElement('span');
    colorBox.className = 'legend-color';
    const color = colorMap[subj];
    colorBox.style.backgroundColor = `rgb(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)})`;
    
    const label = document.createElement('span');
    label.className = 'legend-label';
    label.textContent = subj;
    
    item.appendChild(colorBox);
    item.appendChild(label);
    legend.appendChild(item);
});

// CREATE SPHERES
const sphereGeometry = new THREE.SphereGeometry(0.4, 16, 16);
const spheres = [];

data.forEach((p, i) => {
    const sphereMaterial = new THREE.MeshBasicMaterial({ 
        color: colorMap[p.course_subj],
        size: 0.5,
        // sizeAttenuation: true,
        transparent: true,
        opacity: 0.9,
        // blending: THREE.AdditiveBlending // Makes points glow
    });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.set(p.x * SCALE_FACTOR, p.y * SCALE_FACTOR, p.z * SCALE_FACTOR);
    sphere.userData = { index: i };
    scene.add(sphere);
    spheres.push(sphere);
});

// === HOVER INTERACTION ===
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const label = document.getElementById('labels');

window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

// --- Animation Loop ---
function animate() {
    requestAnimationFrame(animate);
    controls.update();

    // Raycast for hover
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(spheres);
    if (intersects.length > 0) {
        const idx = intersects[0].object.userData.index;
        const course = data[idx];
        label.innerHTML = `<strong>${course.course_subj} ${course.course_number}: ${course.course_name}</strong><br>${course.course_description}`;
        label.style.opacity = 1;
    } else {
        label.innerHTML = 'Hover over a point';
        label.style.opacity = 0.4;
    }

    renderer.render(scene, camera);
}
animate();

// Handle Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
