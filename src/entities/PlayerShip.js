import * as THREE from 'three';
import { GAME_CONFIG } from '../core/Constants.js';
import { clampToBounds } from '../utils/math.js';
import { createPlayerModel } from '../gfx/ModelFactory.js';
import { updateEmissiveForDimension, updateShieldMaterial } from '../gfx/Materials.js';
import { createPlayerHBV } from '../systems/HBV.js';

export class PlayerShip {
  constructor() {
    const model = createPlayerModel();
    this.group = model.group;
    this.emissiveMaterials = model.emissiveMaterials;
    this.core = model.core;
    this.shield = model.shield;
    this.radius = GAME_CONFIG.player.radius;
    this.anchor = new THREE.Vector3(0, 0, -6);
    this.hbv = createPlayerHBV();
    this.hitFlash = 0;
    this.velocity = new THREE.Vector3();
    this.targetEuler = new THREE.Euler();
    this.targetQuaternion = new THREE.Quaternion();
    this.reset();
  }

  reset() {
    this.group.position.copy(this.anchor);
    this.group.quaternion.identity();
    this.velocity.set(0, 0, 0);
  }

  update(delta, input, state) {
    // WASD is screen-space dodge input: W/S move the ship up/down on screen,
    // while the world scroll creates the forward-flight sensation.
    const direction = new THREE.Vector3(
      (input.isDown('KeyA') ? 1 : 0) - (input.isDown('KeyD') ? 1 : 0),
      0,
      (input.isDown('KeyW') ? 1 : 0) - (input.isDown('KeyS') ? 1 : 0)
    );

    if (direction.lengthSq() > 0) {
      direction.normalize();
    }

    this.velocity.lerp(direction.multiplyScalar(GAME_CONFIG.player.speed), 1 - Math.exp(-delta * 12));
    this.group.position.addScaledVector(this.velocity, delta);
    clampToBounds(this.group.position);
    this.group.position.z = THREE.MathUtils.lerp(this.group.position.z, this.anchor.z, 1 - Math.exp(-delta * 0.9));
    this.updateAttitude(delta);
    this.core.rotation.y += delta * 3.2;
    updateEmissiveForDimension(this.emissiveMaterials, state.dimension, state.giEnabled ? 1.15 : 0.7);
    this.updateShield(delta, state);
    if (this.hitFlash > 0) {
      this.hitFlash = Math.max(0, this.hitFlash - delta);
      const flash = this.hitFlash / 0.22;
      for (const material of this.emissiveMaterials) {
        material.emissive.set('#ffffff').lerp(state.dimensionConfig.color, 1 - flash);
        material.emissiveIntensity = 1.6 + flash * 2.4;
      }
      this.group.scale.setScalar(1 + flash * 0.08);
    } else {
      this.group.scale.setScalar(1);
    }
  }

  updateAttitude(delta) {
    const targetPitch = THREE.MathUtils.clamp(this.velocity.z * 0.018, -0.18, 0.18);
    const targetRoll = THREE.MathUtils.clamp(-this.velocity.x * 0.045, -0.42, 0.42);
    this.targetEuler.set(targetPitch, 0, targetRoll, 'XYZ');
    this.targetQuaternion.setFromEuler(this.targetEuler);
    this.group.quaternion.slerp(this.targetQuaternion, 1 - Math.exp(-delta * 8));
  }

  updateShield(delta, state) {
    const shieldRatio = state.shield / GAME_CONFIG.player.maxShield;
    this.shield.visible = shieldRatio > 0.01;
    if (!this.shield.visible) return;
    updateShieldMaterial(this.shield.material, state.dimension, shieldRatio, delta);
    const pulse = Math.sin(this.shield.material.uniforms.time.value * 4.2) * 0.018;
    this.shield.scale.setScalar(1 + pulse + (1 - shieldRatio) * 0.05);
  }

  applyIndirectLight(color, enabled) {
    if (!enabled) return;
    for (const material of this.emissiveMaterials) {
      material.emissive.lerp(color, 0.35);
      material.emissiveIntensity = 1.25;
    }
  }

  flashHit() {
    this.hitFlash = 0.22;
  }
}
