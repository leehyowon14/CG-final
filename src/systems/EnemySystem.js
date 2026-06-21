import * as THREE from 'three';
import { DIMENSIONS, GAME_CONFIG } from '../core/Constants.js';
import { Enemy } from '../entities/Enemy.js';
import { disposeObject3D } from '../utils/dispose.js';
import { randomLane } from '../utils/math.js';

export class EnemySystem {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
    this.spawnTimer = 0.15;
    this.bossTimer = 24;
    this.player = null;
    this.projectileSystem = null;
    this.nearSpawnActive = true;
    this.nearSpawnTimer = 0.15;
  }

  update(delta, state, worldTravelSpeed = 0, camera = null) {
    this.spawnTimer -= delta * DIMENSIONS[state.dimension].spawnRate;

    if (this.spawnTimer <= 0 && this.items.length < GAME_CONFIG.enemy.maxCount) {
      this.spawnTimer = state.dimension === 'combat' ? 0.65 : 1.8;
      this.spawnEnemy(state.dimension);
    }
    this.updateNearSpawns(delta, state.dimension);

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
      enemy.update(
        delta,
        state,
        playerPosition,
        (position, lateralVelocity) => {
          if (this.projectileSystem) {
            this.projectileSystem.spawnEnemyProjectile(position, state.dimensionConfig.color, lateralVelocity);
          }
        },
        worldTravelSpeed,
        camera
      );
      const outOfTravelRange =
        enemy.mesh.position.z < GAME_CONFIG.enemy.zDespawn || enemy.mesh.position.z > GAME_CONFIG.enemy.zSpawn + 24;
      if (outOfTravelRange && enemy.type !== 'boss') {
        this.removeAt(i);
      }
    }
  }

  spawnEnemy(dimensionId) {
    this.spawnEnemyAt(dimensionId, GAME_CONFIG.enemy.zSpawn, 'far');
  }

  spawnEnemyAt(dimensionId, z, spawnSource = 'far') {
    const roll = Math.random();
    const type = dimensionId === 'combat' && roll > 0.64 ? 'gunner' : roll > 0.36 ? 'striker' : 'drone';
    const enemy = new Enemy(type, new THREE.Vector3(randomLane(), 0, z));
    enemy.spawnSource = spawnSource;
    this.items.push(enemy);
    this.scene.add(enemy.mesh);
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
    if (this.nearSpawnTimer <= 0 && this.items.length < GAME_CONFIG.enemy.maxCount) {
      this.spawnEnemyAt(dimensionId, GAME_CONFIG.spawn.portalExitZ, 'near');
      this.nearSpawnTimer = GAME_CONFIG.spawn.portalExitInterval;
    }
  }

  hasFarSpawnReachedNearLine() {
    return this.items.some((enemy) => enemy.spawnSource === 'far' && enemy.mesh.position.z <= GAME_CONFIG.spawn.portalExitZ);
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

  drain() {
    const items = this.items.splice(0);
    this.spawnTimer = 0.15;
    this.bossTimer = 10;
    this.nearSpawnActive = false;
    this.nearSpawnTimer = 0.15;
    return items.map((enemy) => enemy.mesh);
  }

  reset() {
    for (let i = this.items.length - 1; i >= 0; i -= 1) {
      this.removeAt(i);
    }
    this.spawnTimer = 0.15;
    this.bossTimer = 10;
    this.nearSpawnActive = true;
    this.nearSpawnTimer = 0.15;
  }
}
