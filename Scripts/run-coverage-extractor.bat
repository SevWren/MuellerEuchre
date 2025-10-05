@echo off
rem Passes all arguments (%*) to the Node.js script.
rem This allows for flexible input like "1 2 3-5" as well as "1,2,3-5".
node ./Scripts/extract-uncovered-lines.js %*