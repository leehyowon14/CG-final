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
});
