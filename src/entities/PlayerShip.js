import * as THREE from 'three';
import { GAME_CONFIG } from '../core/Constants.js';
import { clampToBounds } from '../utils/math.js';
import { createPlayerModel } from '../gfx/ModelFactory.js';
import { updateEmissiveForDimension } from '../gfx/Materials.js';

export class PlayerShip {
  constructor() {
    const model = createPlayerModel();
    this.group = model.group;
    this.emissiveMaterials = model.emissiveMaterials;
    this.core = model.core;
    this.radius = GAME_CONFIG.player.radius;
    this.velocity = new THREE.Vector3();
    this.reset();
  }

  reset() {
    this.group.position.set(0, 0, -6);
    this.group.rotation.set(0, 0, 0);
    this.velocity.set(0, 0, 0);
  }

  update(delta, input, state) {
    const direction = new THREE.Vector3(
      (input.isDown('KeyD') ? 1 : 0) - (input.isDown('KeyA') ? 1 : 0),
      0,
      (input.isDown('KeyW') ? 1 : 0) - (input.isDown('KeyS') ? 1 : 0)
    );

    if (direction.lengthSq() > 0) {
      direction.normalize();
    }

    this.velocity.lerp(direction.multiplyScalar(GAME_CONFIG.player.speed), 1 - Math.exp(-delta * 12));
    this.group.position.addScaledVector(this.velocity, delta);
    clampToBounds(this.group.position);
    this.group.rotation.z = THREE.MathUtils.lerp(this.group.rotation.z, -this.velocity.x * 0.045, 1 - Math.exp(-delta * 8));
    this.group.rotation.x = THREE.MathUtils.lerp(this.group.rotation.x, this.velocity.z * 0.018, 1 - Math.exp(-delta * 8));
    this.core.rotation.y += delta * 3.2;
    updateEmissiveForDimension(this.emissiveMaterials, state.dimension, state.giEnabled ? 1.15 : 0.7);
  }

  applyIndirectLight(color, enabled) {
    if (!enabled) return;
    for (const material of this.emissiveMaterials) {
      material.emissive.lerp(color, 0.35);
      material.emissiveIntensity = 1.25;
    }
  }
}
