const { spawnSync } = require('child_process');
const path = require('path');

const preview = path.resolve(__dirname, '../../infrastructure/route-manager/preview.js');
const candidate = path.resolve(__dirname, '../route-validator/valid-example.yaml');

console.log('Running preview tests...');
const res = spawnSync('node', [preview, candidate, '--host', 'example.com', '--path', '/api/v1/users'], { encoding: 'utf8' });
console.log('stdout:\n', res.stdout);
console.log('stderr:\n', res.stderr);
if (res.status !== 0) {
  console.error('Preview failed');
  process.exit(1);
}
console.log('Preview test passed');
process.exit(0);
