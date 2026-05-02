#!/usr/bin/env node

/**
 * start-dev.js — Unified stable development server startup
 * ✅ Kills zombie processes on ports 3006-3012
 * ✅ Validates environment before starting
 * ✅ Auto-restarts on crashes
 * ✅ Works on Windows/macOS/Linux
 */

const { spawn, execSync } = require("child_process");
const os = require("os");
const path = require("path");
const fs = require("fs");

const PORTS = [3006, 3007, 3008, 3009, 3010, 3011, 3012];
const MAX_RESTART_ATTEMPTS = 3;
const RESTART_DELAY = 2000;
const isWindows = os.platform() === "win32";

let restartCount = 0;
let serverProcess = null;

// ANSI colors for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(level, message) {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = {
    info: `${colors.blue}ℹ${colors.reset}`,
    success: `${colors.green}✅${colors.reset}`,
    warning: `${colors.yellow}⚠${colors.reset}`,
    error: `${colors.red}❌${colors.reset}`,
    debug: `${colors.cyan}🔧${colors.reset}`,
  }[level] || "•";

  console.log(`[${timestamp}] ${prefix} ${message}`);
}

/**
 * Kill processes using specific ports on Windows
 */
function killWindowsPorts() {
  log("info", "Scanning for zombie processes on ports 3006-3012...");

  let killed = 0;
  for (const port of PORTS) {
    try {
      const result = execSync(`netstat -ano 2>nul | findstr :${port}`, {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });

      if (result.trim()) {
        const match = result.match(/\s+(\d+)\s*$/m);
        if (match) {
          const pid = match[1];
          try {
            execSync(`taskkill /PID ${pid} /F /T 2>nul`, {
              stdio: "ignore",
              windowsHide: true,
            });
            log("success", `Killed zombie on port ${port} (PID: ${pid})`);
            killed++;
          } catch (e) {
            // Already dead
          }
        }
      }
    } catch (error) {
      // Port is free
    }
  }

  if (killed > 0) {
    log("info", `Cleaned up ${killed} zombie process(es)`);
  } else {
    log("success", "All ports clean");
  }
}

/**
 * Kill processes using specific ports on Unix (macOS/Linux)
 */
function killUnixPorts() {
  log("info", "Scanning for zombie processes on ports 3006-3012...");

  let killed = 0;
  for (const port of PORTS) {
    try {
      const result = execSync(`lsof -i :${port} -t 2>/dev/null || true`, {
        encoding: "utf-8",
      });
      const pids = result.trim().split("\n").filter(Boolean);

      for (const pid of pids) {
        try {
          execSync(`kill -9 ${pid}`, { stdio: "ignore" });
          log("success", `Killed zombie on port ${port} (PID: ${pid})`);
          killed++;
        } catch (e) {
          // Already dead
        }
      }
    } catch (error) {
      // Port is free
    }
  }

  if (killed > 0) {
    log("info", `Cleaned up ${killed} zombie process(es)`);
  } else {
    log("success", "All ports clean");
  }
}

/**
 * Validate required files and environment
 */
function validateEnvironment() {
  log("info", "Validating environment...");

  const requiredFiles = [
    "package.json",
    "next.config.mjs",
    "prisma/schema.prisma",
  ];

  for (const file of requiredFiles) {
    if (!fs.existsSync(path.join(__dirname, "..", file))) {
      log("error", `Missing required file: ${file}`);
      process.exit(1);
    }
  }

  // Check NODE_ENV
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = "development";
  }

  log("success", "Environment validated");
}

/**
 * Start the Next.js development server
 */
function startServer() {
  log("info", `Starting development server (attempt ${restartCount + 1})...`);

  // Use npm script which is more portable than direct next command
  const cmd = isWindows ? "npm.cmd" : "npm";
  const args = ["run", "dev:next"];

  serverProcess = spawn(cmd, args, {
    stdio: "inherit",
    shell: isWindows,
    cwd: path.resolve(__dirname, ".."),
    env: {
      ...process.env,
      NODE_ENV: "development",
      // Ensure PATH includes node_modules/.bin
      PATH: `${path.join(__dirname, "..", "node_modules", ".bin")}${isWindows ? ";" : ":"}${process.env.PATH}`,
    },
  });

  serverProcess.on("error", (error) => {
    log("error", `Failed to start server: ${error.message}`);
    handleServerCrash();
  });

  serverProcess.on("close", (code) => {
    if (code !== 0) {
      log("warning", `Server exited with code ${code}`);
      handleServerCrash();
    }
  });

  log("success", "Server started on http://localhost:3006");
}

/**
 * Handle server crash with auto-restart logic
 */
function handleServerCrash() {
  restartCount++;

  if (restartCount >= MAX_RESTART_ATTEMPTS) {
    log("error", `Max restart attempts (${MAX_RESTART_ATTEMPTS}) reached`);
    log("info", "Manual intervention required. Run: npm run dev:safe");
    process.exit(1);
  }

  log(
    "warning",
    `Server crashed. Restarting in ${RESTART_DELAY}ms... (${restartCount}/${MAX_RESTART_ATTEMPTS})`
  );
  setTimeout(() => {
    killWindowsPorts || killUnixPorts;
    startServer();
  }, RESTART_DELAY);
}

/**
 * Main startup sequence
 */
function main() {
  console.clear();
  log("info", `${colors.bright}Development Server Startup${colors.reset}`);
  log("info", `Platform: ${isWindows ? "Windows" : "Unix (macOS/Linux)"}`);
  log("info", `Node: ${process.version}`);
  log("info", `npm: ${execSync("npm -v", { encoding: "utf-8" }).trim()}`);

  console.log("");

  // 1. Validate environment
  validateEnvironment();

  // 2. Kill zombie processes
  if (isWindows) {
    killWindowsPorts();
  } else {
    killUnixPorts();
  }

  // 3. Wait for ports to be fully released
  console.log("");
  log(
    "info",
    "Waiting for ports to be fully released (500ms)..."
  );

  setTimeout(() => {
    console.log("");
    log("success", "Ready to start!");
    console.log(
      `${colors.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`
    );
    log("info", `🌐 Main App  → ${colors.cyan}http://localhost:3006${colors.reset}`);
    log("info", `🎮 Game      → ${colors.cyan}http://localhost:3006?ag=younger${colors.reset}`);
    log("info", `📡 Firebase  → Real-time sync enabled`);
    console.log(
      `${colors.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`
    );
    console.log("");
    log("info", "Press Ctrl+C to stop server\n");

    // 4. Start server
    restartCount = 0;
    startServer();

    // Handle graceful shutdown
    process.on("SIGINT", () => {
      log("info", "\nReceived SIGINT, shutting down gracefully...");
      if (serverProcess) {
        serverProcess.kill();
      }
      process.exit(0);
    });

    process.on("exit", () => {
      if (serverProcess) {
        serverProcess.kill();
      }
    });
  }, 500);
}

// Start the whole flow
main();
