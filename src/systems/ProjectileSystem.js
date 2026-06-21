import * as THREE from 'three';
import { GAME_CONFIG } from '../core/Constants.js';
import { Projectile } from '../entities/Projectile.js';

export class ProjectileSystem {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
    this.cooldown = 0;
  }

  update(delta, input, player, state) {
    this.cooldown = Math.max(0, this.cooldown - delta);

    if (input.isDown('Space') && this.cooldown <= 0 && state.ammo > 0) {
      this.spawnPlayerProjectile(player.group.position, state.dimensionConfig.color);
      state.ammo -= 1;
      this.cooldown = GAME_CONFIG.player.fireCooldown;
    }

    for (let i = this.items.length - 1; i >= 0; i -= 1) {
      const projectile = this.items[i];
      projectile.update(delta);
      if (projectile.isDead) {
        this.removeAt(i);
      }
    }
  }

  spawnPlayerProjectile(position, color) {
    const spawnPosition = position.clone().add(new THREE.Vector3(0, 0.1, 1.2));
    const projectile = new Projectile(spawnPosition, color, 'player');
    this.items.push(projectile);
    this.scene.add(projectile.mesh);
  }

  spawnEnemyProjectile(position, color, lateralVelocity = 0) {
    const spawnPosition = position.clone().add(new THREE.Vector3(0, -0.9, -1));
    spawnPosition.y = 0.12;
    const velocity = new THREE.Vector3(lateralVelocity * 12, 0, -12);
    const projectile = new Projectile(spawnPosition, color, 'enemy', velocity);
    this.items.push(projectile);
    this.scene.add(projectile.mesh);
  }

  remove(projectile) {
    const index = this.items.indexOf(projectile);
    if (index >= 0) {
      this.removeAt(index);
    }
  }

  removeAt(index) {
    const [projectile] = this.items.splice(index, 1);
    this.scene.remove(projectile.mesh);
    projectile.dispose();
  }

  drain() {
    const items = this.items.splice(0);
    this.cooldown = 0;
    return items.map((projectile) => projectile.mesh);
  }

  reset() {
    for (let i = this.items.length - 1; i >= 0; i -= 1) {
      this.removeAt(i);
    }
    this.cooldown = 0;
  }
}
