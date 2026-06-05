import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const htmlPath = path.join(root, 'dist', 'studio.html');

if (!fs.existsSync(htmlPath)) {
  console.error('dist/studio.html is missing. Run npm run build:studio before checking the /studio/ asset base.');
  process.exit(1);
}

const html = fs.readFileSync(htmlPath, 'utf8');
const hasStudioAssetBase = html.includes('/studio/studio-assets/');
const hasRootAssetBase = /["']\/studio-assets\//.test(html);

if (!hasStudioAssetBase || hasRootAssetBase) {
  console.error([
    'Studio subpath build check failed.',
    'Expected built assets to use /studio/studio-assets/.',
    'The old /studio-assets/ root path causes /studio/ deployments to load HTML fallbacks or 404 assets.',
    '',
    html
  ].join('\n'));
  process.exit(1);
}

console.log('Studio subpath build asset base check passed.');
