import { DIMENSIONS, GAME_CONFIG } from '../core/Constants.js';

export class HUD {
  constructor(root, state) {
    this.state = state;
    this.element = document.createElement('div');
    this.element.className = 'hud';
    this.element.innerHTML = `
      <section class="hud__panel hud__panel--left">
        <div class="brand">Rift Aviator</div>
        <div class="metric"><span>HP</span><b data-hp>100</b></div>
        <div class="bar"><i data-hp-bar></i></div>
        <div class="metric"><span>Shield</span><b data-shield>80</b></div>
        <div class="bar bar--shield"><i data-shield-bar></i></div>
        <div class="metric"><span>Ammo</span><b data-ammo>24</b></div>
      </section>
      <section class="hud__panel hud__panel--center">
        <div class="dimension" data-dimension>안정</div>
        <div class="stacks" data-stacks></div>
        <div class="warning" data-warning></div>
      </section>
      <section class="hud__panel hud__panel--right">
        <div class="metric metric--score"><span>Score</span><b data-score>0</b></div>
        <div class="metric"><span>Best</span><b data-best>0</b></div>
        <div class="metric"><span>Kills</span><b data-kills>0</b></div>
        <div class="toggles"><span>V View</span><span>G DDGI</span><span>H GI</span><span>R Restart</span></div>
      </section>
      <div class="game-over" data-game-over>
        <h1>Dimension Collapse</h1>
        <p>R 키로 다시 시작</p>
      </div>
    `;
    root.appendChild(this.element);
    this.refs = {
      hp: this.find('[data-hp]'),
      hpBar: this.find('[data-hp-bar]'),
      shield: this.find('[data-shield]'),
      shieldBar: this.find('[data-shield-bar]'),
      ammo: this.find('[data-ammo]'),
      dimension: this.find('[data-dimension]'),
      stacks: this.find('[data-stacks]'),
      warning: this.find('[data-warning]'),
      score: this.find('[data-score]'),
      best: this.find('[data-best]'),
      kills: this.find('[data-kills]'),
      gameOver: this.find('[data-game-over]')
    };
  }

  find(selector) {
    const element = this.element.querySelector(selector);
    if (!(element instanceof HTMLElement)) {
      throw new Error(`Missing HUD element: ${selector}`);
    }
    return element;
  }

  update() {
    const dimension = DIMENSIONS[this.state.dimension];
    this.element.style.setProperty('--accent', dimension.accent);
    this.refs.hp.textContent = `${Math.ceil(this.state.hp)}`;
    this.refs.hpBar.style.width = `${(this.state.hp / GAME_CONFIG.player.maxHp) * 100}%`;
    this.refs.shield.textContent = `${Math.ceil(this.state.shield)}`;
    this.refs.shieldBar.style.width = `${(this.state.shield / GAME_CONFIG.player.maxShield) * 100}%`;
    this.refs.ammo.textContent = `${this.state.ammo}`;
    this.refs.dimension.textContent = `${dimension.label} 차원`;
    this.refs.stacks.textContent = `Stacks ${'◆'.repeat(this.state.dimensionStacks)}${'◇'.repeat(
      GAME_CONFIG.dimension.maxStacks - this.state.dimensionStacks
    )}`;
    this.refs.warning.textContent = this.state.warning;
    this.refs.score.textContent = `${Math.floor(this.state.score)}`;
    this.refs.best.textContent = `${this.state.bestScore}`;
    this.refs.kills.textContent = `${this.state.kills}`;
    this.refs.gameOver.classList.toggle('is-visible', this.state.gameOver);
  }

  dispose() {
    this.element.remove();
  }
}
