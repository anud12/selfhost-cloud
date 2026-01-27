const http = require('http');
const https = require('https');
const fs = require("fs");
const { URL } = require('url');


function podData() {
  return new Promise(async (resolve, reject) => {
    const url = `https://${process.env["KUBERNETES_SERVICE_HOST"]}:${process.env["KUBERNETES_SERVICE_PORT_HTTPS"]}`;
    log("INFO", "reading pod data", {
      url
    })

    const token = fs.readFileSync("/var/run/secrets/kubernetes.io/serviceaccount/token");
    const certification = fs.readFileSync("/var/run/secrets/kubernetes.io/serviceaccount/ca.crt");
    const result = await new Promise((innerResolve) => {
      const lib = url.startsWith('https') ? https : http;

      lib.get(`${url}/api`, {
        ca: certification,
        headers: {
          Authorization: `Bearer ${token}`
        }
      }, res => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          innerResolve(data)
        });
      }).on('error', (error) => {
        innerResolve(JSON.stringify(error, null , 2))
      });
    })

    log("INFO", "pod data result", {result})
    resolve(result);
  });
}

podData();

function loadStore() {
  const storeText = process.env["store"]
  if(storeText) {
    return JSON.parse(storeText);
  }
  return {};
}

const PORT = process.env.PORT || 3000;
let store = loadStore();

/* ---------- Logging ---------- */

function timestamp() {
  return new Date().toISOString();
}

function log(level, message, meta = {}) {
  console.log(JSON.stringify({
    ts: timestamp(),
    level,
    message,
    ...meta
  }));
}

/* ---------- Helpers ---------- */

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;

    lib.get(url, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', (error) => {
      resolve(JSON.stringify(error, null , 2))
    });
  });
}

function sendJSON(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

async function  sendForm(res, path = '') {
  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`
<!doctype html>
<html>
<head>
  <title>${await parseValue(store?.title)}</title>
</head>
<body>
  <h2>${await parseValue(store?.title)}</h2>
  <form method="post" action="/${path}">
    <label>
      Value
      <input name="value" type="text" required>
    </label>
    <br>
    <button type="submit">Save</button>
  </form>

    <h2>Configuration</h2>
    <pre>
${JSON.stringify(store, null, 2)}
    </pre>

    <h2>Values</h2>
    <table border="1" cellpadding="6" cellspacing="0">
      <tr>
        <th>
          Name
        </th>
        <th>
          Value
        </th>
      </th>
        ${await Promise.all(
          Object.entries(store).map(async ([key, value]) => {
          const resolved = await parseValue(value);
          return `<tr>
            <td>${key}</td>
            <td>${resolved}</td>
          </tr>`;
          })
        )}
    </table>
</body>
</html>
`);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => data += c);
    req.on('end', () => resolve(data || null));
    req.on('error', reject);
  });
}


async function parseValue(string) {
  if(string.startsWith("env:")) {
    return process.env[string.replace("env:", "")];
  }
  if(string.startsWith("request:")) {
    return await fetchUrl(string.replace("request:", ""));
  }
  return string;
}

/* ---------- Server ---------- */


const server = http.createServer(async (req, res) => {
  log('info', 'init', {
    store
  });
  const start = Date.now();
  const url = new URL(req.url, `http://${req.headers.host}`);
  const parts = url.pathname.split('/').filter(Boolean);

  res.on('finish', () => {
    log('info', 'request', {
      method: req.method,
      path: url.pathname,
      status: res.statusCode,
      duration_ms: Date.now() - start
    });
  });
  const key = parts[0];

  try {

    // GET /
    if (req.method === 'GET' && !key) {
      return await sendForm(res, key);
    }
    // POST /
    if (req.method === 'POST' && !key) {
      const raw = await readBody(req);
      const body = new URLSearchParams(raw);

      store = JSON.parse(body.get("value"));
      res.writeHead(302, {"Location": '/'} );
      res.end();
      return;
    }

    sendJSON(res, 405, { error: 'Method Not Allowed' });

  } catch (err) {
    throw err;
  }
});


// Graceful shutdown
function shutdown() {
  log('info', 'shutdown_initiated');
  server.close(err => {
    if (err) {
      log('error', 'shutdown_error', { error: err.message });
      process.exit(1);
    }
    log('info', 'shutdown_complete');
    process.exit(0);
  });

  // Force exit if not closed in 10s
  setTimeout(() => {
    log('warn', 'force_exit');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

server.listen(PORT, () => {
  log('info', 'server_started', { port: PORT, store });
});

