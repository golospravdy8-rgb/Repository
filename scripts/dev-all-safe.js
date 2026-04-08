#!/usr/bin/env node

/**
 * dev-all-safe.js — Safe multi-app dev startup
 * Kills all processes on ports 3006-3012, then starts all apps (MAIN, AUTH, MARKET, COURSES, SHOP, NEWS)
 * Works reliably on Windows without port conflicts
 */

const { spawn, execSync } = require("child_process");
const os = require("os");
const path = require("path");

const PORTS = [3006, 3007, 3008, 3009, 3010, 3011, 3012];
const isWindows = os.platform() === "win32";

console.log(
  "🔧 [DEV:ALL:SAFE] Starting safe multi-app development environment...\n"
);

/**
 * Kill processes using specific ports on Windows
 */
function killWindowsPorts() {
  console.log("🔍 Scanning for processes on ports 3006-3012...");

  for (const port of PORTS) {
    try {
      // Get process info using netstat
      const result = execSync(
        `netstat -ano | findstr :${port}`,
        { encoding: "utf-8", stdio: "pipe" }
      );

      if (result.trim()) {
        // Extract PID from netstat output
        const match = result.match(/\s+(\d+)\s*$/m);
        if (match) {
          const pid = match[1];
          try {
            execSync(`taskkill /PID ${pid} /F /T`, {
              stdio: "ignore",
              windowsHide: true,
            });
            console.log(`✅ Killed process on port ${port} (PID: ${pid})`);
          } catch (e) {
            // Process might have already been killed
          }
        }
      }
    } catch (error) {
      // netstat found nothing, port is free
    }
  }

  console.log("✨ Port cleanup complete!\n");
}

/**
 * Kill processes using specific ports on Unix (macOS/Linux)
 */
function killUnixPorts() {
  console.log("🔍 Scanning for processes on ports 3006-3012...");

  for (const port of PORTS) {
    try {
      const result = execSync(
        `lsof -i :${port} -t 2>/dev/null || true`,
        { encoding: "utf-8" }
      );
      const pids = result.trim().split("\n").filter(Boolean);

      for (const pid of pids) {
        try {
          execSync(`kill -9 ${pid}`, { stdio: "ignore" });
          console.log(`✅ Killed process on port ${port} (PID: ${pid})`);
        } catch (e) {
          // Already killed
        }
      }
    } catch (error) {
      // Port is free
    }
  }

  console.log("✨ Port cleanup complete!\n");
}

// Kill existing processes
if (isWindows) {
  killWindowsPorts();
} else {
  killUnixPorts();
}

// Small delay to ensure ports are fully released
setTimeout(() => {
  console.log("🚀 Starting all development servers (dev:all)...\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📍 Main App   → http://localhost:3006");
  console.log("📍 Auth       → http://localhost:3000 (local)");
  console.log("📍 Marketplace → http://localhost:3007");
  console.log("📍 Courses    → http://localhost:3008");
  console.log("📍 Shop       → http://localhost:3009");
  console.log("📍 News       → http://localhost:3010");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const devAll = spawn("npm", ["run", "dev:all"], {
    stdio: "inherit",
    shell: isWindows,
    cwd: path.resolve(__dirname, ".."),
  });

  devAll.on("error", (error) => {
    console.error("❌ Error starting dev:all:", error.message);
    process.exit(1);
  });

  devAll.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      process.exit(code);
    }
  });

  // Graceful shutdown on Ctrl+C
  process.on("SIGINT", () => {
    console.log("\n\n🛑 Shutting down all development servers...");
    devAll.kill();
    process.exit(0);
  });
}, 500);
