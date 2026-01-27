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
        res.write("Running script:\n> " + script.split("\n").join("\n> ") + "\n\n")
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
            await runCommand(res, `
                # Check for required environment variables
                if [[ -z "$GITHUB_REPO" ]]; then
                echo "GITHUB_REPO must be set"
                exit 1
                fi

                echo "Cloning repository"
                # Clone the repo using the PAT
                git init
                git remote add origin https://github.com/$GITHUB_REPO.git
                git fetch
                git pull origin main

                ls -al;

                # Make deploy.sh executable
                chmod +x deploy.sh


                echo "Running deploy script"

                # Run deploy.sh
                # ./deploy.sh
                `)
            await runCommand(res, `
                pwd;
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