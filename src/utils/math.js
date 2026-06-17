import * as THREE from 'three';
import { GAME_CONFIG } from '../core/Constants.js';

export function clampToBounds(position) {
  position.x = THREE.MathUtils.clamp(position.x, -GAME_CONFIG.bounds.x, GAME_CONFIG.bounds.x);
  position.z = THREE.MathUtils.clamp(position.z, GAME_CONFIG.bounds.zMin, GAME_CONFIG.bounds.zMax);
}

export function randomLane(width = GAME_CONFIG.bounds.x - 1) {
  return THREE.MathUtils.randFloatSpread(width * 2);
}

export function sphereHit(aPosition, aRadius, bPosition, bRadius) {
  return aPosition.distanceToSquared(bPosition) <= (aRadius + bRadius) ** 2;
}
