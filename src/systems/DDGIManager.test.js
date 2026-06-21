import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { GameState } from '../core/GameState.js';
import { GAME_CONFIG } from '../core/Constants.js';
import { DDGIManager } from './DDGIManager.js';

describe('DDGIManager', () => {
  it('creates probe texture data and toggles debug visibility from state', () => {
    const scene = new THREE.Scene();
    const gi = new DDGIManager(scene);
    const state = new GameState();
    state.ddgiDebug = true;
    state.dimension = 'phase';

    gi.update(0.16, state);

    const expectedProbeCount =
      GAME_CONFIG.ddgi.resolution.x * GAME_CONFIG.ddgi.resolution.y * GAME_CONFIG.ddgi.resolution.z;
    expect(gi.probes).toHaveLength(expectedProbeCount);
    expect(expectedProbeCount).toBeGreaterThan(300);
    expect(gi.texture.image.width).toBe(expectedProbeCount);
    expect(gi.debugGroup.visible).toBe(true);
    expect(gi.sampleAt(new THREE.Vector3(0, 0, 0))).toBeInstanceOf(THREE.Color);

    gi.dispose();
  });

  it('boosts nearby probe irradiance when flashed', () => {
    const scene = new THREE.Scene();
    const gi = new DDGIManager(scene);
    const probe = gi.probes[0];
    const before = probe.flash;

    gi.flash(probe.position, new THREE.Color('#ff5b35'));

    expect(probe.flash).toBeGreaterThan(before);
    gi.dispose();
  });

  it('patches standard materials with DDGI shader uniforms once', () => {
    const scene = new THREE.Scene();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial());
    scene.add(mesh);
    const gi = new DDGIManager(scene);

    gi.update(0.16, new GameState());
    gi.update(0.16, new GameState());

    expect(mesh.material.userData.ddgiPatched).toBe(true);
    expect(gi.materials.size).toBe(1);
    expect(mesh.material.customProgramCacheKey()).toContain('ddgi-probe-texture-v1');

    gi.dispose();
    mesh.geometry.dispose();
    mesh.material.dispose();
  });
});
