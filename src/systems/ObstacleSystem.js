import * as THREE from 'three';
import { GAME_CONFIG } from '../core/Constants.js';
import { Obstacle } from '../entities/Obstacle.js';
import { disposeObject3D } from '../utils/dispose.js';
import { randomLane } from '../utils/math.js';

export class ObstacleSystem {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
    this.spawnTimer = 0.15;
    this.nearSpawnActive = true;
    this.nearSpawnTimer = 0.15;
  }

  update(delta, state, worldTravelSpeed = 0) {
    if (state.dimension === 'phase') {
      this.spawnTimer -= delta;
      if (this.spawnTimer <= 0 && this.items.length < GAME_CONFIG.obstacle.maxCount) {
        this.spawnTimer = 0.75;
        this.spawnObstacle(state.dimension);
      }
      this.updateNearSpawns(delta, state.dimension);
    }

    for (let i = this.items.length - 1; i >= 0; i -= 1) {
      const obstacle = this.items[i];
      obstacle.update(delta, state, worldTravelSpeed);
      const outOfTravelRange =
        obstacle.mesh.position.z < GAME_CONFIG.obstacle.zDespawn || obstacle.mesh.position.z > GAME_CONFIG.obstacle.zSpawn + 24;
      if (outOfTravelRange) {
        this.removeAt(i);
      }
    }
  }

  spawnObstacle(dimensionId) {
    if (dimensionId !== 'phase') return;

    this.spawnObstacleAt(GAME_CONFIG.obstacle.zSpawn, 'far');
  }

  spawnObstacleAt(z, spawnSource = 'far') {
    const kind = weightedKind();
    const obstacle = new Obstacle(kind, new THREE.Vector3(randomLane(), 0.2, z));
    obstacle.spawnSource = spawnSource;
    this.items.push(obstacle);
    this.scene.add(obstacle.mesh);
  }

  primeNearSpawns() {
    this.nearSpawnActive = true;
    this.nearSpawnTimer = Math.min(this.nearSpawnTimer, 0.15);
    this.spawnTimer = Math.min(this.spawnTimer, 0.15);
  }

  updateNearSpawns(delta, dimensionId) {
    if (!this.nearSpawnActive || dimensionId !== 'phase') return;

    if (this.hasFarSpawnReachedNearLine()) {
      this.nearSpawnActive = false;
      return;
    }

    this.nearSpawnTimer -= delta;
    if (this.nearSpawnTimer <= 0 && this.items.length < GAME_CONFIG.obstacle.maxCount) {
      this.spawnObstacleAt(GAME_CONFIG.spawn.portalExitZ, 'near');
      this.nearSpawnTimer = GAME_CONFIG.spawn.portalExitInterval;
    }
  }

  hasFarSpawnReachedNearLine() {
    return this.items.some((obstacle) => obstacle.spawnSource === 'far' && obstacle.mesh.position.z <= GAME_CONFIG.spawn.portalExitZ);
  }

  remove(obstacle) {
    const index = this.items.indexOf(obstacle);
    if (index >= 0) {
      this.removeAt(index);
    }
  }

  removeAt(index) {
    const [obstacle] = this.items.splice(index, 1);
    this.scene.remove(obstacle.mesh);
    disposeObject3D(obstacle.mesh);
  }

  drain() {
    const items = this.items.splice(0);
    this.spawnTimer = 1.8;
    this.nearSpawnActive = false;
    this.nearSpawnTimer = 0.15;
    return items.map((obstacle) => obstacle.mesh);
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

function weightedKind() {
  const roll = Math.random();
  if (roll > 0.72) return 'wall';
  if (roll > 0.44) return 'mine';
  return 'crystal';
}
