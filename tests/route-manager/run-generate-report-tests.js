const { spawnSync } = require('child_process');
const path = require('path');

const gen = path.resolve(__dirname, '../../infrastructure/route-manager/generate-report.js');
console.log('Running generate-report tests...');
const res = spawnSync('node', [gen, 'example'], { encoding: 'utf8' });
console.log('stdout:\n', res.stdout);
console.log('stderr:\n', res.stderr);
if (res.status !== 0) {
  console.error('Generate-report failed');
  process.exit(1);
}
console.log('Generate-report passed');
process.exit(0);
