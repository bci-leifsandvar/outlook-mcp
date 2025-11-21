# Verification Script for Outlook MCP Secure Confirmation Fix
Write-Host "`n==========================================" -ForegroundColor Green
Write-Host "  Outlook MCP Security Fix Verification" -ForegroundColor Green  
Write-Host "==========================================" -ForegroundColor Green

Write-Host "`nChecking applied fixes..." -ForegroundColor Cyan

$success = $true

# Check 1: Email index.js has confirmationToken
Write-Host "`n[1/4] Checking email/index.js..." -ForegroundColor Yellow
$emailContent = Get-Content "C:\dev-local\outlook-mcp\email\index.js" -Raw
if ($emailContent -match "confirmationToken") {
    Write-Host "  ✓ confirmationToken found in send-email schema" -ForegroundColor Green
} else {
    Write-Host "  ✗ confirmationToken NOT found in send-email schema" -ForegroundColor Red
    $success = $false
}

# Check 2: Main index.js has improved onboarding
Write-Host "`n[2/4] Checking main index.js..." -ForegroundColor Yellow
$indexContent = Get-Content "C:\dev-local\outlook-mcp\index.js" -Raw
if ($indexContent -match "DO NOT try to authenticate with this token") {
    Write-Host "  ✓ Improved onboarding message found" -ForegroundColor Green
} else {
    Write-Host "  ✗ Improved onboarding message NOT found" -ForegroundColor Red
    $success = $false
}

# Check 3: Calendar index.js has confirmationToken
Write-Host "`n[3/4] Checking calendar/index.js..." -ForegroundColor Yellow
$calendarContent = Get-Content "C:\dev-local\outlook-mcp\calendar\index.js" -Raw
if ($calendarContent -match "confirmationToken") {
    Write-Host "  ✓ confirmationToken found in calendar schemas" -ForegroundColor Green
} else {
    Write-Host "  ✗ confirmationToken NOT found in calendar schemas" -ForegroundColor Red
    $success = $false
}

# Check 4: Auth tools.js has confirmationToken
Write-Host "`n[4/4] Checking auth/tools.js..." -ForegroundColor Yellow
$authContent = Get-Content "C:\dev-local\outlook-mcp\auth\tools.js" -Raw
if ($authContent -match "confirmationToken") {
    Write-Host "  ✓ confirmationToken found in authenticate schema" -ForegroundColor Green
} else {
    Write-Host "  ✗ confirmationToken NOT found in authenticate schema" -ForegroundColor Red
    $success = $false
}

Write-Host "`n==========================================" -ForegroundColor Green

if ($success) {
    Write-Host "✅ ALL FIXES SUCCESSFULLY APPLIED!" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
    
    Write-Host "`nNext Steps:" -ForegroundColor Cyan
    Write-Host "1. Restart your MCP server: " -NoNewline
    Write-Host "npm start" -ForegroundColor Yellow
    Write-Host "2. If needed, start auth server: " -NoNewline
    Write-Host "npm run auth-server" -ForegroundColor Yellow
    Write-Host "3. Test with Claude Desktop" -ForegroundColor White
    
    Write-Host "`nExpected Behavior:" -ForegroundColor Cyan
    Write-Host "• Claude will properly ask for confirmation tokens" -ForegroundColor White
    Write-Host "• No more confusion with authentication" -ForegroundColor White
    Write-Host "• Context maintained through the flow" -ForegroundColor White
} else {
    Write-Host "⚠️  Some fixes may not be applied correctly" -ForegroundColor Red
    Write-Host "==========================================" -ForegroundColor Red
    Write-Host "`nPlease check the files manually or re-run the fix" -ForegroundColor Yellow
}
