@echo off
setlocal

:: ============================================================================
:: !!!!!! WIP!!
:: 
:: EVENTUAL Combined Script for MuellerEuchre Repository Operations
::
:: This script first runs 'npm test' for the project and then
:: executes the gitingest tool to generate a repository snapshot for LLM.
:: The test results will be generated *before* gitingest runs,
:: ensuring they are captured in the gitingest report.
::
:: This version specifically addresses the "for was unexpected at this time."
:: error by using robust command execution and redirection techniques.
:: ============================================================================

:: --- Global Configuration ---
:: Set the full path to your local repository clone.
set "REPO_PATH=C:\github\MuellerEuchre"

:: --- Test Configuration ---
:: Set the name for the test results file. This file will be created
:: inside the %REPO_PATH% directory.
set "TEST_OUTPUT_FILE=test_results.txt"

:: --- Gitingest Configuration ---
:: Set the full path for the gitingest output file.
set "GITINGEST_OUTPUT_FILE=C:\github\MuellerEuchre\tools\mueller_euchre_repo_llm.txt"


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
    goto :end_script
)

:: ============================================================================
:: Section 1: Running MuellerEuchre Tests
:: ============================================================================
echo.
echo ============================================================================
echo [+] Starting 'npm test' operation for MuellerEuchre...
echo ============================================================================
echo.

echo [+] Running tests and redirecting output to: %TEST_OUTPUT_FILE%
echo     This may take a moment...

:: CRITICAL FIX for "for was unexpected at this time.":
:: Use 'call cmd /c "..."' with ESCAPED redirection operators.
:: This ensures the inner 'cmd' instance correctly handles the redirection
:: and isolates the command's parsing from the main script.
:: '^>' escapes the '>' and '2^>^&1' escapes '2>&1' for the inner cmd.exe.
:: This is the most robust way to run commands with redirection that might
:: output special characters or have complex internal logic.
call cmd /c "npm test ^> "%TEST_OUTPUT_FILE%" 2^>^&1"

:: Check if the npm test command failed.
:: The errorlevel is set by the 'call' command based on the called program's exit code.
if errorlevel 1 (
    echo.
    echo [!] WARNING: 'npm test' completed with errors.
    echo     Check the log file (%TEST_OUTPUT_FILE%) for details.
) else (
    echo.
    echo [+] SUCCESS: 'npm test' completed successfully.
)

echo.
echo [i] Test results have been saved to:
echo     %REPO_PATH%\%TEST_OUTPUT_FILE%

echo.
echo ============================================================================
echo [+] 'npm test' operation completed.
echo ============================================================================


:: ============================================================================
:: Section 2: Running Gitingest for MuellerEuchre Repository
:: ============================================================================
echo.
echo ============================================================================
echo [+] Starting Gitingest operation for MuellerEuchre repository...
echo ============================================================================
echo.

echo [+] Starting gitingest for repository: %REPO_PATH%
echo [+] Exclude patterns will be loaded automatically from the .gitingest file.
echo [+] Output will be saved to: %GITINGEST_OUTPUT_FILE%
echo.

:: Use 'call cmd /c "..."' for gitingest.exe as well for consistency and robustness.
:: Since gitingest.exe itself doesn't have redirection operators in this command,
:: no escaping of > or & is required within its quoted string.
call cmd /c "gitingest.exe "%REPO_PATH%" --output "%GITINGEST_OUTPUT_FILE%""

:: Check if the command was successful
if errorlevel 1 (
    echo.
    echo [!] ERROR: Gitingest failed to complete. Please check the output above for errors.
) else (
    echo.
    echo [✔] SUCCESS: Gitingest has successfully generated the file:
    echo     %GITINGEST_OUTPUT_FILE%
)

echo.
echo ============================================================================
echo [+] Gitingest operation completed.
echo ============================================================================


:end_script
echo.
echo ============================================================================
echo [+] All combined operations have finished.
echo ============================================================================
echo.
pause
endlocal