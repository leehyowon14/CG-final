import { describe, expect, it, vi } from 'vitest';
import { GameState } from '../core/GameState.js';

vi.mock('../gfx/ModelFactory.js', async () => {
  const THREE = await import('three');
  return {
    createPlayerModel() {
      const emissiveMaterial = new THREE.MeshStandardMaterial({ emissive: '#000000' });
      const core = new THREE.Object3D();
      const shield = new THREE.Mesh(
        new THREE.SphereGeometry(1),
        new THREE.ShaderMaterial({
          uniforms: {
            shieldColor: { value: new THREE.Color() },
            opacity: { value: 0 },
            time: { value: 0 }
          }
        })
      );
      return {
        group: new THREE.Group(),
        emissiveMaterials: [emissiveMaterial],
        core,
        shield
      };
    }
  };
});

import { PlayerShip } from './PlayerShip.js';

function inputWithKeys(keys) {
  return {
    isDown(code) {
      return keys.includes(code);
    }
  };
}

describe('PlayerShip', () => {
  it('keeps z anchored while W/S drive world travel speed', () => {
    const ship = new PlayerShip();
    const state = new GameState();

    ship.update(0.5, inputWithKeys(['KeyW']), state);
    const forwardSpeed = ship.worldTravelSpeed;
    const zAfterForward = ship.group.position.z;

    ship.update(0.5, inputWithKeys(['KeyS']), state);
    const backwardSpeed = ship.worldTravelSpeed;

    expect(zAfterForward).toBe(ship.anchor.z);
    expect(ship.group.position.z).toBe(ship.anchor.z);
    expect(forwardSpeed).toBeGreaterThan(0);
    expect(backwardSpeed).toBeLessThan(0);
  });

  it('uses warp speed instead of moving the ship through the portal', () => {
    const ship = new PlayerShip();
    const state = new GameState();

    ship.startDimensionWarp();
    ship.update(0.16, inputWithKeys(['KeyS']), state);

    expect(ship.group.position.z).toBe(ship.anchor.z);
    expect(ship.worldTravelSpeed).toBeGreaterThan(0);
  });

  it('ramps portal warp speed up and down smoothly', () => {
    const ship = new PlayerShip();
    const state = new GameState();
    const accelerationSpeeds = [];

    ship.startDimensionWarp();
    for (let index = 0; index < 24; index += 1) {
      ship.update(0.016, inputWithKeys([]), state);
      accelerationSpeeds.push(ship.worldTravelSpeed);
    }

    const speedAtPass = ship.worldTravelSpeed;
    ship.finishDimensionWarp();
    ship.update(0.16, inputWithKeys([]), state);
    const earlyDecelSpeed = ship.worldTravelSpeed;

    expect(accelerationSpeeds[0]).toBeLessThan(accelerationSpeeds.at(-1));
    expect(speedAtPass).toBeGreaterThan(14);
    expect(earlyDecelSpeed).toBeLessThan(speedAtPass);
    expect(earlyDecelSpeed).toBeGreaterThan(speedAtPass * 0.6);

    for (let index = 0; index < 120; index += 1) {
      ship.update(0.016, inputWithKeys([]), state);
    }
    expect(ship.dimensionWarp).toBeNull();
  });
});
