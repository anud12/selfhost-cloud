#!/usr/bin/env node
// Suite: helm-deployer route — GET /infrastructure/helm-deployer → helm-deployer service (200)
const { request, BASE } = require('./helpers');

const tests = [
  {
    name: 'GET /infrastructure/helm-deployer returns 200',
    async fn() {
      const r = await request('/infrastructure/helm-deployer');
      if (r.status !== 200) throw new Error(`expected 200, got ${r.status}`);
    },
  },
  {
    name: 'GET /infrastructure/helm-deployer body references git',
    async fn() {
      const r = await request('/infrastructure/helm-deployer');
      if (!r.body.includes('git')) throw new Error(`body missing 'git'`);
    },
  },
  {
    name: 'GET /infrastructure/helm-deployer/sub returns 200 (prefix match depth)',
    async fn() {
      const r = await request('/infrastructure/helm-deployer/sub');
      if (r.status !== 200) throw new Error(`expected 200, got ${r.status}`);
    },
  },
];

module.exports = { tests, label: `helm-deployer route  [target: ${BASE}]` };

if (require.main === module) {
  const { runSuite } = require('../test.js');
  runSuite(module.exports).then((failed) => process.exit(failed > 0 ? 1 : 0));
}
