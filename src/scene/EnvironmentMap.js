import * as THREE from 'three';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import { DIMENSIONS } from '../core/Constants.js';

const ENV_HDR_PATH = '/CG-final-game/assets/env/HDR_blue_local_star_and_nebulae.hdr';

const FILTER_STRENGTH = {
  stability: 0.14,
  combat: 0.2,
  phase: 0.24
};

export class EnvironmentMap {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;
    this.pmremGenerator = new THREE.PMREMGenerator(renderer);
    this.environmentTexture = null;
    this.sourceTexture = null;
    this.sky = null;
    this.tint = new THREE.Color('#ffffff');
    this.load();
  }

  async load() {
    const texture = await new HDRLoader().loadAsync(ENV_HDR_PATH);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.LinearSRGBColorSpace;
    this.sourceTexture = texture;

    const pmrem = this.pmremGenerator.fromEquirectangular(texture);
    this.environmentTexture = pmrem.texture;
    this.scene.environment = this.environmentTexture;
    this.scene.environmentIntensity = 0.82;

    this.sky = this.createSky(texture);
    this.scene.add(this.sky);
  }

  createSky(texture) {
    const geometry = new THREE.SphereGeometry(80, 64, 32);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        envMap: { value: texture },
        tint: { value: this.tint },
        tintStrength: { value: 0.25 },
        exposure: { value: 0.94 }
      },
      vertexShader: `
        varying vec3 vDirection;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vDirection = normalize(worldPosition.xyz - cameraPosition);
          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D envMap;
        uniform vec3 tint;
        uniform float tintStrength;
        uniform float exposure;
        varying vec3 vDirection;

        const float PI = 3.141592653589793;

        vec2 equirectUv(vec3 direction) {
          vec3 dir = normalize(direction);
          return vec2(atan(dir.z, dir.x) / (2.0 * PI) + 0.5, asin(clamp(dir.y, -1.0, 1.0)) / PI + 0.5);
        }

        void main() {
          vec3 hdrColor = texture2D(envMap, equirectUv(vDirection)).rgb;
          vec3 mapped = vec3(1.0) - exp(-hdrColor * exposure);
          mapped = mix(mapped, mapped * tint, tintStrength);
          gl_FragColor = vec4(mapped, 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false
    });
    const sky = new THREE.Mesh(geometry, material);
    sky.renderOrder = -100;
    return sky;
  }

  update(dimensionId) {
    const dimension = DIMENSIONS[dimensionId];
    this.tint.copy(dimension.color).lerp(new THREE.Color('#ffffff'), 0.44);
    if (this.sky) {
      this.sky.position.set(0, 0, 0);
      this.sky.material.uniforms.tint.value.copy(this.tint);
      this.sky.material.uniforms.tintStrength.value = FILTER_STRENGTH[dimensionId];
    }

    if ('environmentIntensity' in this.scene) {
      this.scene.environmentIntensity = dimensionId === 'combat' ? 1.26 : dimensionId === 'phase' ? 1.2 : 1.12;
    }
  }

  dispose() {
    if (this.sky) {
      this.scene.remove(this.sky);
      this.sky.geometry.dispose();
      this.sky.material.dispose();
    }
    this.sourceTexture?.dispose();
    this.environmentTexture?.dispose();
    this.pmremGenerator.dispose();
  }
}
