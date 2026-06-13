import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-image-workbench-job-dedupe-'));
const token = 'generation-job-dedupe-smoke-token';
const port = 23000 + Math.floor(Math.random() * 1000);
const gatewayPort = port + 1000;
const baseUrl = `http://127.0.0.1:${port}`;
const gatewayBaseUrl = `http://127.0.0.1:${gatewayPort}/v1`;
const tinyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';

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

let gatewayHits = 0;
const gateway = http.createServer((req, res) => {
  if (req.url === '/v1/images/generations') {
    gatewayHits += 1;
    setTimeout(() => {
      if (res.destroyed) return;
      res.writeHead(200, { 'Content-Type': 'application/json', 'x-request-id': `dedupe-${gatewayHits}` });
      res.end(JSON.stringify({ data: [{ b64_json: tinyPngBase64 }] }));
    }, 700);
    return;
  }
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: { message: 'not found' } }));
});

await new Promise((resolve) => gateway.listen(gatewayPort, '127.0.0.1', resolve));

const child = spawn(process.execPath, ['scripts/image-sub2api-studio-history-service.mjs'], {
  cwd: path.resolve(import.meta.dirname, '..'),
  env: {
    ...process.env,
    PORT: String(port),
    STUDIO_HISTORY_PORT: String(port),
    STUDIO_HISTORY_HOST: '127.0.0.1',
    STUDIO_AUTH_MODE: 'local',
    STUDIO_DATA_DIR: dataDir,
    STUDIO_ALLOWED_ORIGINS: 'http://127.0.0.1',
    STUDIO_JOB_CONCURRENCY: '1'
  },
  stdio: ['ignore', 'pipe', 'pipe']
});

let stderr = '';
child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

try {
  await waitForHealth();
  const body = {
    apiKey: 'dedupe-smoke-key',
    gatewayBaseUrl,
    request: {
      id: 'dedupejob1',
      clientRequestId: 'dedupejob1-client',
      sessionId: 'dedupe-session',
      providerId: 'openai-compatible',
      apiKeySource: 'manual',
      mode: 'image',
      route: 'generations',
      fingerprint: 'dedupe-session|image|generations|gpt-image-2|same-prompt',
      model: 'gpt-image-2',
      prompt: 'same prompt',
      generationPrompt: 'same prompt',
      size: '1024x1024',
      quality: 'medium',
      n: 1,
      count: 1
    }
  };

  const first = await request('/studio-api/generation-jobs', {
    method: 'POST',
    body: JSON.stringify(body)
  });
  const second = await request('/studio-api/generation-jobs', {
    method: 'POST',
    body: JSON.stringify({
      ...body,
      request: {
        ...body.request,
        id: 'dedupejob2',
        clientRequestId: 'dedupejob2-client'
      }
    })
  });

  assert(first.job?.id === 'dedupejob1', 'First request should create the original job.', first);
  assert(second.duplicate === true, 'Second active duplicate should be marked as duplicate.', second);
  assert(second.job?.id === first.job?.id, 'Duplicate response should return the original active job.', { first, second });

  await new Promise((resolve) => setTimeout(resolve, 1200));
  const jobs = await request('/studio-api/generation-jobs?sessionId=dedupe-session');
  assert(jobs.jobs.length === 1, 'Only one persisted job should exist for duplicate active submissions.', jobs);
  assert(gatewayHits === 1, 'Duplicate active submissions should hit the gateway once.', { gatewayHits });

  console.log(JSON.stringify({
    ok: true,
    createdJobId: first.job.id,
    duplicateJobId: second.job.id,
    gatewayHits,
    jobCount: jobs.jobs.length
  }, null, 2));
} finally {
  child.kill('SIGTERM');
  gateway.close();
  await new Promise((resolve) => setTimeout(resolve, 100));
}

if (stderr.trim()) {
  console.error(stderr.trim());
}
