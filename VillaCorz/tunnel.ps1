$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $root 'backend'
$logDir = Join-Path $env:TEMP 'villacorz-tunnel-logs'
$cfDir = Join-Path $env:TEMP 'villacorz-cloudflared'
$cfPath = Join-Path $cfDir 'cloudflared.exe'
$urlFile = Join-Path $root '.tunnel-url.txt'

New-Item -ItemType Directory -Force -Path $logDir | Out-Null

function Test-Port([int]$port) {
    return [bool](Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue)
}

if (-not (Test-Port 3306)) {
    Start-Process -FilePath 'C:\xampp\mysql\bin\mysqld.exe' -ArgumentList '--defaults-file=C:\xampp\mysql\bin\my.ini' -WorkingDirectory 'C:\xampp\mysql\bin' -WindowStyle Hidden
    Start-Sleep -Seconds 5
}

if (-not (Test-Port 11434)) {
    Start-Process -FilePath 'C:\Users\Acer\AppData\Local\Programs\Ollama\ollama.exe' -ArgumentList 'serve' -WindowStyle Hidden
    Start-Sleep -Seconds 3
}

$env:SANCTUM_STATEFUL_DOMAINS = 'localhost:5173,127.0.0.1:5173,localhost,127.0.0.1,*.trycloudflare.com'
$env:APP_DEBUG = 'false'

if (-not (Test-Port 8000)) {
    Start-Process -FilePath 'php' -ArgumentList 'artisan serve --host=127.0.0.1 --port=8000' -WorkingDirectory $backendDir -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logDir 'backend.log') -RedirectStandardError (Join-Path $logDir 'backend.err.log')
    Start-Sleep -Seconds 3
}

if (-not (Test-Port 5173)) {
    $npmPath = (Get-Command npm.cmd).Source
    Start-Process -FilePath $npmPath -ArgumentList 'run dev:tunnel' -WorkingDirectory $root -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logDir 'vite.log') -RedirectStandardError (Join-Path $logDir 'vite.err.log')
    Start-Sleep -Seconds 5
}

if (-not (Test-Path $cfPath)) {
    New-Item -ItemType Directory -Force -Path $cfDir | Out-Null
    & curl.exe -L --fail --silent --show-error -o $cfPath 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe'
}

$tunnelOut = Join-Path $logDir 'tunnel.log'
$tunnelErr = Join-Path $logDir 'tunnel.err.log'
$tunnelProc = Start-Process -FilePath $cfPath -ArgumentList @('tunnel', '--url', 'http://127.0.0.1:5173') -RedirectStandardOutput $tunnelOut -RedirectStandardError $tunnelErr -PassThru -WindowStyle Hidden

$url = $null
for ($i = 0; $i -lt 45; $i++) {
    Start-Sleep -Seconds 1
    $content = ''
    foreach ($file in @($tunnelErr, $tunnelOut)) {
        if (Test-Path $file) {
            try { $content += [System.IO.File]::ReadAllText($file) } catch { }
        }
    }
    $match = [regex]::Match($content, 'https://[a-zA-Z0-9-]+\.trycloudflare\.com')
    if ($match.Success) {
        $url = $match.Value
        break
    }
}

if (-not $url) {
    throw "Tunnel URL not found. Check $tunnelErr"
}

$url | Set-Content -LiteralPath $urlFile
$password = (Select-String -Path (Join-Path $root '.env.tunnel') -Pattern '^TUNNEL_PASSWORD=(.*)$').Matches[0].Groups[1].Value

Write-Output "URL: $url"
Write-Output "Password: $password"
Write-Output "Tunnel PID: $($tunnelProc.Id)"
