import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-image-workbench-session-isolation-'));
const token = 'session-isolation-smoke-token';
const port = 22000 + Math.floor(Math.random() * 1000);
const baseUrl = `http://127.0.0.1:${port}`;
const userKey = createHash('sha256').update(`local:${token}`).digest('hex');
const tinyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';
const tinyPngDataUrl = `data:image/png;base64,${tinyPngBase64}`;

function assert(condition, message, evidence) {
  if (!condition) {
    throw new Error(`${message}${evidence ? `\n${JSON.stringify(evidence, null, 2)}` : ''}`);
  }
}

async function waitForHealth() {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/studio-api/health`);
      if (response.ok) return;
    } catch {
      // Service is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  throw new Error('History service did not become healthy.');
}

async function request(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || `HTTP_${response.status}`);
  }
  return payload;
}

const child = spawn(process.execPath, ['scripts/image-sub2api-studio-history-service.mjs'], {
  cwd: path.resolve(import.meta.dirname, '..'),
  env: {
    ...process.env,
    PORT: String(port),
    STUDIO_HISTORY_PORT: String(port),
    STUDIO_HISTORY_HOST: '127.0.0.1',
    STUDIO_AUTH_MODE: 'local',
    STUDIO_DATA_DIR: dataDir,
    STUDIO_ALLOWED_ORIGINS: 'http://127.0.0.1'
  },
  stdio: ['ignore', 'pipe', 'pipe']
});

let stderr = '';
child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

try {
  await waitForHealth();
  const sessions = [
    { id: 'desk-alpha', prompt: 'alpha prompt', nodeId: 'alpha-node' },
    { id: 'desk-beta', prompt: 'beta prompt', nodeId: 'beta-node' }
  ];

  for (const session of sessions) {
    await request(`/studio-api/session?sessionId=${encodeURIComponent(session.id)}`, {
      method: 'POST',
      body: JSON.stringify({
        sessionId: session.id,
        mode: 'image',
        prompt: session.prompt,
        results: [tinyPngDataUrl],
        canvasNodes: [{
          id: session.nodeId,
          canvasIndex: 1,
          kind: 'image',
          url: tinyPngDataUrl,
          prompt: session.prompt
        }]
      })
    });
  }

  const alpha = (await request('/studio-api/session?sessionId=desk-alpha')).session;
  const beta = (await request('/studio-api/session?sessionId=desk-beta')).session;
  assert(alpha?.sessionId === 'desk-alpha', 'Session alpha should load by its own id.', alpha);
  assert(beta?.sessionId === 'desk-beta', 'Session beta should load by its own id.', beta);
  assert(alpha.prompt === 'alpha prompt', 'Session alpha prompt should not be replaced by beta.', alpha);
  assert(beta.prompt === 'beta prompt', 'Session beta prompt should not be replaced by alpha.', beta);
  assert(alpha.canvasNodes?.[0]?.id === 'alpha-node', 'Session alpha canvas node should remain isolated.', alpha);
  assert(beta.canvasNodes?.[0]?.id === 'beta-node', 'Session beta canvas node should remain isolated.', beta);
  assert(alpha.results?.[0]?.includes('/studio-api/history/session-desk-alpha/assets/'), 'Alpha asset should be stored in an alpha-scoped directory.', alpha);
  assert(beta.results?.[0]?.includes('/studio-api/history/session-desk-beta/assets/'), 'Beta asset should be stored in a beta-scoped directory.', beta);

  await request('/studio-api/session?sessionId=desk-alpha', { method: 'DELETE' });
  const alphaAfterDelete = (await request('/studio-api/session?sessionId=desk-alpha')).session;
  const betaAfterDelete = (await request('/studio-api/session?sessionId=desk-beta')).session;
  assert(!alphaAfterDelete, 'Deleting alpha should remove only alpha current session.', alphaAfterDelete);
  assert(betaAfterDelete?.sessionId === 'desk-beta', 'Deleting alpha should not remove beta current session.', betaAfterDelete);
  const betaAssetPath = path.join(dataDir, 'users', userKey, 'assets', 'session-desk-beta');
  const betaAssets = await fs.readdir(betaAssetPath);
  assert(betaAssets.length > 0, 'Deleting alpha should not remove beta assets.', betaAssets);

  console.log(JSON.stringify({
    ok: true,
    dataDir,
    alphaAsset: alpha.results[0],
    betaAsset: beta.results[0],
    betaAssets
  }, null, 2));
} finally {
  child.kill('SIGTERM');
  await new Promise((resolve) => setTimeout(resolve, 100));
}

if (stderr.trim()) {
  console.error(stderr.trim());
}
