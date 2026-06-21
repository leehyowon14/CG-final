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
    expect(gi.texture.image.width).toBe(expectedProbeCount * 4);
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
    expect(mesh.material.customProgramCacheKey()).toContain('ddgi-probe-texture-v2-l1-sh');

    gi.dispose();
    mesh.geometry.dispose();
    mesh.material.dispose();
  });

  it('injects visible contributor color into nearby probe irradiance', () => {
    const scene = new THREE.Scene();
    const gi = new DDGIManager(scene);
    const state = new GameState();
    state.dimension = 'stability';
    const probe = gi.probeAt(4, 1, 4);
    const contributor = createContributor(probe.position.clone().add(new THREE.Vector3(0, 0, 1)), '#ff3018', 2.2, 9);
    scene.add(contributor);

    gi.update(0.16, state, { forceTraceAll: true });

    expect(probe.targetIrradiance.r).toBeGreaterThan(probe.targetIrradiance.g);
    expect(probe.irradiance.r).toBeGreaterThan(0.02);

    gi.dispose();
    contributor.geometry.dispose();
    contributor.material.dispose();
  });

  it('stores contributor injection as directional L1 SH coefficients', () => {
    const scene = new THREE.Scene();
    const gi = new DDGIManager(scene);
    const state = new GameState();
    const probe = gi.probeAt(4, 1, 4);
    const contributor = createContributor(probe.position.clone().add(new THREE.Vector3(0, 0, 1)), '#ff3018', 2.2, 9);
    scene.add(contributor);

    gi.update(0.16, state, { forceTraceAll: true });

    expect(probe.shCoefficients).toHaveLength(4);
    expect(probe.targetSHCoefficients[3].r).toBeGreaterThan(0.25);
    expect(probe.shCoefficients[3].r).toBeGreaterThan(0.05);
    expect(probe.targetSHCoefficients[3].r).toBeGreaterThan(Math.abs(probe.targetSHCoefficients[1].r));
    expect(probe.targetSHCoefficients[3].r).toBeGreaterThan(Math.abs(probe.targetSHCoefficients[2].r));

    gi.dispose();
    contributor.geometry.dispose();
    contributor.material.dispose();
  });

  it('uses nearby standard material meshes as automatic color contributors', () => {
    const scene = new THREE.Scene();
    const gi = new DDGIManager(scene);
    const state = new GameState();
    const probe = gi.probeAt(4, 1, 4);
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.4, 0.4),
      new THREE.MeshStandardMaterial({ color: '#ff1f12' })
    );
    mesh.position.copy(probe.position).add(new THREE.Vector3(0, 0, 0.8));
    scene.add(mesh);

    expect(mesh.userData.ddgiContributor).toBeUndefined();
    expect(gi.collectContributors()).toHaveLength(1);

    gi.update(0.16, state, { forceTraceAll: true });

    expect(probe.targetIrradiance.r).toBeGreaterThan(probe.targetIrradiance.g);
    expect(probe.irradiance.r).toBeGreaterThan(0.015);

    gi.dispose();
    mesh.geometry.dispose();
    mesh.material.dispose();
  });

  it('does not use ddgiIgnore objects as automatic contributors', () => {
    const scene = new THREE.Scene();
    const gi = new DDGIManager(scene);
    const ignoredRoot = new THREE.Group();
    ignoredRoot.userData.ddgiIgnore = true;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.4, 0.4),
      new THREE.MeshStandardMaterial({ color: '#35d6c6' })
    );
    ignoredRoot.add(mesh);
    scene.add(ignoredRoot);

    expect(gi.collectContributors()).toHaveLength(0);

    gi.dispose();
    mesh.geometry.dispose();
    mesh.material.dispose();
  });

  it('keeps probe target irradiance stable when only elapsed time changes', () => {
    const scene = new THREE.Scene();
    const gi = new DDGIManager(scene);
    const state = new GameState();
    const probe = gi.probeAt(4, 1, 4);

    state.elapsed = 0;
    gi.update(0.16, state, { forceTraceAll: true });
    const before = probe.targetIrradiance.clone();

    state.elapsed = 42;
    gi.update(0.16, state, { forceTraceAll: true });

    expect(probe.targetIrradiance.r).toBeCloseTo(before.r, 6);
    expect(probe.targetIrradiance.g).toBeCloseTo(before.g, 6);
    expect(probe.targetIrradiance.b).toBeCloseTo(before.b, 6);

    gi.dispose();
  });

  it('cycles through the full probe grid within three frame budgets', () => {
    const scene = new THREE.Scene();
    const gi = new DDGIManager(scene);
    const traced = new Set();

    for (let frame = 0; frame < 3; frame += 1) {
      for (const index of gi.getTracedProbeIndices(false)) {
        traced.add(index);
      }
    }

    expect(traced.size).toBe(gi.probes.length);

    gi.dispose();
  });

  it('uses visible basic material meshes as weak automatic color contributors too', () => {
    const scene = new THREE.Scene();
    const gi = new DDGIManager(scene);
    const state = new GameState();
    const probe = gi.probeAt(4, 1, 4);
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.4, 0.4),
      new THREE.MeshBasicMaterial({ color: '#ff1f12' })
    );
    mesh.position.copy(probe.position).add(new THREE.Vector3(0, 0, 0.8));
    scene.add(mesh);

    expect(gi.collectContributors()).toHaveLength(1);

    gi.update(0.16, state, { forceTraceAll: true });

    expect(probe.targetIrradiance.r).toBeGreaterThan(probe.targetIrradiance.g);

    gi.dispose();
    mesh.geometry.dispose();
    mesh.material.dispose();
  });

  it('shows the contributor color directly in debug probe materials', () => {
    const scene = new THREE.Scene();
    const gi = new DDGIManager(scene);
    const state = new GameState();
    const probe = gi.probeAt(4, 1, 4);
    const contributor = createContributor(probe.position.clone().add(new THREE.Vector3(0, 0, 1)), '#ff3018', 2.2, 9);
    scene.add(contributor);

    for (let frame = 0; frame < 10; frame += 1) {
      gi.update(0.16, state, { forceTraceAll: true });
    }

    expect(probe.mesh.material.color.r).toBeGreaterThan(0.7);
    expect(probe.mesh.material.color.r).toBeGreaterThan(probe.mesh.material.color.g * 1.5);

    gi.dispose();
    contributor.geometry.dispose();
    contributor.material.dispose();
  });

  it('reduces contributor injection when an opaque blocker sits between probe and source', () => {
    const unblocked = traceContributorWithOptionalBlocker(false);
    const blocked = traceContributorWithOptionalBlocker(true);

    expect(blocked).toBeLessThan(unblocked * 0.5);
  });

  it('does not let sibling meshes from the same object root block contributor injection', () => {
    const scene = new THREE.Scene();
    const gi = new DDGIManager(scene);
    const state = new GameState();
    const probe = gi.probeAt(4, 1, 4);
    const group = new THREE.Group();
    const redSource = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.3, 0.3),
      new THREE.MeshStandardMaterial({ color: '#ff1f12' })
    );
    const siblingShell = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.7, 0.08),
      new THREE.MeshStandardMaterial({ color: '#202020' })
    );
    redSource.position.z = 0.8;
    siblingShell.position.z = 0.4;
    group.add(redSource, siblingShell);
    group.position.copy(probe.position);
    scene.add(group);

    gi.update(0.16, state, { forceTraceAll: true });

    expect(probe.targetIrradiance.r).toBeGreaterThan(probe.targetIrradiance.g);
    expect(probe.irradiance.r).toBeGreaterThan(0.02);

    gi.dispose();
    redSource.geometry.dispose();
    redSource.material.dispose();
    siblingShell.geometry.dispose();
    siblingShell.material.dispose();
  });

  it('keeps probe texture dark when GI is disabled even with contributors', () => {
    const scene = new THREE.Scene();
    const gi = new DDGIManager(scene);
    const state = new GameState();
    state.giEnabled = false;
    const probe = gi.probeAt(4, 1, 4);
    const contributor = createContributor(probe.position.clone().add(new THREE.Vector3(0, 0, 1)), '#ff3018', 2.2, 9);
    scene.add(contributor);

    gi.update(0.16, state, { forceTraceAll: true });

    expect(gi.textureData.every((value) => value === 0)).toBe(true);
    expect(probe.visibility).toBe(0);

    gi.dispose();
    contributor.geometry.dispose();
    contributor.material.dispose();
  });

  it('uses temporal accumulation instead of jumping directly to contributor target', () => {
    const scene = new THREE.Scene();
    const gi = new DDGIManager(scene);
    const state = new GameState();
    const probe = gi.probeAt(4, 1, 4);
    const contributor = createContributor(probe.position.clone().add(new THREE.Vector3(0, 0, 1)), '#ff3018', 2.2, 9);
    scene.add(contributor);

    gi.update(0.16, state, { forceTraceAll: true });

    expect(probe.targetIrradiance.r).toBeGreaterThan(0.3);
    expect(probe.irradiance.r).toBeGreaterThan(0);
    expect(probe.irradiance.r).toBeLessThan(probe.targetIrradiance.r);

    gi.dispose();
    contributor.geometry.dispose();
    contributor.material.dispose();
  });

  it('diffuses injected color to neighboring probes after tracing', () => {
    const scene = new THREE.Scene();
    const gi = new DDGIManager(scene);
    const state = new GameState();
    state.dimension = 'stability';
    const probe = gi.probeAt(4, 1, 4);
    const neighbor = gi.probeAt(5, 1, 4);
    const farProbe = gi.probeAt(0, 1, 4);
    const contributor = createContributor(probe.position.clone().add(new THREE.Vector3(0, 0, 0.1)), '#ff3018', 2.2, 0.7);
    scene.add(contributor);

    gi.update(0.16, state, { forceTraceAll: true });

    expect(neighbor.irradiance.r).toBeGreaterThan(farProbe.irradiance.r);

    gi.dispose();
    contributor.geometry.dispose();
    contributor.material.dispose();
  });

  it('keeps injected contributor color on frames where a probe is outside the trace budget', () => {
    const scene = new THREE.Scene();
    const gi = new DDGIManager(scene);
    const state = new GameState();
    const probe = gi.probeAt(4, 1, 4);
    const contributor = createContributor(probe.position.clone().add(new THREE.Vector3(0, 0, 1)), '#ff3018', 2.2, 9);
    scene.add(contributor);

    gi.update(0.16, state, { forceTraceAll: true });
    const injectedBefore = probe.injectedIrradiance.clone();
    const debugBefore = probe.mesh.material.color.clone();
    gi.update(0.16, state);

    expect(probe.injectedIrradiance.r).toBeCloseTo(injectedBefore.r, 6);
    expect(probe.injectedIrradiance.g).toBeCloseTo(injectedBefore.g, 6);
    expect(probe.injectedIrradiance.b).toBeCloseTo(injectedBefore.b, 6);
    expect(probe.mesh.material.color.r).toBeGreaterThan(debugBefore.r * 0.85);

    gi.dispose();
    contributor.geometry.dispose();
    contributor.material.dispose();
  });
});

function traceContributorWithOptionalBlocker(blocked) {
  const scene = new THREE.Scene();
  const gi = new DDGIManager(scene);
  const state = new GameState();
  state.dimension = 'stability';
  const probe = gi.probeAt(4, 1, 4);
  const contributor = createContributor(probe.position.clone().add(new THREE.Vector3(0, 0, 1)), '#ff3018', 2.2, 9);
  scene.add(contributor);
  let blocker = null;
  if (blocked) {
    blocker = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.9, 0.18),
      new THREE.MeshStandardMaterial({ color: '#111111' })
    );
    blocker.position.copy(probe.position).add(new THREE.Vector3(0, 0, 0.5));
    scene.add(blocker);
  }

  gi.update(0.16, state, { forceTraceAll: true });
  const red = probe.irradiance.r;

  gi.dispose();
  contributor.geometry.dispose();
  contributor.material.dispose();
  if (blocker) {
    blocker.geometry.dispose();
    blocker.material.dispose();
  }
  return red;
}

function createContributor(position, color, intensity, radius) {
  const contributor = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 8, 6),
    new THREE.MeshStandardMaterial({ color })
  );
  contributor.position.copy(position);
  contributor.userData.ddgiContributor = {
    color: new THREE.Color(color),
    intensity,
    radius
  };
  return contributor;
}
