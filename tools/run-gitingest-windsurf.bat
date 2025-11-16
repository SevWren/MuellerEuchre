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

:: --- Pre-Gitingest Cleanup ---
:: Silently delete the output file if it exists
echo [+] Checking for and deleting existing output file: %OUTPUT_FILE%
if exist "%OUTPUT_FILE%" (
    del /q /f "%OUTPUT_FILE%"
    if not exist "%OUTPUT_FILE%" (
        echo [✔] Old output file deleted successfully.
    ) else (
        echo [!] Warning: Failed to delete old output file.
    )
) else (
    echo [i] No old output file found to delete.
)
echo.

:: Change to the repository directory. The /d switch is important
:: as it allows changing the current drive as well.
cd /d "%REPO_PATH%"

:: The command is now much simpler. gitingest will find .gitingest automatically.
gitingest "%REPO_PATH%" --output "%OUTPUT_FILE%" -e "unit_test_results.txt" -e ".git/" -e "Repo_To_LLM/" -e "archived/" -e ".nyc_output" -e "archived_for_later_development/" -e "memory-bank/" -e "public/" -e ".kilocodemodes" -e ".mocharc - Copy.cjs.txt" -e ".mocharc.js.bak" -e "players.unit.test.js_100_percent.txt" -e ".vscode/" -e "node_modules/" -e ".github/" -e ".kilocode/" -e "assets/" -e "coverage/" -e ".husky/" -e "tools/" -e "Prompts/" -e "package-lock.json" -e "CODE_OF_CONDUCT.md" -e ".markdownlint.json" -e "MuellerEuchre-Windsurf.code-workspace" -e ".gitingest" -e ".nvmrc" -e "readme.md" -e "mueller_euchre_repo_llm.txt" -e "docs/Architectural_Reference.html" -e "tools/" -e ".kilocodeignore" -e "CODE_OF_CONDUCT.md" -e "jsdoc.json" -e "package-lock.json" -e ".aiexclude" -e "MuellerEuchre-Windsurf.code-workspace" -e ".markdownlint.json" -e "digest.txt" -e "coverage/" -e ".vscode" -e "scripts/" -e ".windsurf/"

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