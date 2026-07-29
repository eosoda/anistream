# Script de Deploy Docker para Windows PowerShell — AniStream
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚀 AniStream — Deploy Local Docker Compose" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Executar verificações pré-flight em Node.js
node scripts/verify-docker.js
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Verificações falharam. Deploy cancelado." -ForegroundColor Red
    exit 1
}

Write-Host "🐳 Compilando e iniciando os containers..." -ForegroundColor Yellow
docker compose up -d --build --remove-orphans

Write-Host "✨ Deploy local finalizado com sucesso! Acesse http://localhost:3000" -ForegroundColor Green
