import * as THREE from 'three';
import { createEnemyModel, createMiniBossModel } from '../gfx/ModelFactory.js';

const parentWorldQuaternion = new THREE.Quaternion();
const cameraWorldQuaternion = new THREE.Quaternion();

export class Enemy {
  constructor(type, position) {
    this.type = type;
    this.radius = type === 'boss' ? 2.4 : type === 'gunner' ? 0.9 : 0.75;
    this.maxHp = type === 'boss' ? 560 : type === 'gunner' ? 80 : type === 'striker' ? 56 : 42;
    this.hp = this.maxHp;
    this.score = type === 'boss' ? 900 : type === 'gunner' ? 140 : type === 'striker' ? 120 : 90;
    this.fireTimer = type === 'boss' ? 0.4 : 1.1 + Math.random() * 1.3;
    this.mesh = type === 'boss' ? createMiniBossModel() : createEnemyModel(type);
    this.mesh.position.copy(position);
    this.mesh.rotation.y = Math.PI;
    const healthBar = createEnemyHealthBar(type);
    this.healthBar = healthBar.group;
    this.healthFill = healthBar.fill;
    this.healthFillWidth = healthBar.fillWidth;
    this.mesh.add(this.healthBar);
    this.updateHealthBar();
  }

  update(delta, state, playerPosition, spawnEnemyProjectile, worldTravelSpeed = 0, camera = null) {
    this.updateHealthBar(camera);

    if (this.type === 'boss') {
      const targetX = THREE.MathUtils.clamp(playerPosition.x * 0.45, -7, 7);
      this.mesh.position.x = THREE.MathUtils.lerp(this.mesh.position.x, targetX, 1 - Math.exp(-delta * 1.8));
      const targetZ = playerPosition.z + 13 - worldTravelSpeed * 0.35;
      this.mesh.position.z = THREE.MathUtils.lerp(this.mesh.position.z, targetZ, 1 - Math.exp(-delta * 1.4));
      this.mesh.rotation.z = Math.sin(state.elapsed * 1.8) * 0.08;
      this.fireTimer -= delta;
      if (this.fireTimer <= 0) {
        this.fireTimer = 0.65;
        for (let i = -2; i <= 2; i += 1) {
          spawnEnemyProjectile(this.mesh.position, i * 0.18);
        }
      }
      return;
    }

    const speed = this.type === 'striker' ? 8.2 : 4.4;
    this.mesh.position.z -= delta * (speed + worldTravelSpeed);
    this.mesh.position.x += Math.sin(state.elapsed * 2 + this.mesh.id) * delta * 1.2;
    this.mesh.rotation.y += delta * (this.type === 'drone' ? 1.2 : 0.4);

    if (this.type === 'gunner') {
      this.fireTimer -= delta;
      if (this.fireTimer <= 0) {
        this.fireTimer = 1.5;
        spawnEnemyProjectile(this.mesh.position, 0);
      }
    }
  }

  damage(amount) {
    this.hp -= amount;
    this.mesh.scale.setScalar(Math.max(0.72, 1 + (Math.random() - 0.5) * 0.08));
    this.updateHealthBar();
  }

  get isDead() {
    return this.hp <= 0;
  }

  updateHealthBar(camera = null) {
    const ratio = THREE.MathUtils.clamp(this.hp / this.maxHp, 0, 1);
    this.healthFill.scale.x = ratio;
    this.healthFill.position.x = -this.healthFillWidth * (1 - ratio) * 0.5;

    if (ratio > 0.5) {
      this.healthFill.material.color.set('#3aff78');
    } else if (ratio > 0.25) {
      this.healthFill.material.color.set('#ffcf3f');
    } else {
      this.healthFill.material.color.set('#ff4a4a');
    }

    if (!camera) return;
    camera.getWorldQuaternion(cameraWorldQuaternion);
    this.mesh.getWorldQuaternion(parentWorldQuaternion);
    this.healthBar.quaternion.copy(parentWorldQuaternion).invert().multiply(cameraWorldQuaternion);
  }
}

function createEnemyHealthBar(type) {
  const isBoss = type === 'boss';
  const width = isBoss ? 3.8 : 1.65;
  const height = isBoss ? 0.24 : 0.16;
  const y = isBoss ? 2.35 : 1.18;
  const group = new THREE.Group();
  group.name = 'EnemyHealthBar';
  group.position.set(0, y, 0);

  const background = new THREE.Mesh(
    new THREE.PlaneGeometry(width + 0.12, height + 0.08),
    new THREE.MeshBasicMaterial({
      color: '#05080a',
      transparent: true,
      opacity: 0.9,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  );
  background.name = 'EnemyHealthBarBackground';
  background.renderOrder = 30;

  const fill = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({
      color: '#3aff78',
      transparent: true,
      opacity: 0.96,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  );
  fill.name = 'EnemyHealthBarFill';
  fill.position.z = 0.01;
  fill.renderOrder = 31;

  group.add(background, fill);
  return { group, fill, fillWidth: width };
}
