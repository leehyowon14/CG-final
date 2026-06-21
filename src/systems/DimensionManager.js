import { DIMENSION_ORDER, GAME_CONFIG } from '../core/Constants.js';

export class DimensionManager {
  constructor(state) {
    this.state = state;
  }

  update(delta) {
    this.state.dimensionRecharge += delta;
    if (
      this.state.dimensionStacks < GAME_CONFIG.dimension.maxStacks &&
      this.state.dimensionRecharge >= GAME_CONFIG.dimension.rechargeSeconds
    ) {
      this.state.dimensionStacks += 1;
      this.state.dimensionRecharge = 0;
    }

    this.updateDimensionState(delta);
  }

  consumeSwitchRequest(input) {
    for (const dimensionId of DIMENSION_ORDER) {
      const key = `Digit${DIMENSION_ORDER.indexOf(dimensionId) + 1}`;
      if (input.consume(key)) {
        return this.beginSwitch(dimensionId);
      }
    }

    return null;
  }

  updateDimensionState(delta) {
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

  beginSwitch(nextDimension) {
    if (nextDimension === this.state.dimension) return null;
    if (this.state.dimensionStacks <= 0) {
      this.state.warning = '차원 스택이 부족합니다';
      return null;
    }

    this.state.dimensionStacks -= 1;
    this.state.dimensionRecharge = 0;
    this.state.warning = '차원문 진입 중';
    return {
      from: this.state.dimension,
      to: nextDimension
    };
  }

  completeSwitch(nextDimension) {
    if (nextDimension === this.state.dimension) return false;
    this.state.dimension = nextDimension;
    this.state.stabilityTime = 0;
    this.state.warning = '';
    return true;
  }

  switchTo(nextDimension) {
    const request = this.beginSwitch(nextDimension);
    if (!request) return false;
    return this.completeSwitch(request.to);
  }
}
