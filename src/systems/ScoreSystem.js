import { GAME_CONFIG } from '../core/Constants.js';

export class ScoreSystem {
  constructor(state) {
    this.state = state;
  }

  update(delta) {
    this.state.addScore(this.state.dimensionConfig.scoreRate * delta);
    if (this.state.dimension === 'stability' && this.state.stabilityTime > GAME_CONFIG.dimension.stabilityGraceSeconds) {
      this.state.addScore(-GAME_CONFIG.dimension.stabilityPenaltyRate * delta);
    }
  }

  enemyKilled(enemy) {
    this.state.kills += 1;
    this.state.combo += 1;
    this.state.addScore(enemy.score + this.state.combo * 12);
  }
}
