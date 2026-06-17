import * as THREE from 'three';

export function createSceneSetup(root) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#082b34', 14, 38);

  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 120);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  root.appendChild(renderer.domElement);

  return { scene, camera, renderer };
}
