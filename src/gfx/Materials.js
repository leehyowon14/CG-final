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
    color: '#18222c',
    emissive: '#02070a',
    emissiveIntensity: 0.2,
    roughness: 0.34,
    metalness: 0.65,
    flatShading: true
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
