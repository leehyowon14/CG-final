import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { DimensionRiftSystem } from './DimensionRiftSystem.js';

describe('DimensionRiftSystem', () => {
  it('spawns glass shards that can receive DDGI material patching', () => {
    const scene = new THREE.Scene();
    const rifts = new DimensionRiftSystem(scene);

    rifts.spawn(new THREE.Vector3(0, 0, -6), 'stability', 'phase');

    expect(rifts.items).toHaveLength(1);
    expect(scene.children.some((child) => child.name === 'DimensionRift')).toBe(true);
    expect(rifts.items[0].opening.children.some((child) => child.name === 'DimensionRiftPortalCore')).toBe(true);
    expect(rifts.items[0].opening.children.filter((child) => child.name === 'DimensionRiftCrackSegment').length).toBeGreaterThan(10);
    expect(rifts.items[0].opening.children.filter((child) => child.name === 'DimensionRiftEdgeShard').length).toBeGreaterThan(10);
    expect(rifts.items[0].shards.length).toBeGreaterThan(20);
    expect(rifts.items[0].shards.every((shard) => shard.mesh.material.isMeshStandardMaterial)).toBe(true);
    expect(rifts.items[0].shards.every((shard) => shard.mesh.material.emissiveIntensity === 0)).toBe(true);
  });

  it('stays vertical and spawns ahead at ship height', () => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(0, 12, -16);
    camera.updateMatrixWorld();
    const rifts = new DimensionRiftSystem(scene);
    const playerPosition = new THREE.Vector3(0, 0, -6);

    rifts.spawn(playerPosition, 'stability', 'combat', camera);
    const rift = rifts.items[0].group;
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(rift.quaternion);
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(rift.quaternion);
    const toCamera = camera.position.clone().sub(rift.position);
    toCamera.y = 0;
    toCamera.normalize();

    expect(rift.position.y - playerPosition.y).toBeGreaterThan(0.6);
    expect(rift.position.y - playerPosition.y).toBeLessThan(1.2);
    expect(rift.position.z - playerPosition.z).toBeGreaterThan(6.8);
    expect(up.angleTo(new THREE.Vector3(0, 1, 0))).toBeLessThan(0.001);
    expect(forward.angleTo(toCamera)).toBeLessThan(0.001);
  });

  it('cleans up expired rift geometry', () => {
    const scene = new THREE.Scene();
    const rifts = new DimensionRiftSystem(scene);

    rifts.spawn(new THREE.Vector3(), 'combat', 'phase');
    rifts.update(2);

    expect(rifts.items).toHaveLength(0);
    expect(scene.children.some((child) => child.name === 'DimensionRift')).toBe(false);
  });

  it('reports portal traversal after world travel moves it through the player', () => {
    const scene = new THREE.Scene();
    const rifts = new DimensionRiftSystem(scene);
    const playerPosition = new THREE.Vector3(0, 0, -6);

    rifts.spawn(playerPosition, 'stability', 'combat');
    expect(rifts.hasPassedThrough(playerPosition, 'combat')).toBe(false);

    rifts.update(1, null, 9.4);

    expect(rifts.hasPassedThrough(playerPosition, 'combat')).toBe(true);
  });

  it('fades portal opacity as it passes through the player', () => {
    const scene = new THREE.Scene();
    const rifts = new DimensionRiftSystem(scene);
    const playerPosition = new THREE.Vector3(0, 0, -6);

    rifts.spawn(playerPosition, 'stability', 'combat');
    const rift = rifts.items[0];
    const portal = rift.opening.children.find((child) => child.name === 'DimensionRiftPortalCore');
    const initialOpacity = portal.material.opacity;
    rift.group.position.z = playerPosition.z + 0.4;

    rifts.update(0.016, null, 0, playerPosition);

    expect(portal.material.opacity).toBeLessThan(initialOpacity * 0.85);
  });
});
