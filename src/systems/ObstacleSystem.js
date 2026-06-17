import * as THREE from 'three';
import { DIMENSIONS, GAME_CONFIG } from '../core/Constants.js';
import { Obstacle } from '../entities/Obstacle.js';
import { randomLane } from '../utils/math.js';

export class ObstacleSystem {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
    this.spawnTimer = 1.8;
  }

  update(delta, state) {
    this.spawnTimer -= delta * DIMENSIONS[state.dimension].obstacleRate;
    if (this.spawnTimer <= 0 && this.items.length < GAME_CONFIG.obstacle.maxCount) {
      this.spawnTimer = state.dimension === 'phase' ? 0.75 : 2.5;
      this.spawnObstacle(state.dimension);
    }

    for (let i = this.items.length - 1; i >= 0; i -= 1) {
      const obstacle = this.items[i];
      obstacle.update(delta, state);
      if (obstacle.mesh.position.z < GAME_CONFIG.obstacle.zDespawn) {
        this.removeAt(i);
      }
    }
  }

  spawnObstacle(dimensionId) {
    const kind = dimensionId === 'phase' ? weightedKind() : 'crystal';
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
