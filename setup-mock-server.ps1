# Mock Graph Server Setup and Launch Script

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Mock Microsoft Graph API Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to mock server directory
$mockServerPath = "C:\dev-local\outlook-mcp\test\mock-graph-server"
Set-Location $mockServerPath

Write-Host "[1/3] Installing dependencies..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error installing dependencies!" -ForegroundColor Red
    exit 1
}

Write-Host "[2/3] Mock server ready!" -ForegroundColor Green
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "To start the mock server, run:" -ForegroundColor White
Write-Host "  cd test\mock-graph-server" -ForegroundColor Yellow
Write-Host "  npm start" -ForegroundColor Yellow
Write-Host ""
Write-Host "Then update your config.js:" -ForegroundColor White
Write-Host "  GRAPH_API_ENDPOINT: 'http://localhost:4000/v1.0/'" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[3/3] Would you like to start the server now? (Y/N)" -ForegroundColor Yellow
$response = Read-Host

if ($response -eq 'Y' -or $response -eq 'y') {
    Write-Host ""
    Write-Host "Starting mock server on http://localhost:4000..." -ForegroundColor Green
    Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
    Write-Host ""
    npm start
}
