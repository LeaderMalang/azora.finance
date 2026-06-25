#!/bin/sh
# cPanel startup script — runs schema migrations then starts the Next.js server.
# Set DATABASE_URL in your cPanel Node.js app environment variables.
set -e
node scripts/migrate-db.mjs
exec node server.js
