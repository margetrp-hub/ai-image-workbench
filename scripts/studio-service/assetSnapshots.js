import fs from 'node:fs/promises';
import path from 'node:path';

export async function listFilesRecursive(rootDir, baseDir = rootDir) {
  const entries = await fs.readdir(rootDir, { withFileTypes: true }).catch((error) => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFilesRecursive(fullPath, baseDir));
      continue;
    }
    if (!entry.isFile()) continue;
    files.push({
      path: path.relative(baseDir, fullPath).split(path.sep).join('/'),
      fullPath
    });
  }
  return files;
}

export function safeBackupAssetPath(rawPath) {
  const value = String(rawPath || '').replace(/\\/g, '/');
  const segments = value.split('/').filter(Boolean);
  if (!segments.length || segments.some((segment) => segment === '..' || segment.includes('\0'))) return '';
  return segments.join('/');
}

export async function readAssetSnapshot(auth) {
  const root = path.join(auth.userDir, 'assets');
  const files = await listFilesRecursive(root);
  const assets = [];
  for (const file of files) {
    const safePath = safeBackupAssetPath(file.path);
    if (!safePath) continue;
    const buffer = await fs.readFile(file.fullPath);
    assets.push({
      path: safePath,
      bytes: buffer.length,
      data: buffer.toString('base64')
    });
  }
  return assets;
}

export async function restoreAssetSnapshot(auth, assets) {
  const root = path.join(auth.userDir, 'assets');
  await fs.rm(root, { recursive: true, force: true });
  await fs.mkdir(root, { recursive: true });
  for (const asset of assets) {
    const safePath = safeBackupAssetPath(asset?.path);
    if (!safePath || typeof asset?.data !== 'string') continue;
    const filePath = path.join(root, ...safePath.split('/'));
    const relative = path.relative(root, filePath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) continue;
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, Buffer.from(asset.data, 'base64'));
  }
}
