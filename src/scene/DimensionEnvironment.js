import * as THREE from 'three';
import { DIMENSIONS, GAME_CONFIG } from '../core/Constants.js';

export class DimensionEnvironment {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.panelBaseColor = new THREE.Color('#91a7aa');
    this.panelWorldPosition = new THREE.Vector3();
    this.receiverPanels = this.createReceiverPanels();
    this.starLayers = this.createStarLayers();
    this.dustField = this.createDustField();
    this.scroll = 0;
    this.group.add(...this.receiverPanels, ...this.starLayers, this.dustField);
    scene.add(this.group);
  }

  createReceiverPanels() {
    const panels = [];
    const geometry = new THREE.BoxGeometry(1.0, 0.06, 0.72);
    const material = new THREE.MeshStandardMaterial({
      name: 'DDGIReceiverPanel',
      color: this.panelBaseColor,
      emissive: '#000000',
      emissiveIntensity: 0,
      roughness: 0.72,
      metalness: 0.08,
      envMapIntensity: 0.12
    });
    const placements = [
      [-4.8, 0.18, 3.2],
      [4.6, 0.72, 4.4],
      [-2.6, 1.05, 6.1],
      [3.2, 0.22, 7.4],
      [-5.6, 1.25, 8.8],
      [5.4, 0.92, 2.1],
      [-1.0, 0.35, 5.2],
      [1.4, 1.18, 9.4]
    ];

    placements.forEach(([x, y, z], index) => {
      const panel = new THREE.Mesh(geometry, material);
      panel.name = 'DDGIReceiverPanel';
      panel.visible = false;
      panel.position.set(x, y, z);
      panel.rotation.set((index % 3) * 0.18, (index % 5) * 0.35, (index % 2 === 0 ? 1 : -1) * 0.24);
      panel.castShadow = true;
      panel.receiveShadow = true;
      panel.userData.offset = new THREE.Vector3(x, y, z);
      panel.userData.baseRotationY = panel.rotation.y;
      panel.userData.ddgiContributor = {
        intensity: 0.75,
        radius: 5.2
      };
      panels.push(panel);
    });

    return panels;
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

  update(delta, dimensionId, worldTravelSpeed = 0, playerPosition = new THREE.Vector3(0, 0, -6), receiverPanelsVisible = false) {
    const dimension = DIMENSIONS[dimensionId];
    const scrollSpeed = GAME_CONFIG.world.scrollSpeed + worldTravelSpeed;
    this.scroll += delta * scrollSpeed;
    this.scene.background = dimension.darkColor;
    if (this.scene.fog) {
      this.scene.fog.color.copy(dimension.fogColor);
    }
    this.group.rotation.z += delta * 0.08;
    this.group.updateMatrixWorld(true);
    const panelColor = this.panelBaseColor.clone().lerp(dimension.color, 0.04);
    for (const panel of this.receiverPanels) {
      panel.visible = receiverPanelsVisible;
      panel.material.color.copy(panelColor);
      this.panelWorldPosition.copy(playerPosition).add(panel.userData.offset);
      panel.position.copy(this.group.worldToLocal(this.panelWorldPosition));
      panel.rotation.y = panel.userData.baseRotationY + Math.sin(this.scroll * 0.12 + panel.userData.offset.x) * 0.08;
    }
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
