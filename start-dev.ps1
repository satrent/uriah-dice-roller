# Start Development Servers for Uriah's Dice Roller
# This script starts both the Node.js backend and Vite frontend

Write-Host "Starting Uriah's Dice Roller development servers..." -ForegroundColor Cyan

# Start the backend server (Node.js)
Write-Host "Starting backend server on port 3001..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm start" -WindowStyle Normal

# Wait a moment for the backend to start
Start-Sleep -Seconds 2

# Start the frontend dev server (Vite)
Write-Host "Starting frontend dev server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev" -WindowStyle Normal

Write-Host "`nBoth servers are starting in separate windows." -ForegroundColor Green
Write-Host "Backend: http://localhost:3001" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host "`nPress any key to close this window (servers will continue running)..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

