const { spawnSync } = require('child_process');
const path = require('path');

const list = path.resolve(__dirname, '../../infrastructure/route-manager/list.js');
console.log('Running list tests...');
const res = spawnSync('node', [list], { encoding: 'utf8' });
console.log('stdout:\n', res.stdout);
console.log('stderr:\n', res.stderr);
if (res.status !== 0) {
  console.error('List failed');
  process.exit(1);
}
console.log('List test passed');
process.exit(0);
