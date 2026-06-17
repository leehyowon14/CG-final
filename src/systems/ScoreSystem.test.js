import { describe, expect, it } from 'vitest';
import { GameState } from '../core/GameState.js';
import { GAME_CONFIG } from '../core/Constants.js';
import { ScoreSystem } from './ScoreSystem.js';

describe('ScoreSystem', () => {
  it('adds survival score using the active dimension rate', () => {
    const state = new GameState();
    const score = new ScoreSystem(state);
    state.dimension = 'combat';

    score.update(2);

    expect(state.score).toBe(10);
  });

  it('penalizes long stability stays', () => {
    const state = new GameState();
    const score = new ScoreSystem(state);
    state.dimension = 'stability';
    state.stabilityTime = GAME_CONFIG.dimension.stabilityGraceSeconds + 1;

    score.update(1);

    expect(state.score).toBe(0);
  });

  it('adds combo score on enemy kill', () => {
    const state = new GameState();
    const score = new ScoreSystem(state);

    score.enemyKilled({ score: 100 });

    expect(state.kills).toBe(1);
    expect(state.score).toBe(112);
  });
});
