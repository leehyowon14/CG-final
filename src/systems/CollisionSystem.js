import { GAME_CONFIG } from '../core/Constants.js';
import { sphereHit } from '../utils/math.js';

export class CollisionSystem {
  constructor(state) {
    this.state = state;
  }

  update({ player, projectiles, enemies, obstacles, pickups, surfelGI }) {
    for (const projectile of [...projectiles.items]) {
      if (projectile.owner === 'player') {
        this.handlePlayerProjectile(projectile, projectiles, enemies, obstacles, surfelGI);
      } else if (sphereHit(projectile.mesh.position, projectile.radius, player.group.position, player.radius)) {
        this.state.damage(projectile.damage);
        projectiles.remove(projectile);
      }
    }

    for (const enemy of [...enemies.items]) {
      if (sphereHit(enemy.mesh.position, enemy.radius, player.group.position, player.radius)) {
        this.state.damage(enemy.type === 'boss' ? 36 : 22);
        enemies.remove(enemy);
      }
    }

    for (const obstacle of [...obstacles.items]) {
      if (sphereHit(obstacle.mesh.position, obstacle.radius, player.group.position, player.radius)) {
        this.state.damage(obstacle.kind === 'mine' ? 28 : 18);
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
  }

  handlePlayerProjectile(projectile, projectiles, enemies, obstacles, surfelGI) {
    for (const enemy of [...enemies.items]) {
      if (sphereHit(projectile.mesh.position, projectile.radius, enemy.mesh.position, enemy.radius)) {
        enemy.damage(projectile.damage);
        projectiles.remove(projectile);
        if (enemy.isDead) {
          this.state.kills += 1;
          this.state.combo += 1;
          this.state.addScore(enemy.score + this.state.combo * 12);
          surfelGI.flash(enemy.mesh.position, this.state.dimensionConfig.color);
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
    } else {
      this.state.hp = Math.min(GAME_CONFIG.player.maxHp, this.state.hp + 20);
      this.state.addScore(15);
    }
  }
}
