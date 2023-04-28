import * as THREE from 'three';

const rad2deg = (r) => r * (180 / Math.PI);
const deg2rad = (d) => d / (180 / Math.PI);

// Load resources
const earthTexture = new THREE.TextureLoader().load('images/earth.jpg');
const earthBumpMap = new THREE.TextureLoader().load('images/bumpmap.jpg');

// Setup the renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0xffffff, 0);
document.body.appendChild(renderer.domElement);

// Setup the scene
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.x = 3;
camera.lookAt(0, 0, 0);

const earthGeometry = new THREE.SphereGeometry(1, 32, 32);
const earthMaterial = new THREE.MeshPhongMaterial({ 
  map: earthTexture,
  bumpMap: earthBumpMap,
  bumpScale: 0.05,
  specular: 0x333333
});
const earth = new THREE.Mesh(earthGeometry, earthMaterial);
earth.rotation.order = 'ZYX';

let imageMeshes = [];

function loadPhotos(photos) {
  scene.clear();

  scene.add(earth);

  imageMeshes = [];

  for (const [imageUrl, coords] of Object.entries(photos)) {
    const imageTexture = new THREE.TextureLoader().load(imageUrl);
    const imageGeometry = new THREE.PlaneGeometry(0.2, 0.2);
    const imageMaterial = new THREE.MeshPhongMaterial({ map: imageTexture })
    const imageMesh = new THREE.Mesh(imageGeometry, imageMaterial);
    imageMeshes.push(imageMesh);

    // Then rotate to it's lat/lon
    // First translate the image in the +Z direciton
    const translateNode = new THREE.Object3D();
    translateNode.position.x = 1.01;
    translateNode.rotation.y = deg2rad(90);
    translateNode.add(imageMesh);

    const rotateNode = new THREE.Object3D();
    rotateNode.rotation.set(0, -deg2rad(coords.lon), deg2rad(coords.lat));
    rotateNode.add(translateNode);

    earth.add(rotateNode);
  }

  const ambient = new THREE.AmbientLight(0xffffff, 0.3);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xffffff, 0.3);
  sun.position.set(1, 1, 1);
  scene.add(sun);

  animate();
}

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

function getLatLon() {
  return {
    lat: rad2deg(-earth.rotation.z),
    lon: rad2deg(earth.rotation.y)
  }
}

/**
 * Rotates the Earth by the specified change in latitude/longitude
 * @param {number} lat Change in latitude in degrees
 * @param {number} lon Change in longitude in degrees
 */
function updateLatLon(deltaLat, deltaLon) {
  // Get current lat lon
  let { lat, lon } = getLatLon();

  // Add deltas
  lat += deltaLat;
  lon += deltaLon;

  setLatLon(lat, lon);
}

/**
 * Rotates the Earth to the specified latitude/longitude
 * @param {number} lat Latitude in degrees
 * @param {number} lon Longitude in degrees
 */
function setLatLon(lat, lon) {
  // Clamp latitude between -90 and 90 degrees
  lat = Math.max(-90, Math.min(lat, 90));

  // Clamp longitude between -180 and 180 degrees
  if (lon > 180) {
    lon -= 360;
  } else if (lon < -180) {
    lon += 360;
  }

  earth.rotation.z = deg2rad(-lat);
  earth.rotation.y = deg2rad(lon);
}

function updateZoom(deltaZoom) {
  camera.position.x = Math.max(1.1, Math.min(camera.position.x + deltaZoom, 5));

  for (const mesh of imageMeshes) {
    mesh.scale.set(camera.position.x / 3, camera.position.x / 3, 1);
  }
}

export default {
  loadPhotos,
  getLatLon,
  updateLatLon,
  setLatLon,
  updateZoom
}