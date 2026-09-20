$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$homepageDir = Split-Path -Parent $scriptDir
$configPath = Join-Path $homepageDir "assets\supabase-config.js"
$serverPath = Join-Path $scriptDir "server.js"
$defaultAdminPort = 5188
$requiredAdminVersion = 2

function Test-TcpPortInUse([int]$port) {
  $client = [Net.Sockets.TcpClient]::new()
  try {
    $connect = $client.ConnectAsync("127.0.0.1", $port)
    return $connect.Wait(300) -and $client.Connected
  }
  catch { return $false }
  finally { $client.Dispose() }
}

function Get-AvailableLocalPort {
  $listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, 0)
  try {
    $listener.Start()
    return ([Net.IPEndPoint]$listener.LocalEndpoint).Port
  }
  finally { $listener.Stop() }
}

function SecureToText([Security.SecureString]$secureValue) {
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureValue)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
}

$configSource = [System.IO.File]::ReadAllText($configPath)
if ($configSource -notmatch 'QDM_SUPABASE_URL\s*=\s*["'']([^"'']+)') {
  throw "QDM Supabase Project URL was not found."
}
$supabaseUrl = $matches[1].TrimEnd("/")
$projectRef = ([uri]$supabaseUrl).Host.Split(".")[0]
$adminPort = $defaultAdminPort
$adminUrl = "http://127.0.0.1:$adminPort"

try {
  $runningAdmin = Invoke-RestMethod "$adminUrl/api/config" -TimeoutSec 2
  if ($runningAdmin.projectRef -eq $projectRef) {
    if ([int]$runningAdmin.adminVersion -ge $requiredAdminVersion) {
      Write-Host "QDM local admin is already running. Opening the existing server." -ForegroundColor Green
      Start-Process $adminUrl
      exit 0
    }
    throw "이전 버전의 QDM 관리자가 실행 중입니다. 기존 관리자 명령창을 닫은 다음 관리자_열기.bat를 다시 실행해 주세요."
  }
}
catch {
  if ($_.Exception.Message -like "이전 버전의 QDM 관리자*") { throw }
  # 응답하지 않거나 QDM 관리자가 아니면 아래에서 포트 상태를 확인합니다.
}

if (Test-TcpPortInUse $adminPort) {
  $adminPort = Get-AvailableLocalPort
  Write-Host "Port $defaultAdminPort is used by another program. Starting QDM local admin on port $adminPort." -ForegroundColor Yellow
}

$encryptedKeyFile = Join-Path $scriptDir ".qdm-admin-key-$projectRef"
$secretKey = $null

if (Test-Path -LiteralPath $encryptedKeyFile) {
  $encrypted = [System.IO.File]::ReadAllText($encryptedKeyFile).Trim()
  $secretKey = SecureToText (ConvertTo-SecureString $encrypted)
}

if (-not $secretKey) {
  Write-Host "Enter the QDM Supabase Secret key once." -ForegroundColor Yellow
  Write-Host "It will be encrypted for the current Windows user."
  $secureKey = Read-Host "Secret key (sb_secret_...)" -AsSecureString
  $secretKey = SecureToText $secureKey
  if (-not $secretKey) { throw "Secret key was not entered." }
  [System.IO.File]::WriteAllText($encryptedKeyFile, ($secureKey | ConvertFrom-SecureString))
  (Get-Item -LiteralPath $encryptedKeyFile).Attributes = 'Hidden'
}

$bundledNode = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
$nodeExe = if (Test-Path -LiteralPath $bundledNode) { $bundledNode } else { "node.exe" }

$env:QDM_SUPABASE_SECRET_KEY = $secretKey
$env:QDM_ADMIN_PORT = [string]$adminPort
try {
  Push-Location $scriptDir
  & $nodeExe $serverPath
  if ($LASTEXITCODE -ne 0) { throw "The local admin server stopped with an error." }
}
finally {
  Pop-Location
  Remove-Item Env:\QDM_SUPABASE_SECRET_KEY -ErrorAction SilentlyContinue
  Remove-Item Env:\QDM_ADMIN_PORT -ErrorAction SilentlyContinue
}
