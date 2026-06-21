import * as THREE from 'three';
import { disposeObject3D } from '../utils/dispose.js';

const FADE_DURATION = 0.34;

export class FadeOutSystem {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
  }

  add(object, duration = FADE_DURATION) {
    const materials = collectFadeMaterials(object);
    if (materials.length === 0 || duration <= 0) {
      this.scene.remove(object);
      disposeObject3D(object);
      return;
    }

    this.items.push({
      object,
      materials,
      elapsed: 0,
      duration
    });
  }

  update(delta) {
    for (let i = this.items.length - 1; i >= 0; i -= 1) {
      const item = this.items[i];
      item.elapsed = Math.min(item.duration, item.elapsed + delta);
      const t = item.elapsed / item.duration;
      const alpha = 1 - smootherStep(t);

      for (const entry of item.materials) {
        entry.material.opacity = entry.baseOpacity * alpha;
      }

      if (item.elapsed >= item.duration) {
        this.removeAt(i);
      }
    }
  }

  reset() {
    for (let i = this.items.length - 1; i >= 0; i -= 1) {
      this.removeAt(i);
    }
  }

  removeAt(index) {
    const [item] = this.items.splice(index, 1);
    this.scene.remove(item.object);
    disposeObject3D(item.object);
  }
}

function collectFadeMaterials(object) {
  const materials = [];
  const seen = new Set();
  object.traverse((child) => {
    if (!child.material) return;
    const childMaterials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of childMaterials) {
      if (seen.has(material)) continue;
      seen.add(material);
      materials.push({
        material,
        baseOpacity: material.opacity ?? 1
      });
      material.transparent = true;
      material.depthWrite = false;
    }
  });
  return materials;
}

function smootherStep(t) {
  const progress = THREE.MathUtils.clamp(t, 0, 1);
  return progress * progress * progress * (progress * (progress * 6 - 15) + 10);
}
