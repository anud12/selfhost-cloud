#!/usr/bin/env node
// Suite: helm-deployer route — GET /infrastructure/helm-deployer → helm-deployer service (200)
const { request, BASE } = require('./helpers');

const tests = [
  {
    name: 'GET /infrastructure/helm-deployer/health returns 200',
    async fn() {
      const r = await request('/infrastructure/helm-deployer/health');
      if (r.status !== 200) throw new Error(`expected 200, got ${r.status}`);
    },
  },
];

module.exports = { tests, label: `helm-deployer route  [target: ${BASE}]` };

if (require.main === module) {
  const { runSuite } = require('../test.js');
  runSuite(module.exports).then((failed) => process.exit(failed > 0 ? 1 : 0));
}
