import { describe, expect, it } from 'vitest';
import { createPickupModel } from './ModelFactory.js';

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
    const light = pickup.getObjectByName('PickupGreenLight');
    const standardMaterials = meshes.map((mesh) => mesh.material).filter((material) => material.isMeshStandardMaterial);

    expect(pickup.name).toBe('CollectiblePickup');
    expect(pickup.userData.collectible).toBe(true);
    expect(meshes.every((mesh) => mesh.material.color.getHexString() === '35f27a')).toBe(true);
    expect(standardMaterials.length).toBeGreaterThan(0);
    expect(standardMaterials.every((material) => material.emissive.getHexString() === '35f27a')).toBe(true);
    expect(standardMaterials.every((material) => material.emissiveIntensity >= 2)).toBe(true);
    expect(light?.type).toBe('PointLight');
    expect(light?.userData.glowColor).toBe('#35f27a');
    expect(light?.userData.glowIntensity).toBeGreaterThan(0.5);
  });
});
