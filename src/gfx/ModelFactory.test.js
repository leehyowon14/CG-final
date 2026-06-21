import { describe, expect, it } from 'vitest';
import { createPickupModel } from './ModelFactory.js';
import { createDarkHullMaterial, createHullMaterial } from './Materials.js';

function collectMeshes(group) {
  const meshes = [];
  group.traverse((child) => {
    if (child.isMesh) meshes.push(child);
  });
  return meshes;
}

describe('createPickupModel', () => {
  it.each(['ammo', 'shield', 'power', 'health'])('renders %s pickups as green glowing collectibles', (kind) => {
    const pickup = createPickupModel(kind);
    const meshes = collectMeshes(pickup);
    const standardMaterials = meshes.map((mesh) => mesh.material).filter((material) => material.isMeshStandardMaterial);

    expect(pickup.name).toBe('CollectiblePickup');
    expect(pickup.userData.collectible).toBe(true);
    expect(meshes.every((mesh) => mesh.material.color.getHexString() === '35f27a')).toBe(true);
    expect(standardMaterials.length).toBeGreaterThan(0);
    expect(standardMaterials.every((material) => material.emissive.getHexString() === '35f27a')).toBe(true);
    expect(standardMaterials.every((material) => material.emissiveIntensity >= 2)).toBe(true);
    expect(pickup.getObjectByName('PickupGreenLight')).toBeUndefined();
  });
});

describe('player hull materials', () => {
  it('uses neutral hull colors so colored DDGI can tint the ship', () => {
    const hull = createHullMaterial();
    const darkHull = createDarkHullMaterial();

    expect(hull.color.getHexString()).toBe('d9dde3');
    expect(darkHull.color.getHexString()).toBe('5f6874');
    expect(hull.emissiveIntensity).toBeLessThan(0.12);
    expect(darkHull.emissiveIntensity).toBeLessThan(0.13);

    hull.dispose();
    darkHull.dispose();
  });
});
