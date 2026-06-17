import * as THREE from 'three';
import { GAME_CONFIG } from '../core/Constants.js';
import { Pickup } from '../entities/Pickup.js';
import { randomLane } from '../utils/math.js';

export class PickupSystem {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
    this.spawnTimer = 2.4;
  }

  update(delta, state) {
    this.spawnTimer -= delta;
    if (this.spawnTimer <= 0 && this.items.length < GAME_CONFIG.pickup.maxCount) {
      this.spawnTimer = state.dimension === 'phase' ? 1.35 : 3.1;
      this.spawnPickup(state.dimension);
    }

    for (let i = this.items.length - 1; i >= 0; i -= 1) {
      const pickup = this.items[i];
      pickup.update(delta);
      if (pickup.mesh.position.z < GAME_CONFIG.pickup.zDespawn) {
        this.removeAt(i);
      }
    }
  }

  spawnPickup(dimensionId) {
    const kind = dimensionId === 'phase' ? 'ammo' : dimensionId === 'stability' && Math.random() > 0.5 ? 'shield' : 'health';
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
  }

  reset() {
    for (let i = this.items.length - 1; i >= 0; i -= 1) {
      this.removeAt(i);
    }
    this.spawnTimer = 1.2;
  }
}
