import * as THREE from 'three';

export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.targetPosition = new THREE.Vector3();
    this.offset = new THREE.Vector3(0, 13, -16);
    this.lookOffset = new THREE.Vector3(0, 0, 4);
  }

  update(delta, playerPosition) {
    this.targetPosition.copy(playerPosition).add(this.offset);
    this.camera.position.lerp(this.targetPosition, 1 - Math.exp(-delta * 5));
    const lookAt = playerPosition.clone().add(this.lookOffset);
    this.camera.lookAt(lookAt);
  }
}
