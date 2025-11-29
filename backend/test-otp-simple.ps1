# Simple OTP Test Script for PowerShell
Write-Host "Testing OTP Password Recovery Flow" -ForegroundColor Green
Write-Host ""

# Test 1: Send OTP
Write-Host "1. Sending OTP..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/auth/send-otp" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"email": "test@example.com"}'
    Write-Host "Send OTP Response:" -ForegroundColor Green
    Write-Host $response.Content
} catch {
    Write-Host "Send OTP Error:" -ForegroundColor Red
    Write-Host $_.Exception.Message
}
Write-Host ""

# Test 2: Get OTP Statistics
Write-Host "2. Getting OTP Statistics..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/auth/otp-stats" -Method GET
    Write-Host "OTP Stats Response:" -ForegroundColor Green
    Write-Host $response.Content
} catch {
    Write-Host "OTP Stats Error:" -ForegroundColor Red
    Write-Host $_.Exception.Message
}
Write-Host ""

Write-Host "OTP functionality test completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Available OTP Endpoints:" -ForegroundColor Cyan
Write-Host "   POST /api/auth/send-otp - Send OTP to email"
Write-Host "   POST /api/auth/verify-otp - Verify OTP code"
Write-Host "   POST /api/auth/reset-password-with-otp - Reset password with OTP"
Write-Host "   GET  /api/auth/otp-stats - Get OTP statistics"
Write-Host "   POST /api/auth/cleanup-otp - Clean up expired OTPs"