import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { Enemy } from './Enemy.js';
import { GameState } from '../core/GameState.js';

describe('Enemy', () => {
  it('adds a visible health bar to enemy models', () => {
    const enemy = new Enemy('drone', new THREE.Vector3(0, 0, 0));

    expect(enemy.mesh.getObjectByName('EnemyHealthBar')).toBeTruthy();
    expect(enemy.mesh.getObjectByName('EnemyHealthBarBackground')).toBeTruthy();
    expect(enemy.mesh.getObjectByName('EnemyHealthBarFill')).toBeTruthy();
  });

  it('shrinks the health bar fill as the enemy takes damage', () => {
    const enemy = new Enemy('gunner', new THREE.Vector3(0, 0, 0));
    const fill = enemy.mesh.getObjectByName('EnemyHealthBarFill');

    enemy.damage(enemy.maxHp * 0.5);

    expect(fill.scale.x).toBeCloseTo(0.5);
    expect(fill.position.x).toBeLessThan(0);
  });

  it('billboards the health bar toward the active camera', () => {
    const enemy = new Enemy('striker', new THREE.Vector3(0, 0, 0));
    const camera = new THREE.PerspectiveCamera();
    camera.rotation.set(0.35, 0.6, 0.1);
    camera.updateMatrixWorld(true);
    enemy.mesh.rotation.set(0.2, -0.4, 0.3);
    enemy.mesh.updateMatrixWorld(true);

    enemy.updateHealthBar(camera);
    enemy.healthBar.updateMatrixWorld(true);

    const barWorldQuaternion = new THREE.Quaternion();
    enemy.healthBar.getWorldQuaternion(barWorldQuaternion);

    expect(Math.abs(barWorldQuaternion.dot(camera.quaternion))).toBeCloseTo(1, 5);
  });

  it('keeps the mini boss near the player progression distance', () => {
    const boss = new Enemy('boss', new THREE.Vector3(0, 1, 30));
    const state = new GameState();
    const playerPosition = new THREE.Vector3(4, 0, -5);

    boss.update(1, state, playerPosition, () => {});

    expect(boss.mesh.position.z).toBeLessThan(30);
    expect(boss.mesh.position.x).toBeGreaterThan(0);
  });
});
