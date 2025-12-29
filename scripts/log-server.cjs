#!/usr/bin/env node
// Simple log server for multiplayer debugging
// Receives logs via POST and saves to logs/ folder

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
const LOGS_DIR = path.join(__dirname, '..', 'logs');

// Ensure logs directory exists
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

const server = http.createServer((req, res) => {
  // CORS headers for local dev
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/log') {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const { roomCode, role, sessionId, content } = data;

        // Generate filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        const roomPart = roomCode || 'NOROOM';
        const rolePart = role || 'UNKNOWN';
        const filename = `mplog_${roomPart}_${rolePart}_${timestamp}.txt`;
        const filepath = path.join(LOGS_DIR, filename);

        // Write log file
        fs.writeFileSync(filepath, content, 'utf8');

        console.log(`[LogServer] Saved: ${filename} (${content.length} bytes)`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, filename }));
      } catch (err) {
        console.error('[LogServer] Error:', err.message);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
  } else if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`[LogServer] Running on http://localhost:${PORT}`);
  console.log(`[LogServer] Logs will be saved to: ${LOGS_DIR}`);
  console.log('[LogServer] Press Ctrl+C to stop\n');
});

// Handle shutdown gracefully
process.on('SIGINT', () => {
  console.log('\n[LogServer] Shutting down...');
  server.close();
  process.exit(0);
});
