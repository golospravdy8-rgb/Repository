#!/bin/bash

# start-server.sh — Cross-platform safe server startup for bash/zsh
# Works on macOS, Linux, WSL, and Git Bash on Windows

set -e  # Exit on error

echo ""
echo "🚀 Basketball.lviv Development Server"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Kill zombie processes on ports
echo "🔍 Cleaning up zombie processes on ports 3006-3012..."

for PORT in 3006 3007 3008 3009 3010 3011 3012; do
  PID=$(lsof -i :$PORT -t 2>/dev/null || true)
  if [ ! -z "$PID" ]; then
    echo "  Killing process on port $PORT (PID: $PID)..."
    kill -9 $PID 2>/dev/null || true
  fi
done

echo "✅ Port cleanup complete"
echo ""

# Wait for ports to release
sleep 1

# Start server
echo "🚀 Starting Next.js on port 3006..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 http://localhost:3006"
echo "🎮 http://localhost:3006?ag=younger"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

NODE_ENV=development npx next dev -p 3006
