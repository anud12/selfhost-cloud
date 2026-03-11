const { spawnSync } = require('child_process');
const path = require('path');

const migrate = path.resolve(__dirname, '../../infrastructure/route-manager/migrate.js');
console.log('Running migrate tests (dry-run)...');
const res = spawnSync('node', [migrate, 'example', '--dry-run'], { encoding: 'utf8' });
console.log('stdout:\n', res.stdout);
console.log('stderr:\n', res.stderr);
if (res.status !== 0) {
  console.error('Migrate (dry-run) failed');
  process.exit(1);
}
console.log('Migrate dry-run passed');
process.exit(0);
