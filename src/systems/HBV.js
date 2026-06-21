import * as THREE from 'three';
import { disposeObject3D } from '../utils/dispose.js';

export class HierarchicalBoundingVolume {
  constructor(rootRadius, children = [], rootBounds = null) {
    this.rootRadius = rootRadius;
    this.rootBounds = rootBounds ?? {
      offset: new THREE.Vector3(),
      size: new THREE.Vector3(rootRadius * 2, rootRadius * 2, rootRadius * 2)
    };
    this.children = children;
    this.childCenter = new THREE.Vector3();
    this.childLocalTarget = new THREE.Vector3();
    this.childQuaternion = new THREE.Quaternion();
    this.inverseChildQuaternion = new THREE.Quaternion();
    this.rootQuaternion = new THREE.Quaternion();
  }

  hit(position, targetPosition, targetRadius, rotation = null) {
    if (position.distanceToSquared(targetPosition) > (this.rootRadius + targetRadius) ** 2) {
      return false;
    }

    this.rootQuaternion.copy(rotation ?? IDENTITY_QUATERNION);
    return this.children.some((child) => this.childHit(child, position, targetPosition, targetRadius));
  }

  childHit(child, rootPosition, targetPosition, targetRadius) {
    this.childCenter.copy(child.offset).applyQuaternion(this.rootQuaternion).add(rootPosition);
    this.childQuaternion.copy(this.rootQuaternion).multiply(child.rotation ?? IDENTITY_QUATERNION);
    this.inverseChildQuaternion.copy(this.childQuaternion).invert();
    this.childLocalTarget.copy(targetPosition).sub(this.childCenter).applyQuaternion(this.inverseChildQuaternion);

    if (child.type === 'box') {
      return sphereIntersectsBox(this.childLocalTarget, targetRadius, child.size);
    }

    return this.childLocalTarget.lengthSq() <= (child.radius + targetRadius) ** 2;
  }
}

const IDENTITY_QUATERNION = new THREE.Quaternion();

export function createPlayerHBV() {
  return new HierarchicalBoundingVolume(
    1.62,
    [
      boxVolume('hull', new THREE.Vector3(0, -0.13, -0.22), new THREE.Vector3(0.82, 0.78, 1.58)),
      boxVolume('canopy', new THREE.Vector3(0, 0.16, 0.12), new THREE.Vector3(0.44, 0.32, 0.76)),
      boxVolume('nose', new THREE.Vector3(0, -0.18, 0.94), new THREE.Vector3(0.42, 0.46, 0.74)),
      boxVolume('leftPod', new THREE.Vector3(-0.53, -0.2, -0.34), new THREE.Vector3(0.46, 0.34, 0.78)),
      boxVolume('rightPod', new THREE.Vector3(0.53, -0.2, -0.34), new THREE.Vector3(0.46, 0.34, 0.78)),
      boxVolume('leftEngine', new THREE.Vector3(-0.32, -0.39, -0.92), new THREE.Vector3(0.28, 0.38, 0.58)),
      boxVolume('rightEngine', new THREE.Vector3(0.32, -0.39, -0.92), new THREE.Vector3(0.28, 0.38, 0.58))
    ],
    {
      offset: new THREE.Vector3(0, -0.12, 0),
      size: new THREE.Vector3(1.66, 0.98, 2.7)
    }
  );
}

export function hbvHit(hbv, rootPosition, targetPosition, targetRadius, rootRotation = null) {
  return hbv.hit(rootPosition, targetPosition, targetRadius, rootRotation);
}

function boxVolume(name, offset, size, rotation = IDENTITY_QUATERNION.clone()) {
  return { name, type: 'box', offset, size, rotation };
}

function sphereIntersectsBox(sphereCenter, sphereRadius, boxSize) {
  const halfX = boxSize.x * 0.5;
  const halfY = boxSize.y * 0.5;
  const halfZ = boxSize.z * 0.5;
  const closestX = THREE.MathUtils.clamp(sphereCenter.x, -halfX, halfX);
  const closestY = THREE.MathUtils.clamp(sphereCenter.y, -halfY, halfY);
  const closestZ = THREE.MathUtils.clamp(sphereCenter.z, -halfZ, halfZ);
  const dx = sphereCenter.x - closestX;
  const dy = sphereCenter.y - closestY;
  const dz = sphereCenter.z - closestZ;
  return dx * dx + dy * dy + dz * dz <= sphereRadius * sphereRadius;
}

export class HBVDebugVisualizer {
  constructor(hbv) {
    this.hbv = hbv;
    this.group = new THREE.Group();
    this.group.name = 'PlayerHBVDebug';
    this.group.visible = false;
    this.rootMesh = this.createBroadPhaseMesh(hbv.rootBounds);
    this.childMeshes = [];
    this.links = [];

    this.group.add(this.rootMesh);
    for (const child of hbv.children) {
      const childMesh = this.createChildMesh(child);
      childMesh.position.copy(child.offset);
      childMesh.quaternion.copy(child.rotation ?? IDENTITY_QUATERNION);
      childMesh.userData.hbvName = child.name;
      this.childMeshes.push(childMesh);
      this.group.add(childMesh);

      const link = this.createLink(child);
      this.links.push(link);
      this.group.add(link);
    }
  }

  createSphere(name, radius, color, opacity) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 24, 12),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        wireframe: true,
        depthWrite: false
      })
    );
    mesh.name = name;
    return mesh;
  }

  createBroadPhaseMesh(rootBounds) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(rootBounds.size.x, rootBounds.size.y, rootBounds.size.z),
      new THREE.MeshBasicMaterial({
        color: '#ffe066',
        transparent: true,
        opacity: 0.12,
        wireframe: true,
        depthWrite: false
      })
    );
    mesh.name = 'PlayerHBVBroadPhase';
    mesh.position.copy(rootBounds.offset);
    return mesh;
  }

  createChildMesh(child) {
    if (child.type === 'box') {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(child.size.x, child.size.y, child.size.z),
        new THREE.MeshBasicMaterial({
          color: '#35d6c6',
          transparent: true,
          opacity: 0.5,
          wireframe: true,
          depthWrite: false
        })
      );
      mesh.name = `PlayerHBVMesh:${child.name}`;
      return mesh;
    }

    return this.createSphere(`PlayerHBVMesh:${child.name}`, child.radius, '#35d6c6', 0.42);
  }

  createLink(child) {
    const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), child.offset]);
    const material = new THREE.LineBasicMaterial({ color: '#f8fbff', transparent: true, opacity: 0.42, depthWrite: false });
    const line = new THREE.Line(geometry, material);
    line.name = `PlayerHBVLink:${child.name}`;
    return line;
  }

  update(position, rotation, visible) {
    this.group.visible = visible;
    this.group.position.copy(position);
    this.group.quaternion.copy(rotation);
  }

  dispose() {
    disposeObject3D(this.group);
  }
}

export class ObjectBoundsDebugVisualizer {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'ObjectBVHDebug';
    this.group.visible = false;
    this.pool = [];
  }

  update({ enemies, obstacles, pickups, projectiles }, visible) {
    this.group.visible = visible;
    const items = [
      ...debugItems(enemies.items, '#ff6d42', 'enemy'),
      ...debugItems(obstacles.items, '#a46cff', 'obstacle'),
      ...debugItems(pickups.items, '#35f27a', 'pickup'),
      ...debugItems(projectiles.items, '#7fe7ff', 'projectile')
    ];

    this.ensurePool(items.length);
    for (let index = 0; index < this.pool.length; index += 1) {
      const mesh = this.pool[index];
      const item = items[index];
      mesh.visible = visible && Boolean(item);
      if (!item) continue;
      mesh.name = `ObjectBVH:${item.kind}`;
      mesh.material.color.set(item.color);
      mesh.position.copy(item.position);
      mesh.scale.setScalar(item.radius);
    }
  }

  ensurePool(count) {
    while (this.pool.length < count) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(1, 18, 10),
        new THREE.MeshBasicMaterial({
          color: '#ffffff',
          transparent: true,
          opacity: 0.32,
          wireframe: true,
          depthWrite: false
        })
      );
      mesh.name = 'ObjectBVH:unused';
      this.pool.push(mesh);
      this.group.add(mesh);
    }
  }

  dispose() {
    disposeObject3D(this.group);
  }
}

function debugItems(items, color, kind) {
  return items.map((item) => ({
    color,
    kind,
    position: item.mesh.position,
    radius: item.radius
  }));
}
