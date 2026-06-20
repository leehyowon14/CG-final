import './styles.css';
import * as THREE from 'three';
import { Game } from './core/Game.js';

const root = document.querySelector('#app');

if (!root) {
  throw new Error('Missing #app root element.');
}

const loadingScreen = createLoadingScreen();
installLoadingManager(loadingScreen);

const game = new Game(root);
game.start();

if (new URLSearchParams(window.location.search).get('qa') === 'visual') {
  Object.defineProperty(window, '__RIFT_AVIATOR__', {
    value: game,
    configurable: true
  });
}

window.addEventListener('beforeunload', () => {
  game.dispose();
});

function createLoadingScreen() {
  const element = document.createElement('div');
  element.className = 'loading-screen';
  element.innerHTML = `
    <div class="loading-screen__panel" role="status" aria-live="polite">
      <div class="loading-screen__title">Rift Aviator</div>
      <div class="loading-screen__track">
        <i data-loading-bar></i>
      </div>
      <div class="loading-screen__meta">
        <span data-loading-label>Loading</span>
        <b data-loading-percent>0%</b>
      </div>
    </div>
  `;
  document.body.append(element);
  return {
    element,
    bar: element.querySelector('[data-loading-bar]'),
    label: element.querySelector('[data-loading-label]'),
    percent: element.querySelector('[data-loading-percent]'),
    startedAt: performance.now()
  };
}

function installLoadingManager(screen) {
  const setProgress = (loaded, total) => {
    const progress = total > 0 ? loaded / total : 0;
    const percent = Math.round(progress * 100);
    screen.bar.style.width = `${percent}%`;
    screen.percent.textContent = `${percent}%`;
  };

  THREE.DefaultLoadingManager.onStart = (_url, loaded, total) => {
    screen.label.textContent = 'Loading';
    setProgress(loaded, total);
  };

  THREE.DefaultLoadingManager.onProgress = (_url, loaded, total) => {
    setProgress(loaded, total);
  };

  THREE.DefaultLoadingManager.onError = () => {
    screen.label.textContent = 'Asset skipped';
  };

  THREE.DefaultLoadingManager.onLoad = () => {
    screen.bar.style.width = '100%';
    screen.percent.textContent = '100%';
    const remaining = Math.max(0, 420 - (performance.now() - screen.startedAt));
    window.setTimeout(() => {
      screen.element.classList.add('is-hidden');
      screen.element.addEventListener('transitionend', () => screen.element.remove(), { once: true });
    }, remaining);
  };
}
