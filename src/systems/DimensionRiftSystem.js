import * as THREE from 'three';
import { DIMENSIONS } from '../core/Constants.js';
import { disposeObject3D } from '../utils/dispose.js';

const RIFT_LIFETIME = 1.15;
const SHARD_COUNT = 26;
const GI_RECEIVER_SHARD_COUNT = 10;
const EDGE_SHARD_COUNT = 18;
const RIFT_OFFSET = new THREE.Vector3(0, 0.85, 7.2);
const PASS_THROUGH_DEPTH = 1.8;
const PASS_FADE_START_DISTANCE = 1.6;
const WORLD_UP = new THREE.Vector3(0, 1, 0);
const LOCAL_FORWARD = new THREE.Vector3(0, 0, 1);

export class DimensionRiftSystem {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
  }

  spawn(playerPosition, fromDimension, toDimension, camera = null) {
    const fromColor = DIMENSIONS[fromDimension]?.color ?? DIMENSIONS.stability.color;
    const toColor = DIMENSIONS[toDimension].color;
    const group = new THREE.Group();
    group.name = 'DimensionRift';
    group.position.copy(playerPosition).add(RIFT_OFFSET);
    alignVerticalToCamera(group, camera);
    this.scene.add(group);

    const opening = this.createRiftOpening(fromColor, toColor);
    group.add(opening);

    const shards = [];
    for (let index = 0; index < SHARD_COUNT; index += 1) {
      const shard = this.createGlassShard(index, toColor);
      group.add(shard.mesh);
      shards.push(shard);
    }
    for (let index = 0; index < GI_RECEIVER_SHARD_COUNT; index += 1) {
      const shard = this.createGIReceiverShard(index, toColor);
      group.add(shard.mesh);
      shards.push(shard);
    }

    this.items.push({
      group,
      opening,
      shards,
      fromDimension,
      toDimension,
      entryPosition: playerPosition.clone(),
      life: RIFT_LIFETIME,
      maxLife: RIFT_LIFETIME
    });
  }

  createRiftOpening(fromColor, toColor) {
    const opening = new THREE.Group();
    opening.name = 'DimensionRiftOpening';
    opening.scale.set(2.35, 1.95, 1);
    opening.add(this.createPortalCore(toColor));
    const edgeShards = this.createPortalEdgeShards(toColor);
    for (const edgeShard of edgeShards) {
      opening.add(edgeShard);
    }

    const cracks = createImpactCracks();
    for (const crack of cracks) {
      const geometry = createCrackShardGeometry(crack);
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(fromColor).lerp(toColor, 0.72),
        transparent: true,
        opacity: crack.opacity,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const segment = new THREE.Mesh(geometry, material);
      segment.name = 'DimensionRiftCrackSegment';
      opening.add(segment);
    }

    for (const vein of createImpactVeins()) {
      const geometry = createCrackShardGeometry(vein);
      const material = new THREE.MeshBasicMaterial({
        color: toColor,
        transparent: true,
        opacity: vein.opacity,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const veinMesh = new THREE.Mesh(geometry, material);
      veinMesh.name = 'DimensionRiftCrackVein';
      opening.add(veinMesh);
    }

    return opening;
  }

  createPortalCore(color) {
    const geometry = createPortalHoleGeometry(0.58, 18);
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.58,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const portal = new THREE.Mesh(geometry, material);
    portal.name = 'DimensionRiftPortalCore';
    portal.position.z = -0.04;
    portal.scale.set(1.26, 1.08, 1);
    portal.userData.ddgiContributor = {
      color: color.clone(),
      intensity: 2.2,
      radius: 9.0
    };
    return portal;
  }

  createPortalEdgeShards(color) {
    const edgeShards = [];
    for (let index = 0; index < EDGE_SHARD_COUNT; index += 1) {
      const angle = (Math.PI * 2 * index) / EDGE_SHARD_COUNT + (Math.random() - 0.5) * 0.18;
      const radius = 0.58 + Math.random() * 0.12;
      const geometry = createShardGeometry(0.15 + Math.random() * 0.16, 0.2 + Math.random() * 0.22);
      const material = new THREE.MeshStandardMaterial({
        name: 'DimensionRiftGlassEdge',
        color: new THREE.Color('#eef8ff').lerp(color, 0.18),
        emissive: '#000000',
        emissiveIntensity: 0,
        roughness: 0.12,
        metalness: 0.02,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
        depthWrite: false,
        envMapIntensity: 0.16
      });
      const shard = new THREE.Mesh(geometry, material);
      shard.name = 'DimensionRiftEdgeShard';
      shard.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.7, 0.04 + Math.random() * 0.04);
      shard.rotation.set(Math.random() * 0.35, Math.random() * 0.35, angle + Math.PI * 0.5 + Math.random() * 0.5);
      shard.userData.ddgiContributor = {
        color: color.clone(),
        intensity: 0.45,
        radius: 4.2
      };
      edgeShards.push(shard);
    }
    return edgeShards;
  }

  createGlassShard(index, color) {
    const angle = (Math.PI * 2 * index) / SHARD_COUNT + (Math.random() - 0.5) * 0.34;
    const radius = 0.48 + Math.pow(Math.random(), 0.65) * 1.18;
    const verticalScale = 0.72 + Math.random() * 0.22;
    const geometry = createShardGeometry(0.28 + Math.random() * 0.38, 0.42 + Math.random() * 0.56);
    const material = new THREE.MeshStandardMaterial({
      name: 'DimensionRiftGlass',
      color: new THREE.Color('#dcefff').lerp(color, 0.22),
      emissive: '#000000',
      emissiveIntensity: 0,
      roughness: 0.1,
      metalness: 0.02,
      transparent: true,
      opacity: 0.48,
      side: THREE.DoubleSide,
      depthWrite: false,
      envMapIntensity: 0.18
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'DimensionRiftGlassShard';
    mesh.position.set(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius * verticalScale,
      Math.random() * 0.28 - 0.14
    );
    mesh.rotation.set(Math.random() * 0.75, Math.random() * 0.7, angle + Math.random() * 0.9);
    mesh.scale.setScalar(0.56 + Math.random() * 0.5);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.ddgiContributor = {
      color: color.clone(),
      intensity: 0.45,
      radius: 4.2
    };

    return {
      mesh,
      velocity: new THREE.Vector3(Math.cos(angle) * (0.85 + Math.random() * 1.6), Math.sin(angle) * (0.55 + Math.random() * 1.1), -1.35),
      angularVelocity: new THREE.Vector3(Math.random() * 2.6, Math.random() * 2.2, (Math.random() - 0.5) * 4.8),
      baseOpacity: material.opacity,
      baseScale: mesh.scale.x
    };
  }

  createGIReceiverShard(index, color) {
    const angle = (Math.PI * 2 * index) / GI_RECEIVER_SHARD_COUNT + (Math.random() - 0.5) * 0.28;
    const radius = 0.95 + Math.random() * 1.25;
    const geometry = createShardGeometry(0.82 + Math.random() * 0.55, 0.86 + Math.random() * 0.72);
    const material = new THREE.MeshStandardMaterial({
      name: 'DimensionRiftGIReceiver',
      color: new THREE.Color('#e8f2f4').lerp(color, 0.12),
      emissive: '#000000',
      emissiveIntensity: 0,
      roughness: 0.68,
      metalness: 0.08,
      transparent: true,
      opacity: 0.78,
      side: THREE.DoubleSide,
      depthWrite: false,
      envMapIntensity: 0.24
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'DimensionRiftGIReceiverShard';
    mesh.position.set(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius * (0.68 + Math.random() * 0.18),
      Math.random() * 0.46 - 0.18
    );
    mesh.rotation.set(Math.random() * 0.6, Math.random() * 0.8, angle + Math.random() * 0.7);
    mesh.scale.setScalar(0.74 + Math.random() * 0.58);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.ddgiContributor = {
      color: color.clone(),
      intensity: 1.15,
      radius: 5.8
    };

    return {
      mesh,
      velocity: new THREE.Vector3(Math.cos(angle) * (0.32 + Math.random() * 0.72), Math.sin(angle) * (0.25 + Math.random() * 0.58), -0.9),
      angularVelocity: new THREE.Vector3(Math.random() * 1.1, Math.random() * 1.3, (Math.random() - 0.5) * 2.4),
      baseOpacity: material.opacity,
      baseScale: mesh.scale.x
    };
  }

  update(delta, camera = null, worldTravelSpeed = 0, playerPosition = null) {
    for (let i = this.items.length - 1; i >= 0; i -= 1) {
      const item = this.items[i];
      item.life -= delta;
      const progress = 1 - Math.max(0, item.life / item.maxLife);
      const fade = Math.max(0, item.life / item.maxLife);

      item.group.position.z -= worldTravelSpeed * delta;
      alignVerticalToCamera(item.group, camera);
      item.opening.scale.set(2.35 + progress * 0.72, 1.95 + progress * 0.5, 1);
      const passAlpha = getPassAlpha(item.group.position, playerPosition);
      item.opening.traverse((child) => {
        if (child.material) {
          const baseOpacity = getRiftBaseOpacity(child);
          child.material.opacity = baseOpacity * fade * passAlpha;
        }
      });

      for (const shard of item.shards) {
        shard.mesh.position.addScaledVector(shard.velocity, delta);
        shard.mesh.rotation.x += shard.angularVelocity.x * delta;
        shard.mesh.rotation.y += shard.angularVelocity.y * delta;
        shard.mesh.rotation.z += shard.angularVelocity.z * delta;
        shard.mesh.scale.setScalar(shard.baseScale * (0.82 + progress * 0.72));
        shard.mesh.material.opacity = shard.baseOpacity * fade * passAlpha;
      }

      if (item.life <= 0) {
        this.removeAt(i);
      }
    }
  }

  hasPassedThrough(playerPosition, targetDimension = null) {
    return this.items.some((item) => {
      const matchesTarget = !targetDimension || item.toDimension === targetDimension;
      return matchesTarget && item.group.position.z <= playerPosition.z - PASS_THROUGH_DEPTH;
    });
  }

  removeAt(index) {
    const [item] = this.items.splice(index, 1);
    this.scene.remove(item.group);
    disposeObject3D(item.group);
  }

  reset() {
    for (let i = this.items.length - 1; i >= 0; i -= 1) {
      this.removeAt(i);
    }
  }

  dispose() {
    this.reset();
  }
}

function getPassAlpha(riftPosition, playerPosition) {
  if (!playerPosition) return 1;
  const distanceToPlayer = riftPosition.z - playerPosition.z;
  const fadeWindow = PASS_FADE_START_DISTANCE + PASS_THROUGH_DEPTH;
  return THREE.MathUtils.clamp((distanceToPlayer + PASS_THROUGH_DEPTH) / fadeWindow, 0.24, 1);
}

function alignVerticalToCamera(object, camera) {
  if (!camera) return;
  const direction = camera.position.clone().sub(object.position);
  direction.y = 0;
  if (direction.lengthSq() < 0.0001) {
    direction.set(0, 0, -1);
  }
  direction.normalize();
  object.quaternion.setFromUnitVectors(LOCAL_FORWARD, direction);
  object.up.copy(WORLD_UP);
}

function createShardGeometry(width, height) {
  const geometry = new THREE.BufferGeometry();
  const vertices = new Float32Array([
    -width * 0.45,
    -height * 0.35,
    0,
    width * 0.55,
    -height * 0.18,
    0,
    -width * 0.08,
    height * 0.62,
    0
  ]);
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex([0, 1, 2]);
  geometry.computeVertexNormals();
  return geometry;
}

function createPortalHoleGeometry(radius, pointCount) {
  const shape = new THREE.Shape();
  for (let i = 0; i < pointCount; i += 1) {
    const angle = (Math.PI * 2 * i) / pointCount;
    const jaggedRadius = radius * (0.76 + Math.random() * 0.34);
    const x = Math.cos(angle) * jaggedRadius;
    const y = Math.sin(angle) * jaggedRadius;
    if (i === 0) {
      shape.moveTo(x, y);
    } else {
      shape.lineTo(x, y);
    }
  }
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

function createImpactCracks() {
  const cracks = [];
  const rayCount = 12;
  for (let i = 0; i < rayCount; i += 1) {
    const angle = (Math.PI * 2 * i) / rayCount + (Math.random() - 0.5) * 0.32;
    const segmentCount = 2 + Math.floor(Math.random() * 3);
    const startRadius = 0.34 + Math.random() * 0.08;
    const totalLength = 0.44 + Math.random() * 0.72;
    const points = [];
    for (let pointIndex = 0; pointIndex <= segmentCount; pointIndex += 1) {
      const t = pointIndex / segmentCount;
      const distance = startRadius + totalLength * t;
      const bend = (Math.random() - 0.5) * 0.18 * t;
      const pointAngle = angle + bend;
      points.push(new THREE.Vector3(Math.cos(pointAngle) * distance, Math.sin(pointAngle) * distance * 0.78, Math.random() * 0.035));
    }
    for (let pointIndex = 0; pointIndex < points.length - 1; pointIndex += 1) {
      cracks.push(createCrackSegment(points[pointIndex], points[pointIndex + 1], pointIndex, points.length - 2, 0.032));
    }

    if (i % 3 === 0) {
      const branchAngle = angle + (Math.random() > 0.5 ? 0.72 : -0.72);
      const branchStartRadius = startRadius + totalLength * 0.55;
      const branchLength = 0.24 + Math.random() * 0.28;
      const branchStart = new THREE.Vector3(
        Math.cos(angle) * branchStartRadius,
        Math.sin(angle) * branchStartRadius * 0.78,
        0.02
      );
      const branchEnd = branchStart.clone().add(
        new THREE.Vector3(Math.cos(branchAngle) * branchLength, Math.sin(branchAngle) * branchLength * 0.78, 0.01)
      );
      cracks.push(createCrackSegment(branchStart, branchEnd, 1, 2, 0.022));
    }
  }
  return cracks;
}

function createImpactVeins() {
  const veins = [];
  for (let i = 0; i < 8; i += 1) {
    const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.28;
    const startDistance = 0.3 + Math.random() * 0.2;
    const endDistance = startDistance + 0.14 + Math.random() * 0.24;
    const start = new THREE.Vector3(Math.cos(angle) * startDistance, Math.sin(angle) * startDistance * 0.75, Math.random() * 0.04);
    const end = new THREE.Vector3(
      Math.cos(angle + (Math.random() - 0.5) * 0.38) * endDistance,
      Math.sin(angle + (Math.random() - 0.5) * 0.38) * endDistance * 0.75,
      Math.random() * 0.04
    );
    veins.push(createCrackSegment(start, end, 1, 2, 0.016));
  }
  return veins;
}

function createCrackSegment(start, end, index, maxIndex, width) {
  const fade = 1 - index / Math.max(1, maxIndex + 1);
  return {
    start,
    end,
    startWidth: width * (0.9 + fade * 0.8),
    endWidth: width * (0.25 + fade * 0.45),
    opacity: 0.16 + fade * 0.28
  };
}

function createCrackShardGeometry(segment) {
  const direction = segment.end.clone().sub(segment.start);
  if (direction.lengthSq() <= 0.0001) {
    direction.set(0, 1, 0);
  }
  direction.normalize();
  const normal = new THREE.Vector3(-direction.y, direction.x, 0);
  const startLeft = segment.start.clone().addScaledVector(normal, segment.startWidth);
  const startRight = segment.start.clone().addScaledVector(normal, -segment.startWidth * (0.75 + Math.random() * 0.35));
  const endLeft = segment.end.clone().addScaledVector(normal, segment.endWidth * (0.7 + Math.random() * 0.4));
  const endRight = segment.end.clone().addScaledVector(normal, -segment.endWidth);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(
      new Float32Array([
        startLeft.x,
        startLeft.y,
        startLeft.z,
        startRight.x,
        startRight.y,
        startRight.z,
        endLeft.x,
        endLeft.y,
        endLeft.z,
        endRight.x,
        endRight.y,
        endRight.z
      ]),
      3
    )
  );
  geometry.setIndex([0, 1, 2, 1, 3, 2]);
  geometry.computeVertexNormals();
  return geometry;
}

function getRiftBaseOpacity(child) {
  if (child.name === 'DimensionRiftPortalCore') return 0.58;
  if (child.name === 'DimensionRiftEdgeShard') return 0.55;
  if (child.name === 'DimensionRiftCrackSegment') return 0.44;
  return 0.2;
}
