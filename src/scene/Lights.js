import * as THREE from 'three';
import { DIMENSIONS } from '../core/Constants.js';

export class Lights {
  constructor(scene) {
    this.ambient = new THREE.AmbientLight('#c8e5ff', 1.15);
    this.key = new THREE.DirectionalLight('#ffffff', 5.6);
    this.key.position.set(-5, 10, -5);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(1024, 1024);
    this.fill = new THREE.DirectionalLight('#7fb6ff', 2);
    this.fill.position.set(6, 4, 8);
    this.rim = new THREE.PointLight('#35d6c6', 42, 48);
    this.rim.position.set(0, 5, 7);
    scene.add(this.ambient, this.key, this.fill, this.rim);
  }

  update(dimensionId) {
    const dimension = DIMENSIONS[dimensionId];
    this.ambient.color.copy(dimension.color).lerp(new THREE.Color('#ffffff'), 0.64);
    this.key.color.copy(dimension.color).lerp(new THREE.Color('#ffffff'), 0.48);
    this.fill.color.copy(dimension.color).lerp(new THREE.Color('#7aa8ff'), 0.6);
    this.rim.color.copy(dimension.color);
  }
}
