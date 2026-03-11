// Shared HTTP request helper for routing test suites.
const http = require('http');
const { execSync } = require('child_process');

const TARGET = process.env.TARGET || execSync('curl -s -4 ifconfig.me').toString().trim();
const BASE = `http://${TARGET}`;

function request(path) {
  return new Promise((resolve, reject) => {
    const url = `${BASE}${path}`;
    const req = http.get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body, url }));
    });
    req.on('error', reject);
    req.setTimeout(10000, () => req.destroy(new Error(`Timeout: ${url}`)));
  });
}

module.exports = { request, BASE };
