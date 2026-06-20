import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { PickupSystem } from './PickupSystem.js';

describe('PickupSystem', () => {
  it('uses Power Fragment pickups in combat', () => {
    const system = new PickupSystem(new THREE.Scene());

    system.spawnPickup('combat');

    expect(system.items[0].kind).toBe('power');
  });
});
