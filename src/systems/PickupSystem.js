import * as THREE from 'three';
import { GAME_CONFIG } from '../core/Constants.js';
import { Pickup } from '../entities/Pickup.js';
import { disposeObject3D } from '../utils/dispose.js';
import { randomLane } from '../utils/math.js';

export class PickupSystem {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
    this.spawnTimer = 2.4;
  }

  update(delta, state, worldTravelSpeed = 0) {
    this.spawnTimer -= delta;
    if (this.spawnTimer <= 0 && this.items.length < GAME_CONFIG.pickup.maxCount) {
      this.spawnTimer = state.dimension === 'phase' ? 1.35 : 3.1;
      this.spawnPickup(state.dimension);
    }

    for (let i = this.items.length - 1; i >= 0; i -= 1) {
      const pickup = this.items[i];
      pickup.update(delta, worldTravelSpeed);
      const outOfTravelRange =
        pickup.mesh.position.z < GAME_CONFIG.pickup.zDespawn || pickup.mesh.position.z > GAME_CONFIG.pickup.zSpawn + 24;
      if (outOfTravelRange) {
        this.removeAt(i);
      }
    }
  }

  spawnPickup(dimensionId) {
    const kind = pickupKindForDimension(dimensionId);
    const pickup = new Pickup(kind, new THREE.Vector3(randomLane(), 0.25, GAME_CONFIG.pickup.zSpawn));
    this.items.push(pickup);
    this.scene.add(pickup.mesh);
  }

  remove(pickup) {
    const index = this.items.indexOf(pickup);
    if (index >= 0) {
      this.removeAt(index);
    }
  }

  removeAt(index) {
    const [pickup] = this.items.splice(index, 1);
    this.scene.remove(pickup.mesh);
    disposeObject3D(pickup.mesh);
  }

  reset() {
    for (let i = this.items.length - 1; i >= 0; i -= 1) {
      this.removeAt(i);
    }
    this.spawnTimer = 1.2;
  }
}

function pickupKindForDimension(dimensionId) {
  if (dimensionId === 'phase') return 'ammo';
  if (dimensionId === 'combat') return 'power';
  return Math.random() > 0.5 ? 'shield' : 'health';
}
