import * as THREE from 'three';
import { GAME_CONFIG } from '../core/Constants.js';
import { Pickup } from '../entities/Pickup.js';
import { disposeObject3D } from '../utils/dispose.js';
import { randomLane } from '../utils/math.js';

export class PickupSystem {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
    this.spawnTimer = 0.15;
    this.nearSpawnActive = true;
    this.nearSpawnTimer = 0.15;
  }

  update(delta, state, worldTravelSpeed = 0) {
    this.spawnTimer -= delta;
    if (this.spawnTimer <= 0 && this.items.length < GAME_CONFIG.pickup.maxCount) {
      this.spawnTimer = state.dimension === 'phase' ? 1.35 : 3.1;
      this.spawnPickup(state.dimension);
    }
    this.updateNearSpawns(delta, state.dimension);

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
    this.spawnPickupAt(dimensionId, GAME_CONFIG.pickup.zSpawn, 'far');
  }

  spawnPickupAt(dimensionId, z, spawnSource = 'far') {
    const kind = pickupKindForDimension(dimensionId);
    const pickup = new Pickup(kind, new THREE.Vector3(randomLane(), 0.25, z));
    pickup.spawnSource = spawnSource;
    this.items.push(pickup);
    this.scene.add(pickup.mesh);
  }

  primeNearSpawns() {
    this.nearSpawnActive = true;
    this.nearSpawnTimer = Math.min(this.nearSpawnTimer, 0.15);
    this.spawnTimer = Math.min(this.spawnTimer, 0.15);
  }

  updateNearSpawns(delta, dimensionId) {
    if (!this.nearSpawnActive) return;

    if (this.hasFarSpawnReachedNearLine()) {
      this.nearSpawnActive = false;
      return;
    }

    this.nearSpawnTimer -= delta;
    if (this.nearSpawnTimer <= 0 && this.items.length < GAME_CONFIG.pickup.maxCount) {
      this.spawnPickupAt(dimensionId, GAME_CONFIG.spawn.portalExitZ, 'near');
      this.nearSpawnTimer = GAME_CONFIG.spawn.portalExitInterval;
    }
  }

  hasFarSpawnReachedNearLine() {
    return this.items.some((pickup) => pickup.spawnSource === 'far' && pickup.mesh.position.z <= GAME_CONFIG.spawn.portalExitZ);
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

  drain() {
    const items = this.items.splice(0);
    this.spawnTimer = 1.2;
    this.nearSpawnActive = false;
    this.nearSpawnTimer = 0.15;
    return items.map((pickup) => pickup.mesh);
  }

  reset() {
    for (let i = this.items.length - 1; i >= 0; i -= 1) {
      this.removeAt(i);
    }
    this.spawnTimer = 0.15;
    this.nearSpawnActive = true;
    this.nearSpawnTimer = 0.15;
  }
}

function pickupKindForDimension(dimensionId) {
  if (dimensionId === 'phase') return 'ammo';
  if (dimensionId === 'combat') return 'power';
  return Math.random() > 0.5 ? 'shield' : 'health';
}
