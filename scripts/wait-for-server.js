#!/usr/bin/env node

/**
 * Simple utility that waits for the API server to start listening before
 * launching the client dev server. This avoids the React app firing requests
 * at the proxy before Express is ready, which used to trigger noisy 404s.
 */

const net = require('net');

const host = process.env.WAIDA_SERVER_HOST || '127.0.0.1';
const port = Number(process.env.WAIDA_SERVER_PORT || process.env.PORT || 3001);
const timeoutMs = Number(process.env.WAIDA_WAIT_TIMEOUT || 30000);
const retryIntervalMs = Number(process.env.WAIDA_WAIT_INTERVAL || 250);

const startTime = Date.now();

function attempt() {
  const socket = net.createConnection({ host, port }, () => {
    socket.end();
    console.log(`Server detected on ${host}:${port}. Starting client...`);
    process.exit(0);
  });

  socket.setTimeout(retryIntervalMs, () => {
    socket.destroy();
  });

  socket.on('error', () => {
    socket.destroy();
    if (Date.now() - startTime >= timeoutMs) {
      console.error(`Timed out waiting for server on ${host}:${port}`);
      process.exit(1);
    }
    setTimeout(attempt, retryIntervalMs);
  });
}

console.log(`Waiting for server on ${host}:${port} (timeout ${timeoutMs}ms)...`);
attempt();
