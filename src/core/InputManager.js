export class InputManager {
  constructor(target = window) {
    this.target = target;
    this.keys = new Set();
    this.pressed = new Set();
    this.onKeyDown = this.handleKeyDown.bind(this);
    this.onKeyUp = this.handleKeyUp.bind(this);
    target.addEventListener('keydown', this.onKeyDown);
    target.addEventListener('keyup', this.onKeyUp);
  }

  handleKeyDown(event) {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
      event.preventDefault();
    }

    if (!this.keys.has(event.code)) {
      this.pressed.add(event.code);
    }
    this.keys.add(event.code);
  }

  handleKeyUp(event) {
    this.keys.delete(event.code);
  }

  isDown(code) {
    return this.keys.has(code);
  }

  consume(code) {
    const hasPressed = this.pressed.has(code);
    this.pressed.delete(code);
    return hasPressed;
  }

  endFrame() {
    this.pressed.clear();
  }

  dispose() {
    this.target.removeEventListener('keydown', this.onKeyDown);
    this.target.removeEventListener('keyup', this.onKeyUp);
  }
}
