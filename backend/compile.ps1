$ProgressPreference = 'SilentlyContinue'
$mavenVersion = "3.9.6"
$zipFile = "apache-maven-$mavenVersion-bin.zip"
$extractedDir = "apache-maven-$mavenVersion"

if (-not (Test-Path $zipFile)) {
    Write-Host "Downloading Maven (silently)..."
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri "https://archive.apache.org/dist/maven/maven-3/$mavenVersion/binaries/$zipFile" -OutFile $zipFile
}

if (-not (Test-Path $extractedDir)) {
    Write-Host "Extracting Maven..."
    Expand-Archive -Path $zipFile -DestinationPath .
}

if (-not (Test-Path ".env")) {
    Write-Warning "No .env file found! Database connections and API keys might not work."
}

Write-Host "Compiling project..."
& ".\$extractedDir\bin\mvn.cmd" clean compile
