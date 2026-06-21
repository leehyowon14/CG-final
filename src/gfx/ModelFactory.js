import * as THREE from 'three';
import {
  createCanopyMaterial,
  createDarkHullMaterial,
  createEnergyMaterial,
  createHullMaterial,
  createShieldMaterial,
  dimensionMaterial
} from './Materials.js';

export function createPlayerModel() {
  const group = new THREE.Group();
  const fighter = new THREE.Group();
  const effects = new THREE.Group();
  group.add(fighter, effects);

  const hull = createHullMaterial();
  const darkHull = createDarkHullMaterial();
  const canopyMaterial = createCanopyMaterial();
  const energy = createEnergyMaterial('#35d6c6', { emissiveIntensity: 1.1 });
  const engineGlow = createEnergyMaterial('#7fe7ff', { emissiveIntensity: 1.8, transparent: true, opacity: 0.86 });
  const shieldMaterial = createShieldMaterial();
  const panelMaterial = createDarkHullMaterial();
  const warmLight = createEnergyMaterial('#8deeff', { emissiveIntensity: 0.95, roughness: 0.18, metalness: 0.05 });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.45, 8, 20), hull);
  body.rotation.x = Math.PI / 2;
  body.scale.set(0.95, 0.82, 1.08);
  body.castShadow = true;
  fighter.add(body);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.78, 28), hull);
  nose.rotation.x = Math.PI / 2;
  nose.position.z = 1.08;
  nose.castShadow = true;
  fighter.add(nose);

  const belly = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.16, 1.55), darkHull);
  belly.position.set(0, -0.22, -0.18);
  fighter.add(belly);

  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.34, 24, 12), canopyMaterial);
  canopy.scale.set(0.72, 0.34, 1.05);
  canopy.position.set(0, 0.25, 0.35);
  fighter.add(canopy);
  fighter.add(createCanopyFrame(panelMaterial));

  const leftWing = createPlayerWing(-1, hull);
  const rightWing = createPlayerWing(1, hull);
  fighter.add(leftWing, rightWing);
  fighter.add(createWingDetails(-1, panelMaterial), createWingDetails(1, panelMaterial));

  const leftStabilizer = createPlayerStabilizer(-1, darkHull);
  const rightStabilizer = createPlayerStabilizer(1, darkHull);
  fighter.add(leftStabilizer, rightStabilizer);

  for (const x of [-0.32, 0.32]) {
    const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.66, 24), darkHull);
    engine.rotation.x = Math.PI / 2;
    engine.position.set(x, -0.04, -1.1);
    engine.castShadow = true;
    fighter.add(engine);

    const nozzle = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.035, 8, 24), panelMaterial);
    nozzle.position.set(x, -0.04, -1.45);
    fighter.add(nozzle);

    const plume = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.72, 24), engineGlow);
    plume.rotation.x = -Math.PI / 2;
    plume.position.set(x, -0.04, -1.55);
    effects.add(plume);
  }

  fighter.add(createFuselagePanels(panelMaterial), createNoseSensor(warmLight));

  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.34, 1), energy);
  core.position.set(0, 0.08, -0.48);
  core.scale.set(0.62, 0.62, 0.62);
  effects.add(core);

  const shield = new THREE.Mesh(new THREE.SphereGeometry(1.48, 48, 24), shieldMaterial);
  shield.name = 'PlayerShieldBubble';
  shield.position.set(0, 0.02, -0.08);
  shield.renderOrder = 12;
  shield.visible = false;
  effects.add(shield);

  return {
    group,
    emissiveMaterials: [energy, engineGlow],
    core,
    shield
  };
}

function createPlayerWing(side, material) {
  const geometry = new THREE.BufferGeometry();
  const vertices = new Float32Array([
    0.16 * side, -0.03, 0.24,
    1.9 * side, -0.08, -0.48,
    0.42 * side, -0.06, -1.06,
    0.16 * side, 0.035, 0.24,
    1.9 * side, -0.03, -0.48,
    0.42 * side, 0.02, -1.06
  ]);
  const indices = [0, 1, 2, 3, 5, 4, 0, 3, 4, 0, 4, 1, 1, 4, 5, 1, 5, 2, 2, 5, 3, 2, 3, 0];
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const wing = new THREE.Mesh(geometry, material);
  wing.castShadow = true;
  return wing;
}

function createWingDetails(side, material) {
  const group = new THREE.Group();

  const leadingEdge = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.035, 0.055), material);
  leadingEdge.position.set(0.88 * side, 0.035, -0.25);
  leadingEdge.rotation.y = -side * 0.4;
  group.add(leadingEdge);

  const rearFlap = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.03, 0.08), material);
  rearFlap.position.set(0.82 * side, 0.03, -0.82);
  rearFlap.rotation.y = side * 0.1;
  group.add(rearFlap);

  const wingLight = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 12, 8),
    createEnergyMaterial(side < 0 ? '#ff4058' : '#55ff9b', { emissiveIntensity: 1.65, roughness: 0.2, metalness: 0 })
  );
  wingLight.position.set(1.72 * side, 0.02, -0.48);
  group.add(wingLight);

  return group;
}

function createCanopyFrame(material) {
  const group = new THREE.Group();
  const center = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.035, 0.66), material);
  center.position.set(0, 0.37, 0.38);
  group.add(center);

  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.035, 0.58), material);
    rail.position.set(0.19 * side, 0.33, 0.34);
    rail.rotation.z = side * 0.12;
    group.add(rail);
  }

  return group;
}

function createFuselagePanels(material) {
  const group = new THREE.Group();
  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.028, 1.48), material);
  spine.position.set(0, 0.38, -0.18);
  group.add(spine);

  for (const z of [0.72, 0.18, -0.38, -0.88]) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.024, 0.035), material);
    band.position.set(0, 0.34, z);
    group.add(band);
  }

  for (const side of [-1, 1]) {
    const intake = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 0.62), material);
    intake.position.set(0.48 * side, -0.05, -0.42);
    intake.rotation.z = -side * 0.08;
    group.add(intake);
  }

  return group;
}

function createNoseSensor(material) {
  const sensor = new THREE.Mesh(new THREE.SphereGeometry(0.038, 16, 8), material);
  sensor.position.set(0, 0.06, 1.42);
  return sensor;
}

function createPlayerStabilizer(side, material) {
  const stabilizer = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.42, 0.72), material);
  stabilizer.position.set(0.48 * side, 0.08, -1.04);
  stabilizer.rotation.z = side * 0.42;
  stabilizer.rotation.y = side * 0.16;
  stabilizer.castShadow = true;
  return stabilizer;
}

export function createEnemyModel(type) {
  const group = new THREE.Group();
  const baseColor = type === 'gunner' ? '#ff9b45' : type === 'striker' ? '#ff4a4a' : '#ff6d42';
  const hull = new THREE.MeshStandardMaterial({
    color: '#5d241b',
    emissive: '#3b120c',
    emissiveIntensity: 0.28,
    roughness: 0.52,
    metalness: 0.28,
    flatShading: true
  });
  const glow = createEnergyMaterial(baseColor, { emissiveIntensity: 1.1, roughness: 0.45, metalness: 0.12 });

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
    color: '#55211a',
    emissive: '#3d100b',
    emissiveIntensity: 0.34,
    roughness: 0.56,
    metalness: 0.32,
    flatShading: true
  });
  const glow = createEnergyMaterial('#ff5b35', { emissiveIntensity: 1.35, roughness: 0.42, metalness: 0.12 });

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
      dimensionMaterial('phase', { transparent: true, opacity: 0.72, emissiveIntensity: 0.35, roughness: 0.68, metalness: 0.08 })
    );
    wall.castShadow = true;
    return wall;
  }

  if (kind === 'mine') {
    const mine = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7, 0), dimensionMaterial('phase', { emissiveIntensity: 0.45, roughness: 0.62, metalness: 0.12 }));
    mine.castShadow = true;
    return mine;
  }

  const crystal = new THREE.Mesh(new THREE.ConeGeometry(0.75, 2.2, 5), dimensionMaterial('phase', { emissiveIntensity: 0.5, roughness: 0.58, metalness: 0.1 }));
  crystal.castShadow = true;
  return crystal;
}

export function createPickupModel(kind) {
  const color = '#35f27a';
  const group = new THREE.Group();
  group.name = 'CollectiblePickup';
  group.userData.kind = kind;
  group.userData.collectible = true;

  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.46, 1), createEnergyMaterial(color, { emissiveIntensity: 3.1, roughness: 0.22, metalness: 0.12 }));
  core.name = 'PickupGreenCore';
  const glowMaterial = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false
  });
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.72, 0.055, 8, 28),
    glowMaterial
  );
  ring.name = 'PickupGreenRing';
  const verticalRing = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.035, 8, 28), glowMaterial.clone());
  verticalRing.name = 'PickupGreenVerticalRing';
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(1.05, 24, 12),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false
    })
  );
  halo.name = 'PickupGreenHalo';
  ring.rotation.x = Math.PI / 2;
  verticalRing.rotation.y = Math.PI / 2;
  group.add(halo, core, ring, verticalRing);
  return group;
}
