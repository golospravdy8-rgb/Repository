#!/usr/bin/env node

/**
 * start.js — Simple, reliable production-ready startup script
 * ✅ Works on Windows/macOS/Linux
 * ✅ Kills zombie processes
 * ✅ Starts Next.js on port 3006
 * ✅ Shows colored logs
 */

const { execSync, spawn } = require("child_process");
const os = require("os");
const path = require("path");

const isWindows = os.platform() === "win32";
const projectDir = path.resolve(__dirname);

// Colors
const log = {
  info: (msg) => console.log(`\x1b[34mℹ\x1b[0m ${msg}`),
  success: (msg) => console.log(`\x1b[32m✅\x1b[0m ${msg}`),
  warn: (msg) => console.log(`\x1b[33m⚠\x1b[0m ${msg}`),
  error: (msg) => console.log(`\x1b[31m❌\x1b[0m ${msg}`),
};

console.log("\n\x1b[1m🚀 Basketball.lviv Development Server\x1b[0m\n");

// Kill zombie processes
log.info("Scanning for zombie processes on ports 3006-3012...");
const ports = [3006, 3007, 3008, 3009, 3010, 3011, 3012];

for (const port of ports) {
  try {
    if (isWindows) {
      // Windows: use netstat + taskkill
      const result = execSync(`netstat -ano 2>nul | findstr :${port}`, {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });

      if (result.trim()) {
        const match = result.match(/\s+(\d+)\s*$/m);
        if (match) {
          const pid = match[1];
          try {
            execSync(`taskkill /PID ${pid} /F 2>nul`, { stdio: "ignore" });
            log.success(`Killed process on port ${port}`);
          } catch (e) {}
        }
      }
    } else {
      // Unix: use lsof + kill
      const result = execSync(`lsof -i :${port} -t 2>/dev/null || true`, {
        encoding: "utf-8",
      });

      if (result.trim()) {
        const pids = result.trim().split("\n");
        for (const pid of pids) {
          if (pid) {
            execSync(`kill -9 ${pid}`, { stdio: "ignore" });
            log.success(`Killed process on port ${port}`);
          }
        }
      }
    }
  } catch (error) {
    // Port is free
  }
}

log.info("Waiting for ports to fully release...");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
setTimeout(() => {
  log.success("Ports are clean\n");

  console.log(`\x1b[1m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m`);
  log.info(`🌐 Main App    → \x1b[36mhttp://localhost:3006\x1b[0m`);
  log.info(`🎮 Game        → \x1b[36mhttp://localhost:3006?ag=younger\x1b[0m`);
  log.info(`📡 Firebase    → Real-time multiplayer sync`);
  console.log(`\x1b[1m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m\n`);

  log.info("Starting Next.js (Ctrl+C to stop)\n");

  // Start server: on Windows use shell with npx.cmd, on Unix use direct binary
  const server = spawn(
    isWindows ? "npx.cmd" : "npx",
    ["next", "dev", "-p", "3006"],
    {
      cwd: projectDir,
      stdio: "inherit",
      shell: isWindows,
      env: {
        ...process.env,
        NODE_ENV: "development",
      },
    }
  );

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    console.log("\n\n🛑 Shutting down...");
    server.kill();
    process.exit(0);
  });

  server.on("error", (err) => {
    log.error(`Failed to start: ${err.message}`);
    process.exit(1);
  });

  server.on("close", (code) => {
    if (code !== 0) {
      log.error(`Server exited with code ${code}`);
    }
    process.exit(code || 0);
  });
}, 1000);
