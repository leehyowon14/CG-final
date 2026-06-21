import * as THREE from 'three';
import { GAME_CONFIG } from '../core/Constants.js';
import { Obstacle } from '../entities/Obstacle.js';
import { disposeObject3D } from '../utils/dispose.js';
import { randomLane } from '../utils/math.js';

export class ObstacleSystem {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
    this.spawnTimer = 1.8;
  }

  update(delta, state, worldTravelSpeed = 0) {
    if (state.dimension === 'phase') {
      this.spawnTimer -= delta;
      if (this.spawnTimer <= 0 && this.items.length < GAME_CONFIG.obstacle.maxCount) {
        this.spawnTimer = 0.75;
        this.spawnObstacle(state.dimension);
      }
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

    const kind = weightedKind();
    const obstacle = new Obstacle(kind, new THREE.Vector3(randomLane(), 0.2, GAME_CONFIG.obstacle.zSpawn));
    this.items.push(obstacle);
    this.scene.add(obstacle.mesh);
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

  reset() {
    for (let i = this.items.length - 1; i >= 0; i -= 1) {
      this.removeAt(i);
    }
    this.spawnTimer = 1.8;
  }
}

function weightedKind() {
  const roll = Math.random();
  if (roll > 0.72) return 'wall';
  if (roll > 0.44) return 'mine';
  return 'crystal';
}
