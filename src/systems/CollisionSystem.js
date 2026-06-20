import { GAME_CONFIG } from '../core/Constants.js';
import { hbvHit } from './HBV.js';
import { sphereHit } from '../utils/math.js';

export class CollisionSystem {
  constructor(state) {
    this.state = state;
    this.events = [];
  }

  update({ player, projectiles, enemies, obstacles, pickups, gi }) {
    this.events = [];
    for (const projectile of [...projectiles.items]) {
      if (projectile.owner === 'player') {
        this.handlePlayerProjectile(projectile, projectiles, enemies, obstacles, gi);
      } else if (hbvHit(player.hbv, player.group.position, projectile.mesh.position, projectile.radius)) {
        this.damagePlayer(projectile.damage, projectile.mesh.position, 'enemyProjectile');
        projectiles.remove(projectile);
      }
    }

    for (const enemy of [...enemies.items]) {
      if (hbvHit(player.hbv, player.group.position, enemy.mesh.position, enemy.radius)) {
        this.damagePlayer(enemy.type === 'boss' ? 36 : 22, enemy.mesh.position, 'enemyBody');
        enemies.remove(enemy);
      }
    }

    for (const obstacle of [...obstacles.items]) {
      if (hbvHit(player.hbv, player.group.position, obstacle.mesh.position, obstacle.radius)) {
        this.damagePlayer(obstacle.kind === 'mine' ? 28 : 18, obstacle.mesh.position, 'obstacle');
        obstacles.remove(obstacle);
      } else if (
        this.state.dimension === 'phase' &&
        Math.abs(obstacle.mesh.position.z - player.group.position.z) < 0.7 &&
        obstacle.mesh.position.distanceTo(player.group.position) < 2.5
      ) {
        this.state.addScore(0.35);
      }
    }

    for (const pickup of [...pickups.items]) {
      if (sphereHit(pickup.mesh.position, pickup.radius, player.group.position, player.radius)) {
        this.applyPickup(pickup);
        pickups.remove(pickup);
      }
    }
    return this.events;
  }

  damagePlayer(amount, position, source) {
    this.state.damage(amount);
    this.events.push({
      type: 'playerHit',
      amount,
      source,
      position: position.clone()
    });
  }

  handlePlayerProjectile(projectile, projectiles, enemies, obstacles, gi) {
    for (const enemy of [...enemies.items]) {
      if (sphereHit(projectile.mesh.position, projectile.radius, enemy.mesh.position, enemy.radius)) {
        enemy.damage(projectile.damage);
        projectiles.remove(projectile);
        if (enemy.isDead) {
          this.state.kills += 1;
          this.state.combo += 1;
          this.state.addScore(enemy.score + this.state.combo * 12);
          gi.flash(enemy.mesh.position, this.state.dimensionConfig.color);
          enemies.remove(enemy);
        }
        return;
      }
    }

    for (const obstacle of [...obstacles.items]) {
      if (sphereHit(projectile.mesh.position, projectile.radius, obstacle.mesh.position, obstacle.radius)) {
        obstacle.damage(projectile.damage);
        projectiles.remove(projectile);
        if (obstacle.isDead) {
          this.state.addScore(25);
          obstacles.remove(obstacle);
        }
        return;
      }
    }
  }

  applyPickup(pickup) {
    if (pickup.kind === 'ammo') {
      this.state.ammo = Math.min(GAME_CONFIG.player.maxAmmo, this.state.ammo + 8);
      this.state.addScore(35);
    } else if (pickup.kind === 'shield') {
      this.state.shield = Math.min(GAME_CONFIG.player.maxShield, this.state.shield + 24);
      this.state.addScore(15);
    } else if (pickup.kind === 'power') {
      this.state.combo += 1;
      this.state.addScore(120 + this.state.combo * 20);
    } else {
      this.state.hp = Math.min(GAME_CONFIG.player.maxHp, this.state.hp + 20);
      this.state.addScore(15);
    }
  }
}
