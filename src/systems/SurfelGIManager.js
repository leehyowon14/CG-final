import * as THREE from 'three';
import { DIMENSIONS } from '../core/Constants.js';

export class SurfelGIManager {
  constructor(scene) {
    this.scene = scene;
    this.samples = [];
    this.debugGroup = new THREE.Group();
    this.debugGroup.visible = false;
    this.scene.add(this.debugGroup);
    this.createSamples();
  }

  createSamples() {
    const geometry = new THREE.SphereGeometry(0.08, 8, 6);
    for (let i = 0; i < 64; i += 1) {
      const angle = (Math.PI * 2 * i) / 64;
      const radius = 5 + (i % 8) * 1.45;
      const position = new THREE.Vector3(Math.cos(angle) * radius, -0.95 + (i % 3) * 0.25, Math.sin(angle) * radius + 3);
      const sample = {
        position,
        normal: new THREE.Vector3(0, 1, 0),
        color: new THREE.Color('#35d6c6'),
        intensity: 0.4 + (i % 5) * 0.08
      };
      const mesh = new THREE.Mesh(
        geometry,
        new THREE.MeshBasicMaterial({ color: sample.color, transparent: true, opacity: 0.9 })
      );
      mesh.position.copy(position);
      this.debugGroup.add(mesh);
      this.samples.push({ ...sample, mesh });
    }
  }

  update(delta, state) {
    const dimensionColor = DIMENSIONS[state.dimension].color;
    this.debugGroup.visible = state.surfelDebug;
    this.samples.forEach((sample, index) => {
      sample.color.copy(dimensionColor);
      sample.intensity = state.giEnabled ? 0.55 + Math.sin(state.elapsed * 1.8 + index) * 0.12 : 0;
      sample.mesh.material.color.copy(dimensionColor);
      sample.mesh.position.y = sample.position.y + Math.sin(state.elapsed * 2 + index) * 0.08;
    });
    this.debugGroup.rotation.y += delta * 0.08;
  }

  sampleAt(position) {
    let color = new THREE.Color('#000000');
    let weight = 0;
    for (const sample of this.samples) {
      const distance = Math.max(0.001, sample.position.distanceTo(position));
      const contribution = sample.intensity / (distance * distance);
      color = color.add(sample.color.clone().multiplyScalar(contribution));
      weight += contribution;
    }
    if (weight > 0) {
      color.multiplyScalar(1 / weight);
    }
    return color;
  }

  flash(position, color) {
    const mesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.18, 0),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 })
    );
    mesh.position.copy(position);
    this.debugGroup.add(mesh);
    window.setTimeout(() => {
      this.debugGroup.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    }, 350);
  }

  reset() {
    this.debugGroup.visible = false;
  }
}
