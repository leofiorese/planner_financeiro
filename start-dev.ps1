<#
.SYNOPSIS
    Starts the Personal Finance Planner in development mode:
    backend (Express + MySQL, default port 3001) and frontend (Next.js, default port 3000).

.DESCRIPTION
    1. Checks Node.js (>= 20) and npm.
    2. Installs dependencies of backend/ and frontend/ when node_modules is missing (or with -Install).
    3. Ensures backend/.env and frontend/.env.local exist (created from .env.example).
    4. Checks that MySQL is reachable (warning only) and that the ports are free.
    5. Opens one window for the backend, waits for GET /api/health, then opens one window for the frontend.

.PARAMETER Install
    Forces "npm install" in backend/ and frontend/.

.PARAMETER SkipDbCheck
    Skips the MySQL TCP reachability check.

.PARAMETER BackendPort
    Backend port. Defaults to PORT from backend/.env, or 3001.

.PARAMETER FrontendPort
    Frontend port. Defaults to 3000.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\start-dev.ps1

.EXAMPLE
    .\start-dev.ps1 -Install -FrontendPort 3005
#>
[CmdletBinding()]
param(
    [switch]$Install,
    [switch]$SkipDbCheck,
    [int]$BackendPort = 3001,
    [int]$FrontendPort = 3000,
    [int]$HealthTimeoutSec = 45
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$Root        = $PSScriptRoot
$BackendDir  = Join-Path $Root 'backend'
$FrontendDir = Join-Path $Root 'frontend'

function Write-Step([string]$Message) { Write-Host "==> $Message" -ForegroundColor Cyan }
function Write-Ok([string]$Message)   { Write-Host "    [ok] $Message" -ForegroundColor Green }
function Write-Warn([string]$Message) { Write-Host "    [warn] $Message" -ForegroundColor Yellow }
function Stop-WithError([string]$Message) {
    Write-Host ""
    Write-Host "[error] $Message" -ForegroundColor Red
    exit 1
}

# Reads KEY=value from a .env file (ignores comments; strips surrounding quotes).
function Get-DotEnvValue([string]$File, [string]$Key, [string]$Default) {
    if (-not (Test-Path -LiteralPath $File)) { return $Default }
    foreach ($line in Get-Content -LiteralPath $File) {
        if ($line -match "^\s*$([regex]::Escape($Key))\s*=\s*(.*)$") {
            $value = $Matches[1].Trim()
            if ($value.Length -ge 2 -and (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'")))) {
                $value = $value.Substring(1, $value.Length - 2)
            }
            if ($value -ne '') { return $value }
        }
    }
    return $Default
}

function Install-Dependencies([string]$Dir, [string]$Name) {
    $nodeModules = Join-Path $Dir 'node_modules'
    if ($Install -or -not (Test-Path -LiteralPath $nodeModules)) {
        Write-Step "Installing $Name dependencies (npm install)..."
        Push-Location -LiteralPath $Dir
        try {
            & npm.cmd install
            if ($LASTEXITCODE -ne 0) { Stop-WithError "npm install failed in $Name (exit code $LASTEXITCODE)." }
        }
        finally {
            Pop-Location
        }
        Write-Ok "$Name dependencies installed"
    }
    else {
        Write-Ok "$Name dependencies already installed (use -Install to reinstall)"
    }
}

function Assert-PortFree([int]$Port, [string]$Name) {
    $listeners = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
    if ($listeners.Count -gt 0) {
        $owner = $listeners[0].OwningProcess
        $procName = 'unknown'
        $proc = Get-Process -Id $owner -ErrorAction SilentlyContinue
        if ($proc) { $procName = $proc.ProcessName }
        Stop-WithError "Port $Port ($Name) is already in use by PID $owner ($procName). Stop it (Stop-Process -Id $owner) or choose another port."
    }
    Write-Ok "Port $Port is free ($Name)"
}

function Test-TcpReachable([string]$HostName, [int]$Port, [int]$TimeoutMs) {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $async = $client.BeginConnect($HostName, $Port, $null, $null)
        if (-not $async.AsyncWaitHandle.WaitOne($TimeoutMs, $false)) { return $false }
        $client.EndConnect($async)
        return $true
    }
    catch {
        return $false
    }
    finally {
        $client.Close()
    }
}

# Opens a new PowerShell window running $Command inside $Dir.
# -EncodedCommand avoids any quoting problem with paths or arguments.
function Start-DevWindow([string]$Title, [string]$Dir, [string]$Command) {
    $shell = 'powershell'
    if (Get-Command pwsh -ErrorAction SilentlyContinue) { $shell = 'pwsh' }
    $script = "`$Host.UI.RawUI.WindowTitle = '$Title'; $Command"
    $encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($script))
    return Start-Process -FilePath $shell -WorkingDirectory $Dir -PassThru `
        -ArgumentList "-NoExit -NoProfile -ExecutionPolicy Bypass -EncodedCommand $encoded"
}

Write-Host ""
Write-Host "Personal Finance Planner - dev environment" -ForegroundColor White
Write-Host "Repository: $Root"
Write-Host ""

# 1. Repository layout ---------------------------------------------------------
Write-Step "Checking repository layout..."
foreach ($dir in @($BackendDir, $FrontendDir)) {
    if (-not (Test-Path -LiteralPath (Join-Path $dir 'package.json'))) {
        Stop-WithError "Missing $dir\package.json. Run this script from the repository root checkout."
    }
}
Write-Ok "backend/ and frontend/ found"

# 2. Node.js and npm ------------------------------------------------------------
Write-Step "Checking Node.js and npm..."
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Stop-WithError "Node.js not found in PATH. Install Node.js 20+ (https://nodejs.org)." }
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) { Stop-WithError "npm not found in PATH." }
$nodeVersion = (& node -v).Trim()
$nodeMajor = [int]($nodeVersion.TrimStart('v').Split('.')[0])
if ($nodeMajor -lt 20) { Stop-WithError "Node.js $nodeVersion found; version 20 or newer is required." }
Write-Ok "Node.js $nodeVersion"

# 3. Dependencies ---------------------------------------------------------------
Install-Dependencies $BackendDir 'backend'
Install-Dependencies $FrontendDir 'frontend'

# 4. Environment files ----------------------------------------------------------
Write-Step "Checking environment files..."
$backendEnv  = Join-Path $BackendDir '.env'
$frontendEnv = Join-Path $FrontendDir '.env.local'

if (-not (Test-Path -LiteralPath $backendEnv)) {
    Copy-Item -LiteralPath (Join-Path $BackendDir '.env.example') -Destination $backendEnv
    Stop-WithError "backend/.env did not exist and was created from .env.example. Fill in the MySQL credentials (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME) and run the script again."
}
Write-Ok "backend/.env"

if (-not (Test-Path -LiteralPath $frontendEnv)) {
    Copy-Item -LiteralPath (Join-Path $FrontendDir '.env.example') -Destination $frontendEnv
    Write-Ok "frontend/.env.local created from .env.example"
}
else {
    Write-Ok "frontend/.env.local"
}

if (-not $PSBoundParameters.ContainsKey('BackendPort')) {
    $BackendPort = [int](Get-DotEnvValue $backendEnv 'PORT' '3001')
}
$backendUrl = "http://localhost:$BackendPort"

# 5. MySQL reachability (warning only) ------------------------------------------
if (-not $SkipDbCheck) {
    Write-Step "Checking MySQL..."
    $dbHost = Get-DotEnvValue $backendEnv 'DB_HOST' 'localhost'
    $dbPort = [int](Get-DotEnvValue $backendEnv 'DB_PORT' '3306')
    if (Test-TcpReachable $dbHost $dbPort 2000) {
        Write-Ok "MySQL reachable at ${dbHost}:$dbPort"
    }
    else {
        Write-Warn "MySQL is not reachable at ${dbHost}:$dbPort. The app will start, but API calls will fail until MySQL is running."
    }
}

# 6. Ports ------------------------------------------------------------------------
Write-Step "Checking ports..."
if ($BackendPort -eq $FrontendPort) { Stop-WithError "BackendPort and FrontendPort must be different ($BackendPort)." }
Assert-PortFree $BackendPort 'backend'
Assert-PortFree $FrontendPort 'frontend'

# 7. Backend ---------------------------------------------------------------------
Write-Step "Starting backend on $backendUrl ..."
$backendProc = Start-DevWindow "planner backend :$BackendPort" $BackendDir "`$env:PORT = '$BackendPort'; npm.cmd run dev"

$healthUrl = "$backendUrl/api/health"
$deadline = (Get-Date).AddSeconds($HealthTimeoutSec)
$healthy = $false
while ((Get-Date) -lt $deadline) {
    if ($backendProc.HasExited) { Stop-WithError "The backend window exited early. Run 'npm run dev' inside backend/ to see the error." }
    try {
        $response = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 2
        if ($response.StatusCode -eq 200) { $healthy = $true; break }
    }
    catch {
        # Not listening yet; retry below.
    }
    Start-Sleep -Milliseconds 750
}
if (-not $healthy) {
    Stop-WithError "Backend did not answer $healthUrl within $HealthTimeoutSec s. Check the backend window for errors."
}
Write-Ok "Backend is healthy ($healthUrl)"

# 8. Frontend --------------------------------------------------------------------
Write-Step "Starting frontend on http://localhost:$FrontendPort ..."
$null = Start-DevWindow "planner frontend :$FrontendPort" $FrontendDir "`$env:BACKEND_URL = '$backendUrl'; npm.cmd run dev -- -p $FrontendPort"

Write-Host ""
Write-Host "Ready. Two windows were opened (close them or press Ctrl+C in each to stop):" -ForegroundColor Green
Write-Host "  Frontend : http://localhost:$FrontendPort"
Write-Host "  Backend  : $backendUrl  (health: $healthUrl)"
Write-Host "  /api/* on the frontend is proxied to the backend."
Write-Host ""
