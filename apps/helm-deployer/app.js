/**
 * @fileoverview Minimal standalone Node.js HTTP server
 * with a single catch-all GET endpoint.
 */
/// <reference types="node" />

const http = require('http');
const { spawn } = require('child_process');

// Server configuration
const PORT = process.env.PORT || 3001;

/**
 * @param {http.ServerResponse} res
 * @param {string} script
 * @returns {Promise<number>} exit code
 */
const runCommand = (res, script) =>
    new Promise((resolve, reject) => {
        const child = spawn('bash', ['-c', script], {
            env: process.env
        });

        child.stdout.on('data', d => res.write(d));
        child.stderr.on('data', d => res.write(`ERROR: ${d}`));

        child.on('close', code => {
            resolve();
        });
        child.on('error', code => {
            reject();
        });
    });

// Create HTTP server
const server = http.createServer(
    /**
     * Handle incoming requests
     * @param {http.IncomingMessage} req - HTTP request object
     * @param {http.ServerResponse} res - HTTP response object
     */
    async (req, res) => {
    switch (req.method) {
        case "GET": {
            // Path to your shell script
            

            // Set headers for text streaming (chunked)
            res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Transfer-Encoding': 'chunked' });
            const scriptPath = './deploy.sh';
            await runCommand(res, "whoami")
            await runCommand(res, "kubectl config view")
            await runCommand(res, `
                helm template selfhost-cloud . > rendered.yaml ;
                wc -c rendered.yaml;
                cat rendered.yaml;
                `)
            await runCommand(res, `
                cd ../..
                ./deploy.sh
                `)
            res.end(`\nDone\n`)
        } break;
            
    }
});

// Start listening
server.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});

// -----------------------------
// Graceful shutdown
// -----------------------------

/**
 * Handles shutdown signals and closes the server gracefully
 * @param {string} signal - Signal name (SIGINT, SIGTERM)
 */
const shutdown = signal => {
    console.log(`Shutting down (${signal})...`);
    server.close(err => {
        if (err) console.error('Server close error:', err);
        process.exit(err ? 1 : 0);
    });
};
// Listen for termination signals
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));