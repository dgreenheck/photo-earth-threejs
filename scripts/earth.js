import * as THREE from 'three';
import * as geoData from '../images/geoData.json';

const rad2deg = (r) => r * (180 / Math.PI);
const deg2rad = (d) => d / (180 / Math.PI);

const images = [
  'images/bahamas.jpg',
  'images/italy.jpg',
  'images/newyork.jpg',
  'images/paris.jpg',
  'images/newzealand.jpg'
];

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

const earthGeometry = new THREE.SphereGeometry(1, 32, 32);
const earthMaterial = new THREE.MeshPhongMaterial({ 
  map: earthTexture,
  bumpMap: earthBumpMap,
  bumpScale: 0.05,
  specular: 0x333333
});

const earth = new THREE.Mesh(earthGeometry, earthMaterial);
sphere.rotation.order = 'ZYX';
scene.add(sphere);

for (const image of images) {
  const imageTexture = new THREE.TextureLoader().load(image);
  const imageGeometry = new THREE.PlaneGeometry();
  const imageMaterial = new THREE.MeshPhongMaterial({ map: imageTexture })
  const imageMesh = new THREE.Mesh(imageGeometry, imageMaterial);
}

const light = new THREE.DirectionalLight(0xffffff, 0.3);
light.position.set(1, 1, 1);
scene.add(light);

camera.position.x = 2.5;
camera.lookAt(0, 0, 0);

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

function getLatLon() {
  return {
    lat: rad2deg(-sphere.rotation.z),
    lon: rad2deg(sphere.rotation.y)
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

  sphere.rotation.z = deg2rad(-lat);
  sphere.rotation.y = deg2rad(lon);
}

function setZoom(zoom) {
  camera.position.x = 2.5 / zoom * 0.2;
  console.log(camera.position.x);
}

animate();

export default {
  getLatLon,
  updateLatLon,
  setLatLon,
  setZoom
}