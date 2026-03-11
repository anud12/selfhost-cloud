const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const apply = path.resolve(__dirname, '../../infrastructure/route-manager/apply.js');
const sample = path.resolve(__dirname, '../route-validator/valid-example.yaml');
const repoRoot = path.resolve(__dirname, '../../');
const stateDir = path.join(repoRoot, 'state', 'route-activations');

// clean state
if (fs.existsSync(stateDir)) {
  fs.rmSync(stateDir, { recursive: true, force: true });
}

fs.mkdirSync(stateDir, { recursive: true });

console.log('Running apply tests...');
let res = spawnSync('node', [apply, 'activate', sample, '--author', 'test-run'], { encoding: 'utf8' });
console.log('stdout:', res.stdout);
console.log('stderr:', res.stderr);
if (res.status !== 0) {
  console.error('Apply failed');
  process.exit(1);
}

const files = fs.readdirSync(stateDir).filter(f => f.endsWith('.json'));
if (files.length === 0) {
  console.error('No activation files created');
  process.exit(1);
}

const idx = JSON.parse(fs.readFileSync(path.join(stateDir, 'index.json'), 'utf8'));
if (!Array.isArray(idx) || idx.length === 0) {
  console.error('Index not created properly');
  process.exit(1);
}

console.log('Apply tests passed, activations:', files);
process.exit(0);
