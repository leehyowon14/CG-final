import { DIMENSIONS, GAME_CONFIG } from './Constants.js';

export class GameState {
  constructor() {
    this.dimension = 'stability';
    this.hp = GAME_CONFIG.player.maxHp;
    this.shield = GAME_CONFIG.player.maxShield;
    this.ammo = GAME_CONFIG.player.startAmmo;
    this.score = 0;
    this.bestScore = 0;
    this.elapsed = 0;
    this.combo = 0;
    this.gameOver = false;
    this.warning = '';
    this.giEnabled = true;
    this.surfelDebug = false;
    this.dimensionStacks = GAME_CONFIG.dimension.maxStacks;
    this.dimensionRecharge = 0;
    this.stabilityTime = 0;
    this.kills = 0;
  }

  get dimensionConfig() {
    return DIMENSIONS[this.dimension];
  }

  restart() {
    const bestScore = Math.max(this.bestScore, Math.floor(this.score));
    this.dimension = 'stability';
    this.hp = GAME_CONFIG.player.maxHp;
    this.shield = GAME_CONFIG.player.maxShield;
    this.ammo = GAME_CONFIG.player.startAmmo;
    this.score = 0;
    this.bestScore = bestScore;
    this.elapsed = 0;
    this.combo = 0;
    this.gameOver = false;
    this.warning = '';
    this.giEnabled = true;
    this.surfelDebug = false;
    this.dimensionStacks = GAME_CONFIG.dimension.maxStacks;
    this.dimensionRecharge = 0;
    this.stabilityTime = 0;
    this.kills = 0;
  }

  addScore(amount) {
    this.score = Math.max(0, this.score + amount);
    this.bestScore = Math.max(this.bestScore, Math.floor(this.score));
  }

  damage(amount) {
    if (this.gameOver) return;

    const shieldDamage = Math.min(this.shield, amount);
    this.shield -= shieldDamage;
    this.hp -= amount - shieldDamage;

    if (this.hp <= 0) {
      this.hp = 0;
      this.gameOver = true;
      this.bestScore = Math.max(this.bestScore, Math.floor(this.score));
    }
  }
}
