import * as THREE from 'three';
import { DIMENSIONS, GAME_CONFIG } from '../core/Constants.js';

export class DimensionEnvironment {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.tunnel = this.createTunnel();
    this.grid = this.createGrid();
    this.starLayers = this.createStarLayers();
    this.dustField = this.createDustField();
    this.scroll = 0;
    this.group.add(this.tunnel, this.grid, ...this.starLayers, this.dustField);
    scene.add(this.group);
  }

  createTunnel() {
    const geometry = new THREE.CylinderGeometry(18, 18, 42, 18, 1, true);
    const material = new THREE.MeshBasicMaterial({
      color: '#082b34',
      transparent: true,
      opacity: 0.18,
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
    grid.material.opacity = 0.38;
    grid.material.depthWrite = false;
    return grid;
  }

  createStarLayers() {
    return [
      this.createPointField({ count: 460, spreadX: 44, spreadY: 24, minY: 1.5, size: 0.04, opacity: 1, speed: 2.8 }),
      this.createPointField({ count: 190, spreadX: 34, spreadY: 12, minY: -0.3, size: 0.075, opacity: 0.72, speed: 5.4 })
    ];
  }

  createDustField() {
    return this.createPointField({ count: 150, spreadX: 28, spreadY: 7, minY: -0.9, size: 0.11, opacity: 0.42, speed: 8.2 });
  }

  createPointField({ count, spreadX, spreadY, minY, size, opacity, speed }) {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * spreadX;
      positions[i * 3 + 1] = minY + Math.random() * spreadY;
      positions[i * 3 + 2] = Math.random() * 44 - 20;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: '#d8f6ff',
      size,
      sizeAttenuation: true,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const points = new THREE.Points(geometry, material);
    points.userData.speed = speed;
    points.userData.spreadX = spreadX;
    points.userData.spreadY = spreadY;
    points.userData.minY = minY;
    return points;
  }

  update(delta, dimensionId, worldTravelSpeed = 0) {
    const dimension = DIMENSIONS[dimensionId];
    const scrollSpeed = GAME_CONFIG.world.scrollSpeed + worldTravelSpeed;
    this.scroll += delta * scrollSpeed;
    this.scene.background = dimension.darkColor;
    if (this.scene.fog) {
      this.scene.fog.color.copy(dimension.fogColor);
    }
    this.tunnel.material.color.copy(dimension.color);
    this.grid.material.color.copy(dimension.color);
    this.grid.position.z = 4 - (this.scroll % 2);
    this.tunnel.position.z = 4 - (this.scroll % 3) * 0.35;
    this.group.rotation.z += delta * 0.08;
    for (const field of [...this.starLayers, this.dustField]) {
      field.material.color.copy(new THREE.Color('#d8f6ff').lerp(dimension.color, 0.2));
      const positions = field.geometry.attributes.position;
      const speed = field.userData.speed + scrollSpeed;
      for (let i = 0; i < positions.count; i += 1) {
        const z = positions.getZ(i) - delta * speed;
        if (z < -20) {
          positions.setXYZ(
            i,
            (Math.random() - 0.5) * field.userData.spreadX,
            field.userData.minY + Math.random() * field.userData.spreadY,
            24
          );
        } else if (z > 24) {
          positions.setXYZ(
            i,
            (Math.random() - 0.5) * field.userData.spreadX,
            field.userData.minY + Math.random() * field.userData.spreadY,
            -20
          );
        } else {
          positions.setZ(i, z);
        }
      }
      positions.needsUpdate = true;
    }
  }
}
