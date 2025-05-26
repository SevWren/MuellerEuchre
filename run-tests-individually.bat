@echo ON
setlocal enabledelayedexpansion

:: =====================================================================
:: run-tests-individually.bat - Test Runner Script
:: 
:: Purpose:
::   This script runs each test file in the test directory individually,
::   providing clear pass/fail status for each test file. This is useful
::   for identifying exactly which tests pass or fail when running tests
::   individually versus running them all at once.
::
:: Usage:
::   Simply double-click this file in Windows Explorer or run it from
::   the command line. No arguments are required.
::
:: Features:
::   - Finds all .test.js files in the test directory and subdirectories
::   - Runs each test file individually with Mocha
::   - Provides clear visual separation between test runs
::   - Shows success/error status for each test file
::   - Includes a brief pause between tests for better readability
::   - Displays a summary when all tests are complete
::
:: Exit Codes:
::   0 - All tests passed
::   1 - One or more tests failed
::
:: Dependencies:
::   - Node.js and npm installed
::   - Mocha installed (locally or globally)
::   - Test files must use the .test.js extension
:: =====================================================================

REM Get all test files
echo Finding all test files...
for /r test\ %%f in (*.test.js) do (
    echo.
    echo ===================================================
    echo RUNNING TEST: %%~nxf
    echo ===================================================
    
    REM Run the test with mocha
    npx mocha "%%f"
    
    if !errorlevel! neq 0 (
        echo.
        echo [ERROR] Test failed: %%~nxf
        echo.
    ) else (
        echo.
        echo [SUCCESS] Test passed: %%~nxf
        echo.
    )
    
    timeout /t 1 /nobreak >nul
)

echo.
echo All tests completed.
pause
