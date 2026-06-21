import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { GameState } from '../core/GameState.js';
import { GAME_CONFIG } from '../core/Constants.js';
import { Enemy } from '../entities/Enemy.js';
import { EnemySystem } from './EnemySystem.js';

describe('EnemySystem', () => {
  it('spawns the mini boss only while the combat dimension is active', () => {
    const system = new EnemySystem(new THREE.Scene());
    const state = new GameState();
    system.bossTimer = 0;

    system.update(0.1, state);

    expect(system.items.some((enemy) => enemy.type === 'boss')).toBe(false);

    state.dimension = 'phase';
    system.update(0.1, state);

    expect(system.items.some((enemy) => enemy.type === 'boss')).toBe(false);

    state.dimension = 'combat';
    system.update(0.1, state);

    expect(system.items.some((enemy) => enemy.type === 'boss')).toBe(true);
  });

  it('spawns enemies farther away but starts gunner fire near the old engagement range', () => {
    const state = new GameState();
    state.dimension = 'combat';
    const gunner = new Enemy('gunner', new THREE.Vector3(0, 0, GAME_CONFIG.enemy.zSpawn));
    const shots = [];

    gunner.fireTimer = 0;
    gunner.update(1, state, new THREE.Vector3(0, 0, -6), (position) => shots.push(position.clone()));

    expect(GAME_CONFIG.enemy.zSpawn).toBeGreaterThan(GAME_CONFIG.enemy.fireStartZ);
    expect(shots).toHaveLength(0);

    gunner.mesh.position.z = GAME_CONFIG.enemy.fireStartZ;
    gunner.update(1, state, new THREE.Vector3(0, 0, -6), (position) => shots.push(position.clone()));

    expect(shots).toHaveLength(1);
  });

  it('keeps far travel spawns while adding near helper spawns after start or portal exit', () => {
    const system = new EnemySystem(new THREE.Scene());
    const state = new GameState();
    state.dimension = 'combat';

    system.update(0.2, state);
    const zPositions = system.items.map((enemy) => enemy.mesh.position.z);

    expect(zPositions.some((z) => z > GAME_CONFIG.enemy.zSpawn - 2 && z <= GAME_CONFIG.enemy.zSpawn)).toBe(true);
    expect(zPositions.some((z) => z > GAME_CONFIG.spawn.portalExitZ - 2 && z <= GAME_CONFIG.spawn.portalExitZ)).toBe(true);
  });

  it('stops near helper spawns after a far enemy reaches the near spawn line', () => {
    const system = new EnemySystem(new THREE.Scene());
    const state = new GameState();
    state.dimension = 'combat';
    system.spawnTimer = 999;
    system.spawnEnemy('combat');
    system.items[0].mesh.position.z = GAME_CONFIG.spawn.portalExitZ;
    system.primeNearSpawns();

    system.update(1, state);

    expect(system.items.filter((enemy) => enemy.spawnSource === 'near')).toHaveLength(0);
    expect(system.nearSpawnActive).toBe(false);
  });
});
