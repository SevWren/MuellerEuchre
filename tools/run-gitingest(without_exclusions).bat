@echo off
setlocal

:: ============================================================================
:: Gitingest Script for MuellerEuchre Repository
::
:: This script runs the gitingest tool on a local clone of the
:: MuellerEuchre repository. Exclude patterns are loaded automatically
:: from the .gitingest file in the repository root.
:: ============================================================================

:: --- Configuration ---
set "REPO_PATH=C:\github\MuellerEuchre"
set "OUTPUT_FILE=C:\github\MuellerEuchre\tools\mueller_euchre_repo_llm.txt"


:: --- Script Execution ---
echo.
echo [+] Starting gitingest for repository: %REPO_PATH%
echo [+] Exclude patterns will be loaded from .gitingest file.
echo [+] Output will be saved to: %OUTPUT_FILE%
echo.

:: Change to the repository directory. The /d switch is important
:: as it allows changing the current drive as well.
cd /d "%REPO_PATH%"

:: The command is now much simpler. gitingest will find .gitingest automatically.
gitingest.exe "%REPO_PATH%" --output "%OUTPUT_FILE%"

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
pause
endlocal