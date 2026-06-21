import * as THREE from 'three';
import { DIMENSIONS, GAME_CONFIG } from '../core/Constants.js';
import { disposeObject3D } from '../utils/dispose.js';

const DDGI_SHADER_KEY = 'ddgi-probe-texture-v1';
const WHITE = new THREE.Color('#ffffff');

export class DDGIManager {
  constructor(scene) {
    this.scene = scene;
    this.config = GAME_CONFIG.ddgi;
    this.probes = [];
    this.materials = new Set();
    this.debugGroup = new THREE.Group();
    this.debugGroup.name = 'DDGIProbeDebug';
    this.debugGroup.visible = false;
    this.scene.add(this.debugGroup);
    this.texture = this.createTexture();
    this.uniforms = this.createUniforms();
    this.createProbes();
    this.writeProbeTexture();
  }

  createTexture() {
    const total = this.config.resolution.x * this.config.resolution.y * this.config.resolution.z;
    this.textureData = new Uint8Array(total * 4);
    const texture = new THREE.DataTexture(this.textureData, total, 1, THREE.RGBAFormat, THREE.UnsignedByteType);
    texture.name = 'DDGIIrradianceTexture';
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;
    return texture;
  }

  createUniforms() {
    const { bounds, resolution, intensity } = this.config;
    return {
      ddgiIrradianceMap: { value: this.texture },
      ddgiGridMin: { value: new THREE.Vector3(bounds.min.x, bounds.min.y, bounds.min.z) },
      ddgiGridMax: { value: new THREE.Vector3(bounds.max.x, bounds.max.y, bounds.max.z) },
      ddgiGridSize: { value: new THREE.Vector3(resolution.x, resolution.y, resolution.z) },
      ddgiProbeCount: { value: resolution.x * resolution.y * resolution.z },
      ddgiEnabled: { value: 1 },
      ddgiIntensity: { value: intensity }
    };
  }

  createProbes() {
    const { bounds, resolution } = this.config;
    const debugGeometry = new THREE.SphereGeometry(0.075, 8, 6);
    for (let z = 0; z < resolution.z; z += 1) {
      for (let y = 0; y < resolution.y; y += 1) {
        for (let x = 0; x < resolution.x; x += 1) {
          const position = new THREE.Vector3(
            lerpByIndex(bounds.min.x, bounds.max.x, x, resolution.x),
            lerpByIndex(bounds.min.y, bounds.max.y, y, resolution.y),
            lerpByIndex(bounds.min.z, bounds.max.z, z, resolution.z)
          );
          const material = new THREE.MeshBasicMaterial({ color: '#35d6c6', transparent: true, opacity: 0.8 });
          const mesh = new THREE.Mesh(debugGeometry, material);
          mesh.position.copy(position);
          this.debugGroup.add(mesh);
          this.probes.push({
            position,
            color: new THREE.Color('#35d6c6'),
            irradiance: new THREE.Color('#000000'),
            visibility: 0,
            flash: 0,
            mesh
          });
        }
      }
    }
  }

  update(delta, state) {
    this.debugGroup.visible = state.ddgiDebug;
    this.uniforms.ddgiEnabled.value = state.giEnabled ? 1 : 0;
    this.syncSceneMaterials();
    this.updateProbes(delta, state);
    this.writeProbeTexture();
  }

  syncSceneMaterials() {
    this.scene.traverse((object) => {
      if (!object.isMesh) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if (material?.isMeshStandardMaterial) {
          this.patchMaterial(material);
        }
      }
    });
  }

  patchMaterial(material) {
    if (this.materials.has(material)) {
      this.syncMaterialUniforms(material);
      return;
    }

    const previousOnBeforeCompile = material.onBeforeCompile.bind(material);
    const previousCacheKey = material.customProgramCacheKey.bind(material);
    material.onBeforeCompile = (shader) => {
      previousOnBeforeCompile(shader);
      Object.assign(shader.uniforms, this.uniforms);
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
varying vec3 vDDGIWorldPosition;`
        )
        .replace(
          '#include <worldpos_vertex>',
          `#include <worldpos_vertex>
vDDGIWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;`
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
uniform sampler2D ddgiIrradianceMap;
uniform vec3 ddgiGridMin;
uniform vec3 ddgiGridMax;
uniform vec3 ddgiGridSize;
uniform float ddgiProbeCount;
uniform float ddgiEnabled;
uniform float ddgiIntensity;
varying vec3 vDDGIWorldPosition;

vec4 ddgiProbeAt(vec3 cell) {
  vec3 clampedCell = clamp(cell, vec3(0.0), ddgiGridSize - vec3(1.0));
  float index = clampedCell.x + clampedCell.y * ddgiGridSize.x + clampedCell.z * ddgiGridSize.x * ddgiGridSize.y;
  return texture2D(ddgiIrradianceMap, vec2((index + 0.5) / ddgiProbeCount, 0.5));
}

vec3 sampleDDGIIrradiance(vec3 worldPosition) {
  vec3 gridUv = clamp((worldPosition - ddgiGridMin) / max(ddgiGridMax - ddgiGridMin, vec3(0.001)), vec3(0.0), vec3(0.999));
  vec3 probePosition = gridUv * (ddgiGridSize - vec3(1.0));
  vec3 baseCell = floor(probePosition);
  vec3 blend = fract(probePosition);
  vec4 c000 = ddgiProbeAt(baseCell + vec3(0.0, 0.0, 0.0));
  vec4 c100 = ddgiProbeAt(baseCell + vec3(1.0, 0.0, 0.0));
  vec4 c010 = ddgiProbeAt(baseCell + vec3(0.0, 1.0, 0.0));
  vec4 c110 = ddgiProbeAt(baseCell + vec3(1.0, 1.0, 0.0));
  vec4 c001 = ddgiProbeAt(baseCell + vec3(0.0, 0.0, 1.0));
  vec4 c101 = ddgiProbeAt(baseCell + vec3(1.0, 0.0, 1.0));
  vec4 c011 = ddgiProbeAt(baseCell + vec3(0.0, 1.0, 1.0));
  vec4 c111 = ddgiProbeAt(baseCell + vec3(1.0, 1.0, 1.0));
  vec4 x00 = mix(c000, c100, blend.x);
  vec4 x10 = mix(c010, c110, blend.x);
  vec4 x01 = mix(c001, c101, blend.x);
  vec4 x11 = mix(c011, c111, blend.x);
  vec4 y0 = mix(x00, x10, blend.y);
  vec4 y1 = mix(x01, x11, blend.y);
  vec4 irradiance = mix(y0, y1, blend.z);
  return irradiance.rgb * irradiance.a;
}`
        )
        .replace(
          '#include <lights_fragment_begin>',
          `#include <lights_fragment_begin>
vec3 ddgiBounce = sampleDDGIIrradiance(vDDGIWorldPosition);
reflectedLight.indirectDiffuse += diffuseColor.rgb * ddgiBounce * ddgiEnabled * ddgiIntensity;`
        );
      material.userData.ddgiShader = shader;
    };
    material.customProgramCacheKey = () => `${previousCacheKey()}|${DDGI_SHADER_KEY}`;
    material.userData.ddgiPatched = true;
    material.needsUpdate = true;
    this.materials.add(material);
  }

  syncMaterialUniforms(material) {
    const shader = material.userData.ddgiShader;
    if (!shader) return;
    Object.assign(shader.uniforms, this.uniforms);
  }

  updateProbes(delta, state) {
    const dimension = DIMENSIONS[state.dimension];
    const dimensionColor = dimension.color;
    for (let index = 0; index < this.probes.length; index += 1) {
      const probe = this.probes[index];
      probe.flash = Math.max(0, probe.flash - delta * this.config.flashDecay);
      const heightFactor = THREE.MathUtils.clamp((probe.position.y - this.config.bounds.min.y) / 5.2, 0, 1);
      const laneFactor = 1 - THREE.MathUtils.clamp(Math.abs(probe.position.x) / GAME_CONFIG.bounds.x, 0, 1) * 0.35;
      const wave = 0.5 + Math.sin(state.elapsed * 1.35 + index * 0.41) * 0.5;
      const visibility = state.giEnabled
        ? THREE.MathUtils.clamp(0.42 + heightFactor * 0.18 + laneFactor * 0.16, 0, 0.86)
        : 0;
      const baseStrength = state.giEnabled ? (0.24 + wave * 0.08) * laneFactor + probe.flash * 0.62 : 0;
      probe.color.copy(dimensionColor).lerp(WHITE, 0.24 + heightFactor * 0.16);
      probe.irradiance.copy(probe.color).multiplyScalar(baseStrength);
      probe.visibility = visibility;
      probe.mesh.material.color.copy(probe.irradiance).lerp(probe.color, 0.35);
      probe.mesh.material.opacity = state.giEnabled ? 0.34 + visibility * 0.5 : 0.16;
      probe.mesh.scale.setScalar(0.85 + probe.flash * 0.55 + wave * 0.18);
    }
  }

  writeProbeTexture() {
    for (let index = 0; index < this.probes.length; index += 1) {
      const probe = this.probes[index];
      const offset = index * 4;
      this.textureData[offset] = toByte(probe.irradiance.r);
      this.textureData[offset + 1] = toByte(probe.irradiance.g);
      this.textureData[offset + 2] = toByte(probe.irradiance.b);
      this.textureData[offset + 3] = toByte(probe.visibility);
    }
    this.texture.needsUpdate = true;
  }

  sampleAt(position) {
    let color = new THREE.Color('#000000');
    let weight = 0;
    for (const probe of this.probes) {
      const distance = Math.max(0.001, probe.position.distanceTo(position));
      const contribution = probe.visibility / (distance * distance);
      color = color.add(probe.irradiance.clone().multiplyScalar(contribution));
      weight += contribution;
    }
    if (weight > 0) {
      color.multiplyScalar(1 / weight);
    }
    return color;
  }

  flash(position, color) {
    for (const probe of this.probes) {
      const distance = probe.position.distanceTo(position);
      if (distance < this.config.flashRadius) {
        const boost = (1 - distance / this.config.flashRadius) * 0.75;
        probe.flash = Math.max(probe.flash, boost);
        probe.color.copy(color);
      }
    }
  }

  reset() {
    this.debugGroup.visible = false;
    for (const probe of this.probes) {
      probe.flash = 0;
    }
  }

  dispose() {
    this.scene.remove(this.debugGroup);
    disposeObject3D(this.debugGroup);
    this.texture.dispose();
    this.materials.clear();
  }
}

function lerpByIndex(min, max, index, count) {
  if (count <= 1) return (min + max) * 0.5;
  return THREE.MathUtils.lerp(min, max, index / (count - 1));
}

function toByte(value) {
  return Math.round(THREE.MathUtils.clamp(value, 0, 1) * 255);
}
