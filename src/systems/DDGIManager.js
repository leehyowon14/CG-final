import * as THREE from 'three';
import { DIMENSIONS, GAME_CONFIG } from '../core/Constants.js';
import { disposeObject3D } from '../utils/dispose.js';

const DDGI_SHADER_KEY = 'ddgi-probe-texture-v2-l1-sh';
const WHITE = new THREE.Color('#ffffff');
const MAX_DIRECTED_CONTRIBUTORS = 4;
const SH_COEFFICIENT_COUNT = 4;
const TRACE_BUDGET_PER_FRAME = 132;
const TEMPORAL_BLEND = 0.28;
const DEBUG_COLOR_BLEND = 0.14;
const DIFFUSION_SELF_WEIGHT = 0.82;
const DIFFUSION_NEIGHBOR_WEIGHT = 0.18;
const BASE_IRRADIANCE_SCALE = 0.1;
const SH_AMBIENT_WEIGHT = 0.55;
const SH_DIRECTIONAL_WEIGHT = 0.45;
const BLOCKER_EPSILON = 0.05;
const AUTO_CONTRIBUTOR_RADIUS = 7.2;
const AUTO_CONTRIBUTOR_INTENSITY = 1.65;
const UP_NORMAL = new THREE.Vector3(0, 1, 0);

export class DDGIManager {
  constructor(scene) {
    this.scene = scene;
    this.config = GAME_CONFIG.ddgi;
    this.probes = [];
    this.materials = new Set();
    this.raycaster = new THREE.Raycaster();
    this.traceCursor = 0;
    this.probeWorldPosition = new THREE.Vector3();
    this.contributorWorldPosition = new THREE.Vector3();
    this.rayDirection = new THREE.Vector3();
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
    const width = total * SH_COEFFICIENT_COUNT;
    this.textureData = new Uint8Array(width * 4);
    const texture = new THREE.DataTexture(this.textureData, width, 1, THREE.RGBAFormat, THREE.UnsignedByteType);
    texture.name = 'DDGIL1SHTexture';
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
            gridIndex: { x, y, z },
            color: new THREE.Color('#35d6c6'),
            irradiance: new THREE.Color('#000000'),
            targetIrradiance: new THREE.Color('#000000'),
            nextIrradiance: new THREE.Color('#000000'),
            injectedIrradiance: new THREE.Color('#000000'),
            contributionColor: new THREE.Color('#000000'),
            debugColor: new THREE.Color('#35d6c6'),
            shCoefficients: createSHCoefficients(),
            targetSHCoefficients: createSHCoefficients(),
            nextSHCoefficients: createSHCoefficients(),
            injectedSHCoefficients: createSHCoefficients(),
            visibility: 0,
            flash: 0,
            wave: 0,
            mesh
          });
        }
      }
    }
  }

  update(delta, state, options = {}) {
    this.debugGroup.visible = state.ddgiDebug;
    this.uniforms.ddgiEnabled.value = state.giEnabled ? 1 : 0;
    this.syncSceneMaterials();
    const contributors = state.giEnabled ? this.collectContributors() : [];
    const blockers = state.giEnabled ? this.collectBlockers() : [];
    this.updateProbes(delta, state, contributors, blockers, options);
    if (state.giEnabled) {
      this.diffuseProbes();
    }
    this.updateDebugMeshes(state);
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
varying vec3 vDDGIWorldPosition;
varying vec3 vDDGIWorldNormal;`
        )
        .replace(
          '#include <worldpos_vertex>',
          `#include <worldpos_vertex>
vDDGIWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
vDDGIWorldNormal = normalize(mat3(modelMatrix) * normal);`
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
varying vec3 vDDGIWorldNormal;

vec4 ddgiProbeCoeffAt(vec3 cell, float coeffIndex) {
  vec3 clampedCell = clamp(cell, vec3(0.0), ddgiGridSize - vec3(1.0));
  float probeIndex = clampedCell.x + clampedCell.y * ddgiGridSize.x + clampedCell.z * ddgiGridSize.x * ddgiGridSize.y;
  float texelIndex = probeIndex * 4.0 + coeffIndex;
  return texture2D(ddgiIrradianceMap, vec2((texelIndex + 0.5) / (ddgiProbeCount * 4.0), 0.5));
}

vec3 ddgiDecodeSHCoeff(vec4 packedCoeff, float coeffIndex) {
  if (coeffIndex < 0.5) {
    return packedCoeff.rgb;
  }
  return packedCoeff.rgb * 2.0 - 1.0;
}

vec4 sampleDDGICoeff(vec3 baseCell, vec3 blend, float coeffIndex) {
  vec4 c000 = ddgiProbeCoeffAt(baseCell + vec3(0.0, 0.0, 0.0), coeffIndex);
  vec4 c100 = ddgiProbeCoeffAt(baseCell + vec3(1.0, 0.0, 0.0), coeffIndex);
  vec4 c010 = ddgiProbeCoeffAt(baseCell + vec3(0.0, 1.0, 0.0), coeffIndex);
  vec4 c110 = ddgiProbeCoeffAt(baseCell + vec3(1.0, 1.0, 0.0), coeffIndex);
  vec4 c001 = ddgiProbeCoeffAt(baseCell + vec3(0.0, 0.0, 1.0), coeffIndex);
  vec4 c101 = ddgiProbeCoeffAt(baseCell + vec3(1.0, 0.0, 1.0), coeffIndex);
  vec4 c011 = ddgiProbeCoeffAt(baseCell + vec3(0.0, 1.0, 1.0), coeffIndex);
  vec4 c111 = ddgiProbeCoeffAt(baseCell + vec3(1.0, 1.0, 1.0), coeffIndex);
  vec4 x00 = mix(c000, c100, blend.x);
  vec4 x10 = mix(c010, c110, blend.x);
  vec4 x01 = mix(c001, c101, blend.x);
  vec4 x11 = mix(c011, c111, blend.x);
  vec4 y0 = mix(x00, x10, blend.y);
  vec4 y1 = mix(x01, x11, blend.y);
  return mix(y0, y1, blend.z);
}

vec3 sampleDDGIIrradiance(vec3 worldPosition, vec3 worldNormal) {
  vec3 gridUv = clamp((worldPosition - ddgiGridMin) / max(ddgiGridMax - ddgiGridMin, vec3(0.001)), vec3(0.0), vec3(0.999));
  vec3 probePosition = gridUv * (ddgiGridSize - vec3(1.0));
  vec3 baseCell = floor(probePosition);
  vec3 blend = fract(probePosition);
  vec4 packedL0 = sampleDDGICoeff(baseCell, blend, 0.0);
  vec3 l0 = ddgiDecodeSHCoeff(packedL0, 0.0);
  vec3 lx = ddgiDecodeSHCoeff(sampleDDGICoeff(baseCell, blend, 1.0), 1.0);
  vec3 ly = ddgiDecodeSHCoeff(sampleDDGICoeff(baseCell, blend, 2.0), 2.0);
  vec3 lz = ddgiDecodeSHCoeff(sampleDDGICoeff(baseCell, blend, 3.0), 3.0);
  vec3 n = normalize(worldNormal);
  vec3 irradiance = max(l0 + lx * n.x + ly * n.y + lz * n.z, vec3(0.0));
  return irradiance * packedL0.a;
}`
        )
        .replace(
          '#include <lights_fragment_begin>',
          `#include <lights_fragment_begin>
vec3 ddgiBounce = sampleDDGIIrradiance(vDDGIWorldPosition, vDDGIWorldNormal);
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

  collectContributors() {
    const contributors = [];
    this.scene.updateMatrixWorld(true);
    this.scene.traverse((object) => {
      if (!object.isMesh || !isVisibleInHierarchy(object)) return;
      if (isDescendantOf(object, this.debugGroup)) return;
      if (isIgnoredContributor(object)) return;
      const source = object.userData.ddgiContributor ?? getAutomaticContributor(object);
      if (!source) return;

      object.getWorldPosition(this.contributorWorldPosition);
      contributors.push({
        object,
        root: getSceneRoot(object, this.scene),
        position: this.contributorWorldPosition.clone(),
        color: getContributorColor(object, source),
        intensity: source.intensity ?? 1,
        radius: source.radius ?? this.config.flashRadius
      });
    });
    return contributors;
  }

  collectBlockers() {
    const blockers = [];
    this.scene.traverse((object) => {
      if (!object.isMesh || !isVisibleInHierarchy(object)) return;
      if (isDescendantOf(object, this.debugGroup)) return;
      if (!isBlockerMaterial(object.material)) return;
      blockers.push(object);
    });
    return blockers;
  }

  updateProbes(delta, state, contributors = [], blockers = [], options = {}) {
    const dimension = DIMENSIONS[state.dimension];
    const dimensionColor = dimension.color;
    const tracedIndices = this.getTracedProbeIndices(options.forceTraceAll);
    for (let index = 0; index < this.probes.length; index += 1) {
      const probe = this.probes[index];
      probe.flash = Math.max(0, probe.flash - delta * this.config.flashDecay);
      if (!state.giEnabled) {
        probe.color.copy(dimensionColor).lerp(WHITE, 0.24);
        probe.targetIrradiance.setRGB(0, 0, 0);
        probe.irradiance.setRGB(0, 0, 0);
        probe.nextIrradiance.setRGB(0, 0, 0);
        probe.injectedIrradiance.setRGB(0, 0, 0);
        probe.contributionColor.setRGB(0, 0, 0);
        clearSH(probe.targetSHCoefficients);
        clearSH(probe.shCoefficients);
        clearSH(probe.nextSHCoefficients);
        clearSH(probe.injectedSHCoefficients);
        probe.visibility = 0;
        probe.wave = 0;
        continue;
      }

      const heightFactor = THREE.MathUtils.clamp((probe.position.y - this.config.bounds.min.y) / 5.2, 0, 1);
      const laneFactor = 1 - THREE.MathUtils.clamp(Math.abs(probe.position.x) / GAME_CONFIG.bounds.x, 0, 1) * 0.35;
      probe.wave = 0;
      const visibility = THREE.MathUtils.clamp(0.42 + heightFactor * 0.18 + laneFactor * 0.16, 0, 0.86);
      const baseStrength = (0.28 * laneFactor + probe.flash * 0.62) * BASE_IRRADIANCE_SCALE;
      probe.color.copy(dimensionColor).lerp(WHITE, 0.24 + heightFactor * 0.16);
      clearSH(probe.targetSHCoefficients);
      addAmbientSH(probe.targetSHCoefficients, probe.color.clone().multiplyScalar(baseStrength));
      if (tracedIndices.has(index)) {
        const injection = this.traceContributorIrradiance(probe, contributors, blockers);
        lerpSH(probe.injectedSHCoefficients, injection.shCoefficients, 0.42);
        probe.injectedIrradiance.copy(evaluateSH(probe.injectedSHCoefficients, UP_NORMAL));
        probe.contributionColor.copy(probe.injectedIrradiance);
        probe.visibility = THREE.MathUtils.clamp(visibility + injection.visibilityBoost, 0, 1);
      } else {
        probe.visibility = visibility;
      }
      addSH(probe.targetSHCoefficients, probe.injectedSHCoefficients);
      probe.targetIrradiance.copy(evaluateSH(probe.targetSHCoefficients, UP_NORMAL));
      lerpSH(probe.shCoefficients, probe.targetSHCoefficients, TEMPORAL_BLEND);
      probe.irradiance.copy(evaluateSH(probe.shCoefficients, UP_NORMAL));
    }
  }

  getTracedProbeIndices(forceTraceAll = false) {
    const indices = new Set();
    if (forceTraceAll || this.probes.length <= TRACE_BUDGET_PER_FRAME) {
      for (let index = 0; index < this.probes.length; index += 1) {
        indices.add(index);
      }
      return indices;
    }

    for (let step = 0; step < TRACE_BUDGET_PER_FRAME; step += 1) {
      indices.add((this.traceCursor + step) % this.probes.length);
    }
    this.traceCursor = (this.traceCursor + TRACE_BUDGET_PER_FRAME) % this.probes.length;
    return indices;
  }

  traceContributorIrradiance(probe, contributors, blockers) {
    const selected = this.selectContributors(probe, contributors);
    const shCoefficients = createSHCoefficients();
    const color = new THREE.Color('#000000');
    let visibilityBoost = 0;

    for (const contributor of selected) {
      const distance = probe.position.distanceTo(contributor.position);
      if (distance <= 0.001 || this.isContributorBlocked(probe, contributor, blockers)) continue;
      const falloff = Math.pow(THREE.MathUtils.clamp(1 - distance / contributor.radius, 0, 1), 2);
      const strength = falloff * contributor.intensity;
      const contribution = contributor.color.clone().multiplyScalar(strength);
      this.rayDirection.copy(contributor.position).sub(probe.position).normalize();
      addDirectionalSH(shCoefficients, contribution, this.rayDirection);
      color.add(contribution);
      visibilityBoost += strength * 0.18;
    }

    return { color, shCoefficients, visibilityBoost };
  }

  selectContributors(probe, contributors) {
    return contributors
      .map((contributor) => {
        const distance = probe.position.distanceTo(contributor.position);
        const falloff = Math.pow(THREE.MathUtils.clamp(1 - distance / contributor.radius, 0, 1), 2);
        return { contributor, score: falloff * contributor.intensity };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score || a.contributor.object.id - b.contributor.object.id)
      .slice(0, MAX_DIRECTED_CONTRIBUTORS)
      .map(({ contributor }) => contributor);
  }

  isContributorBlocked(probe, contributor, blockers) {
    this.probeWorldPosition.copy(probe.position);
    this.rayDirection.copy(contributor.position).sub(this.probeWorldPosition);
    const targetDistance = this.rayDirection.length();
    if (targetDistance <= BLOCKER_EPSILON) return false;

    this.rayDirection.normalize();
    this.raycaster.set(this.probeWorldPosition, this.rayDirection);
    this.raycaster.near = BLOCKER_EPSILON;
    this.raycaster.far = Math.max(BLOCKER_EPSILON, targetDistance - BLOCKER_EPSILON);
    const hits = this.raycaster.intersectObjects(blockers, false);
    return hits.some((hit) => !isDescendantOf(hit.object, contributor.object) && getSceneRoot(hit.object, this.scene) !== contributor.root);
  }

  diffuseProbes() {
    for (const probe of this.probes) {
      const neighbors = this.getNeighborProbes(probe);
      if (neighbors.length === 0) {
        copySH(probe.nextSHCoefficients, probe.shCoefficients);
        continue;
      }
      for (let coeffIndex = 0; coeffIndex < SH_COEFFICIENT_COUNT; coeffIndex += 1) {
        const neighborAverage = new THREE.Color('#000000');
        for (const neighbor of neighbors) {
          neighborAverage.add(neighbor.shCoefficients[coeffIndex]);
        }
        neighborAverage.multiplyScalar(1 / neighbors.length);
        probe.nextSHCoefficients[coeffIndex].copy(probe.shCoefficients[coeffIndex]).multiplyScalar(DIFFUSION_SELF_WEIGHT);
        probe.nextSHCoefficients[coeffIndex].add(neighborAverage.multiplyScalar(DIFFUSION_NEIGHBOR_WEIGHT));
      }
    }

    for (const probe of this.probes) {
      copySH(probe.shCoefficients, probe.nextSHCoefficients);
      probe.irradiance.copy(evaluateSH(probe.shCoefficients, UP_NORMAL));
    }
  }

  getNeighborProbes(probe) {
    const { x, y, z } = probe.gridIndex;
    return [
      this.probeAt(x - 1, y, z),
      this.probeAt(x + 1, y, z),
      this.probeAt(x, y - 1, z),
      this.probeAt(x, y + 1, z),
      this.probeAt(x, y, z - 1),
      this.probeAt(x, y, z + 1)
    ].filter(Boolean);
  }

  probeAt(x, y, z) {
    const { resolution } = this.config;
    if (x < 0 || x >= resolution.x || y < 0 || y >= resolution.y || z < 0 || z >= resolution.z) {
      return null;
    }
    return this.probes[x + y * resolution.x + z * resolution.x * resolution.y];
  }

  updateDebugMeshes(state) {
    for (const probe of this.probes) {
      const targetDebugColor = colorEnergy(probe.contributionColor) > 0.0001 ? normalizedColor(probe.contributionColor) : probe.irradiance.clone();
      if (!state.giEnabled) {
        probe.debugColor.setRGB(0, 0, 0);
      } else {
        probe.debugColor.lerp(targetDebugColor, DEBUG_COLOR_BLEND);
      }
      probe.mesh.material.color.copy(probe.debugColor);
      probe.mesh.material.opacity = state.giEnabled ? 0.34 + probe.visibility * 0.5 : 0.16;
      probe.mesh.scale.setScalar(0.92 + probe.flash * 0.55);
    }
  }

  writeProbeTexture() {
    for (let index = 0; index < this.probes.length; index += 1) {
      const probe = this.probes[index];
      for (let coeffIndex = 0; coeffIndex < SH_COEFFICIENT_COUNT; coeffIndex += 1) {
        const coeff = probe.shCoefficients[coeffIndex];
        const offset = (index * SH_COEFFICIENT_COUNT + coeffIndex) * 4;
        if (probe.visibility <= 0 && isSHBlack(probe.shCoefficients)) {
          this.textureData[offset] = 0;
          this.textureData[offset + 1] = 0;
          this.textureData[offset + 2] = 0;
          this.textureData[offset + 3] = 0;
          continue;
        }
        const pack = coeffIndex === 0 ? toByte : toSignedByte;
        this.textureData[offset] = pack(coeff.r);
        this.textureData[offset + 1] = pack(coeff.g);
        this.textureData[offset + 2] = pack(coeff.b);
        this.textureData[offset + 3] = toByte(probe.visibility);
      }
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

function toSignedByte(value) {
  return toByte(value * 0.5 + 0.5);
}

function createSHCoefficients() {
  return Array.from({ length: SH_COEFFICIENT_COUNT }, () => new THREE.Color('#000000'));
}

function clearSH(coefficients) {
  for (const coeff of coefficients) {
    coeff.setRGB(0, 0, 0);
  }
}

function copySH(target, source) {
  for (let index = 0; index < SH_COEFFICIENT_COUNT; index += 1) {
    target[index].copy(source[index]);
  }
}

function addSH(target, source) {
  for (let index = 0; index < SH_COEFFICIENT_COUNT; index += 1) {
    target[index].add(source[index]);
  }
}

function lerpSH(target, source, alpha) {
  for (let index = 0; index < SH_COEFFICIENT_COUNT; index += 1) {
    target[index].lerp(source[index], alpha);
  }
}

function addAmbientSH(coefficients, color) {
  coefficients[0].add(color);
}

function addDirectionalSH(coefficients, color, direction) {
  coefficients[0].add(color.clone().multiplyScalar(SH_AMBIENT_WEIGHT));
  coefficients[1].add(color.clone().multiplyScalar(direction.x * SH_DIRECTIONAL_WEIGHT));
  coefficients[2].add(color.clone().multiplyScalar(direction.y * SH_DIRECTIONAL_WEIGHT));
  coefficients[3].add(color.clone().multiplyScalar(direction.z * SH_DIRECTIONAL_WEIGHT));
}

function evaluateSH(coefficients, normal) {
  return new THREE.Color(
    Math.max(0, coefficients[0].r + coefficients[1].r * normal.x + coefficients[2].r * normal.y + coefficients[3].r * normal.z),
    Math.max(0, coefficients[0].g + coefficients[1].g * normal.x + coefficients[2].g * normal.y + coefficients[3].g * normal.z),
    Math.max(0, coefficients[0].b + coefficients[1].b * normal.x + coefficients[2].b * normal.y + coefficients[3].b * normal.z)
  );
}

function isSHBlack(coefficients) {
  return coefficients.every((coeff) => colorEnergy(coeff) <= 0.000001);
}

function colorEnergy(color) {
  return color.r * color.r + color.g * color.g + color.b * color.b;
}

function normalizedColor(color) {
  const maxChannel = Math.max(color.r, color.g, color.b, 0.001);
  return color.clone().multiplyScalar(1 / maxChannel);
}

function getContributorColor(object, source) {
  if (source.color instanceof THREE.Color) {
    return source.color.clone();
  }
  if (typeof source.color === 'string' || typeof source.color === 'number') {
    return new THREE.Color(source.color);
  }

  const material = getFirstMaterial(object.material);
  return material?.color?.clone?.() ?? WHITE.clone();
}

function getAutomaticContributor(object) {
  const material = getFirstMaterial(object.material);
  if (isUiLikeObject(object)) return null;
  if (!material?.color || !isVisibleMaterial(material)) return null;
  const emissiveBoost = material.emissive ? material.emissive.r + material.emissive.g + material.emissive.b : 0;
  return {
    intensity: AUTO_CONTRIBUTOR_INTENSITY + Math.min(0.45, emissiveBoost * 0.08 + (material.emissiveIntensity ?? 0) * 0.12),
    radius: AUTO_CONTRIBUTOR_RADIUS
  };
}

function isBlockerMaterial(material) {
  const materials = Array.isArray(material) ? material : [material];
  return materials.some((entry) => isVisibleMaterial(entry));
}

function isVisibleMaterial(material) {
  if (!material || material.visible === false) return false;
  if (material.transparent && material.opacity < 0.25) return false;
  return true;
}

function getFirstMaterial(material) {
  if (Array.isArray(material)) {
    return material[0] ?? null;
  }
  return material ?? null;
}

function isVisibleInHierarchy(object) {
  let current = object;
  while (current) {
    if (!current.visible) return false;
    current = current.parent;
  }
  return true;
}

function isDescendantOf(object, ancestor) {
  let current = object;
  while (current) {
    if (current === ancestor) return true;
    current = current.parent;
  }
  return false;
}

function getSceneRoot(object, scene) {
  let current = object;
  let root = object;
  while (current?.parent && current.parent !== scene) {
    current = current.parent;
    root = current;
  }
  return root;
}

function isUiLikeObject(object) {
  let current = object;
  while (current) {
    if (current.name?.includes('HealthBar')) return true;
    current = current.parent;
  }
  return false;
}

function isIgnoredContributor(object) {
  let current = object;
  while (current) {
    if (current.userData?.ddgiIgnore || current.name === 'PlayerShip') return true;
    current = current.parent;
  }
  return false;
}
