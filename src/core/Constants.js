import * as THREE from 'three';

export const DIMENSIONS = {
  stability: {
    id: 'stability',
    key: '1',
    label: '안정',
    shortLabel: 'STABILITY',
    color: new THREE.Color('#35d6c6'),
    darkColor: new THREE.Color('#0a1d25'),
    fogColor: new THREE.Color('#0b3a43'),
    accent: '#35d6c6',
    scoreRate: 2,
    spawnRate: 0.45,
    obstacleRate: 0.25
  },
  combat: {
    id: 'combat',
    key: '2',
    label: '전투',
    shortLabel: 'COMBAT',
    color: new THREE.Color('#ff5b35'),
    darkColor: new THREE.Color('#2f120d'),
    fogColor: new THREE.Color('#43180f'),
    accent: '#ff5b35',
    scoreRate: 5,
    spawnRate: 1.35,
    obstacleRate: 0.35
  },
  phase: {
    id: 'phase',
    key: '3',
    label: '위상',
    shortLabel: 'PHASE',
    color: new THREE.Color('#a46cff'),
    darkColor: new THREE.Color('#20123c'),
    fogColor: new THREE.Color('#301956'),
    accent: '#a46cff',
    scoreRate: 3,
    spawnRate: 0.65,
    obstacleRate: 1.2
  }
};

export const DIMENSION_ORDER = ['stability', 'combat', 'phase'];

export const GAME_CONFIG = {
  bounds: {
    x: 12,
    zMin: -10.5,
    zMax: -1.8
  },
  world: {
    scrollSpeed: 5.6
  },
  player: {
    speed: 12,
    radius: 0.9,
    maxHp: 100,
    maxShield: 80,
    maxAmmo: 40,
    startAmmo: 24,
    fireCooldown: 0.16
  },
  dimension: {
    maxStacks: 3,
    rechargeSeconds: 5,
    stabilityGraceSeconds: 7,
    stabilityPenaltyRate: 8
  },
  projectile: {
    speed: 26,
    radius: 0.16,
    ttl: 2.2,
    damage: 24
  },
  enemy: {
    zSpawn: 18,
    zDespawn: -14,
    maxCount: 18
  },
  obstacle: {
    zSpawn: 18,
    zDespawn: -14,
    maxCount: 16
  },
  pickup: {
    zSpawn: 16,
    zDespawn: -14,
    maxCount: 8
  },
  ddgi: {
    resolution: { x: 9, y: 4, z: 11 },
    bounds: {
      min: { x: -12, y: -1.1, z: -12 },
      max: { x: 12, y: 4.2, z: 18 }
    },
    intensity: 1.35,
    flashRadius: 6.4,
    flashDecay: 2.8
  }
};
