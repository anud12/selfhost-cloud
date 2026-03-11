const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const audit = path.resolve(__dirname, '../../infrastructure/route-manager/audit.js');
const repoRoot = path.resolve(__dirname, '../../');
const auditDir = path.join(repoRoot, '_project', 'migrations', 'audit');

console.log('Running audit tests...');
if (!fs.existsSync(auditDir)) {
  console.log('No audit directory; creating a dummy audit file for test');
  fs.mkdirSync(auditDir, { recursive: true });
  fs.writeFileSync(path.join(auditDir, 'dummy-audit.md'), '# dummy');
}
const res = spawnSync('node', [audit, 'list'], { encoding: 'utf8' });
console.log('stdout:\n', res.stdout);
if (res.status !== 0) { console.error('Audit list failed'); process.exit(1); }
console.log('Audit list passed');
process.exit(0);
