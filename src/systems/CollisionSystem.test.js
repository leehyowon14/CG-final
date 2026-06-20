import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { GameState } from '../core/GameState.js';
import { CollisionSystem } from './CollisionSystem.js';

function meshAt(x, y, z) {
  return { position: new THREE.Vector3(x, y, z) };
}

function collection(items) {
  return {
    items,
    removed: [],
    remove(item) {
      this.removed.push(item);
      this.items = this.items.filter((candidate) => candidate !== item);
    }
  };
}

describe('CollisionSystem', () => {
  it('applies ammo pickup and removes it', () => {
    const state = new GameState();
    state.ammo = 10;
    const collision = new CollisionSystem(state);
    const pickup = { kind: 'ammo', radius: 1, mesh: meshAt(0, 0, 0) };
    const pickups = collection([pickup]);

    collision.update({
      player: { radius: 1, group: meshAt(0, 0, 0) },
      projectiles: collection([]),
      enemies: collection([]),
      obstacles: collection([]),
      pickups,
      gi: { flash() {} }
    });

    expect(state.ammo).toBe(18);
    expect(pickups.removed).toContain(pickup);
  });

  it('damages enemies with player projectiles and awards score on kill', () => {
    const state = new GameState();
    const collision = new CollisionSystem(state);
    const projectile = { owner: 'player', radius: 1, damage: 50, mesh: meshAt(0, 0, 0) };
    const enemy = {
      radius: 1,
      hp: 10,
      score: 90,
      mesh: meshAt(0, 0, 0),
      damage(amount) {
        this.hp -= amount;
      },
      get isDead() {
        return this.hp <= 0;
      }
    };
    const projectiles = collection([projectile]);
    const enemies = collection([enemy]);

    collision.update({
      player: { radius: 1, group: meshAt(5, 0, 5) },
      projectiles,
      enemies,
      obstacles: collection([]),
      pickups: collection([]),
      gi: { flash() {} }
    });

    expect(projectiles.removed).toContain(projectile);
    expect(enemies.removed).toContain(enemy);
    expect(state.kills).toBe(1);
    expect(state.score).toBeGreaterThan(90);
  });

  it('applies combat power pickups as score and combo rewards', () => {
    const state = new GameState();
    const collision = new CollisionSystem(state);

    collision.applyPickup({ kind: 'power' });

    expect(state.combo).toBe(1);
    expect(state.score).toBe(140);
  });
});
