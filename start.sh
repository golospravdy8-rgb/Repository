#!/bin/sh
set -e

echo "Running Prisma migrations..."
node ./node_modules/prisma/build/index.js migrate deploy

echo "Starting Next.js..."
exec HOSTNAME=0.0.0.0 node server.js
