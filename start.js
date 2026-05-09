#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

const PORT = 3006;
const isWindows = os.platform() === 'win32';

console.log(`🚀 Starting basket-lviv on port ${PORT}...`);
console.log(`Platform: ${os.platform()}`);

// On Windows, use next.cmd from node_modules; on Unix, use next
const nextBin = isWindows
  ? path.join(__dirname, 'node_modules', '.bin', 'next.cmd')
  : path.join(__dirname, 'node_modules', '.bin', 'next');

const args = ['dev', '-p', PORT.toString()];

console.log(`Running: ${nextBin} ${args.join(' ')}\n`);

// Spawn with shell: true on Windows to handle .cmd files
const child = spawn(nextBin, args, {
  stdio: 'inherit',
  shell: isWindows,
  cwd: __dirname,
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n📛 Shutting down...');
  child.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n📛 Shutting down...');
  child.kill('SIGTERM');
  process.exit(0);
});

child.on('error', (err) => {
  console.error(`❌ Failed to start server: ${err.message}`);
  process.exit(1);
});

child.on('exit', (code) => {
  if (code !== 0) {
    console.error(`❌ Server exited with code ${code}`);
    process.exit(code);
  }
});
