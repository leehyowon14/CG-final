import { createPickupModel } from '../gfx/ModelFactory.js';

export class Pickup {
  constructor(kind, position) {
    this.kind = kind;
    this.radius = 0.8;
    this.mesh = createPickupModel(kind);
    this.mesh.position.copy(position);
  }

  update(delta, worldTravelSpeed = 0) {
    this.mesh.position.z -= delta * (4.1 + worldTravelSpeed);
    this.mesh.rotation.y += delta * 2.5;
    this.mesh.rotation.x += delta * 0.8;
  }
}
