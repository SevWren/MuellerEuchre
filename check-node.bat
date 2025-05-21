@echo off
echo ===== Node.js Environment Check =====
echo.

echo [1/7] Checking Node.js installation...
where node > node-path.txt 2>&1
if %errorlevel% equ 0 (
    for /f "delims=" %%i in (node-path.txt) do set NODE_PATH=%%i
    echo ✅ Node.js found at: %NODE_PATH%
) else (
    echo ❌ Node.js is not installed or not in PATH
    goto :end
)

echo.
echo [2/7] Checking Node.js version...
node --version > node-version.txt 2>&1
if %errorlevel% equ 0 (
    set /p NODE_VERSION= < node-version.txt
    echo ✅ Node.js version: %NODE_VERSION%
) else (
    echo ❌ Could not determine Node.js version
)

echo.
echo [3/7] Checking npm installation...
where npm > npm-path.txt 2>&1
if %errorlevel% equ 0 (
    for /f "delims=" %%i in (npm-path.txt) do set NPM_PATH=%%i
    echo ✅ npm found at: %NPM_PATH%
) else (
    echo ❌ npm not found
)

echo.
echo [4/7] Checking project directory...
echo Current directory: %CD%
dir /b > dir-contents.txt
echo ✅ Directory listing saved to dir-contents.txt

echo.
echo [5/7] Running a simple test...
echo console.log('Hello from Node.js!'); > test-script.js
node test-script.js > test-output.txt 2>&1
if %errorlevel% equ 0 (
    echo ✅ Simple test passed
    type test-output.txt
) else (
    echo ❌ Simple test failed
)

echo.
echo [6/7] Checking package.json...
if exist package.json (
    echo ✅ package.json found
    type package.json | findstr "name version"
) else (
    echo ❌ package.json not found
)

echo.
echo [7/7] Installing dependencies...
call npm install > npm-install.log 2>&1
if %errorlevel% equ 0 (
    echo ✅ Dependencies installed successfully
) else (
    echo ❌ Failed to install dependencies. Check npm-install.log for details.
)

:end
echo.
echo ===== Environment Check Complete =====
echo Results have been saved to the following files:
echo - node-path.txt
echo - node-version.txt
echo - npm-path.txt
echo - dir-contents.txt
echo - test-output.txt
echo - npm-install.log
echo.
pause
