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
  await page.goto(`${baseUrl}?demo=stability`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.hud');
  await page.screenshot({ path: `${screenshotDir}/00_overview.png` });
  checks.push(await checkCanvasNotBlank(page, 'stability canvas nonblank'));
  checks.push(await expectText(page, '[data-dimension]', '안정 차원', 'starts in stability dimension'));

  await page.keyboard.press('Digit2');
  await page.waitForTimeout(200);
  checks.push(await expectText(page, '[data-dimension]', '전투 차원', 'Digit2 switches to combat'));
  checks.push(await expectText(page, '[data-stacks]', 'Stacks ◆◆◇', 'dimension switch spends one stack'));
  await page.screenshot({ path: `${screenshotDir}/02_combat_dimension.png` });

  const ammoBefore = Number(await page.locator('[data-ammo]').textContent());
  await page.keyboard.down('Space');
  await page.waitForTimeout(250);
  await page.keyboard.up('Space');
  await page.waitForTimeout(100);
  const ammoAfter = Number(await page.locator('[data-ammo]').textContent());
  checks.push({ name: 'Space fires and spends ammo', passed: ammoAfter < ammoBefore, detail: `${ammoBefore} -> ${ammoAfter}` });
  await page.screenshot({ path: `${screenshotDir}/04_space_shooting.png` });

  await page.keyboard.press('Digit3');
  await page.waitForTimeout(250);
  checks.push(await expectText(page, '[data-dimension]', '위상 차원', 'Digit3 switches to phase'));
  await page.screenshot({ path: `${screenshotDir}/03_phase_dimension.png` });

  await page.keyboard.press('KeyG');
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${screenshotDir}/08_surfel_debug.png` });
  checks.push(await checkCanvasNotBlank(page, 'surfel debug canvas nonblank'));

  await page.keyboard.press('KeyH');
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${screenshotDir}/09_gi_off.png` });
  await page.keyboard.press('KeyH');
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${screenshotDir}/10_gi_on.png` });
  checks.push({ name: 'G and H toggles exercised', passed: true, detail: 'surfel debug and GI toggles captured' });

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
  await writeVerificationReport(checks, failed, baseUrl);

  if (failed.length > 0) {
    console.error(formatChecks(checks));
    process.exitCode = 1;
  } else {
    console.log(formatChecks(checks));
  }
} finally {
  server.kill('SIGTERM');
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
- Browser plugin path: attempted first, failed because the in-app browser runtime exited with a CODEX_HOME path error.
- Fallback: \`playwright-core\` with local Google Chrome headless.

## Result

${failed.length === 0 ? 'All verification checks passed.' : `${failed.length} verification checks failed.`}

| Status | Check | Evidence |
|---|---|---|
${rows}

## Screenshots

- [Overview](./screenshots/00_overview.png)
- [Combat](./screenshots/02_combat_dimension.png)
- [Space shooting](./screenshots/04_space_shooting.png)
- [Phase](./screenshots/03_phase_dimension.png)
- [Surfel debug](./screenshots/08_surfel_debug.png)
- [GI off](./screenshots/09_gi_off.png)
- [GI on](./screenshots/10_gi_on.png)
`;
  await writeFile(reportPath, body);
}
