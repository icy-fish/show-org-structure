#!/bin/bash
# Start both backend and frontend
cd "$(dirname "$0")"

echo "Starting backend on http://localhost:3001 ..."
(cd backend && node server.js) &
BACKEND_PID=$!

echo "Starting frontend on http://localhost:3000 ..."
(cd frontend && npm run dev -- --port 3000) &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT INT TERM
wait
