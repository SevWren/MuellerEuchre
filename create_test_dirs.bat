@echo off
echo Creating test directory structure...

echo Creating test\__mocks__\services
mkdir "test\__mocks__\services" 2>nul || echo Directory already exists or could not be created

echo Creating test\__fixtures__
mkdir "test\__fixtures__" 2>nul || echo Directory already exists or could not be created

echo Creating test\utils
mkdir "test\utils" 2>nul || echo Directory already exists or could not be created

echo.
echo Directory creation complete.
pause
