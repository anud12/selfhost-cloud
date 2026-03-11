#!/usr/bin/env node
// Suite: catch-all route — GET / → notfound service (404)
const { request, BASE } = require('./helpers');

const tests = [
  {
    name: 'GET / returns 404',
    async fn() {
      const r = await request('/');
      if (r.status !== 404) throw new Error(`expected 404, got ${r.status}`);
    },
  },
  {
    name: 'GET / body is custom 404 HTML',
    async fn() {
      const r = await request('/');
      if (!r.body.includes('Not Found')) throw new Error(`body missing 'Not Found': ${r.body.slice(0, 80)}`);
    },
  },
  {
    name: 'GET / Server header is nginx',
    async fn() {
      const r = await request('/');
      const server = r.headers['server'] || '';
      if (!server.toLowerCase().includes('nginx')) throw new Error(`Server header: '${server}'`);
    },
  },
  {
    name: 'GET /nonexistent returns 404 (catch-all depth)',
    async fn() {
      const r = await request('/nonexistent/path');
      if (r.status !== 404) throw new Error(`expected 404, got ${r.status}`);
    },
  },
];

module.exports = { tests, label: `notfound route  [target: ${BASE}]` };

if (require.main === module) {
  const { runSuite } = require('../test.js');
  runSuite(module.exports).then((failed) => process.exit(failed > 0 ? 1 : 0));
}
