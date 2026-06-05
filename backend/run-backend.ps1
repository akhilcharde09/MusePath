# MusePath Java Backend Runner
# This script downloads a portable Maven instance (if not present) and runs the Spring Boot application.

$ProgressPreference = 'SilentlyContinue'
$mavenVersion = "3.9.6"
$zipFile = "apache-maven-$mavenVersion-bin.zip"
$extractedDir = "apache-maven-$mavenVersion"

# Navigate to project directory
$PSScriptRoot = Split-Path -Parent -Path $MyInvocation.MyCommand.Definition
Set-Location $PSScriptRoot

Write-Host "[INFO] Starting MusePath Java Backend Server Runner..." -ForegroundColor Cyan

# 1. Download Maven if not present
if (-not (Test-Path $zipFile)) {
    Write-Host "Downloading portable Apache Maven $mavenVersion..." -ForegroundColor Yellow
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri "https://archive.apache.org/dist/maven/maven-3/$mavenVersion/binaries/$zipFile" -OutFile $zipFile -ErrorAction Stop
        Write-Host "Download complete." -ForegroundColor Green
    } catch {
        Write-Error "Failed to download Maven: $_"
        Exit 1
    }
}

# 2. Extract Maven if not present
if (-not (Test-Path $extractedDir)) {
    Write-Host "Extracting Apache Maven..." -ForegroundColor Yellow
    try {
        Expand-Archive -Path $zipFile -DestinationPath . -ErrorAction Stop
        Write-Host "Extraction complete." -ForegroundColor Green
    } catch {
        Write-Error "Failed to extract Maven: $_"
        Exit 1
    }
}

# 3. Verify .env file is in place
if (-not (Test-Path ".env")) {
    Write-Warning "No .env file found! Database connections and API keys might not work."
}

# 4. Prompt for DB_PASSWORD if missing in .env
if (Test-Path ".env") {
    $envContent = Get-Content ".env" -Raw
    if ($envContent -notmatch "DB_PASSWORD=") {
        Write-Host ""
        Write-Host "Note: Direct database connection (JPA) requires database credentials in env." -ForegroundColor Cyan
        Write-Host "Your Supabase project ID is tdfqwobzkfwxrsllyhfy." -ForegroundColor Cyan
        Write-Host "Please append the following keys to your .env file to enable full database access:" -ForegroundColor Cyan
        Write-Host "DB_HOST=aws-0-us-east-1.pooler.supabase.com" -ForegroundColor DarkGray
        Write-Host "DB_PORT=6543" -ForegroundColor DarkGray
        Write-Host "DB_NAME=postgres" -ForegroundColor DarkGray
        Write-Host "DB_USERNAME=postgres.tdfqwobzkfwxrsllyhfy" -ForegroundColor DarkGray
        Write-Host "DB_PASSWORD=YOUR_DATABASE_PASSWORD" -ForegroundColor DarkGray
        Write-Host ""
    }
}

# 5. Launch the application
Write-Host "Starting Spring Boot Application..." -ForegroundColor Cyan
& ".\$extractedDir\bin\mvn.cmd" spring-boot:run
