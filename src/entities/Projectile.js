import * as THREE from 'three';
import { GAME_CONFIG } from '../core/Constants.js';
import { createEnergyMaterial } from '../gfx/Materials.js';

const projectileGeometry = new THREE.SphereGeometry(GAME_CONFIG.projectile.radius, 12, 8);

export class Projectile {
  constructor(position, dimensionColor, owner = 'player', velocity = null) {
    this.owner = owner;
    this.radius = GAME_CONFIG.projectile.radius;
    this.damage = owner === 'player' ? GAME_CONFIG.projectile.damage : 14;
    this.life = owner === 'player' ? GAME_CONFIG.projectile.ttl : 3.2;
    this.velocity = velocity ?? new THREE.Vector3(0, 0, GAME_CONFIG.projectile.speed);
    this.mesh = new THREE.Mesh(projectileGeometry, createEnergyMaterial(dimensionColor, { emissiveIntensity: 1.4 }));
    this.mesh.position.copy(position);
    this.mesh.castShadow = true;
  }

  update(delta) {
    this.life -= delta;
    this.mesh.position.addScaledVector(this.velocity, delta);
    this.mesh.rotation.y += delta * 8;
  }

  get isDead() {
    return this.life <= 0 || Math.abs(this.mesh.position.z) > 26 || Math.abs(this.mesh.position.x) > 18;
  }

  dispose() {
    this.mesh.material.dispose();
  }
}
