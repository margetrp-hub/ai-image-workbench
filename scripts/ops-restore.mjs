import fs from 'node:fs/promises';
import path from 'node:path';

const backupPath = process.argv[2] ? path.resolve(process.argv[2]) : '';
const baseUrl = String(process.env.STUDIO_HISTORY_BASE_URL || process.env.STUDIO_API_BASE_URL || 'http://127.0.0.1:8787').replace(/\/+$/, '');
const token = process.env.STUDIO_BACKUP_TOKEN || process.env.STUDIO_API_TOKEN || process.env.STUDIO_AUTH_TOKEN || '';

if (!backupPath) {
  throw new Error('Usage: npm run ops:restore -- path/to/backup.json');
}
if (!token) {
  throw new Error('Set STUDIO_BACKUP_TOKEN before running restore.');
}

const raw = await fs.readFile(backupPath, 'utf8');
JSON.parse(raw);

const response = await fetch(`${baseUrl}/studio-api/backup/restore`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: raw
});
const payload = await response.json().catch(async () => ({ raw: await response.text().catch(() => '') }));
if (!response.ok || payload.ok === false) {
  throw new Error(`Restore failed: HTTP ${response.status}\n${JSON.stringify(payload, null, 2)}`);
}

console.log(JSON.stringify(payload, null, 2));
