import * as THREE from 'three';

export class HierarchicalBoundingVolume {
  constructor(rootRadius, children = []) {
    this.rootRadius = rootRadius;
    this.children = children;
    this.childCenter = new THREE.Vector3();
  }

  hit(position, targetPosition, targetRadius, rotation = null) {
    if (position.distanceToSquared(targetPosition) > (this.rootRadius + targetRadius) ** 2) {
      return false;
    }

    return this.children.some((child) => {
      this.childCenter.copy(child.offset);
      if (rotation) {
        this.childCenter.applyQuaternion(rotation);
      }
      this.childCenter.add(position);
      return this.childCenter.distanceToSquared(targetPosition) <= (child.radius + targetRadius) ** 2;
    });
  }
}

export function createPlayerHBV() {
  return new HierarchicalBoundingVolume(1.38, [
    { name: 'core', offset: new THREE.Vector3(0, 0.04, 0), radius: 0.5 },
    { name: 'nose', offset: new THREE.Vector3(0, 0.08, 0.72), radius: 0.34 },
    { name: 'engine', offset: new THREE.Vector3(0, 0, -0.82), radius: 0.36 },
    { name: 'leftWing', offset: new THREE.Vector3(-0.82, 0, -0.18), radius: 0.28 },
    { name: 'rightWing', offset: new THREE.Vector3(0.82, 0, -0.18), radius: 0.28 }
  ]);
}

export function hbvHit(hbv, rootPosition, targetPosition, targetRadius, rootRotation = null) {
  return hbv.hit(rootPosition, targetPosition, targetRadius, rootRotation);
}
