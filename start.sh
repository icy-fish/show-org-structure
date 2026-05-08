#!/bin/bash
# Start the backend API and frontend dev server.
#
# Usage:
#   ./start.sh [OPTIONS]
#
# Options:
#   --host HOST           Hostname or IP the browser will use to reach this machine.
#                         Defaults to 'localhost'. Set to the server's public IP or
#                         domain name when running on a remote host.
#   --backend-port PORT   Port for the Express API server (default: 3001)
#   --frontend-port PORT  Port for the Vite dev server (default: 3000)
#
# Environment variables (equivalent to the flags above):
#   HOST, BACKEND_PORT, FRONTEND_PORT
#
# Examples:
#   ./start.sh                                 # local development
#   ./start.sh --host 192.168.1.50             # LAN / remote host by IP
#   ./start.sh --host myserver.example.com     # remote host by domain
#   HOST=10.0.0.5 BACKEND_PORT=4000 ./start.sh

HOST="${HOST:-localhost}"
BACKEND_PORT="${BACKEND_PORT:-3001}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"

while [[ $# -gt 0 ]]; do
  case $1 in
    --host)           HOST="$2";         shift 2 ;;
    --backend-port)   BACKEND_PORT="$2"; shift 2 ;;
    --frontend-port)  FRONTEND_PORT="$2"; shift 2 ;;
    -h|--help)
      sed -n '/^# Usage/,/^[^#]/{ /^[^#]/!p }' "$0" | sed 's/^# \?//'
      exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

export VITE_API_BASE_URL="http://${HOST}:${BACKEND_PORT}/api"

echo "Backend  → http://${HOST}:${BACKEND_PORT}"
echo "Frontend → http://${HOST}:${FRONTEND_PORT}"
echo "API URL  → ${VITE_API_BASE_URL}"
echo ""

cd "$(dirname "$0")"

PORT="$BACKEND_PORT" node backend/server.js &
BACKEND_PID=$!

# --host binds Vite to 0.0.0.0 so it is reachable from outside localhost
(cd frontend && npm run dev -- --port "$FRONTEND_PORT" --host) &
FRONTEND_PID=$!

printf '%s\n' "$BACKEND_PID" "$FRONTEND_PID" > .pids

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; rm -f .pids; exit 0" EXIT INT TERM
wait
