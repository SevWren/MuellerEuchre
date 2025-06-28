@echo off
setlocal

:: ============================================================================
:: Gitingest Script for MuellerEuchre Repository
::
:: This script runs gitingest, runs tests, and copies both result FILES to the
:: clipboard for easy pasting.
:: ============================================================================

:: --- Configuration ---
set "REPO_PATH=C:\github\MuellerEuchre"
set "OUTPUT_FILE=C:\github\MuellerEuchre\mueller_euchre_repo_llm.txt"
set "TEST_OUTPUT_FILE=C:\github\MuellerEuchre\test_results.txt"

:: --- Script Execution ---
echo.
echo [+] Starting gitingest for repository: %REPO_PATH%
echo [+] Exclude patterns will be loaded from .gitingest file.
echo [+] Output will be saved to: %OUTPUT_FILE%
echo.

:: Change to the repository directory.
cd /d "%REPO_PATH%"

:: Run gitingest with exclusions
call gitingest "%REPO_PATH%" --output "%OUTPUT_FILE%" -e "unit_test_results.txt" -e "mueller_euchre_repo_llm.txt" -e "package-lock.json" -e ".nvmrc" -e "CODE_OF_CONDUCT.md" -e "coverage/" -e ".git/" -e "Repo_To_LLM/" -e "archived/" -e "node_modules/" -e ".kilocode/" -e ".vscode/" -e "assets/" -e ".husky/" -e ".github/"

:: Check if the command was successful
if errorlevel 1 (
    echo.
    echo [!] ERROR: Gitingest failed to complete. Please check the output above for errors.
) else (
    echo.
    echo [✔] SUCCESS: Gitingest has successfully generated the file:
    echo     %OUTPUT_FILE%
)

echo.
echo [+] Running tests and redirecting output to: %TEST_OUTPUT_FILE%
echo     This may take a moment...

:: Run npm test and redirect both stdout and stderr to the output file.
call npm test > "%TEST_OUTPUT_FILE%" 2>&1

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
echo.

:: --- New: Copy both FILES to clipboard using PowerShell ---
echo.
echo [+] Copying the test_results.txt and mueller_euchre_repo_llm.txt FILES to clipboard...

powershell -ExecutionPolicy Bypass -Command "Set-Clipboard -Path '%TEST_OUTPUT_FILE%', '%OUTPUT_FILE%'"

echo [i] Both files have been copied to the clipboard. You can now paste (Ctrl+V) into a folder.

echo.
pause
endlocal