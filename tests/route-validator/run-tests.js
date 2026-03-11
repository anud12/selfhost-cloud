const { spawnSync } = require('child_process');
const path = require('path');
const validator = path.resolve(__dirname, '../../infrastructure/route-manager/validator.js');

console.log('Running route-validator tests...');
let ok = true;

// valid example should pass
let res = spawnSync('node', [validator, path.resolve(__dirname, 'valid-example.yaml')], { encoding: 'utf8' });
if (res.status !== 0) {
  console.error('Valid example failed:', res.stderr);
  ok = false;
} else {
  console.log('Valid example passed');
}

// invalid example should fail
res = spawnSync('node', [validator, path.resolve(__dirname, 'invalid-example.yaml')], { encoding: 'utf8' });
if (res.status === 0) {
  console.error('Invalid example unexpectedly passed');
  ok = false;
} else {
  console.log('Invalid example produced errors (expected)');
  console.error(res.stderr);
}

process.exit(ok ? 0 : 1);
