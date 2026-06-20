import * as THREE from 'three';

const VIEW_MODES = [
  {
    id: 'current',
    offset: new THREE.Vector3(0, 13, -16),
    lookOffset: new THREE.Vector3(0, 0, 4),
    up: new THREE.Vector3(0, 1, 0),
    followSpeed: 5
  },
  {
    id: 'firstPerson',
    offset: new THREE.Vector3(0, 0.55, 1.85),
    lookOffset: new THREE.Vector3(0, 0.45, 10),
    up: new THREE.Vector3(0, 1, 0),
    followSpeed: 12
  },
  {
    id: 'chase',
    offset: new THREE.Vector3(0, 4.2, -9),
    lookOffset: new THREE.Vector3(0, 0.5, 7),
    up: new THREE.Vector3(0, 1, 0),
    followSpeed: 7
  },
  {
    id: 'top',
    offset: new THREE.Vector3(0, 24, -0.1),
    lookOffset: new THREE.Vector3(0, 0, 0),
    up: new THREE.Vector3(0, 0, 1),
    followSpeed: 6
  }
];

export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.targetPosition = new THREE.Vector3();
    this.lookAtTarget = new THREE.Vector3();
    this.viewIndex = 0;
    this.mode = VIEW_MODES[this.viewIndex];
    this.shakeTime = 0;
    this.shakeStrength = 0;
  }

  cycleView() {
    this.viewIndex = (this.viewIndex + 1) % VIEW_MODES.length;
    this.mode = VIEW_MODES[this.viewIndex];
    return this.mode.id;
  }

  update(delta, playerPosition) {
    this.targetPosition.copy(playerPosition).add(this.mode.offset);
    if (this.shakeTime > 0) {
      this.shakeTime = Math.max(0, this.shakeTime - delta);
      const falloff = this.shakeTime / 0.22;
      this.targetPosition.x += (Math.random() - 0.5) * this.shakeStrength * falloff;
      this.targetPosition.y += (Math.random() - 0.5) * this.shakeStrength * 0.45 * falloff;
    }
    this.camera.position.lerp(this.targetPosition, 1 - Math.exp(-delta * this.mode.followSpeed));
    this.camera.up.lerp(this.mode.up, 1 - Math.exp(-delta * 10)).normalize();
    this.lookAtTarget.copy(playerPosition).add(this.mode.lookOffset);
    this.camera.lookAt(this.lookAtTarget);
  }

  shake(strength = 0.55) {
    this.shakeTime = 0.22;
    this.shakeStrength = Math.max(this.shakeStrength, strength);
  }
}
