import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { GameState } from '../core/GameState.js';
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

    expect(system.items).toHaveLength(1);
  });
});
