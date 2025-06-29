@echo off
setlocal

:: ============================================================================
:: Gitingest Script for MuellerEuchre Repository
::
:: This script performs three main actions:
:: 1. Runs gitingest to gather a complete snapshot of the repository.
:: 2. Runs a PowerShell script to get only the staged file changes.
:: 3. Copies both result FILES to the clipboard for easy pasting.
:: 4. Opens a specific Google AI Studio prompt in Chrome.
:: ============================================================================

:: --- Configuration ---
set "REPO_PATH=C:\github\MuellerEuchre"
set "OUTPUT_FILE=C:\github\MuellerEuchre\mueller_euchre_repo_llm.txt"
set "CHANGES_FILE=C:\github\MuellerEuchre\changes_since_last_commit.txt"
set "CHANGES_SCRIPT=%REPO_PATH%\tools\generate_file_changes_since_previous_commit.ps1"
set "PROMPT_URL=https://aistudio.google.com/prompts/1Urk_tlkvT_NknL_IyVJBoaF65vDzPKkF"


:: --- Script Execution ---
echo.
echo [+] Starting gitingest for repository: %REPO_PATH%
echo [+] Exclude patterns will be loaded from .gitingest file.
echo [+] Full repo output will be saved to: %OUTPUT_FILE%
echo.

:: Change to the repository directory.
cd /d "%REPO_PATH%"
if errorlevel 1 (
    echo [!] ERROR: Failed to change directory to %REPO_PATH%.
    goto end
)

:: Run gitingest with exclusions
call gitingest "%REPO_PATH%" --output "%OUTPUT_FILE%" -e "unit_test_results.txt" -e "mueller_euchre_repo_llm.txt" -e "package-lock.json" -e ".nvmrc" -e "CODE_OF_CONDUCT.md" -e "coverage/" -e ".git/" -e "Repo_To_LLM/" -e "archived/" -e "node_modules/" -e ".kilocode/" -e ".vscode/" -e "assets/" -e ".husky/" -e ".github/"

:: Check if the gitingest command was successful
if errorlevel 1 (
    echo.
    echo [!] ERROR: Gitingest failed to complete. Please check the output above for errors.
    goto end
) else (
    echo.
    echo [✔] SUCCESS: Gitingest has successfully generated the file:
    echo     %OUTPUT_FILE%
)

echo.
echo [+] Generating staged file changes to: %CHANGES_FILE%

:: Run the PowerShell script to get staged changes
powershell.exe -ExecutionPolicy Bypass -File "%CHANGES_SCRIPT%"

:: Check if the PowerShell script ran successfully
if errorlevel 1 (
    echo.
    echo [!] ERROR: The PowerShell script to generate changes failed.
    echo     Script path: %CHANGES_SCRIPT%
    goto end
) else (
    echo [✔] SUCCESS: PowerShell script completed and generated the changes file.
)


:: Copy both FILES to clipboard using PowerShell
echo.
echo [+] Copying the contents of '%CHANGES_FILE%' and '%OUTPUT_FILE%' to the clipboard...
powershell -ExecutionPolicy Bypass -Command "Set-Clipboard -Path '%CHANGES_FILE%', '%OUTPUT_FILE%'"
echo [i] Both files have been copied to the clipboard. You can now paste (Ctrl+V) into a folder.


:: --- New: Open URL in Chrome ---
echo.
echo [+] Opening Google AI Studio prompt in Chrome...
start chrome "%PROMPT_URL%"


:end
echo.
echo [✔] All operations completed.
pause
endlocal