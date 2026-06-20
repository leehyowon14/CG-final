import { Time } from './Time.js';
import { GameState } from './GameState.js';
import { InputManager } from './InputManager.js';
import { createSceneSetup } from '../scene/SceneSetup.js';
import { CameraRig } from '../scene/CameraRig.js';
import { Lights } from '../scene/Lights.js';
import { DimensionEnvironment } from '../scene/DimensionEnvironment.js';
import { EnvironmentMap } from '../scene/EnvironmentMap.js';
import { PlayerShip } from '../entities/PlayerShip.js';
import { ProjectileSystem } from '../systems/ProjectileSystem.js';
import { EnemySystem } from '../systems/EnemySystem.js';
import { ObstacleSystem } from '../systems/ObstacleSystem.js';
import { PickupSystem } from '../systems/PickupSystem.js';
import { CollisionSystem } from '../systems/CollisionSystem.js';
import { DimensionManager } from '../systems/DimensionManager.js';
import { ScoreSystem } from '../systems/ScoreSystem.js';
import { DDGIManager } from '../systems/DDGIManager.js';
import { HUD } from '../ui/HUD.js';
import { ParticleBurst } from '../gfx/Particles.js';

export class Game {
  constructor(root) {
    this.root = root;
    this.time = new Time();
    this.state = new GameState();
    this.input = new InputManager(window);
    this.setup = createSceneSetup(root);
    this.cameraRig = new CameraRig(this.setup.camera);
    this.lights = new Lights(this.setup.scene);
    this.environment = new DimensionEnvironment(this.setup.scene);
    this.environmentMap = new EnvironmentMap(this.setup.scene, this.setup.renderer);
    this.player = new PlayerShip();
    this.projectiles = new ProjectileSystem(this.setup.scene);
    this.enemies = new EnemySystem(this.setup.scene);
    this.obstacles = new ObstacleSystem(this.setup.scene);
    this.pickups = new PickupSystem(this.setup.scene);
    this.dimensionManager = new DimensionManager(this.state);
    this.scoreSystem = new ScoreSystem(this.state);
    this.ddgi = new DDGIManager(this.setup.scene);
    this.particles = new ParticleBurst(this.setup.scene);
    this.collisionSystem = new CollisionSystem(this.state);
    this.hud = new HUD(root, this.state);
    this.frameId = 0;
    this.resizeObserver = new ResizeObserver(() => this.resize());

    this.setup.scene.add(this.player.group);
    this.enemies.player = this.player;
    this.enemies.projectileSystem = this.projectiles;
    this.applyLaunchParams();
    this.resizeObserver.observe(root);
    this.resize();
  }

  start() {
    this.frameId = requestAnimationFrame(() => this.loop());
  }

  loop() {
    this.time.tick();
    this.update(this.time.delta);
    this.render();
    this.input.endFrame();
    this.frameId = requestAnimationFrame(() => this.loop());
  }

  update(delta) {
    if (this.input.consume('KeyR')) {
      this.restart();
    }

    if (this.input.consume('KeyG')) {
      this.state.ddgiDebug = !this.state.ddgiDebug;
    }

    if (this.input.consume('KeyH')) {
      this.state.giEnabled = !this.state.giEnabled;
    }

    if (this.input.consume('KeyV')) {
      this.cameraRig.cycleView();
    }

    this.dimensionManager.update(delta, this.input);
    this.environment.update(delta, this.state.dimension);
    this.environmentMap.update(this.state.dimension);
    this.lights.update(this.state.dimension);
    this.ddgi.update(delta, this.state);

    if (!this.state.gameOver) {
      this.state.elapsed += delta;
      this.player.update(delta, this.input, this.state);
      this.projectiles.update(delta, this.input, this.player, this.state);
      this.enemies.update(delta, this.state);
      this.obstacles.update(delta, this.state);
      this.pickups.update(delta, this.state);
      const collisionEvents = this.collisionSystem.update({
        player: this.player,
        projectiles: this.projectiles,
        enemies: this.enemies,
        obstacles: this.obstacles,
        pickups: this.pickups,
        gi: this.ddgi
      });
      this.handleCollisionEvents(collisionEvents);
      this.scoreSystem.update(delta);
    }

    this.particles.update(delta);
    this.cameraRig.update(delta, this.player.group.position);
    this.hud.update();
  }

  handleCollisionEvents(events) {
    for (const event of events) {
      if (event.type === 'playerHit') {
        this.player.flashHit();
        this.cameraRig.shake(event.amount > 20 ? 0.75 : 0.48);
        this.particles.spawnHit(this.player.group.position, this.state.dimensionConfig.color);
      }
    }
  }

  render() {
    this.setup.renderer.render(this.setup.scene, this.setup.camera);
  }

  restart() {
    this.state.restart();
    this.player.reset();
    this.projectiles.reset();
    this.enemies.reset();
    this.obstacles.reset();
    this.pickups.reset();
    this.ddgi.reset();
    this.particles.reset();
    this.applyLaunchParams();
  }

  applyLaunchParams() {
    const params = new URLSearchParams(window.location.search);
    const demo = params.get('demo');
    const dimension = params.get('dimension') ?? demo;

    if (dimension && ['stability', 'combat', 'phase'].includes(dimension)) {
      this.state.dimension = dimension;
    }

    if (demo === 'gi') {
      this.state.dimension = 'phase';
    }

    if (['surfel', 'ddgi'].includes(params.get('debug')) || demo === 'gi') {
      this.state.ddgiDebug = true;
    }

    if (params.get('gi') === 'off') {
      this.state.giEnabled = false;
    }

    if (demo) {
      this.seedDemoScene(demo, params.get('hit') === '1');
    }
  }

  seedDemoScene(demo, shouldDemoHit = false) {
    if (demo === 'stability') {
      this.state.stabilityTime = -999;
      this.state.warning = '';
    }

    if (demo === 'combat' || demo === 'boss') {
      this.enemies.spawnEnemy('combat');
      this.enemies.spawnEnemy('combat');
      this.enemies.spawnBoss();
      this.projectiles.spawnPlayerProjectile(this.player.group.position, this.state.dimensionConfig.color);
      if (shouldDemoHit) {
        this.collisionSystem.damagePlayer(12, this.player.group.position, 'demoHit');
        this.handleCollisionEvents(this.collisionSystem.events);
      }
    }

    if (demo === 'phase') {
      this.obstacles.spawnObstacle('phase');
      this.obstacles.spawnObstacle('phase');
      this.pickups.spawnPickup('phase');
      this.pickups.spawnPickup('phase');
    }

    if (demo === 'gi') {
      this.obstacles.spawnObstacle('phase');
      this.pickups.spawnPickup('phase');
    }
  }

  resize() {
    const width = Math.max(1, this.root.clientWidth);
    const height = Math.max(1, this.root.clientHeight);
    this.setup.camera.aspect = width / height;
    this.setup.camera.updateProjectionMatrix();
    this.setup.renderer.setSize(width, height);
    this.setup.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  dispose() {
    cancelAnimationFrame(this.frameId);
    this.resizeObserver.disconnect();
    this.input.dispose();
    this.hud.dispose();
    this.ddgi.dispose();
    this.environmentMap.dispose();
    this.setup.renderer.dispose();
    this.root.innerHTML = '';
  }
}
