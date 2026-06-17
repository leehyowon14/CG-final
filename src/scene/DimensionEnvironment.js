import * as THREE from 'three';
import { DIMENSIONS } from '../core/Constants.js';

export class DimensionEnvironment {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.tunnel = this.createTunnel();
    this.grid = this.createGrid();
    this.riftParticles = this.createRiftParticles();
    this.group.add(this.tunnel, this.grid, this.riftParticles);
    scene.add(this.group);
  }

  createTunnel() {
    const geometry = new THREE.CylinderGeometry(18, 18, 42, 18, 1, true);
    const material = new THREE.MeshBasicMaterial({
      color: '#082b34',
      transparent: true,
      opacity: 0.34,
      side: THREE.BackSide,
      wireframe: true
    });
    const tunnel = new THREE.Mesh(geometry, material);
    tunnel.rotation.x = Math.PI / 2;
    tunnel.position.z = 4;
    return tunnel;
  }

  createGrid() {
    const grid = new THREE.GridHelper(32, 32, '#35d6c6', '#16444c');
    grid.position.y = -1.25;
    grid.position.z = 4;
    grid.material.transparent = true;
    grid.material.opacity = 0.45;
    return grid;
  }

  createRiftParticles() {
    const group = new THREE.Group();
    const material = new THREE.MeshBasicMaterial({ color: '#35d6c6', transparent: true, opacity: 0.75 });
    for (let i = 0; i < 70; i += 1) {
      const shard = new THREE.Mesh(new THREE.TetrahedronGeometry(0.08 + Math.random() * 0.14, 0), material.clone());
      shard.position.set((Math.random() - 0.5) * 28, Math.random() * 8 - 0.5, Math.random() * 34 - 16);
      shard.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      group.add(shard);
    }
    return group;
  }

  update(delta, dimensionId) {
    const dimension = DIMENSIONS[dimensionId];
    this.scene.background = dimension.darkColor;
    this.scene.fog.color.copy(dimension.fogColor);
    this.tunnel.material.color.copy(dimension.color);
    this.grid.material.color.copy(dimension.color);
    this.group.rotation.z += delta * 0.08;
    this.riftParticles.children.forEach((child, index) => {
      child.position.z -= delta * (1.8 + (index % 5) * 0.25);
      child.rotation.y += delta * 0.9;
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
        child.material.color.copy(dimension.color);
      }
      if (child.position.z < -16) {
        child.position.z = 18;
      }
    });
  }
}
