import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { GameState } from '../core/GameState.js';
import { SurfelGIManager } from './SurfelGIManager.js';

describe('SurfelGIManager', () => {
  it('creates surfel samples and toggles debug visibility from state', () => {
    const scene = new THREE.Scene();
    const gi = new SurfelGIManager(scene);
    const state = new GameState();
    state.surfelDebug = true;
    state.dimension = 'phase';

    gi.update(0.16, state);

    expect(gi.samples.length).toBeGreaterThan(0);
    expect(gi.debugGroup.visible).toBe(true);
    expect(gi.sampleAt(new THREE.Vector3(0, 0, 0))).toBeInstanceOf(THREE.Color);
  });
});
