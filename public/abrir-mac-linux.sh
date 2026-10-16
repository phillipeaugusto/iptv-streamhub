#!/usr/bin/env bash
cd "$(dirname "$0")"
echo "Iniciando StreamHub em http://localhost:8080/"
echo "Nao feche o Terminal enquanto usar o app."
if command -v open >/dev/null 2>&1; then
  (sleep 1 && open "http://localhost:8080/") &
elif command -v xdg-open >/dev/null 2>&1; then
  (sleep 1 && xdg-open "http://localhost:8080/") &
fi
python3 -m http.server 8080
