import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { GameState } from '../core/GameState.js';
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
});
