import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { GameState } from '../core/GameState.js';
import { GAME_CONFIG } from '../core/Constants.js';
import { ObstacleSystem } from './ObstacleSystem.js';

describe('ObstacleSystem', () => {
  it('spawns collidable obstacles only in the phase dimension', () => {
    const system = new ObstacleSystem(new THREE.Scene());
    const state = new GameState();
    system.spawnTimer = 0;

    state.dimension = 'combat';
    system.update(1, state);

    expect(system.items).toHaveLength(0);

    state.dimension = 'phase';
    system.update(1, state);

    expect(system.items.length).toBeGreaterThanOrEqual(1);
    expect(GAME_CONFIG.obstacle.zSpawn).toBeGreaterThan(18);
    expect(system.items[0].mesh.position.z).toBeGreaterThan(18);
  });

  it('keeps far travel spawns while adding near helper spawns after start or portal exit', () => {
    const system = new ObstacleSystem(new THREE.Scene());
    const state = new GameState();
    state.dimension = 'phase';

    system.update(0.2, state);
    const zPositions = system.items.map((obstacle) => obstacle.mesh.position.z);

    expect(zPositions.some((z) => z > GAME_CONFIG.obstacle.zSpawn - 2 && z <= GAME_CONFIG.obstacle.zSpawn)).toBe(true);
    expect(zPositions.some((z) => z > GAME_CONFIG.spawn.portalExitZ - 2 && z <= GAME_CONFIG.spawn.portalExitZ)).toBe(true);
  });

  it('stops near helper spawns after a far obstacle reaches the near spawn line', () => {
    const system = new ObstacleSystem(new THREE.Scene());
    const state = new GameState();
    state.dimension = 'phase';
    system.spawnTimer = 999;
    system.spawnObstacle('phase');
    system.items[0].mesh.position.z = GAME_CONFIG.spawn.portalExitZ;
    system.primeNearSpawns();

    system.update(1, state);

    expect(system.items.filter((obstacle) => obstacle.spawnSource === 'near')).toHaveLength(0);
    expect(system.nearSpawnActive).toBe(false);
  });
});
