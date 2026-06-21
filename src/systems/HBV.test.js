import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createPlayerHBV, hbvHit } from './HBV.js';

describe('HierarchicalBoundingVolume', () => {
  it('hits child volumes after passing the broad root volume', () => {
    const hbv = createPlayerHBV();

    expect(hbvHit(hbv, new THREE.Vector3(0, 0, -6), new THREE.Vector3(0.92, 0, -6.18), 0.18)).toBe(true);
  });

  it('rejects targets outside the broad root volume', () => {
    const hbv = createPlayerHBV();

    expect(hbvHit(hbv, new THREE.Vector3(0, 0, -6), new THREE.Vector3(4, 0, -6), 0.18)).toBe(false);
  });

  it('rejects broad-root near misses outside child volumes', () => {
    const hbv = createPlayerHBV();

    expect(hbvHit(hbv, new THREE.Vector3(0, 0, -6), new THREE.Vector3(1.18, 0, -5.28), 0.16)).toBe(false);
  });

  it('rotates child volumes with the player orientation', () => {
    const hbv = createPlayerHBV();
    const rotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2);
    const root = new THREE.Vector3(0, 0, -6);
    const rotatedWingTarget = new THREE.Vector3(0, -0.82, -6.18);

    expect(hbvHit(hbv, root, rotatedWingTarget, 0.16)).toBe(false);
    expect(hbvHit(hbv, root, rotatedWingTarget, 0.16, rotation)).toBe(true);
  });
});
