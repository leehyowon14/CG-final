import { createObstacleModel } from '../gfx/ModelFactory.js';

export class Obstacle {
  constructor(kind, position) {
    this.kind = kind;
    this.radius = kind === 'wall' ? 1.7 : 0.95;
    this.hp = kind === 'wall' ? 120 : kind === 'mine' ? 70 : 90;
    this.mesh = createObstacleModel(kind);
    this.mesh.position.copy(position);
    this.mesh.rotation.set(Math.random(), Math.random() * Math.PI, Math.random());
  }

  update(delta, state, worldTravelSpeed = 0) {
    const speed = state.dimension === 'phase' ? 5.3 : 3.7;
    this.mesh.position.z -= delta * (speed + worldTravelSpeed);
    this.mesh.rotation.y += delta * 1.4;
    this.mesh.rotation.x += delta * 0.5;
  }

  damage(amount) {
    this.hp -= amount * 0.45;
  }

  get isDead() {
    return this.hp <= 0;
  }
}
