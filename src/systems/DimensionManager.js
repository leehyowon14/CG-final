import { DIMENSION_ORDER, GAME_CONFIG } from '../core/Constants.js';

export class DimensionManager {
  constructor(state) {
    this.state = state;
  }

  update(delta, input) {
    this.state.dimensionRecharge += delta;
    if (
      this.state.dimensionStacks < GAME_CONFIG.dimension.maxStacks &&
      this.state.dimensionRecharge >= GAME_CONFIG.dimension.rechargeSeconds
    ) {
      this.state.dimensionStacks += 1;
      this.state.dimensionRecharge = 0;
    }

    for (const dimensionId of DIMENSION_ORDER) {
      const key = `Digit${DIMENSION_ORDER.indexOf(dimensionId) + 1}`;
      if (input.consume(key)) {
        this.switchTo(dimensionId);
      }
    }

    if (this.state.dimension === 'stability') {
      this.state.stabilityTime += delta;
      this.state.hp = Math.min(GAME_CONFIG.player.maxHp, this.state.hp + delta * 5);
      this.state.shield = Math.min(GAME_CONFIG.player.maxShield, this.state.shield + delta * 7);
      if (this.state.stabilityTime > GAME_CONFIG.dimension.stabilityGraceSeconds) {
        this.state.warning = '안정 차원 장기 체류: 점수 효율 감소';
      }
    } else {
      this.state.stabilityTime = 0;
      this.state.warning = '';
    }
  }

  switchTo(nextDimension) {
    if (nextDimension === this.state.dimension) return false;
    if (this.state.dimensionStacks <= 0) {
      this.state.warning = '차원 스택이 부족합니다';
      return false;
    }

    this.state.dimension = nextDimension;
    this.state.dimensionStacks -= 1;
    this.state.dimensionRecharge = 0;
    this.state.stabilityTime = 0;
    this.state.warning = '';
    return true;
  }
}
