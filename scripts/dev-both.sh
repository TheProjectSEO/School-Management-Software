#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "Starting student-app on :3000 and teacher-app on :3001"

cleanup() {
  echo "Shutting down dev servers..."
  [[ -n "${STUDENT_PID:-}" ]] && kill "$STUDENT_PID" 2>/dev/null || true
  [[ -n "${TEACHER_PID:-}" ]] && kill "$TEACHER_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

(cd student-app && npm run dev) &
STUDENT_PID=$!

(cd teacher-app && npm run dev) &
TEACHER_PID=$!

wait -n "$STUDENT_PID" "$TEACHER_PID"

