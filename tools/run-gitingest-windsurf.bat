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
set "REPO_PATH=C:\github\MuellerEuchre-Windsurf"
set "OUTPUT_FILE=C:\github\MuellerEuchre-Windsurf\mueller_euchre_repo_llm.txt"


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
gitingest "%REPO_PATH%" --output "%OUTPUT_FILE%" -e "unit_test_results.txt" -e "mueller_euchre_repo_llm.txt" -e "package-lock.json" -e "CODE_OF_CONDUCT.md" -e "coverage/" -e ".git/" -e "Repo_To_LLM/" -e "archived/" -e "node_modules/" -e ".kilocode/" -e ".vscode/" -e "assets/" -e ".husky/" -e ".github/" -e ".nyc_output" -e "archived_for_later_development/" -e "memory-bank/" -e "Prompts/" -e "public/" -e "tools/" -e ".windsurf/"  -e ".kilocode" -e ".kilocodemodes" -e ".markdownlint.json" -e ".mocharc - Copy.cjs.txt" -e ".mocharc.js.bak" -e "players.unit.test.js_100_percent.txt"

:: Check if the command was successful
if errorlevel 1 (
    echo.
    echo [!] ERROR: Gitingest failed to complete. Please check the output above for errors.
) else (
    echo.
    echo [✔] SUCCESS: Gitingest has successfully generated the file:
    echo     %OUTPUT_FILE%
)

echo Copying GitIngest file to clipboard:

powershell -ExecutionPolicy Bypass -Command "Set-Clipboard -Path '%OUTPUT_FILE%'"

echo.
start "" "https://aistudio.google.com/prompts/new_chat"
endlocal