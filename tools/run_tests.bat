@echo off
setlocal

:: ============================================================================
:: Batch Script to Run MuellerEuchre Tests
::
:: This script changes to the project directory, runs 'npm test',
:: and redirects all output (including errors) to a log file,
:: overwriting the file on each run.
:: ============================================================================

:: --- Configuration ---
:: Set the full path to your local repository clone.
set "REPO_PATH=C:\github\MuellerEuchre"
:: Set the name for the test results file.
set "TEST_OUTPUT_FILE=test_results.txt"


:: --- Script Execution ---
echo.
echo [+] Changing directory to: %REPO_PATH%

:: Change to the repository directory. The /d switch is important
:: as it allows changing the current drive as well.
cd /d "%REPO_PATH%"

:: Check if the directory change was successful.
if errorlevel 1 (
    echo.
    echo [!] ERROR: Could not change directory to "%REPO_PATH%".
    echo     Please verify the path is correct in the script.
    goto :end
)

echo [+] Running tests and redirecting output to: %TEST_OUTPUT_FILE%
echo     This may take a moment...

:: Run npm test and redirect both standard output (>) and standard error (2>&1)
:: to the output file. This overwrites the file if it exists.
npm test > "%TEST_OUTPUT_FILE%" 2>&1

:: Check if the npm test command failed.
if errorlevel 1 (
    echo.
    echo [!] WARNING: 'npm test' completed with errors.
    echo     Check the log file for details.
) else (
    echo.
    echo [+] SUCCESS: 'npm test' completed successfully.
)

echo.
echo [i] Test results have been saved to:
echo     %REPO_PATH%\%TEST_OUTPUT_FILE%

:end
echo.
pause
endlocal