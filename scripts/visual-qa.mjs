import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const host = '127.0.0.1';
const port = 4173;
const baseUrl = `http://${host}:${port}/CG-final/`;
const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const screenshotDir = 'report/screenshots';
const reportPath = 'report/10_verification.md';

const server = spawn(
  './node_modules/.bin/vite',
  ['--host', host, '--port', String(port), '--strictPort'],
  { stdio: ['ignore', 'pipe', 'pipe'] }
);

const serverLogs = [];
server.stdout.on('data', (chunk) => serverLogs.push(chunk.toString()));
server.stderr.on('data', (chunk) => serverLogs.push(chunk.toString()));

try {
  await waitForServer(baseUrl);
  await mkdir(screenshotDir, { recursive: true });

  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--disable-gpu-sandbox']
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const consoleIssues = [];
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) {
      consoleIssues.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => {
    consoleIssues.push(`pageerror: ${error.message}`);
  });

  const checks = [];
  const launchUrl = qaUrl({ demo: 'stability' });
  await page.goto(launchUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.loading-screen', { timeout: 5_000 });
  await page.screenshot({ path: `${screenshotDir}/11_loading_screen.png` });
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('.hud');
  await page.waitForSelector('.loading-screen', { state: 'detached', timeout: 10_000 }).catch(() => {});
  await page.waitForFunction(() => Boolean(window['__RIFT_AVIATOR__']));
  await page.screenshot({ path: `${screenshotDir}/00_overview.png` });
  checks.push(await checkCanvasNotBlank(page, 'stability canvas nonblank'));
  checks.push(await checkGIReceiverPanels(page));
  checks.push(await checkReceiverPanelToggleAndAnchor(page));
  checks.push(await checkHBVDebugToggle(page));
  checks.push(await checkToggleBorders(page, { gi: true, ddgi: false, hbv: false, panels: false }, 'GI toggle starts highlighted and DDGI/HBV starts idle'));
  checks.push(await expectText(page, '[data-dimension]', '안정 차원', 'starts in stability dimension'));
  checks.push(await expectText(page, '[data-dimension-description]', '회복과 재정비', 'stability dimension explains its role'));
  checks.push(await checkWorldScrollTravel(page));
  checks.push(await checkMovementKey(page, 'KeyA', 'x', 'increase', 'A maps to screen left'));
  checks.push(await checkMovementKey(page, 'KeyD', 'x', 'decrease', 'D maps to screen right'));
  checks.push(await checkCameraCycle(page));
  await page.screenshot({ path: `${screenshotDir}/01_movement_controls.png` });

  await resetPlayerPose(page);
  await page.evaluate(() => {
    const game = window['__RIFT_AVIATOR__'];
    game.projectiles.reset();
    game.projectiles.cooldown = 0;
    game.state.ammo = 24;
    game.hud.update();
  });
  const ammoBefore = Number(await page.locator('[data-ammo]').textContent());
  const playerProjectilesBefore = await playerProjectileCount(page);
  await page.keyboard.down('Space');
  await page.waitForTimeout(250);
  await page.keyboard.up('Space');
  await page.waitForTimeout(100);
  const ammoAfter = Number(await page.locator('[data-ammo]').textContent());
  const playerProjectilesAfter = await playerProjectileCount(page);
  checks.push({
    name: 'Space fires and spends ammo',
    passed: ammoAfter < ammoBefore && playerProjectilesAfter > playerProjectilesBefore,
    detail: `ammo ${ammoBefore} -> ${ammoAfter}, projectiles ${playerProjectilesBefore} -> ${playerProjectilesAfter}`
  });
  await page.screenshot({ path: `${screenshotDir}/04_space_shooting.png` });

  await page.evaluate(() => {
    const game = window['__RIFT_AVIATOR__'];
    game.state.ammo = 0;
    game.projectiles.reset();
    game.projectiles.cooldown = 0;
    game.hud.update();
  });
  const emptyAmmoBefore = Number(await page.locator('[data-ammo]').textContent());
  const emptyProjectilesBefore = await playerProjectileCount(page);
  await page.keyboard.down('Space');
  await page.waitForTimeout(250);
  await page.keyboard.up('Space');
  await page.waitForTimeout(100);
  const emptyAmmoAfter = Number(await page.locator('[data-ammo]').textContent());
  const emptyProjectilesAfter = await playerProjectileCount(page);
  checks.push({
    name: 'Space is blocked at zero ammo',
    passed: emptyAmmoBefore === 0 && emptyAmmoAfter === 0 && emptyProjectilesAfter === emptyProjectilesBefore,
    detail: `ammo ${emptyAmmoBefore} -> ${emptyAmmoAfter}, projectiles ${emptyProjectilesBefore} -> ${emptyProjectilesAfter}`
  });
  await page.screenshot({ path: `${screenshotDir}/05_ammo_empty_blocked.png` });

  await seedPreviousDimensionObjects(page);
  await page.keyboard.press('Digit2');
  await page.waitForTimeout(120);
  checks.push(await expectText(page, '[data-dimension]', '안정 차원', 'Digit2 keeps current dimension until portal traversal'));
  checks.push(await expectText(page, '[data-stacks]', 'Stacks ◆◆◇', 'dimension switch spends one stack'));
  checks.push(await checkTransitionObjectsFadeBeforePass(page));
  checks.push(await checkDimensionRift(page));
  checks.push(await checkRiftVerticalTravelPlaneAcrossCameraModes(page));
  checks.push(await checkRiftAlphaFadesBeforePass(page, 'combat'));
  checks.push(await checkDimensionPortalTraversal(page, 'combat', 'Digit2 switches to combat after portal traversal'));
  checks.push(await checkEnemyHealthBars(page));
  checks.push(await checkPickupVisualIdentity(page));
  checks.push(await expectText(page, '[data-dimension-description]', '고득점 전투', 'combat dimension explains its role'));
  await page.screenshot({ path: `${screenshotDir}/18_green_pickups.png` });
  await page.screenshot({ path: `${screenshotDir}/02_combat_dimension.png` });

  await page.waitForTimeout(500);
  await seedPreviousDimensionObjects(page);
  await page.keyboard.press('Digit3');
  await page.waitForTimeout(120);
  checks.push(await expectText(page, '[data-dimension]', '전투 차원', 'Digit3 keeps current dimension until portal traversal'));
  checks.push(await checkRiftAlphaFadesBeforePass(page, 'phase'));
  checks.push(await checkDimensionPortalTraversal(page, 'phase', 'Digit3 switches to phase after portal traversal'));
  checks.push(await expectText(page, '[data-dimension-description]', '회피와 수급', 'phase dimension explains its role'));
  await page.screenshot({ path: `${screenshotDir}/03_phase_dimension.png` });

  await page.keyboard.press('KeyG');
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${screenshotDir}/08_surfel_debug.png` });
  checks.push(await checkCanvasNotBlank(page, 'DDGI debug canvas nonblank'));
  checks.push(await checkToggleBorders(page, { gi: true, ddgi: true, hbv: false, panels: false }, 'G highlights DDGI toggle label'));
  await page.keyboard.press('KeyG');
  await page.waitForTimeout(100);

  await page.keyboard.press('KeyH');
  await page.waitForTimeout(250);
  const giOffState = await captureGIState(page);
  checks.push(await checkToggleBorders(page, { gi: false, ddgi: false, hbv: false, panels: false }, 'H clears GI toggle highlight'));
  await page.screenshot({ path: `${screenshotDir}/09_gi_off.png` });
  await page.keyboard.press('KeyH');
  await page.waitForTimeout(250);
  const giOnState = await captureGIState(page);
  checks.push(await checkToggleBorders(page, { gi: true, ddgi: false, hbv: false, panels: false }, 'H restores GI toggle highlight'));
  await page.screenshot({ path: `${screenshotDir}/10_gi_on.png` });
  checks.push({
    name: 'GI toggle updates DDGI shader state',
    passed:
      giOffState.enabled === 0 &&
      giOnState.enabled === 1 &&
      giOnState.probeCount >= 300 &&
      giOnState.receiverPanels >= 8 &&
      giOnState.patchedMaterials > 0,
    detail: `enabled ${giOffState.enabled}->${giOnState.enabled}, probes=${giOnState.probeCount}, receiverPanels=${giOnState.receiverPanels}, visiblePanels=${giOnState.visibleReceiverPanels}, patched=${giOnState.patchedMaterials}`
  });

  await page.keyboard.press('KeyR');
  await page.waitForTimeout(250);
  checks.push(await expectText(page, '[data-dimension]', '안정 차원', 'R restarts to stability'));

  await browser.close();

  const relevantConsoleIssues = consoleIssues.filter((line) => !line.includes('favicon'));
  checks.push({
    name: 'browser console clean',
    passed: relevantConsoleIssues.length === 0,
    detail: relevantConsoleIssues.join('\n') || 'no warnings/errors'
  });

  const failed = checks.filter((check) => !check.passed);
  await writeVerificationReport(checks, failed, launchUrl);

  if (failed.length > 0) {
    console.error(formatChecks(checks));
    process.exitCode = 1;
  } else {
    console.log(formatChecks(checks));
  }
} finally {
  server.kill('SIGTERM');
}

function qaUrl(params = {}) {
  const url = new URL(baseUrl);
  url.searchParams.set('qa', 'visual');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

async function waitForServer(url) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`Vite server exited early:\n${serverLogs.join('')}`);
    }
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Retry until Vite is ready.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${url}\n${serverLogs.join('')}`);
}

async function expectText(page, selector, expected, name) {
  const text = (await page.locator(selector).textContent())?.trim() ?? '';
  return { name, passed: text.includes(expected), detail: text };
}

async function checkCanvasNotBlank(page, name) {
  const stats = await page.locator('canvas').evaluate((canvas) => {
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    if (!gl) return { unique: -1, sampled: 0 };
    const width = Math.max(1, Math.floor(canvas.width / 4));
    const height = Math.max(1, Math.floor(canvas.height / 4));
    const image = new Uint8Array(width * height * 4);
    gl.readPixels(
      Math.floor(canvas.width / 2 - width / 2),
      Math.floor(canvas.height / 2 - height / 2),
      width,
      height,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      image
    );
    const colors = new Set();
    const step = Math.max(4, Math.floor(image.length / 4 / 5000) * 4);
    for (let index = 0; index < image.length; index += step) {
      colors.add(`${image[index]},${image[index + 1]},${image[index + 2]},${image[index + 3]}`);
      if (colors.size > 16) break;
    }
    return { unique: colors.size, sampled: Math.floor(image.length / step) };
  });
  return { name, passed: stats.unique > 16, detail: `${stats.unique} unique sampled colors` };
}

async function checkDimensionRift(page) {
  const stats = await page.evaluate(() => {
    const game = window['__RIFT_AVIATOR__'];
    const activeRift = game.dimensionRifts.items[0];
    const hasPortalCore = Boolean(activeRift?.opening.children.find((child) => child.name === 'DimensionRiftPortalCore'));
    const crackCount = activeRift?.opening.children.filter((child) => child.name === 'DimensionRiftCrackSegment').length ?? 0;
    const edgeShardCount = activeRift?.opening.children.filter((child) => child.name === 'DimensionRiftEdgeShard').length ?? 0;
    const receiverShardCount = activeRift?.shards.filter((shard) => shard.mesh.name === 'DimensionRiftGIReceiverShard').length ?? 0;
    return {
      active: Boolean(activeRift),
      hasPortalCore,
      crackCount,
      edgeShardCount,
      receiverShardCount,
      shardCount: activeRift?.shards.length ?? 0,
      standardShardCount: activeRift?.shards.filter((shard) => shard.mesh.material.isMeshStandardMaterial).length ?? 0
    };
  });
  return {
    name: 'dimension switch opens DDGI glass rift',
    passed:
      stats.active &&
      stats.hasPortalCore &&
      stats.crackCount >= 12 &&
      stats.edgeShardCount >= 12 &&
      stats.receiverShardCount >= 8 &&
      stats.shardCount >= 20 &&
      stats.standardShardCount === stats.shardCount,
    detail: `${stats.shardCount} glass shards, ${stats.standardShardCount} standard materials, receivers=${stats.receiverShardCount}, cracks=${stats.crackCount}, edge=${stats.edgeShardCount}, portal=${stats.hasPortalCore}`
  };
}

async function checkGIReceiverPanels(page) {
  const stats = await page.evaluate(() => {
    const game = window['__RIFT_AVIATOR__'];
    const panels = game.environment.receiverPanels ?? [];
    return {
      count: panels.length,
      standardCount: panels.filter((panel) => panel.material?.isMeshStandardMaterial).length,
      emissiveOffCount: panels.filter((panel) => panel.material?.emissiveIntensity === 0).length,
      visibleCount: panels.filter((panel) => panel.visible).length
    };
  });

  return {
    name: 'DDGI receiver panels are available but hidden by default',
    passed: stats.count >= 8 && stats.standardCount === stats.count && stats.emissiveOffCount === stats.count && stats.visibleCount === 0,
    detail: `${stats.count} panels, ${stats.standardCount} standard materials, ${stats.emissiveOffCount} emissive-off, visible=${stats.visibleCount}`
  };
}

async function checkReceiverPanelToggleAndAnchor(page) {
  await page.keyboard.press('KeyP');
  await page.waitForTimeout(120);
  const before = await panelRelativeSample(page);
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(220);
  await page.keyboard.up('KeyW');
  await page.waitForTimeout(80);
  const after = await panelRelativeSample(page);
  await page.keyboard.press('KeyP');
  await page.waitForTimeout(80);
  const hidden = await page.evaluate(() => {
    const game = window['__RIFT_AVIATOR__'];
    return {
      panelsVisible: game.state.receiverPanelsVisible,
      visibleCount: game.environment.receiverPanels.filter((panel) => panel.visible).length
    };
  });

  const maxDelta = Math.max(
    Math.abs(before.relative.x - after.relative.x),
    Math.abs(before.relative.y - after.relative.y),
    Math.abs(before.relative.z - after.relative.z)
  );

  return {
    name: 'P toggles DDGI receiver panels anchored near player',
    passed:
      before.panelsVisible &&
      before.visibleCount >= 8 &&
      after.panelsVisible &&
      after.visibleCount >= 8 &&
      maxDelta < 0.08 &&
      !hidden.panelsVisible &&
      hidden.visibleCount === 0,
    detail: `visible ${before.visibleCount}->${after.visibleCount}->${hidden.visibleCount}, relativeDelta=${maxDelta.toFixed(3)}`
  };
}

async function panelRelativeSample(page) {
  return page.evaluate(() => {
    const game = window['__RIFT_AVIATOR__'];
    game.environment.update(0.016, game.state.dimension, game.player.worldTravelSpeed, game.player.group.position, game.state.receiverPanelsVisible);
    const panel = game.environment.receiverPanels[0];
    const panelWorldPosition = panel.getWorldPosition(panel.position.clone());
    const relative = panelWorldPosition.sub(game.player.group.position);
    return {
      panelsVisible: game.state.receiverPanelsVisible,
      visibleCount: game.environment.receiverPanels.filter((item) => item.visible).length,
      relative: { x: relative.x, y: relative.y, z: relative.z }
    };
  });
}

async function checkHBVDebugToggle(page) {
  const initial = await hbvDebugStats(page);
  await page.keyboard.press('KeyB');
  await page.waitForTimeout(120);
  const visible = await hbvDebugStats(page);
  await page.screenshot({ path: `${screenshotDir}/19_hbv_debug.png` });
  await page.keyboard.press('KeyB');
  await page.waitForTimeout(80);
  const hidden = await hbvDebugStats(page);

  return {
    name: 'B toggles player HBV hierarchy debug',
    passed:
      !initial.stateVisible &&
      !initial.groupVisible &&
      !initial.hudActive &&
      visible.stateVisible &&
      visible.groupVisible &&
      visible.hudActive &&
      visible.broadPhaseCount === 1 &&
      visible.broadPhaseBoxCount === 1 &&
      visible.broadPhaseWidth <= 1.8 &&
      visible.broadPhaseDepth <= 2.8 &&
      visible.meshCount >= 5 &&
      visible.boxMeshCount === visible.meshCount &&
      visible.linkCount === visible.meshCount &&
      visible.objectGroupVisible &&
      visible.positionDelta < 0.001 &&
      !hidden.stateVisible &&
      !hidden.groupVisible &&
      !hidden.objectGroupVisible &&
      !hidden.hudActive,
    detail: `visible ${initial.groupVisible}->${visible.groupVisible}->${hidden.groupVisible}, hud=${initial.hudActive}->${visible.hudActive}->${hidden.hudActive}, broad=${visible.broadPhaseCount}/${visible.broadPhaseBoxCount} ${visible.broadPhaseWidth.toFixed(2)}x${visible.broadPhaseDepth.toFixed(2)}, meshes=${visible.meshCount}, boxes=${visible.boxMeshCount}, links=${visible.linkCount}, objects=${visible.objectSphereCount} ${visible.objectKinds.join('/')}, delta=${visible.positionDelta.toFixed(4)}`
  };
}

async function hbvDebugStats(page) {
  return page.evaluate(() => {
    const { document } = globalThis;
    const game = window['__RIFT_AVIATOR__'];
    game.hbvDebug.update(game.player.group.position, game.player.group.quaternion, game.state.hbvDebug);
    game.objectBoundsDebug.update(
      {
        enemies: game.enemies,
        obstacles: game.obstacles,
        pickups: game.pickups,
        projectiles: game.projectiles
      },
      game.state.hbvDebug
    );
    const group = game.hbvDebug.group;
    const objectGroup = game.objectBoundsDebug.group;
    const delta = group.position.distanceTo(game.player.group.position);
    const hbvToggle = document.querySelector('[data-hbv-toggle]');
    const objectSpheres = objectGroup.children.filter((child) => child.visible && child.name.startsWith('ObjectBVH:'));
    return {
      stateVisible: game.state.hbvDebug,
      groupVisible: group.visible,
      objectGroupVisible: objectGroup.visible,
      hudActive: hbvToggle?.classList.contains('is-active') ?? false,
      broadPhaseCount: group.children.filter((child) => child.name === 'PlayerHBVBroadPhase').length,
      broadPhaseBoxCount: group.children.filter((child) => child.name === 'PlayerHBVBroadPhase' && child.geometry?.type === 'BoxGeometry').length,
      broadPhaseWidth: game.hbvDebug.rootMesh.geometry.parameters.width,
      broadPhaseDepth: game.hbvDebug.rootMesh.geometry.parameters.depth,
      meshCount: group.children.filter((child) => child.name.startsWith('PlayerHBVMesh:')).length,
      boxMeshCount: group.children.filter((child) => child.name.startsWith('PlayerHBVMesh:') && child.geometry?.type === 'BoxGeometry').length,
      linkCount: group.children.filter((child) => child.name.startsWith('PlayerHBVLink:')).length,
      objectSphereCount: objectSpheres.length,
      objectKinds: [...new Set(objectSpheres.map((child) => child.name.replace('ObjectBVH:', '')))].sort(),
      positionDelta: delta
    };
  });
}

async function checkToggleBorders(page, expected, name) {
  const state = await page.evaluate(() => {
    const { document, getComputedStyle } = globalThis;
    const gi = document.querySelector('[data-gi-toggle]');
    const ddgi = document.querySelector('[data-ddgi-toggle]');
    const hbv = document.querySelector('[data-hbv-toggle]');
    const panels = document.querySelector('[data-panels-toggle]');
    return {
      giActive: gi?.classList.contains('is-active') ?? false,
      ddgiActive: ddgi?.classList.contains('is-active') ?? false,
      hbvActive: hbv?.classList.contains('is-active') ?? false,
      panelsActive: panels?.classList.contains('is-active') ?? false,
      giBorder: gi ? getComputedStyle(gi).borderColor : '',
      ddgiBorder: ddgi ? getComputedStyle(ddgi).borderColor : '',
      hbvBorder: hbv ? getComputedStyle(hbv).borderColor : '',
      panelsBorder: panels ? getComputedStyle(panels).borderColor : ''
    };
  });

  return {
    name,
    passed:
      state.giActive === expected.gi &&
      state.ddgiActive === expected.ddgi &&
      state.hbvActive === expected.hbv &&
      state.panelsActive === expected.panels,
    detail: `GI=${state.giActive} ${state.giBorder}, DDGI=${state.ddgiActive} ${state.ddgiBorder}, HBV=${state.hbvActive} ${state.hbvBorder}, Panels=${state.panelsActive} ${state.panelsBorder}`
  };
}

async function checkRiftVerticalTravelPlaneAcrossCameraModes(page) {
  const modeSnapshots = [
    { mode: 'current', path: null },
    { mode: 'firstPerson', path: `${screenshotDir}/15_rift_first_person.png` },
    { mode: 'chase', path: `${screenshotDir}/16_rift_chase.png` },
    { mode: 'top', path: `${screenshotDir}/17_rift_top.png` }
  ];
  const samples = [];

  for (const snapshot of modeSnapshots) {
    if (snapshot.mode !== 'current') {
      await page.keyboard.press('KeyV');
      await page.waitForTimeout(100);
    }
    const angle = await page.evaluate(() => {
      const game = window['__RIFT_AVIATOR__'];
      const rift = game.dimensionRifts.items[0];
      rift.life = rift.maxLife;
      game.dimensionRifts.update(0.016, game.setup.camera);
      rift.group.updateMatrixWorld(true);
      game.render();
      const elements = rift.group.matrixWorld.elements;
      const up = normalizeVector({ x: elements[4], y: elements[5], z: elements[6] });
      const forward = normalizeVector({ x: elements[8], y: elements[9], z: elements[10] });
      const riftPosition = rift.group.position;
      const entryPosition = rift.entryPosition;
      const toCamera = normalizeVector({
        x: game.setup.camera.position.x - riftPosition.x,
        y: 0,
        z: game.setup.camera.position.z - riftPosition.z
      });
      const upDot = clamp(up.y, -1, 1);
      const forwardDot = clamp(forward.x * toCamera.x + forward.z * toCamera.z, -1, 1);
      return {
        mode: game.cameraRig.mode.id,
        upAngle: Math.acos(upDot),
        forwardAngle: Math.acos(forwardDot),
        yDelta: riftPosition.y - entryPosition.y,
        zDelta: riftPosition.z - entryPosition.z
      };

      function normalizeVector(vector) {
        const length = Math.hypot(vector.x, vector.y, vector.z) || 1;
        return { x: vector.x / length, y: vector.y / length, z: vector.z / length };
      }

      function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
      }
    });
    samples.push(angle);
    if (snapshot.path) {
      await page.screenshot({ path: snapshot.path });
    }
  }

  await page.keyboard.press('KeyV');
  await page.waitForTimeout(100);

  const maxUpAngle = Math.max(...samples.map((sample) => sample.upAngle));
  const maxForwardAngle = Math.max(...samples.map((sample) => sample.forwardAngle));
  const minYDelta = Math.min(...samples.map((sample) => sample.yDelta));
  const maxYDelta = Math.max(...samples.map((sample) => sample.yDelta));
  const minZDelta = Math.min(...samples.map((sample) => sample.zDelta));
  return {
    name: 'rift stays vertical at ship height during pass-through',
    passed: maxUpAngle < 0.02 && maxForwardAngle < 0.08 && minYDelta > 0.6 && maxYDelta < 1.2 && minZDelta > -2.1,
    detail: `up ${maxUpAngle.toFixed(4)} rad, facing ${maxForwardAngle.toFixed(4)} rad, y+${minYDelta.toFixed(2)}..${maxYDelta.toFixed(2)}, z+${minZDelta.toFixed(2)}`
  };
}

async function checkRiftAlphaFadesBeforePass(page, targetDimension) {
  await page.waitForFunction(
    (dimension) => {
      const game = window['__RIFT_AVIATOR__'];
      const rift = game.dimensionRifts.items.find((item) => item.toDimension === dimension);
      return Boolean(rift) && rift.group.position.z - game.player.group.position.z < 0.8;
    },
    targetDimension,
    { timeout: 1500 }
  );
  const stats = await page.evaluate((dimension) => {
    const game = window['__RIFT_AVIATOR__'];
    const rift = game.dimensionRifts.items.find((item) => item.toDimension === dimension);
    const portal = rift?.opening.children.find((child) => child.name === 'DimensionRiftPortalCore');
    const shard = rift?.shards[0];
    return {
      targetDimension: dimension,
      active: Boolean(rift),
      portalOpacity: portal?.material.opacity ?? 1,
      shardOpacity: shard?.mesh.material.opacity ?? 1,
      riftZ: rift?.group.position.z ?? 0,
      playerZ: game.player.group.position.z
    };
  }, targetDimension);

  return {
    name: 'rift alpha fades before portal pass-through',
    passed: stats.active && stats.portalOpacity < 0.42 && stats.shardOpacity < 0.36,
    detail: `${stats.targetDimension}, portal alpha=${stats.portalOpacity.toFixed(2)}, shard alpha=${stats.shardOpacity.toFixed(2)}, z ${stats.riftZ.toFixed(2)} vs player ${stats.playerZ.toFixed(2)}`
  };
}

async function checkWorldScrollTravel(page) {
  await resetPlayerPose(page);
  const forward = await measureTravelObjectDelta(page, 'KeyW');
  const backward = await measureTravelObjectDelta(page, 'KeyS');

  return {
    name: 'W/S scroll world while player z stays anchored',
    passed:
      Math.abs(forward.playerDeltaZ) < 0.05 &&
      Math.abs(backward.playerDeltaZ) < 0.05 &&
      forward.objectDeltaZ < -1.2 &&
      backward.objectDeltaZ > 0.8,
    detail: `W player dz=${forward.playerDeltaZ.toFixed(2)}, object dz=${forward.objectDeltaZ.toFixed(2)} / S player dz=${backward.playerDeltaZ.toFixed(2)}, object dz=${backward.objectDeltaZ.toFixed(2)}`
  };
}

async function measureTravelObjectDelta(page, key) {
  await resetPlayerPose(page);
  const before = await page.evaluate(() => {
    const game = window['__RIFT_AVIATOR__'];
    game.pickups.reset();
    game.pickups.spawnPickup(game.state.dimension);
    const pickup = game.pickups.items.at(-1);
    pickup.mesh.position.set(0, 0.25, 6);
    return {
      playerZ: game.player.group.position.z,
      objectZ: pickup.mesh.position.z
    };
  });
  await page.keyboard.down(key);
  await page.waitForTimeout(420);
  await page.keyboard.up(key);
  await page.waitForTimeout(80);
  const after = await page.evaluate(() => {
    const game = window['__RIFT_AVIATOR__'];
    const pickup = game.pickups.items.at(-1);
    return {
      playerZ: game.player.group.position.z,
      objectZ: pickup?.mesh.position.z ?? 0
    };
  });

  return {
    playerDeltaZ: after.playerZ - before.playerZ,
    objectDeltaZ: after.objectZ - before.objectZ
  };
}

async function checkDimensionPortalTraversal(page, expectedDimension, name) {
  await page.waitForFunction((dimension) => window['__RIFT_AVIATOR__'].state.dimension === dimension, expectedDimension, {
    timeout: 1800
  });
  await page.waitForTimeout(80);
  const stats = await page.evaluate((dimension) => {
    const game = window['__RIFT_AVIATOR__'];
    const rift = game.dimensionRifts.items.find((item) => item.toDimension === dimension);
    return {
      dimension: game.state.dimension,
      playerZ: game.player.group.position.z,
      anchorZ: game.player.anchor.z,
      riftZ: rift?.group.position.z ?? null,
      transitionActive: Boolean(game.dimensionTransition),
      warpActive: Boolean(game.player.dimensionWarp),
      warpPhase: game.player.dimensionWarp?.phase ?? 'none',
      worldTravelSpeed: game.player.worldTravelSpeed,
      enemies: game.enemies.items.length,
      obstacles: game.obstacles.items.length,
      pickups: game.pickups.items.length,
      projectiles: game.projectiles.items.length,
      fadingObjects: game.fadeOutObjects.items.length,
      fadeOpacity: game.fadeOutObjects.items[0]?.materials[0]?.material.opacity ?? 1
    };
  }, expectedDimension);
  const riftPassed = stats.riftZ === null || stats.riftZ <= stats.playerZ - 1.65;
  const objectsCleared = stats.enemies === 0 && stats.obstacles === 0 && stats.pickups === 0 && stats.projectiles === 0;
  const fadedBeforePass = stats.fadingObjects === 0;
  const deceleratingAfterPass = stats.warpPhase === 'decelerate' && stats.worldTravelSpeed > 0.35;
  return {
    name,
    passed:
      stats.dimension === expectedDimension &&
      Math.abs(stats.playerZ - stats.anchorZ) < 0.05 &&
      riftPassed &&
      objectsCleared &&
      fadedBeforePass &&
      deceleratingAfterPass &&
      !stats.transitionActive,
    detail: `dimension=${stats.dimension}, playerZ=${stats.playerZ.toFixed(2)}, riftZ=${stats.riftZ?.toFixed(2) ?? 'expired'}, objects=${stats.enemies}/${stats.obstacles}/${stats.pickups}/${stats.projectiles}, fading=${stats.fadingObjects}, fadeAlpha=${stats.fadeOpacity.toFixed(2)}, transition=${stats.transitionActive}, warp=${stats.warpPhase}/${stats.worldTravelSpeed.toFixed(2)}`
  };
}

async function checkTransitionObjectsFadeBeforePass(page) {
  const stats = await page.evaluate(() => {
    const game = window['__RIFT_AVIATOR__'];
    return {
      transitionActive: Boolean(game.dimensionTransition),
      enemies: game.enemies.items.length,
      obstacles: game.obstacles.items.length,
      pickups: game.pickups.items.length,
      projectiles: game.projectiles.items.length,
      fadingObjects: game.fadeOutObjects.items.length,
      fadeOpacity: game.fadeOutObjects.items[0]?.materials[0]?.material.opacity ?? 1
    };
  });

  return {
    name: 'previous dimension objects fade before portal pass',
    passed:
      stats.transitionActive &&
      stats.enemies === 0 &&
      stats.obstacles === 0 &&
      stats.pickups === 0 &&
      stats.projectiles === 0 &&
      stats.fadingObjects >= 4 &&
      stats.fadeOpacity > 0 &&
      stats.fadeOpacity < 1,
    detail: `objects=${stats.enemies}/${stats.obstacles}/${stats.pickups}/${stats.projectiles}, fading=${stats.fadingObjects}, alpha=${stats.fadeOpacity.toFixed(2)}`
  };
}

async function checkEnemyHealthBars(page) {
  const stats = await page.evaluate(() => {
    const game = window['__RIFT_AVIATOR__'];
    game.enemies.reset();
    game.obstacles.reset();
    game.enemies.spawnEnemy('combat');
    game.enemies.spawnEnemy('combat');
    game.enemies.spawnBoss();
    game.obstacles.spawnObstacle('phase');

    const positions = [
      { x: -2.6, y: 0, z: 6.8 },
      { x: 2.2, y: 0, z: 8.5 },
      { x: 0, y: 1.1, z: 12.5 }
    ];

    game.enemies.items.forEach((enemy, index) => {
      enemy.mesh.position.set(positions[index].x, positions[index].y, positions[index].z);
      if (index === 0) {
        enemy.damage(enemy.maxHp * 0.45);
      }
      enemy.updateHealthBar(game.setup.camera);
    });

    if (game.obstacles.items[0]) {
      game.obstacles.items[0].mesh.position.set(4.2, 0.2, 7.7);
    }

    game.render();

    const enemyBarCount = game.enemies.items.filter((enemy) => enemy.mesh.getObjectByName('EnemyHealthBar')).length;
    const fillScales = game.enemies.items.map((enemy) => enemy.mesh.getObjectByName('EnemyHealthBarFill')?.scale.x ?? 0);
    const obstacleBarCount = game.obstacles.items.filter((obstacle) => obstacle.mesh.getObjectByName?.('EnemyHealthBar')).length;

    return {
      enemyCount: game.enemies.items.length,
      enemyBarCount,
      obstacleCount: game.obstacles.items.length,
      obstacleBarCount,
      fillScales
    };
  });

  return {
    name: 'enemy health bars distinguish enemies from obstacles',
    passed:
      stats.enemyCount === 3 &&
      stats.enemyBarCount === stats.enemyCount &&
      stats.obstacleCount === 1 &&
      stats.obstacleBarCount === 0 &&
      stats.fillScales.some((scale) => scale < 0.7) &&
      stats.fillScales.every((scale) => scale > 0),
    detail: `${stats.enemyBarCount}/${stats.enemyCount} enemies have bars, obstacles with bars=${stats.obstacleBarCount}, fill=${stats.fillScales.map((scale) => scale.toFixed(2)).join('/')}`
  };
}

async function checkPickupVisualIdentity(page) {
  const stats = await page.evaluate(() => {
    const game = window['__RIFT_AVIATOR__'];
    game.pickups.reset();
    game.pickups.spawnPickup('combat');
    game.pickups.spawnPickup('phase');
    game.pickups.spawnPickup('stability');
    const positions = [
      { x: -1.8, y: 0.45, z: 7.2 },
      { x: 0.0, y: 0.55, z: 8.4 },
      { x: 1.8, y: 0.45, z: 7.2 }
    ];

    game.pickups.items.forEach((pickup, index) => {
      pickup.mesh.position.set(positions[index].x, positions[index].y, positions[index].z);
      pickup.mesh.rotation.set(0.45, index * 0.8, 0);
    });
    game.render();

    return game.pickups.items.map((pickup) => {
      const meshes = [];
      pickup.mesh.traverse((child) => {
        if (child.isMesh) meshes.push(child);
      });
      const standardMaterials = meshes.map((mesh) => mesh.material).filter((material) => material.isMeshStandardMaterial);
      return {
        kind: pickup.kind,
        collectible: pickup.mesh.userData.collectible === true,
        greenMeshCount: meshes.filter((mesh) => mesh.material.color?.getHexString() === '35f27a').length,
        meshCount: meshes.length,
        emissiveCount: standardMaterials.filter((material) => material.emissive?.getHexString() === '35f27a' && material.emissiveIntensity >= 2).length,
        standardCount: standardMaterials.length,
        sceneLightCount: pickup.mesh.children.filter((child) => child.isLight).length
      };
    });
  });

  const passed = stats.length >= 3 && stats.every((pickup) => (
    pickup.collectible &&
    pickup.meshCount > 0 &&
    pickup.greenMeshCount === pickup.meshCount &&
    pickup.standardCount > 0 &&
    pickup.emissiveCount === pickup.standardCount &&
    pickup.sceneLightCount === 0
  ));

  return {
    name: 'collectible pickups are green self-lit markers without scene lights',
    passed,
    detail: stats.map((pickup) => `${pickup.kind}: green=${pickup.greenMeshCount}/${pickup.meshCount}, emissive=${pickup.emissiveCount}/${pickup.standardCount}, sceneLights=${pickup.sceneLightCount}`).join('; ')
  };
}

async function seedPreviousDimensionObjects(page) {
  await page.evaluate(() => {
    const game = window['__RIFT_AVIATOR__'];
    game.enemies.reset();
    game.obstacles.reset();
    game.pickups.reset();
    game.projectiles.reset();
    game.enemies.spawnEnemy('combat');
    game.obstacles.spawnObstacle('phase');
    game.pickups.spawnPickup('stability');
    game.projectiles.spawnEnemyProjectile(game.player.group.position.clone().setZ(18), game.state.dimensionConfig.color, 0);
    for (const enemy of game.enemies.items) {
      enemy.mesh.position.z = 18;
    }
    for (const obstacle of game.obstacles.items) {
      obstacle.mesh.position.z = 19;
    }
    for (const pickup of game.pickups.items) {
      pickup.mesh.position.z = 17;
    }
  });
}

async function checkMovementKey(page, key, axis, direction, name) {
  await resetPlayerPose(page);
  const before = await getPlayerPosition(page);
  await page.keyboard.down(key);
  await page.waitForTimeout(260);
  await page.keyboard.up(key);
  await page.waitForTimeout(80);
  const after = await getPlayerPosition(page);
  const delta = after[axis] - before[axis];
  const passed = direction === 'increase' ? delta > 0.45 : delta < -0.45;
  return {
    name,
    passed,
    detail: `${axis} ${before[axis].toFixed(2)} -> ${after[axis].toFixed(2)} (${delta.toFixed(2)})`
  };
}

async function resetPlayerPose(page) {
  await page.evaluate(() => {
    const game = window['__RIFT_AVIATOR__'];
    game.player.group.position.set(0, 0, -6);
    game.player.velocity.set(0, 0, 0);
    game.player.worldTravelSpeed = 0;
    game.player.dimensionWarp = null;
    game.dimensionTransition = null;
  });
  await page.waitForTimeout(40);
}

async function getPlayerPosition(page) {
  return page.evaluate(() => {
    const position = window['__RIFT_AVIATOR__'].player.group.position;
    return { x: position.x, z: position.z };
  });
}

async function checkCameraCycle(page) {
  const before = await page.evaluate(() => window['__RIFT_AVIATOR__'].cameraRig.mode.id);
  await page.keyboard.press('KeyV');
  await page.waitForTimeout(120);
  const afterFirst = await page.evaluate(() => window['__RIFT_AVIATOR__'].cameraRig.mode.id);
  await page.screenshot({ path: `${screenshotDir}/12_camera_first_person.png` });
  await page.keyboard.press('KeyV');
  await page.waitForTimeout(120);
  const afterSecond = await page.evaluate(() => window['__RIFT_AVIATOR__'].cameraRig.mode.id);
  await page.screenshot({ path: `${screenshotDir}/13_camera_chase.png` });
  await page.keyboard.press('KeyV');
  await page.waitForTimeout(120);
  const afterThird = await page.evaluate(() => window['__RIFT_AVIATOR__'].cameraRig.mode.id);
  const topFogDisabled = await page.evaluate(() => {
    const game = window['__RIFT_AVIATOR__'];
    game.updateFogForCameraMode();
    return game.cameraRig.mode.id === 'top' && game.setup.scene.fog === null;
  });
  await page.screenshot({ path: `${screenshotDir}/14_camera_top.png` });
  await page.keyboard.press('KeyV');
  await page.waitForTimeout(120);
  const currentFogRestored = await page.evaluate(() => {
    const game = window['__RIFT_AVIATOR__'];
    game.updateFogForCameraMode();
    return game.cameraRig.mode.id === 'current' && game.setup.scene.fog !== null;
  });
  const currentFogRange = await page.evaluate(() => {
    const fog = window['__RIFT_AVIATOR__'].setup.fog;
    return { near: fog.near, far: fog.far };
  });
  return {
    name: 'V cycles camera view',
    passed:
      before === 'current' &&
      afterFirst === 'firstPerson' &&
      afterSecond === 'chase' &&
      afterThird === 'top' &&
      topFogDisabled &&
      currentFogRestored &&
      currentFogRange.near >= 20 &&
      currentFogRange.far >= 56,
    detail: `${before} -> ${afterFirst} -> ${afterSecond} -> ${afterThird}, topFogDisabled=${topFogDisabled}, currentFogRestored=${currentFogRestored}, fog=${currentFogRange.near}/${currentFogRange.far}`
  };
}

async function playerProjectileCount(page) {
  return page.evaluate(() => window['__RIFT_AVIATOR__'].projectiles.items.filter((projectile) => projectile.owner === 'player').length);
}

async function captureGIState(page) {
  return page.evaluate(() => {
    const game = window['__RIFT_AVIATOR__'];
    game.ddgi.update(0, game.state);
    game.render();
    return {
      enabled: game.ddgi.uniforms.ddgiEnabled.value,
      probeCount: game.ddgi.probes.length,
      patchedMaterials: game.ddgi.materials.size,
      receiverPanels: game.environment.receiverPanels?.length ?? 0,
      visibleReceiverPanels: game.environment.receiverPanels?.filter((panel) => panel.visible).length ?? 0
    };
  });
}

function formatChecks(checks) {
  return checks.map((check) => `${check.passed ? 'PASS' : 'FAIL'} ${check.name}: ${check.detail}`).join('\n');
}

async function writeVerificationReport(checks, failed, url) {
  const rows = checks
    .map((check) => `| ${check.passed ? 'PASS' : 'FAIL'} | ${check.name} | ${check.detail.replaceAll('\n', '<br>')} |`)
    .join('\n');
  const body = `# Verification Report

## Environment

- URL: \`${url}\`
- Viewport: 1440 x 900
- Browser path: \`${chromePath}\`
- QA mode: \`qa=visual\` enables drawing-buffer preservation only for pixel checks.
- Automation: \`playwright-core\` with local Google Chrome headless.

## Result

${failed.length === 0 ? 'All verification checks passed.' : `${failed.length} verification checks failed.`}

| Status | Check | Evidence |
|---|---|---|
${rows}

## Screenshots

- [Overview](./screenshots/00_overview.png)
- [Movement controls](./screenshots/01_movement_controls.png)
- [Combat](./screenshots/02_combat_dimension.png)
- [Space shooting](./screenshots/04_space_shooting.png)
- [Empty ammo fire block](./screenshots/05_ammo_empty_blocked.png)
- [Phase](./screenshots/03_phase_dimension.png)
- [DDGI debug](./screenshots/08_surfel_debug.png)
- [GI off](./screenshots/09_gi_off.png)
- [GI on](./screenshots/10_gi_on.png)
- [Rift first person](./screenshots/15_rift_first_person.png)
- [Rift chase](./screenshots/16_rift_chase.png)
- [Rift top](./screenshots/17_rift_top.png)
- [Green pickups](./screenshots/18_green_pickups.png)
- [HBV debug](./screenshots/19_hbv_debug.png)
`;
  await writeFile(reportPath, body);
}
