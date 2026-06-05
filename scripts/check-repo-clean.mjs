import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];

function git(args) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  }).trim();
}

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function fail(message) {
  failures.push(message);
}

function matchesAny(value, patterns) {
  const normalized = value.replace(/\\/g, '/');
  return patterns.some((pattern) => pattern.test(normalized));
}

const trackedFiles = git(['ls-files'])
  .split(/\r?\n/)
  .map((item) => item.trim())
  .filter(Boolean);

const forbiddenTrackedPatterns = [
  /^node_modules\//,
  /^dist\//,
  /^release\//,
  /^output\//,
  /^tmp\//,
  /^\.tmp\//,
  /^\.image-sub2api-studio-data\//,
  /^\.ohlaoo-studio-data\//,
  /^\.playwright-cli\//,
  /^\.env$/,
  /^\.env\.(?!example$)/,
  /\.zip$/,
  /\.zip\.csupload$/
];

const forbiddenTracked = trackedFiles.filter((file) => matchesAny(file, forbiddenTrackedPatterns));
if (forbiddenTracked.length) {
  fail(`Generated, local, or secret-like files are tracked:\n${forbiddenTracked.map((file) => `  - ${file}`).join('\n')}`);
}

const ignoredTracked = git(['ls-files', '-c', '-i', '--exclude-standard'])
  .split(/\r?\n/)
  .map((item) => item.trim())
  .filter(Boolean);
if (ignoredTracked.length) {
  fail(`Files ignored by .gitignore are still tracked:\n${ignoredTracked.map((file) => `  - ${file}`).join('\n')}`);
}

const requiredIgnoreEntries = [
  'node_modules/',
  'dist/',
  'release/',
  'output/',
  'tmp/',
  '.tmp/',
  '.image-sub2api-studio-data/',
  '.playwright-cli/',
  '*.zip'
];

for (const ignoreFile of ['.gitignore', '.dockerignore']) {
  const body = read(ignoreFile);
  for (const entry of requiredIgnoreEntries) {
    const dockerEntry = entry.endsWith('/') ? entry.slice(0, -1) : entry;
    if (!body.includes(entry) && !body.includes(dockerEntry)) {
      fail(`${ignoreFile} is missing ${entry}`);
    }
  }
}

const secretPattern = /\bsk-[A-Za-z0-9_-]{20,}\b/g;
const secretAllowList = new Set([
  'README.md',
  'README.zh-CN.md',
  'docs/DEPLOY.zh-CN.md',
  'docs/DOCKER.zh-CN.md'
]);

const secretHits = [];
for (const file of trackedFiles) {
  if (secretAllowList.has(file)) continue;
  if (/\.(png|jpe?g|webp|gif|svg|ico|woff2?|ttf|zip|gz)$/i.test(file)) continue;
  let body = '';
  try {
    body = read(file);
  } catch {
    continue;
  }
  const hits = [...body.matchAll(secretPattern)].map((match) => match[0]);
  if (hits.length) {
    secretHits.push({ file, hits: [...new Set(hits)] });
  }
}

if (secretHits.length) {
  fail(`Possible API keys found in tracked files:\n${secretHits.map((item) => `  - ${item.file}: ${item.hits.join(', ')}`).join('\n')}`);
}

if (failures.length) {
  console.error(`Repository cleanliness check failed:\n${failures.map((item) => `- ${item}`).join('\n')}`);
  process.exit(1);
}

console.log('Repository cleanliness check passed.');
