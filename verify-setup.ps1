# PowerShell script to verify and fix Node.js environment
Write-Host "=== Node.js Environment Verification ===" -ForegroundColor Cyan

# 1. Check Node.js installation
Write-Host "`n1. Checking Node.js installation..." -ForegroundColor Yellow
$nodePath = (Get-Command node -ErrorAction SilentlyContinue).Source
$npmPath = (Get-Command npm -ErrorAction SilentlyContinue).Source

if ($nodePath) {
    Write-Host "✅ Node.js found at: $nodePath" -ForegroundColor Green
    Write-Host "   Node.js version: $(node --version)" -ForegroundColor Green
} else {
    Write-Host "❌ Node.js not found in PATH" -ForegroundColor Red
    Write-Host "   Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# 2. Check npm
if ($npmPath) {
    Write-Host "✅ npm found at: $npmPath" -ForegroundColor Green
    Write-Host "   npm version: $(npm --version)" -ForegroundColor Green
} else {
    Write-Host "❌ npm not found" -ForegroundColor Red
}

# 3. Check project directory
Write-Host "`n2. Checking project directory..." -ForegroundColor Yellow
$projectDir = Get-Location
Write-Host "   Current directory: $projectDir"

# 4. Check for package.json
if (Test-Path "$projectDir\package.json") {
    Write-Host "✅ package.json found" -ForegroundColor Green
    $pkg = Get-Content "$projectDir\package.json" | ConvertFrom-Json
    Write-Host "   Project name: $($pkg.name)"
    Write-Host "   Project version: $($pkg.version)"
} else {
    Write-Host "❌ package.json not found" -ForegroundColor Red
    exit 1
}

# 5. Check node_modules
Write-Host "`n3. Checking dependencies..." -ForegroundColor Yellow
if (Test-Path "$projectDir\node_modules") {
    Write-Host "✅ node_modules directory exists" -ForegroundColor Green
} else {
    Write-Host "⚠ node_modules not found. Running 'npm install'..." -ForegroundColor Yellow
    npm install
}

# 6. Verify test files
Write-Host "`n4. Verifying test files..." -ForegroundColor Yellow
$testDir = "$projectDir\test"
if (Test-Path $testDir) {
    $testFiles = Get-ChildItem -Path $testDir -Filter "*.test.js" -Recurse
    if ($testFiles.Count -gt 0) {
        Write-Host "✅ Found $($testFiles.Count) test files" -ForegroundColor Green
        $testFiles | Select-Object -First 5 | ForEach-Object {
            Write-Host "   - $($_.Name)"
        }
        if ($testFiles.Count -gt 5) {
            Write-Host "   ... and $($testFiles.Count - 5) more"
        }
    } else {
        Write-Host "⚠ No test files found in $testDir" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Test directory not found: $testDir" -ForegroundColor Red
}

# 7. Run a simple test
Write-Host "`n5. Running a simple test..." -ForegroundColor Yellow
try {
    $testScript = "$projectDir\test-simple.js"
    if (Test-Path $testScript) {
        Write-Host "Running: node $testScript"
        $output = node $testScript 2>&1 | Out-String
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Simple test passed!" -ForegroundColor Green
            if ($output) { Write-Host $output }
        } else {
            Write-Host "❌ Simple test failed with exit code $LASTEXITCODE" -ForegroundColor Red
            if ($output) { Write-Host $output }
        }
    } else {
        Write-Host "❌ Test script not found: $testScript" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error running test: $_" -ForegroundColor Red
}

# 8. Run Mocha test
Write-Host "`n6. Running Mocha test..." -ForegroundColor Yellow
try {
    $mochaBin = "$projectDir\node_modules\.bin\mocha"
    $testFile = "$testDir\sanity.test.js"
    
    if (Test-Path $mochaBin -and (Test-Path $testFile)) {
        Write-Host "Running: node $mochaBin $testFile"
        Push-Location $projectDir
        $output = node $mochaBin $testFile 2>&1 | Out-String
        Pop-Location
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Mocha test passed!" -ForegroundColor Green
            if ($output) { Write-Host $output }
        } else {
            Write-Host "❌ Mocha test failed with exit code $LASTEXITCODE" -ForegroundColor Red
            if ($output) { Write-Host $output }
        }
    } else {
        if (-not (Test-Path $mochaBin)) {
            Write-Host "❌ Mocha not found at: $mochaBin" -ForegroundColor Red
        }
        if (-not (Test-Path $testFile)) {
            Write-Host "❌ Test file not found: $testFile" -ForegroundColor Red
        }
    }
} catch {
    Write-Host "❌ Error running Mocha: $_" -ForegroundColor Red
}

Write-Host "`n=== Verification Complete ===" -ForegroundColor Cyan
