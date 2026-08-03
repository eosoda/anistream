#!/usr/bin/env bash
# Script de Deploy Docker para Linux / macOS / Bash — AniStream

set -e

echo "========================================"
echo "🚀 AniStream — Deploy Local Docker Compose"
echo "========================================"

# Executar verificações pré-flight
node scripts/verify-docker.js

echo "🐳 Compilando e iniciando os containers..."
docker compose up -d --build --remove-orphans

echo "✨ Deploy local finalizado com sucesso! Acesse http://localhost:3000"
