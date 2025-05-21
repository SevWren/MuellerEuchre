@echo off
echo ===== Starting Test Runner ===== > test-output.txt
echo Date: %date% %time% >> test-output.txt
echo ================================ >> test-output.txt

echo.
echo 1. Checking Node.js version...
node --version >> test-output.txt 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed or not in PATH >> test-output.txt
    goto :end
) else (
    echo ✅ Node.js found >> test-output.txt
)

echo.
echo 2. Checking npm version...
npm --version >> test-output.txt 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed or not in PATH >> test-output.txt
) else (
    echo ✅ npm found >> test-output.txt
)

echo.
echo 3. Installing dependencies...
npm install >> test-output.txt 2>&1
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies >> test-output.txt
    goto :end
) else (
    echo ✅ Dependencies installed successfully >> test-output.txt
)

echo.
echo 4. Running simple test...
echo === Simple Test === >> test-output.txt
node -e "console.log('Hello from Node.js')" >> test-output.txt 2>&1
if %errorlevel% neq 0 (
    echo ❌ Simple test failed >> test-output.txt
) else (
    echo ✅ Simple test passed >> test-output.txt
)

echo.
echo 5. Running Mocha test...
echo === Mocha Test === >> test-output.txt
npx mocha test/sanity.test.js --reporter spec >> test-output.txt 2>&1
if %errorlevel% neq 0 (
    echo ❌ Mocha test failed >> test-output.txt
) else (
    echo ✅ Mocha test passed >> test-output.txt
)

:end
echo.
echo ===== Test Runner Finished ===== >> test-output.txt
echo Test results have been saved to test-output.txt

REM Display the output file
type test-output.txt

REM Pause to see the output
pause
