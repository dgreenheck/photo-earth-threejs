import * as THREE from 'three';

const clock = new THREE.Clock(true);

// Constants
const IMAGE_SIZE = 0.2;
const MIN_ZOOM = 1.2;
const MAX_ZOOM = 4;
const ZOOM_SENSITIVITY = 0.001;
const ROTATE_SENSITIVITY = 0.2;
const DAMPING = 0.99;
const LERP_SPEED = 0.1;

// Helper functions to convert between radians and degrees
const rad2deg = (r) => r * (180 / Math.PI);
const deg2rad = (d) => d / (180 / Math.PI);

// Load textures
// https://planetpixelemporium.com/earth8081.html
const res = '10k';
const earthTexture = new THREE.TextureLoader().load(`images/earth/earth_texture_${res}.jpg`);
const earthBumpMap = new THREE.TextureLoader().load(`images/earth/earth_bump_${res}.jpg`);
const earthSpecularMap = new THREE.TextureLoader().load(`images/earth/earth_specular_${res}.jpg`);

// Setup the renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0xffffff, 0);
document.getElementById('render-target').appendChild(renderer.domElement);

// Setup raycaster
const raycaster = new THREE.Raycaster();

// Setup the scene
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 100);
camera.position.x = 3;
camera.lookAt(0, 0, 0);

// Setup earth
const earthGeometry = new THREE.SphereGeometry(1, 64, 64);
const earthMaterial = new THREE.MeshPhongMaterial({
  map: earthTexture,
  bumpMap: earthBumpMap,
  bumpScale: 0.05,
  specular: 0x555555,
  specularMap: earthSpecularMap
});
const earth = new THREE.Mesh(earthGeometry, earthMaterial);
earth.name = 'earth';
earth.rotation.order = 'ZYX';
scene.add(earth);

// Physics for acceleration based rotation of earth
let lerpTimeout = undefined;
let freeSpinning = false;
let prevCoords = { lat: 0, lon: 0 };
let speed = { lat: 0, lon: 0 };

const textureLoader = new THREE.TextureLoader();

export function loadPhotos(locations) {
  for (const location of Object.values(locations)) {
    // Asynchronously load the texture
    textureLoader.loadAsync(location.imageUrl)
      .then(texture => {
        create3dPhoto(texture, location)
      });
  }
  setupLighting();
  animate();
}

function create3dPhoto(texture, location) {
  // Compute aspect ratio of the image
  const aspectRatio = texture.source.data.width / texture.source.data.height;

  // Build a plane with the correct aspect ratio
  const imageGeometry = new THREE.PlaneGeometry(IMAGE_SIZE, IMAGE_SIZE / aspectRatio);

  // Create a new material with the image as a texture.
  const imageMaterial = new THREE.MeshBasicMaterial({ 
    map: texture, 
    side: THREE.DoubleSide // Image visible on front and back of plane
  })

  // Create the plane mesh
  const imageMesh = new THREE.Mesh(imageGeometry, imageMaterial);
  imageMesh.name = 'photo';

  // Keep coords in user data so when we click on it, we know where to rotate to
  imageMesh.userData = location.coords;

  createLineFromPhotoToEarth(imageMesh);

  // First translate the image in the +Z direciton
  const translateNode = new THREE.Object3D();
  translateNode.position.x = 1.05;
  translateNode.rotation.y = deg2rad(90);
  translateNode.add(imageMesh);

  // Then rotate to it's lat/lon
  const rotateNode = new THREE.Object3D();
  rotateNode.rotation.set(0, -deg2rad(location.coords.lon), deg2rad(location.coords.lat));
  rotateNode.add(translateNode);

  earth.add(rotateNode);
}

function createLineFromPhotoToEarth(parentNode) {
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1.05)
  ]);

  const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0xffffff }));
  parentNode.add(line);
}

function setupLighting() {
  const ambient = new THREE.AmbientLight(0xffffff, 0.1);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xffffff, 0.6);
  sun.position.set(5, 5, 5);
  scene.add(sun);
}

function animate() {
  // Get change in time since the last frame
  const deltaTime = clock.getDelta();

  if (freeSpinning) {
    // Apply damping to slow down rotation over time
    speed.lat *= DAMPING;
    speed.lon *= DAMPING;

    // Continue to rotate the earth
    rotate(
      getLatitude() + speed.lat * deltaTime,
      getLongitude() + speed.lon * deltaTime
    );
  } else {
    // Update instantaneous speed (change in rotation over time)
    speed.lat = (getLatitude() - prevCoords.lat) / deltaTime;
    speed.lon = (getLongitude() - prevCoords.lon) / deltaTime;
  }

  prevCoords.lat = getLatitude();
  prevCoords.lon = getLongitude();

  // Render next frame
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

const getLatitude = () => rad2deg(-earth.rotation.z);
const getLongitude = () => rad2deg(earth.rotation.y);

export function rotateDelta(deltaX, deltaY) {
  rotate(
    getLatitude() + deltaY * ROTATE_SENSITIVITY,
    getLongitude() + deltaX * ROTATE_SENSITIVITY
  );
}

export function rotate(lat, lon) {
  // Clamp latitude between -85 and 85 degrees to avoid gimbal lock
  lat = Math.max(-85, Math.min(lat, 85));

  // Clamp longitude between -180 and 180 degrees
  if (lon > 180) {
    lon -= 360;
  } else if (lon < -180) {
    lon += 360;
  }

  earth.rotation.set(0, deg2rad(lon), deg2rad(-lat));
}

export function zoom(deltaZoom) {
  camera.position.x += deltaZoom * ZOOM_SENSITIVITY;
  camera.position.x = Math.max(MIN_ZOOM, Math.min(camera.position.x, MAX_ZOOM));

  // Scale photos based on the zoom level
  for (const photo of scene.getObjectsByProperty('name', 'photo')) {
    photo.scale.set(camera.position.x / 3, camera.position.x / 3, 1);
  }
}

export function onMouseDown(event) {
  freeSpinning = false;
  clearTimeout(lerpTimeout);

  // Get normalized mouse coordinates
  let unitMouse = {
    x: (event.clientX / renderer.domElement.clientWidth) * 2 - 1,
    y: -(event.clientY / renderer.domElement.clientHeight) * 2 + 1
  };

  // Update raycaster with new mouse position
  raycaster.setFromCamera(unitMouse, camera);

  // Find intersections
  let intersections = raycaster.intersectObjects(scene.children, true);
  if (intersections.length > 0) {
    const photo = intersections.find(x => x.object.geometry.type === 'PlaneGeometry');
    if (!photo) return;
    const coords = photo.object.userData;
    rotateSmooth(coords.lat, coords.lon);
  }
}

export function onMouseUp() {
  freeSpinning = true;
}

function rotateSmooth(targetLat, targetLon) {
  freeSpinning = false;

  let currentLat = getLatitude();
  let currentLon = getLongitude();

  // Handle discontinuity as -180 to 180
  if (Math.abs(currentLon - targetLon) > 180) {
    if (targetLon < 0 && currentLon > 0) currentLon -= 360;
    if (targetLon > 0 && currentLon < 0) currentLon += 360;
  }

  // Compute the next latitude/longitude
  const nextLat = (1 - LERP_SPEED) * currentLat + LERP_SPEED * targetLat;
  const nextLon = (1 - LERP_SPEED) * currentLon + LERP_SPEED * targetLon;

  rotate(nextLat, nextLon);

  // Continue rotating until we are close to the target coordinates
  if (Math.abs(targetLat - getLatitude()) > 0.05 ||
      Math.abs(targetLon - getLongitude()) > 0.05) {
    lerpTimeout = setTimeout(() => {
      rotateSmooth(targetLat, targetLon);
    }, 10);
  }
}