import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const host = '127.0.0.1';
const port = 4173;
const baseUrl = `http://${host}:${port}/CG-final-game/`;
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
  checks.push(await expectText(page, '[data-dimension]', '안정 차원', 'starts in stability dimension'));
  checks.push(await checkMovementKey(page, 'KeyW', 'z', 'increase', 'W moves screen up'));
  checks.push(await checkMovementKey(page, 'KeyS', 'z', 'decrease', 'S moves screen down'));
  checks.push(await checkMovementKey(page, 'KeyA', 'x', 'increase', 'A maps to screen left'));
  checks.push(await checkMovementKey(page, 'KeyD', 'x', 'decrease', 'D maps to screen right'));
  checks.push(await checkCameraCycle(page));
  await page.screenshot({ path: `${screenshotDir}/01_movement_controls.png` });

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

  await page.keyboard.press('Digit2');
  await page.waitForTimeout(200);
  checks.push(await expectText(page, '[data-dimension]', '전투 차원', 'Digit2 switches to combat'));
  checks.push(await expectText(page, '[data-stacks]', 'Stacks ◆◆◇', 'dimension switch spends one stack'));
  await page.screenshot({ path: `${screenshotDir}/02_combat_dimension.png` });

  await page.keyboard.press('Digit3');
  await page.waitForTimeout(250);
  checks.push(await expectText(page, '[data-dimension]', '위상 차원', 'Digit3 switches to phase'));
  await page.screenshot({ path: `${screenshotDir}/03_phase_dimension.png` });

  await page.keyboard.press('KeyG');
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${screenshotDir}/08_surfel_debug.png` });
  checks.push(await checkCanvasNotBlank(page, 'DDGI debug canvas nonblank'));
  await page.keyboard.press('KeyG');
  await page.waitForTimeout(100);

  await page.keyboard.press('KeyH');
  await page.waitForTimeout(250);
  const giOffSignature = await captureCanvasSignature(page);
  await page.screenshot({ path: `${screenshotDir}/09_gi_off.png` });
  await page.keyboard.press('KeyH');
  await page.waitForTimeout(250);
  const giOnSignature = await captureCanvasSignature(page);
  await page.screenshot({ path: `${screenshotDir}/10_gi_on.png` });
  checks.push({
    name: 'GI toggle changes rendered pixels',
    passed: giOffSignature.hash !== giOnSignature.hash,
    detail: `off ${formatSignature(giOffSignature)} / on ${formatSignature(giOnSignature)}`
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
  await page.screenshot({ path: `${screenshotDir}/14_camera_top.png` });
  await page.keyboard.press('KeyV');
  await page.waitForTimeout(120);
  return {
    name: 'V cycles camera view',
    passed: before === 'current' && afterFirst === 'firstPerson' && afterSecond === 'chase' && afterThird === 'top',
    detail: `${before} -> ${afterFirst} -> ${afterSecond} -> ${afterThird}`
  };
}

async function playerProjectileCount(page) {
  return page.evaluate(() => window['__RIFT_AVIATOR__'].projectiles.items.filter((projectile) => projectile.owner === 'player').length);
}

async function captureCanvasSignature(page) {
  return page.locator('canvas').evaluate((canvas) => {
    const game = window['__RIFT_AVIATOR__'];
    game.ddgi.update(0, game.state);
    game.player.update(0, game.input, game.state);
    game.render();

    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    if (!gl) return { hash: 0, samples: 0, luma: 0 };
    const width = Math.max(1, Math.floor(canvas.width / 5));
    const height = Math.max(1, Math.floor(canvas.height / 5));
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
    const step = Math.max(4, Math.floor(image.length / 4 / 6000) * 4);
    let hash = 2_166_136_261;
    let luma = 0;
    let samples = 0;
    for (let index = 0; index < image.length; index += step) {
      const red = image[index];
      const green = image[index + 1];
      const blue = image[index + 2];
      hash = Math.imul(hash ^ red, 16_777_619);
      hash = Math.imul(hash ^ green, 16_777_619);
      hash = Math.imul(hash ^ blue, 16_777_619);
      luma += red * 0.2126 + green * 0.7152 + blue * 0.0722;
      samples += 1;
    }
    return { hash: hash >>> 0, samples, luma: Math.round(luma / Math.max(1, samples)) };
  });
}

function formatSignature(signature) {
  return `hash=${signature.hash}, luma=${signature.luma}, samples=${signature.samples}`;
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
`;
  await writeFile(reportPath, body);
}
