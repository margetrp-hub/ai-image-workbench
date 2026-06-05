import { execFileSync } from 'node:child_process';

function assert(condition, message, evidence) {
  if (!condition) {
    const suffix = evidence ? `\n${JSON.stringify(evidence, null, 2)}` : '';
    throw new Error(`${message}${suffix}`);
  }
}

function composeConfigJson() {
  const command = process.platform === 'win32' ? 'cmd.exe' : 'docker';
  const args = process.platform === 'win32'
    ? ['/d', '/c', 'docker', 'compose', '--env-file', '.env.example', 'config', '--format', 'json']
    : ['compose', '--env-file', '.env.example', 'config', '--format', 'json'];
  const raw = execFileSync(command, args, { encoding: 'utf8' });
  return JSON.parse(raw);
}

const config = composeConfigJson();
const services = config.services || {};
const web = services['studio-web'];
const history = services['studio-history'];

assert(web, 'Docker Compose must define studio-web.');
assert(history, 'Docker Compose must define studio-history.');

assert(web.build?.target === 'web', 'studio-web must build the web target.', web.build);
assert(history.build?.target === 'history', 'studio-history must build the history target.', history.build);
assert(web.build?.args?.VITE_BASE_PATH === '/studio/', 'studio-web must build assets for /studio/.', web.build?.args);
assert(web.build?.args?.STUDIO_BASE_PATH === '/studio/', 'studio-web must pass STUDIO_BASE_PATH=/studio/.', web.build?.args);
assert(web.build?.args?.VITE_AI_IMAGE_ROUTE === 'auto', 'studio-web must default image route to auto.', web.build?.args);
assert(web.environment?.STUDIO_HISTORY_UPSTREAM === 'http://studio-history:8787', 'studio-web must proxy to studio-history.', web.environment);
assert(web.depends_on?.['studio-history']?.condition === 'service_healthy', 'studio-web must wait for a healthy history service.', web.depends_on);
assert(web.healthcheck?.test?.join(' ').includes('/studio/'), 'studio-web healthcheck must verify /studio/.', web.healthcheck);

const webPort = web.ports?.[0];
assert(webPort?.target === 80 && String(webPort.published) === '8080', 'studio-web must publish host 8080 to container 80 by default.', web.ports);

assert(history.environment?.STUDIO_AUTH_MODE === 'local', 'studio-history must default to local auth for standalone Docker.', history.environment);
assert(history.environment?.STUDIO_DATA_DIR === '/data', 'studio-history must write persisted data to /data.', history.environment);
assert(history.environment?.STUDIO_JOB_CONCURRENCY === '1', 'studio-history must default to conservative job concurrency.', history.environment);
assert(history.environment?.STUDIO_ALLOWED_ORIGINS === 'https://studio.example.com', 'studio-history must read allowed origins from .env.example.', history.environment);
assert(history.healthcheck?.test?.join(' ').includes('/studio-api/health'), 'studio-history healthcheck must verify /studio-api/health.', history.healthcheck);

const historyVolumes = history.volumes || [];
assert(historyVolumes.some((volume) => volume.type === 'volume' && volume.source === 'studio-data' && volume.target === '/data'), 'studio-history must persist /data in the studio-data volume.', historyVolumes);
assert(historyVolumes.some((volume) => volume.type === 'bind' && volume.target === '/app/library' && volume.read_only === true), 'studio-history must mount library data read-only.', historyVolumes);
assert(config.volumes?.['studio-data'], 'Docker Compose must declare the studio-data volume.', config.volumes);

console.log('Docker Compose check passed.');
