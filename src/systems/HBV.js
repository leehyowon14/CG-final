import * as THREE from 'three';

export class HierarchicalBoundingVolume {
  constructor(rootRadius, children = []) {
    this.rootRadius = rootRadius;
    this.children = children;
  }

  hit(position, targetPosition, targetRadius) {
    if (position.distanceToSquared(targetPosition) > (this.rootRadius + targetRadius) ** 2) {
      return false;
    }

    return this.children.some((child) => {
      const center = position.clone().add(child.offset);
      return center.distanceToSquared(targetPosition) <= (child.radius + targetRadius) ** 2;
    });
  }
}

export function createPlayerHBV() {
  return new HierarchicalBoundingVolume(1.7, [
    { name: 'core', offset: new THREE.Vector3(0, 0.05, 0), radius: 0.72 },
    { name: 'nose', offset: new THREE.Vector3(0, 0.08, 0.72), radius: 0.48 },
    { name: 'engine', offset: new THREE.Vector3(0, 0, -0.85), radius: 0.52 },
    { name: 'leftWing', offset: new THREE.Vector3(-0.92, 0, -0.18), radius: 0.42 },
    { name: 'rightWing', offset: new THREE.Vector3(0.92, 0, -0.18), radius: 0.42 }
  ]);
}

export function hbvHit(hbv, rootPosition, targetPosition, targetRadius) {
  return hbv.hit(rootPosition, targetPosition, targetRadius);
}
