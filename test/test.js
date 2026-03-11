#!/usr/bin/env node
// Main test runner.
// Discovers all *.js files in the test/ directory tree (excluding itself),
// requires each one, and runs their exported test suite.
//
// Usage:
//   ./test/test.js
//   node test/test.js

const fs = require('fs');
const path = require('path');

// ── suite runner ─────────────────────────────────────────────────────────────

async function runSuite({ tests, label = '' }) {
  let pass = 0;
  let fail = 0;
  if (label) console.log(`\n── ${label}`);
  for (const t of tests) {
    try {
      await t.fn();
      console.log(`  PASS  ${t.name}`);
      pass++;
    } catch (err) {
      console.log(`  FAIL  ${t.name}  — ${err.message}`);
      fail++;
    }
  }
  return fail;
}

// ── discovery ────────────────────────────────────────────────────────────────

function discover(dir, self) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...discover(full, self));
    } else if (
      entry.isFile() &&
      entry.name.endsWith('.js') &&
      full !== self
    ) {
      files.push(full);
    }
  }
  return files.sort();
}

// ── main ─────────────────────────────────────────────────────────────────────

module.exports = { runSuite };

if (require.main === module) {
  const self = __filename;
  const dir = __dirname;
  const suiteFiles = discover(dir, self);

  (async () => {
    let totalFail = 0;
    for (const file of suiteFiles) {
      const mod = require(file);
      if (mod && Array.isArray(mod.tests)) {
        totalFail += await runSuite(mod);
      }
    }
    const totalPass = suiteFiles.reduce((acc, f) => {
      const m = require(f);
      return acc + (m && Array.isArray(m.tests) ? m.tests.length : 0);
    }, 0) - totalFail;

    console.log(`\nResults: ${totalPass} passed, ${totalFail} failed`);
    process.exit(totalFail > 0 ? 1 : 0);
  })();
}
