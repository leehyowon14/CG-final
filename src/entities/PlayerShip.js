import * as THREE from 'three';
import { GAME_CONFIG } from '../core/Constants.js';
import { createPlayerModel } from '../gfx/ModelFactory.js';
import { updateEmissiveForDimension, updateShieldMaterial } from '../gfx/Materials.js';
import { createPlayerHBV } from '../systems/HBV.js';

const WARP_DURATION = 0.72;
const WARP_DISTANCE = 9.7;

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
    this.worldTravelSpeed = 0;
    this.dimensionWarp = null;
    this.targetEuler = new THREE.Euler();
    this.targetQuaternion = new THREE.Quaternion();
    this.reset();
  }

  reset() {
    this.group.position.copy(this.anchor);
    this.group.quaternion.identity();
    this.velocity.set(0, 0, 0);
    this.worldTravelSpeed = 0;
    this.dimensionWarp = null;
  }

  update(delta, input, state) {
    // WASD is screen-space dodge input. A/D move the ship laterally; W/S
    // change world-relative travel speed so the ship stays in the play space.
    const direction = new THREE.Vector3(
      (input.isDown('KeyA') ? 1 : 0) - (input.isDown('KeyD') ? 1 : 0),
      0,
      (input.isDown('KeyW') ? 1 : 0) - (input.isDown('KeyS') ? 1 : 0)
    );

    if (direction.lengthSq() > 0) {
      direction.normalize();
    }

    this.velocity.lerp(direction.multiplyScalar(GAME_CONFIG.player.speed), 1 - Math.exp(-delta * 12));
    this.group.position.x += this.velocity.x * delta;
    this.group.position.x = THREE.MathUtils.clamp(this.group.position.x, -GAME_CONFIG.bounds.x, GAME_CONFIG.bounds.x);
    this.group.position.z = this.anchor.z;
    this.updateDimensionWarp(delta);
    this.updateAttitude(delta);
    this.core.rotation.y += delta * 3.2;
    updateEmissiveForDimension(this.emissiveMaterials, state.dimension, 0.9);
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

  startDimensionWarp() {
    this.dimensionWarp = {
      elapsed: 0,
      previousDistance: 0
    };
  }

  updateDimensionWarp(delta) {
    this.worldTravelSpeed = this.velocity.z;
    if (!this.dimensionWarp) return;

    this.dimensionWarp.elapsed = Math.min(WARP_DURATION, this.dimensionWarp.elapsed + delta);
    const t = this.dimensionWarp.elapsed / WARP_DURATION;
    const eased = smootherStep(t);
    const distance = WARP_DISTANCE * eased;
    const deltaDistance = distance - this.dimensionWarp.previousDistance;
    this.worldTravelSpeed = delta > 0 ? deltaDistance / delta : 0;
    this.dimensionWarp.previousDistance = distance;

    if (this.dimensionWarp.elapsed >= WARP_DURATION) {
      this.dimensionWarp = null;
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

function smootherStep(t) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}
