import * as THREE from 'three';
import { createEnemyModel, createMiniBossModel } from '../gfx/ModelFactory.js';

export class Enemy {
  constructor(type, position) {
    this.type = type;
    this.radius = type === 'boss' ? 2.4 : type === 'gunner' ? 0.9 : 0.75;
    this.hp = type === 'boss' ? 560 : type === 'gunner' ? 80 : type === 'striker' ? 56 : 42;
    this.score = type === 'boss' ? 900 : type === 'gunner' ? 140 : type === 'striker' ? 120 : 90;
    this.fireTimer = type === 'boss' ? 0.4 : 1.1 + Math.random() * 1.3;
    this.mesh = type === 'boss' ? createMiniBossModel() : createEnemyModel(type);
    this.mesh.position.copy(position);
    this.mesh.rotation.y = Math.PI;
  }

  update(delta, state, playerPosition, spawnEnemyProjectile) {
    if (this.type === 'boss') {
      const targetX = THREE.MathUtils.clamp(playerPosition.x * 0.45, -7, 7);
      this.mesh.position.x = THREE.MathUtils.lerp(this.mesh.position.x, targetX, 1 - Math.exp(-delta * 1.8));
      this.mesh.position.z = THREE.MathUtils.lerp(this.mesh.position.z, playerPosition.z + 13, 1 - Math.exp(-delta * 1.4));
      this.mesh.rotation.z = Math.sin(state.elapsed * 1.8) * 0.08;
      this.fireTimer -= delta;
      if (this.fireTimer <= 0) {
        this.fireTimer = 0.65;
        for (let i = -2; i <= 2; i += 1) {
          spawnEnemyProjectile(this.mesh.position, i * 0.18);
        }
      }
      return;
    }

    const speed = this.type === 'striker' ? 8.2 : 4.4;
    this.mesh.position.z -= delta * speed;
    this.mesh.position.x += Math.sin(state.elapsed * 2 + this.mesh.id) * delta * 1.2;
    this.mesh.rotation.y += delta * (this.type === 'drone' ? 1.2 : 0.4);

    if (this.type === 'gunner') {
      this.fireTimer -= delta;
      if (this.fireTimer <= 0) {
        this.fireTimer = 1.5;
        spawnEnemyProjectile(this.mesh.position, 0);
      }
    }
  }

  damage(amount) {
    this.hp -= amount;
    this.mesh.scale.setScalar(Math.max(0.72, 1 + (Math.random() - 0.5) * 0.08));
  }

  get isDead() {
    return this.hp <= 0;
  }
}
