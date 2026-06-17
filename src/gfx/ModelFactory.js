import * as THREE from 'three';
import { createEnergyMaterial, createHullMaterial, dimensionMaterial } from './Materials.js';

export function createPlayerModel() {
  const group = new THREE.Group();
  const hull = createHullMaterial();
  const energy = createEnergyMaterial('#35d6c6', { emissiveIntensity: 1.1 });

  const body = new THREE.Mesh(new THREE.ConeGeometry(0.75, 2.4, 4), hull);
  body.rotation.x = Math.PI / 2;
  body.scale.set(1, 0.75, 1.25);
  body.castShadow = true;
  group.add(body);

  const wingGeometry = new THREE.BoxGeometry(2.5, 0.08, 0.55);
  const leftWing = new THREE.Mesh(wingGeometry, hull);
  leftWing.position.set(-0.75, -0.05, -0.25);
  leftWing.rotation.z = 0.2;
  const rightWing = leftWing.clone();
  rightWing.position.x = 0.75;
  rightWing.rotation.z = -0.2;
  group.add(leftWing, rightWing);

  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.34, 1), energy);
  core.position.set(0, 0.18, -0.1);
  group.add(core);

  const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 0.7, 6), energy);
  engine.rotation.x = Math.PI / 2;
  engine.position.set(0, -0.02, -1.1);
  group.add(engine);

  return {
    group,
    emissiveMaterials: [energy],
    core
  };
}

export function createEnemyModel(type) {
  const group = new THREE.Group();
  const baseColor = type === 'gunner' ? '#ff9b45' : type === 'striker' ? '#ff4a4a' : '#ff6d42';
  const hull = new THREE.MeshStandardMaterial({
    color: '#2b1411',
    emissive: '#160604',
    emissiveIntensity: 0.25,
    roughness: 0.45,
    metalness: 0.45,
    flatShading: true
  });
  const glow = createEnergyMaterial(baseColor, { emissiveIntensity: 1 });

  if (type === 'striker') {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.8, 5), hull);
    spike.rotation.x = -Math.PI / 2;
    group.add(spike);
  } else if (type === 'gunner') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.55, 1.1), hull);
    const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.55, 8), glow);
    turret.rotation.x = Math.PI / 2;
    turret.position.z = -0.6;
    group.add(body, turret);
  } else {
    const drone = new THREE.Mesh(new THREE.OctahedronGeometry(0.65, 1), hull);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), glow);
    eye.position.z = -0.45;
    group.add(drone, eye);
  }

  return group;
}

export function createMiniBossModel() {
  const group = new THREE.Group();
  const hull = new THREE.MeshStandardMaterial({
    color: '#301311',
    emissive: '#140404',
    emissiveIntensity: 0.35,
    roughness: 0.38,
    metalness: 0.6,
    flatShading: true
  });
  const glow = createEnergyMaterial('#ff5b35', { emissiveIntensity: 1.3 });

  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.15, 1), glow);
  const left = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.45, 0.9), hull);
  const right = left.clone();
  left.position.x = -1.8;
  right.position.x = 1.8;
  left.rotation.z = -0.18;
  right.rotation.z = 0.18;
  const spine = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.7, 2.8), hull);
  group.add(core, left, right, spine);
  group.scale.setScalar(1.25);
  return group;
}

export function createObstacleModel(kind) {
  if (kind === 'wall') {
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 2.8, 4.2),
      dimensionMaterial('phase', { transparent: true, opacity: 0.48, emissiveIntensity: 0.85 })
    );
    wall.castShadow = true;
    return wall;
  }

  if (kind === 'mine') {
    const mine = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7, 0), dimensionMaterial('phase'));
    mine.castShadow = true;
    return mine;
  }

  const crystal = new THREE.Mesh(new THREE.ConeGeometry(0.75, 2.2, 5), dimensionMaterial('phase'));
  crystal.castShadow = true;
  return crystal;
}

export function createPickupModel(kind) {
  const color = kind === 'ammo' ? '#a46cff' : kind === 'shield' ? '#47a7ff' : '#35d67a';
  const group = new THREE.Group();
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 1), createEnergyMaterial(color, { emissiveIntensity: 1.2 }));
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.62, 0.045, 8, 24),
    createEnergyMaterial(color, { emissiveIntensity: 0.8, transparent: true, opacity: 0.75 })
  );
  ring.rotation.x = Math.PI / 2;
  group.add(core, ring);
  return group;
}
