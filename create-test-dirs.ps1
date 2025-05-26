# PowerShell script to create test directories
Write-Host "Creating test directory structure..." -ForegroundColor Cyan

$testDirs = @(
    "test\__mocks__\services",
    "test\__fixtures__",
    "test\utils"
)

foreach ($dir in $testDirs) {
    $fullPath = Join-Path -Path $PSScriptRoot -ChildPath $dir
    Write-Host "Creating: $fullPath" -NoNewline
    
    if (Test-Path -Path $fullPath) {
        Write-Host " - Already exists" -ForegroundColor Yellow
    } else {
        try {
            $null = New-Item -Path $fullPath -ItemType Directory -Force -ErrorAction Stop
            Write-Host " - Created" -ForegroundColor Green
        } catch {
            Write-Host " - Failed: $_" -ForegroundColor Red
        }
    }
}

Write-Host "`nTest directory structure creation complete." -ForegroundColor Cyan
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
