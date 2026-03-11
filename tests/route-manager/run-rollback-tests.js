const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const rollback = path.resolve(__dirname, '../../infrastructure/route-manager/rollback.js');
const repoRoot = path.resolve(__dirname, '../../');
const indexPath = path.join(repoRoot, 'state', 'route-activations', 'index.json');

console.log('Running rollback tests...');
if (!fs.existsSync(indexPath)) { console.error('No index.json found'); process.exit(1); }
const idx = JSON.parse(fs.readFileSync(indexPath,'utf8'));
if (!Array.isArray(idx) || idx.length === 0) { console.error('Index empty'); process.exit(1); }
const targetActivation = idx[0].activationId;
console.log('Using activationId', targetActivation);
const res = spawnSync('node', [rollback, targetActivation, '--author', 'tester', '--reason', 'test rollback', '--dry-run'], { encoding: 'utf8' });
console.log('stdout:\n', res.stdout);
console.log('stderr:\n', res.stderr);
if (res.status !== 0) {
  console.error('Rollback dry-run failed');
  process.exit(1);
}
console.log('Rollback dry-run passed');
process.exit(0);
