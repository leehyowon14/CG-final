import { describe, expect, it } from 'vitest';
import { GameState } from './GameState.js';

describe('GameState', () => {
  it('keeps best score across restart in the same page session', () => {
    const state = new GameState();
    state.addScore(240);

    state.restart();

    expect(state.score).toBe(0);
    expect(state.bestScore).toBe(240);
  });

  it('uses shield before hp when taking damage', () => {
    const state = new GameState();
    state.shield = 10;

    state.damage(25);

    expect(state.shield).toBe(0);
    expect(state.hp).toBe(85);
  });
});
