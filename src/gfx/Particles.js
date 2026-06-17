import * as THREE from 'three';
import { DIMENSIONS } from '../core/Constants.js';

export class ParticleBurst {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
  }

  spawn(position, dimensionId) {
    const material = new THREE.MeshBasicMaterial({
      color: DIMENSIONS[dimensionId].color,
      transparent: true,
      opacity: 0.9
    });

    for (let i = 0; i < 18; i += 1) {
      const mesh = new THREE.Mesh(new THREE.TetrahedronGeometry(0.09, 0), material.clone());
      mesh.position.copy(position);
      const angle = (Math.PI * 2 * i) / 18;
      const speed = 2.5 + Math.random() * 2.2;
      this.items.push({
        mesh,
        velocity: new THREE.Vector3(Math.cos(angle) * speed, Math.random() * 1.2, Math.sin(angle) * speed),
        life: 0.45
      });
      this.scene.add(mesh);
    }
  }

  update(delta) {
    for (let i = this.items.length - 1; i >= 0; i -= 1) {
      const item = this.items[i];
      item.life -= delta;
      item.mesh.position.addScaledVector(item.velocity, delta);
      item.mesh.material.opacity = Math.max(0, item.life / 0.45);
      if (item.life <= 0) {
        this.scene.remove(item.mesh);
        item.mesh.geometry.dispose();
        item.mesh.material.dispose();
        this.items.splice(i, 1);
      }
    }
  }

  reset() {
    for (const item of this.items) {
      this.scene.remove(item.mesh);
      item.mesh.geometry.dispose();
      item.mesh.material.dispose();
    }
    this.items = [];
  }
}
