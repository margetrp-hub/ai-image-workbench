import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const docTargets = [
  'README.md',
  'README.zh-CN.md',
  'RELEASE_NOTES.md',
  'SECURITY.md',
  'docs'
];
const suspiciousPatterns = [
  /\uFFFD/,
  /鈹[^\n]*/,
  /�/,
  /\?{4,}/,
  /鎴[^\n]*/,
  /杩[^\n]*/,
  /瀵[^\n]*/,
  /涓[^\n]*/,
  /鐢[^\n]*/,
  /鍥[^\n]*/,
  /乣/,
  /乚/
];
const allowedFiles = new Set();

function walk(target) {
  const fullPath = path.join(root, target);
  if (!fs.existsSync(fullPath)) return [];
  const stat = fs.statSync(fullPath);
  if (stat.isFile()) return [target];
  return fs.readdirSync(fullPath, { withFileTypes: true }).flatMap((entry) => {
    const child = path.join(target, entry.name).replace(/\\/g, '/');
    if (entry.isDirectory()) return walk(child);
    return entry.isFile() ? [child] : [];
  });
}

const files = docTargets
  .flatMap(walk)
  .filter((file) => /\.md$/i.test(file))
  .filter((file) => !allowedFiles.has(file));

const failures = [];
for (const file of files) {
  const body = fs.readFileSync(path.join(root, file), 'utf8');
  const lines = body.split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(line)) {
        failures.push(`${file}:${index + 1}: suspicious encoding artifact: ${line.slice(0, 160)}`);
        break;
      }
    }
  });
}

if (failures.length) {
  console.error(`Documentation encoding check failed:\n${failures.map((item) => `- ${item}`).join('\n')}`);
  process.exit(1);
}

console.log('Documentation encoding check passed.');
