import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const targets = [
  'src/studio.jsx',
  'src/studio/i18n.js',
  'src/aiGatewayClient.js',
  'src/studio/providers',
  'src/studio/storage'
];

const suspiciousTokens = [
  '\uFFFD',
  '\u921E',
  '\u9379',
  '\u934F',
  '\u9422',
  '\u7470',
  '\u93C0',
  '\u951F',
  '\u4E63',
  '\u4E5A',
  '鍔犺浇',
  '鏇村',
  '涓婁紶',
  '娑傛姽',
  '妫€娴',
  '椤甸潰',
  '璇锋眰',
  '鍙傝€',
  '鏀惧叆',
  '杈撳叆',
  '闇€瑕',
  '鐢熸垚',
  '浼氳瘽',
  '鍘嗗彶',
  '绠€浣'
];

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

const files = targets
  .flatMap(walk)
  .filter((file) => /\.(js|jsx|mjs)$/i.test(file));

const failures = [];
for (const file of files) {
  const body = fs.readFileSync(path.join(root, file), 'utf8');
  const lines = body.split(/\r?\n/);
  lines.forEach((line, index) => {
    const token = suspiciousTokens.find((item) => line.includes(item));
    if (token) {
      failures.push(`${file}:${index + 1}: suspicious source encoding artifact U+${token.codePointAt(0).toString(16).toUpperCase()}: ${line.slice(0, 160)}`);
    }
  });
}

if (failures.length) {
  console.error(`Source encoding check failed:\n${failures.map((item) => `- ${item}`).join('\n')}`);
  process.exit(1);
}

console.log('Source encoding check passed.');
