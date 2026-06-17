import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { Enemy } from './Enemy.js';
import { GameState } from '../core/GameState.js';

describe('Enemy', () => {
  it('keeps the mini boss near the player progression distance', () => {
    const boss = new Enemy('boss', new THREE.Vector3(0, 1, 30));
    const state = new GameState();
    const playerPosition = new THREE.Vector3(4, 0, -5);

    boss.update(1, state, playerPosition, () => {});

    expect(boss.mesh.position.z).toBeLessThan(30);
    expect(boss.mesh.position.x).toBeGreaterThan(0);
  });
});
