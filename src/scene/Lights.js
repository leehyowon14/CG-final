import * as THREE from 'three';
import { DIMENSIONS } from '../core/Constants.js';

export class Lights {
  constructor(scene) {
    this.ambient = new THREE.AmbientLight('#7adbd4', 1.2);
    this.key = new THREE.DirectionalLight('#ffffff', 3.2);
    this.key.position.set(-5, 9, -4);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(1024, 1024);
    this.rim = new THREE.PointLight('#35d6c6', 18, 34);
    this.rim.position.set(0, 4, 6);
    scene.add(this.ambient, this.key, this.rim);
  }

  update(dimensionId) {
    const dimension = DIMENSIONS[dimensionId];
    this.ambient.color.copy(dimension.color).lerp(new THREE.Color('#ffffff'), 0.45);
    this.key.color.copy(dimension.color).lerp(new THREE.Color('#ffffff'), 0.28);
    this.rim.color.copy(dimension.color);
  }
}
