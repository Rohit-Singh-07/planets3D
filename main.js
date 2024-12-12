import "./style.css";
import "./index.css";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader";
import gsap from "gsap";

// Create scene
const scene = new THREE.Scene();
const loadingManager = new THREE.LoadingManager();
const loadingScreen = document.querySelector(".loader");

loadingManager.onStart = function (url, itemsLoaded, itemsTotal) {
  console.log(`Started loading: ${url}`);
  console.log(`Loaded ${itemsLoaded} of ${itemsTotal}`);
};

loadingManager.onLoad = function () {
  console.log("All items loaded");
  loadingScreen.classList.add("hidden"); // Add a class to fade out the loader
};

loadingManager.onProgress = function (url, itemsLoaded, itemsTotal) {
  console.log(`Loading file: ${url}`);
  console.log(`Loaded ${itemsLoaded} of ${itemsTotal}`);
};

// Handle errors
loadingManager.onError = function (url) {
  console.error(`There was an error loading ${url}`);
};

const textureLoader = new THREE.TextureLoader(loadingManager);
const gltfLoader = new GLTFLoader(loadingManager);
const rgbeLoader = new RGBELoader(loadingManager);

let isThrottled = false;
let deltaAccumulator = 0;
const THRESHOLD = 50; // Adjust this value to control sensitivity

// Normalize rotation to avoid overflow
window.addEventListener("wheel", (e) => {
  if (isThrottled) return;

  // Normalize delta values across different devices
  const delta = e.deltaY || e.deltaX;
  deltaAccumulator += Math.abs(delta);

  if (deltaAccumulator < THRESHOLD) return;

  isThrottled = true;
  deltaAccumulator = 0;

  // Determine direction (positive = down/right, negative = up/left)
  const direction = delta > 0 ? 1 : -1;

  // Rotate planets
  gsap.to(spheres.rotation, {
    y: `+=${(direction * Math.PI) / 2}`,
    duration: 1
  });

  // Get all heading elements
  const headings = document.querySelectorAll(".heading");
  const headingHeight = 100; // 100% height movement

  // Calculate current index based on spheres rotation
  const currentIndex =
    Math.round((spheres.rotation.y % (Math.PI * 2)) / (Math.PI / 2)) % 4;

  // Animate all headings
  gsap.to(".heading", {
    y: `-=${direction * headingHeight}%`,
    duration: 1,
    onComplete: () => {
      // If we've gone past the last heading, reset positions
      if (currentIndex === 3 && direction > 0) {
        headings.forEach((heading) => {
          gsap.set(heading, { y: "0%" });
        });
      }
      // If we've gone before the first heading, reset positions
      if (currentIndex === 0 && direction < 0) {
        headings.forEach((heading) => {
          gsap.set(heading, { y: "-300%" });
        });
      }
    }
  });

  setTimeout(() => {
    isThrottled = false;
  }, 1000);
});


// Create camera
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.z = 9;

// setInterval(() => {
//   gsap.to(spheres.rotation, {
//     y: `-=${Math.PI / 2}`,
//     duration: 2,
//   });
// }, 2500);

const spheres = new THREE.Group();

const starTexture = textureLoader.load("/stars.jpg");
starTexture.colorSpace = THREE.SRGBColorSpace;
const starGeometry = new THREE.SphereGeometry(50, 32, 32);
const starMaterial = new THREE.MeshStandardMaterial({
  map: starTexture,
  side: THREE.BackSide,
});
const star = new THREE.Mesh(starGeometry, starMaterial);
scene.add(star);

const radius = 1.5;
const orbitRadius = 6.9;

// const textures = [
//   "/csilla/color.png",
//   "/earth/map.jpg",
//   "/venus/map.jpg",
//   "/volcanic/color.png",
// ].map((url) => textureLoader.load(url));


// Create ambient light
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// Add directional light for shadows
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// Create and setup HDRI environment

// Load HDRI environment map
rgbeLoader.load(
  'https://dl.polyhaven.org/file/ph-assets/HDRIs/exr/1k/versveldpas_1k.exr',
  (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    scene.environment = texture;
  },
  undefined,
  () => {
    console.error('Failed to load HDRI. Using default black background.');
    scene.background = new THREE.Color(0x000000);
  }
);



const textureUrls = [
  '/csilla/color.png',
  '/earth/map.jpg',
  '/venus/map.jpg',
  '/volcanic/color.png',
];

const textures = textureUrls.map(
  (url) =>
    new Promise((resolve, reject) => {
      textureLoader.load(
        url,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          resolve(texture);
        },
        undefined,
        (err) => reject(err)
      );
    })
);

Promise.all(textures)
  .then((loadedTextures) => {
    for (let i = 0; i < loadedTextures.length; i++) {
      const texture = loadedTextures[i];
      const sphereGeometry = new THREE.SphereGeometry(radius, 30, 32);
      const sphereMaterial = new THREE.MeshStandardMaterial({
        map: texture,
      });

      const angle = (i / loadedTextures.length) * Math.PI * 2;
      const x = Math.cos(angle) * orbitRadius;
      const z = Math.sin(angle) * orbitRadius;

      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      sphere.position.set(x, 0, z);
      spheres.add(sphere);
    }
  })
  .catch((err) => console.error('Texture loading failed:', err));


// Add sphere to scene
scene.add(spheres);
spheres.rotation.x = 0.2;

// Set up renderer and canvas
const renderer = new THREE.WebGLRenderer({
  canvas: document.querySelector("#canvas"),
  antialias: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Add orbit controls
// const controls = new OrbitControls(camera, renderer.domElement);
// controls.enableDamping = true;
// controls.dampingFactor = 0.05;

// Handle window resizing
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  //   controls.update();
  renderer.render(scene, camera);
}

animate();
