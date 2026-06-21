import * as THREE from 'three';

export function createSceneSetup(root) {
  const scene = new THREE.Scene();
  const fog = new THREE.Fog('#082b34', 20, 56);
  scene.fog = fog;

  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 120);
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: isVisualQaMode()
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.28;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  root.appendChild(renderer.domElement);

  return { scene, camera, renderer, fog };
}

function isVisualQaMode() {
  return typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('qa') === 'visual';
}
