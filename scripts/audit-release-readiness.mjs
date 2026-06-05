import { execFileSync } from 'node:child_process';

const items = [];

function add(name, status, evidence, command = '') {
  items.push({ name, status, evidence, command });
}

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options
  });
}

function npmScript(script) {
  try {
    execFileSync(process.platform === 'win32' ? 'cmd.exe' : 'npm', process.platform === 'win32'
      ? ['/d', '/c', 'npm', 'run', script]
      : ['run', script], {
      stdio: 'inherit'
    });
    return true;
  } catch {
    return false;
  }
}

function dockerDaemonAvailable() {
  try {
    run(process.platform === 'win32' ? 'cmd.exe' : 'docker', process.platform === 'win32'
      ? ['/d', '/c', 'docker', 'version']
      : ['version']);
    return true;
  } catch {
    return false;
  }
}

add(
  'local pre-release gate',
  npmScript('check:local') ? 'pass' : 'fail',
  'Build, route dispatch, deploy config, Docker Compose config, docs/source/i18n/env checks, persistence, queue recovery, browser layout, performance, and language smokes.',
  'npm run check:local'
);

add(
  'release package build and structure',
  npmScript('package:release') ? 'pass' : 'fail',
  'Fresh release zip pairs are built from the current worktree, then checked for required core/service files and package-internal starter data.',
  'npm run package:release'
);

if (dockerDaemonAvailable()) {
  add(
    'Docker runtime smoke',
    npmScript('smoke:docker') ? 'pass' : 'fail',
    'Docker daemon is available; Compose runtime smoke attempted.',
    'npm run smoke:docker'
  );
} else {
  add(
    'Docker runtime smoke',
    'blocked',
    'Docker daemon is not available on this machine, so the complete container deployment shape is not yet runtime-proven.',
    'npm run smoke:docker'
  );
}

console.table(items.map(({ name, status, command }) => ({ name, status, command })));

const failures = items.filter((item) => item.status !== 'pass');
if (failures.length) {
  console.error([
    'Release readiness audit is not complete.',
    ...failures.map((item) => `- ${item.name}: ${item.status}. ${item.evidence}`)
  ].join('\n'));
  process.exit(1);
}

console.log('Release readiness audit passed.');
