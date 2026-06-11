import { execFileSync } from 'node:child_process';

function run(command, args, options = {}) {
  console.log(`$ ${[command, ...args].join(' ')}`);
  execFileSync(command, args, { stdio: 'inherit', ...options });
}

const composeArgs = ['compose', '--env-file', process.env.STUDIO_ENV_FILE || '.env'];
const shouldBackup = process.env.STUDIO_SKIP_BACKUP !== 'true';

if (shouldBackup) {
  run(process.execPath, ['scripts/ops-backup.mjs']);
}

run('docker', [...composeArgs, 'pull']);
run('docker', [...composeArgs, 'build']);
run('docker', [...composeArgs, 'up', '-d']);
run(process.execPath, ['scripts/ops-self-check.mjs']);
