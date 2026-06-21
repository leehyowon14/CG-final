import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createPlayerHBV, hbvHit, HBVDebugVisualizer, ObjectBoundsDebugVisualizer } from './HBV.js';

describe('HierarchicalBoundingVolume', () => {
  it('hits child volumes after passing the broad root volume', () => {
    const hbv = createPlayerHBV();

    expect(hbvHit(hbv, new THREE.Vector3(0, 0, -6), new THREE.Vector3(0.72, -0.18, -6.2), 0.18)).toBe(true);
  });

  it('rejects targets outside the broad root volume', () => {
    const hbv = createPlayerHBV();

    expect(hbvHit(hbv, new THREE.Vector3(0, 0, -6), new THREE.Vector3(4, 0, -6), 0.18)).toBe(false);
  });

  it('rejects broad-root near misses outside child volumes', () => {
    const hbv = createPlayerHBV();

    expect(hbvHit(hbv, new THREE.Vector3(0, 0, -6), new THREE.Vector3(1.1, 0, -5.28), 0.16)).toBe(false);
  });

  it('rotates child volumes with the player orientation', () => {
    const hbv = createPlayerHBV();
    const rotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2);
    const root = new THREE.Vector3(0, 0, -6);
    const rotatedPodTarget = new THREE.Vector3(0.18, 0.7, -6.2);

    expect(hbvHit(hbv, root, rotatedPodTarget, 0.16)).toBe(false);
    expect(hbvHit(hbv, root, rotatedPodTarget, 0.16, rotation)).toBe(true);
  });

  it('creates a toggleable mesh debug hierarchy with root, child meshes, and links', () => {
    const hbv = createPlayerHBV();
    const debug = new HBVDebugVisualizer(hbv);
    const position = new THREE.Vector3(1, 2, 3);
    const rotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0.4);

    debug.update(position, rotation, true);

    expect(debug.group.name).toBe('PlayerHBVDebug');
    expect(debug.group.visible).toBe(true);
    expect(debug.group.position).toEqual(position);
    expect(debug.group.quaternion.angleTo(rotation)).toBeLessThan(0.001);
    expect(debug.group.getObjectByName('PlayerHBVBroadPhase')).toBe(debug.rootMesh);
    expect(debug.rootMesh.geometry.type).toBe('BoxGeometry');
    expect(debug.rootMesh.geometry.parameters.width).toBeLessThan(1.8);
    expect(debug.rootMesh.geometry.parameters.depth).toBeLessThan(2.8);
    expect(debug.childMeshes).toHaveLength(hbv.children.length);
    expect(debug.childMeshes.every((mesh) => mesh.name.startsWith('PlayerHBVMesh:'))).toBe(true);
    expect(debug.childMeshes.every((mesh) => mesh.geometry.type === 'BoxGeometry')).toBe(true);
    expect(debug.links).toHaveLength(hbv.children.length);

    debug.dispose();
  });

  it('creates world-space debug spheres for active object bounds', () => {
    const debug = new ObjectBoundsDebugVisualizer();
    const makeItem = (x, radius) => ({
      radius,
      mesh: { position: new THREE.Vector3(x, 0, -6) }
    });

    debug.update(
      {
        enemies: { items: [makeItem(1, 0.75)] },
        obstacles: { items: [makeItem(2, 1.7)] },
        pickups: { items: [makeItem(3, 0.8)] },
        projectiles: { items: [makeItem(4, 0.16)] }
      },
      true
    );

    expect(debug.group.name).toBe('ObjectBVHDebug');
    expect(debug.group.visible).toBe(true);
    expect(debug.group.children).toHaveLength(4);
    expect(debug.group.children.map((child) => child.name)).toEqual([
      'ObjectBVH:enemy',
      'ObjectBVH:obstacle',
      'ObjectBVH:pickup',
      'ObjectBVH:projectile'
    ]);
    expect(debug.group.children[1].scale.x).toBeCloseTo(1.7);

    debug.update(
      {
        enemies: { items: [] },
        obstacles: { items: [] },
        pickups: { items: [] },
        projectiles: { items: [] }
      },
      false
    );

    expect(debug.group.visible).toBe(false);
    expect(debug.group.children.every((child) => !child.visible)).toBe(true);

    debug.dispose();
  });
});
