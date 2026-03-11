const { spawnSync } = require('child_process');
const path = require('path');

function run(cmd, args) {
  console.log('\n> ' + cmd + ' ' + args.join(' '));
  const res = spawnSync(cmd, args, { encoding: 'utf8' });
  console.log('stdout:\n', res.stdout);
  console.log('stderr:\n', res.stderr);
  if (res.status !== 0) {
    console.error('Step failed:', cmd, args.join(' '));
    process.exit(1);
  }
  return res;
}

const repoRoot = path.resolve(__dirname, '../../../');
const valid = path.join(repoRoot, 'tests', 'route-validator', 'valid-example.yaml');

// 1) Validate
run('node', [path.join(repoRoot, 'infrastructure', 'route-manager', 'validate-on-save.js')], { TEST_FILES: valid });

// Instead of passing env in this wrapper, run validator directly
run('node', [path.join(repoRoot, 'infrastructure', 'route-manager', 'validator.js'), valid]);

// 2) Apply
run('node', [path.join(repoRoot, 'infrastructure', 'route-manager', 'apply.js'), 'activate', valid, '--author', 'e2e-test', '--force']);

// 3) Preview
run('node', [path.join(repoRoot, 'infrastructure', 'route-manager', 'preview.js'), valid, '--host', 'example.com', '--path', '/api/v1/users']);

// 4) Migrate (dry-run)
run('node', [path.join(repoRoot, 'infrastructure', 'route-manager', 'migrate.js'), 'example', '--dry-run']);

// 5) Generate report
run('node', [path.join(repoRoot, 'infrastructure', 'route-manager', 'generate-report.js'), 'example']);

// 6) Rollback (dry-run)
// pick latest activation
const idx = JSON.parse(require('fs').readFileSync(path.join(repoRoot, 'state', 'route-activations', 'index.json'), 'utf8'));
const latest = idx && idx[0] && idx[0].activationId;
if (!latest) { console.error('No activation found for rollback test'); process.exit(1); }
run('node', [path.join(repoRoot, 'infrastructure', 'route-manager', 'rollback.js'), latest, '--author', 'e2e-test', '--reason', 'e2e test', '--dry-run']);

console.log('\nE2E routing tests completed successfully');
