import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { Obstacle } from './Obstacle.js';

describe('Obstacle', () => {
  it('takes reduced projectile damage so avoidance is more efficient', () => {
    const obstacle = new Obstacle('crystal', new THREE.Vector3(0, 0, 0));
    const hpBefore = obstacle.hp;

    obstacle.damage(20);

    expect(hpBefore - obstacle.hp).toBe(9);
  });
});
