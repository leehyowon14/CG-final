import * as THREE from 'three';
import { DIMENSIONS, GAME_CONFIG } from '../core/Constants.js';
import { Enemy } from '../entities/Enemy.js';
import { disposeObject3D } from '../utils/dispose.js';
import { randomLane } from '../utils/math.js';

export class EnemySystem {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
    this.spawnTimer = 1.2;
    this.bossTimer = 24;
    this.player = null;
    this.projectileSystem = null;
  }

  update(delta, state, worldTravelSpeed = 0) {
    this.spawnTimer -= delta * DIMENSIONS[state.dimension].spawnRate;

    if (this.spawnTimer <= 0 && this.items.length < GAME_CONFIG.enemy.maxCount) {
      this.spawnTimer = state.dimension === 'combat' ? 0.65 : 1.8;
      this.spawnEnemy(state.dimension);
    }

    if (state.dimension === 'combat') {
      this.bossTimer -= delta;
      if (this.bossTimer <= 0 && !this.items.some((enemy) => enemy.type === 'boss')) {
        this.bossTimer = 36;
        this.spawnBoss();
      }
    }

    const playerPosition = new THREE.Vector3(0, 0, -6);
    const player = this.player;
    if (player) {
      playerPosition.copy(player.group.position);
    }

    for (let i = this.items.length - 1; i >= 0; i -= 1) {
      const enemy = this.items[i];
      enemy.update(delta, state, playerPosition, (position, lateralVelocity) => {
        if (this.projectileSystem) {
          this.projectileSystem.spawnEnemyProjectile(position, state.dimensionConfig.color, lateralVelocity);
        }
      }, worldTravelSpeed);
      const outOfTravelRange =
        enemy.mesh.position.z < GAME_CONFIG.enemy.zDespawn || enemy.mesh.position.z > GAME_CONFIG.enemy.zSpawn + 24;
      if (outOfTravelRange && enemy.type !== 'boss') {
        this.removeAt(i);
      }
    }
  }

  spawnEnemy(dimensionId) {
    const roll = Math.random();
    const type = dimensionId === 'combat' && roll > 0.64 ? 'gunner' : roll > 0.36 ? 'striker' : 'drone';
    const enemy = new Enemy(type, new THREE.Vector3(randomLane(), 0, GAME_CONFIG.enemy.zSpawn));
    this.items.push(enemy);
    this.scene.add(enemy.mesh);
  }

  spawnBoss() {
    const boss = new Enemy('boss', new THREE.Vector3(0, 1.1, 11));
    this.items.push(boss);
    this.scene.add(boss.mesh);
  }

  remove(enemy) {
    const index = this.items.indexOf(enemy);
    if (index >= 0) {
      this.removeAt(index);
    }
  }

  removeAt(index) {
    const [enemy] = this.items.splice(index, 1);
    this.scene.remove(enemy.mesh);
    disposeObject3D(enemy.mesh);
  }

  reset() {
    for (let i = this.items.length - 1; i >= 0; i -= 1) {
      this.removeAt(i);
    }
    this.spawnTimer = 1.2;
    this.bossTimer = 10;
  }
}
