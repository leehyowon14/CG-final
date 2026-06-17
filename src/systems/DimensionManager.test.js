import { describe, expect, it } from 'vitest';
import { GameState } from '../core/GameState.js';
import { GAME_CONFIG } from '../core/Constants.js';
import { DimensionManager } from './DimensionManager.js';

function inputWithPressed(code) {
  return {
    consume(candidate) {
      return candidate === code;
    }
  };
}

describe('DimensionManager', () => {
  it('spends one stack when switching dimensions', () => {
    const state = new GameState();
    const manager = new DimensionManager(state);

    manager.update(0.1, inputWithPressed('Digit2'));

    expect(state.dimension).toBe('combat');
    expect(state.dimensionStacks).toBe(GAME_CONFIG.dimension.maxStacks - 1);
  });

  it('blocks switching when stacks are empty', () => {
    const state = new GameState();
    const manager = new DimensionManager(state);
    state.dimensionStacks = 0;

    manager.update(0.1, inputWithPressed('Digit3'));

    expect(state.dimension).toBe('stability');
    expect(state.warning).toContain('부족');
  });

  it('recovers a stack after recharge time', () => {
    const state = new GameState();
    const manager = new DimensionManager(state);
    state.dimensionStacks = 1;

    manager.update(GAME_CONFIG.dimension.rechargeSeconds, inputWithPressed('None'));

    expect(state.dimensionStacks).toBe(2);
  });

  it('heals hp and shield in stability and warns after the grace time', () => {
    const state = new GameState();
    const manager = new DimensionManager(state);
    state.hp = 50;
    state.shield = 20;

    manager.update(GAME_CONFIG.dimension.stabilityGraceSeconds + 1, inputWithPressed('None'));

    expect(state.hp).toBeGreaterThan(50);
    expect(state.shield).toBeGreaterThan(20);
    expect(state.warning).toContain('장기 체류');
  });
});
