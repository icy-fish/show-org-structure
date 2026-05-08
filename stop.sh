#!/bin/bash
# Stop services started by start.sh.
# For Docker deployments use: docker compose down

SCRIPT_DIR="$(dirname "$0")"
PID_FILE="$SCRIPT_DIR/.pids"
GRACEFUL_TIMEOUT=5

if [[ ! -f "$PID_FILE" ]]; then
  echo "No .pids file found — services do not appear to be running."
  echo "(For Docker: docker compose down)"
  exit 0
fi

pids=()
while IFS= read -r pid; do
  [[ -n "$pid" ]] && pids+=("$pid")
done < "$PID_FILE"

if [[ ${#pids[@]} -eq 0 ]]; then
  rm -f "$PID_FILE"
  echo "No PIDs recorded."
  exit 0
fi

echo "Sending SIGTERM to ${#pids[@]} service(s)..."
for pid in "${pids[@]}"; do
  if kill -0 "$pid" 2>/dev/null; then
    # Kill child processes first (e.g. npm → node/vite), then the parent
    pkill -TERM -P "$pid" 2>/dev/null
    kill -TERM "$pid" 2>/dev/null
    echo "  → PID $pid signalled"
  else
    echo "  → PID $pid already stopped"
  fi
done

# Wait for graceful shutdown
echo "Waiting up to ${GRACEFUL_TIMEOUT}s for processes to exit..."
for (( i=1; i<=GRACEFUL_TIMEOUT; i++ )); do
  sleep 1
  still_alive=()
  for pid in "${pids[@]}"; do
    kill -0 "$pid" 2>/dev/null && still_alive+=("$pid")
  done
  [[ ${#still_alive[@]} -eq 0 ]] && break
done

# Force-kill anything that didn't exit in time
still_alive=()
for pid in "${pids[@]}"; do
  kill -0 "$pid" 2>/dev/null && still_alive+=("$pid")
done

if [[ ${#still_alive[@]} -gt 0 ]]; then
  echo "Force killing ${#still_alive[@]} process(es) that did not exit in time..."
  for pid in "${still_alive[@]}"; do
    pkill -KILL -P "$pid" 2>/dev/null
    kill -KILL "$pid" 2>/dev/null
    echo "  → PID $pid killed"
  done
fi

rm -f "$PID_FILE"
echo "Stopped."
