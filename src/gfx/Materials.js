import * as THREE from 'three';
import { DIMENSIONS } from '../core/Constants.js';

export function createEnergyMaterial(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: options.emissiveIntensity ?? 0.7,
    roughness: options.roughness ?? 0.42,
    metalness: options.metalness ?? 0.35,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1
  });
}

export function createHullMaterial() {
  return new THREE.MeshStandardMaterial({
    color: '#d9dde3',
    emissive: '#08151c',
    emissiveIntensity: 0.1,
    roughness: 0.22,
    metalness: 0.88
  });
}

export function createDarkHullMaterial() {
  return new THREE.MeshStandardMaterial({
    color: '#5f6874',
    emissive: '#071016',
    emissiveIntensity: 0.12,
    roughness: 0.3,
    metalness: 0.78
  });
}

export function createCanopyMaterial() {
  return new THREE.MeshStandardMaterial({
    color: '#78bced',
    emissive: '#123655',
    emissiveIntensity: 0.48,
    roughness: 0.08,
    metalness: 0.15,
    transparent: true,
    opacity: 0.78
  });
}

export function createShieldMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      shieldColor: { value: new THREE.Color('#47a7ff') },
      opacity: { value: 0 },
      time: { value: 0 }
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vWorldPosition;
      varying vec3 vLocalPosition;

      void main() {
        vNormal = normalize(normalMatrix * normal);
        vLocalPosition = position;
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 shieldColor;
      uniform float opacity;
      uniform float time;
      varying vec3 vNormal;
      varying vec3 vWorldPosition;
      varying vec3 vLocalPosition;

      void main() {
        vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
        float fresnel = pow(1.0 - abs(dot(normalize(vNormal), viewDirection)), 2.35);
        float scan = smoothstep(0.88, 1.0, sin((vLocalPosition.y + time * 0.45) * 18.0) * 0.5 + 0.5);
        float pulse = 0.82 + sin(time * 4.2) * 0.18;
        float alpha = opacity * pulse * (0.2 + fresnel * 0.88 + scan * 0.16);
        vec3 color = shieldColor * (0.38 + fresnel * 1.65 + scan * 0.28);
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending
  });
}

export function dimensionMaterial(dimensionId, options = {}) {
  const dimension = DIMENSIONS[dimensionId];
  return createEnergyMaterial(dimension.color, options);
}

export function updateEmissiveForDimension(materials, dimensionId, intensity = 0.8) {
  const color = DIMENSIONS[dimensionId].color;
  for (const material of materials) {
    material.emissive.copy(color);
    material.emissiveIntensity = intensity;
  }
}

export function updateShieldMaterial(material, dimensionId, shieldRatio, delta) {
  const color = DIMENSIONS[dimensionId].color;
  material.uniforms.shieldColor.value.copy(color).lerp(new THREE.Color('#47a7ff'), 0.28);
  material.uniforms.opacity.value = THREE.MathUtils.clamp(0.12 + shieldRatio * 0.18, 0, 0.3);
  material.uniforms.time.value += delta;
}
