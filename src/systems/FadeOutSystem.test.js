import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { FadeOutSystem } from './FadeOutSystem.js';

describe('FadeOutSystem', () => {
  it('fades object materials before removing them from the scene', () => {
    const scene = new THREE.Scene();
    const system = new FadeOutSystem(scene);
    const material = new THREE.MeshBasicMaterial({ color: '#ffffff', opacity: 0.8 });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
    scene.add(mesh);

    system.add(mesh, 1);
    system.update(0.5);

    expect(scene.children).toContain(mesh);
    expect(material.transparent).toBe(true);
    expect(material.opacity).toBeGreaterThan(0);
    expect(material.opacity).toBeLessThan(0.8);

    system.update(0.5);

    expect(scene.children).not.toContain(mesh);
    expect(system.items).toHaveLength(0);
  });
});
