/**
 * @fileoverview Minimal standalone Node.js HTTP server
 * with a single catch-all GET endpoint.
 */
/// <reference types="node" />

const http = require('http');
const { spawn } = require('child_process');

// Server configuration
const PORT = process.env.PORT || 3001;

// Create HTTP server
const server = http.createServer(
    /**
     * Handle incoming requests
     * @param {http.IncomingMessage} req - HTTP request object
     * @param {http.ServerResponse} res - HTTP response object
     */
    (req, res) => {
    switch (req.method) {
        case "GET": {
            // Path to your shell script
            

            // Set headers for text streaming (chunked)
            res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Transfer-Encoding': 'chunked' });
            const scriptPath = './deploy.sh';
            const child = spawn('bash', [scriptPath]);
            // Pipe stdout and stderr, mark errors, and close on exit
            child.stdout.on('data', chunk => res.write(chunk.toString()));
            child.stderr.on('data', chunk => res.write(`ERROR: ${chunk.toString()}`));
            child.on('close', code => res.end(`\nScript exited with code ${code}\n`));
            child.on('error', err => res.end(`Failed to start script: ${err.message}\n`));
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