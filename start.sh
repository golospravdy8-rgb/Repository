#!/bin/sh
set -e

echo "Running Prisma migrations..."
node ./node_modules/prisma/build/index.js migrate deploy

echo "Starting Next.js..."
export HOSTNAME=0.0.0.0
exec node server.js
