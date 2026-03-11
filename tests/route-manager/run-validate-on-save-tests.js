const { spawnSync } = require('child_process');
const path = require('path');

const script = path.resolve(__dirname, '../../infrastructure/route-manager/validate-on-save.js');
const valid = path.resolve(__dirname, '../route-validator/valid-example.yaml');
const invalid = path.resolve(__dirname, '../route-validator/invalid-example.yaml');

console.log('Running validate-on-save tests...');
let res = spawnSync('node', [script], { env: Object.assign({}, process.env, { TEST_FILES: valid }), encoding: 'utf8' });
console.log('stdout:\n', res.stdout);
console.log('stderr:\n', res.stderr);
if (res.status !== 0) { console.error('validate-on-save failed for valid file'); process.exit(1); }

res = spawnSync('node', [script], { env: Object.assign({}, process.env, { TEST_FILES: invalid }), encoding: 'utf8' });
console.log('stdout:\n', res.stdout);
console.log('stderr:\n', res.stderr);
if (res.status === 0) { console.error('validate-on-save unexpectedly succeeded for invalid file'); process.exit(1); }

console.log('validate-on-save tests passed');
process.exit(0);
