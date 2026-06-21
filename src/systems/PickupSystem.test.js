import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { GameState } from '../core/GameState.js';
import { GAME_CONFIG } from '../core/Constants.js';
import { PickupSystem } from './PickupSystem.js';

describe('PickupSystem', () => {
  it('uses Power Fragment pickups in combat at the far travel spawn', () => {
    const system = new PickupSystem(new THREE.Scene());

    system.spawnPickup('combat');

    expect(system.items[0].kind).toBe('power');
    expect(system.items[0].mesh.position.z).toBe(GAME_CONFIG.pickup.zSpawn);
  });

  it('keeps far travel spawns while adding near helper spawns after start or portal exit', () => {
    const system = new PickupSystem(new THREE.Scene());
    const state = new GameState();

    system.update(0.2, state);
    const zPositions = system.items.map((pickup) => pickup.mesh.position.z);

    expect(zPositions.some((z) => z > GAME_CONFIG.pickup.zSpawn - 2 && z <= GAME_CONFIG.pickup.zSpawn)).toBe(true);
    expect(zPositions.some((z) => z > GAME_CONFIG.spawn.portalExitZ - 2 && z <= GAME_CONFIG.spawn.portalExitZ)).toBe(true);
  });

  it('stops near helper spawns after a far pickup reaches the near spawn line', () => {
    const system = new PickupSystem(new THREE.Scene());
    const state = new GameState();
    system.spawnTimer = 999;
    system.spawnPickup('combat');
    system.items[0].mesh.position.z = GAME_CONFIG.spawn.portalExitZ;
    system.primeNearSpawns();

    system.update(1, state);

    expect(system.items.filter((pickup) => pickup.spawnSource === 'near')).toHaveLength(0);
    expect(system.nearSpawnActive).toBe(false);
  });
});
