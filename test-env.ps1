# PowerShell script to test the Node.js environment
$ErrorActionPreference = "Stop"
$outputFile = "$PSScriptRoot\test-environment-output.txt"

function Write-Log {
    param ([string]$message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "[$timestamp] $message" | Tee-Object -FilePath $outputFile -Append
}

# Clear previous output
"=== Node.js Environment Test ===" | Out-File -FilePath $outputFile -Force
Write-Log "Starting environment test..."

# 1. Check Node.js installation
try {
    $nodePath = (Get-Command node -ErrorAction Stop).Source
    $nodeVersion = node --version
    Write-Log "✅ Node.js found at: $nodePath"
    Write-Log "   Version: $nodeVersion"
} catch {
    Write-Log "❌ Node.js is not installed or not in PATH"
    Write-Log "   Please install Node.js from https://nodejs.org/"
    exit 1
}

# 2. Check npm
try {
    $npmPath = (Get-Command npm -ErrorAction Stop).Source
    $npmVersion = npm --version
    Write-Log "✅ npm found at: $npmPath"
    Write-Log "   Version: $npmVersion"
} catch {
    Write-Log "❌ npm not found. This might cause issues with package management."
}

# 3. Check project directory
$projectDir = $PSScriptRoot
Write-Log "`n=== Project Directory ==="
Write-Log "Path: $projectDir"

# 4. Check package.json
$packageJson = Join-Path $projectDir "package.json"
if (Test-Path $packageJson) {
    $pkg = Get-Content $packageJson | ConvertFrom-Json
    Write-Log "✅ package.json found"
    Write-Log "   Name: $($pkg.name)"
    Write-Log "   Version: $($pkg.version)"
} else {
    Write-Log "❌ package.json not found in project directory"
    exit 1
}

# 5. Install dependencies
Write-Log "`n=== Installing Dependencies ==="
try {
    Push-Location $projectDir
    $installOutput = npm install 2>&1 | Out-String
    if ($LASTEXITCODE -eq 0) {
        Write-Log "✅ Dependencies installed successfully"
    } else {
        Write-Log "❌ Failed to install dependencies"
        Write-Log $installOutput
        exit 1
    }
} catch {
    Write-Log "❌ Error installing dependencies: $_"
    exit 1
} finally {
    Pop-Location
}

# 6. Run a simple test
Write-Log "`n=== Running Simple Test ==="
try {
    $simpleTest = @"
    console.log('Simple test from Node.js');
    console.log('Current directory:', process.cwd());
    console.log('Environment:');
    console.log('- NODE_ENV:', process.env.NODE_ENV || 'not set');
    console.log('- PWD:', process.env.PWD || 'not set');
    "@
    
    $tempFile = [System.IO.Path]::GetTempFileName() + ".js"
    $simpleTest | Out-File -FilePath $tempFile -Encoding utf8
    
    Write-Log "Running test script: $tempFile"
    $output = node $tempFile 2>&1 | Out-String
    Remove-Item $tempFile -Force
    
    Write-Log "Test output:"
    Write-Log $output
    Write-Log "✅ Simple test completed"
} catch {
    Write-Log "❌ Simple test failed: $_"
}

# 7. Run Mocha test
Write-Log "`n=== Running Mocha Test ==="
try {
    $testFile = Join-Path $projectDir "test\sanity.test.js"
    if (Test-Path $testFile) {
        Write-Log "Running test: $testFile"
        Push-Location $projectDir
        $output = npx mocha $testFile --reporter spec 2>&1 | Out-String
        Pop-Location
        
        Write-Log "Test output:"
        Write-Log $output
        
        if ($LASTEXITCODE -eq 0) {
            Write-Log "✅ Mocha test completed successfully"
        } else {
            Write-Log "❌ Mocha test failed with exit code $LASTEXITCODE"
        }
    } else {
        Write-Log "❌ Test file not found: $testFile"
    }
} catch {
    Write-Log "❌ Error running Mocha test: $_"
}

Write-Log "`n=== Test Complete ==="
Write-Log "Results have been saved to: $outputFile"
Write-Host "`nTest complete. Check $outputFile for results." -ForegroundColor Cyan
