ECHO ON
echo change to unit test directory
cd "G:\Users\mmuel\OneDrive\Documents\GitHub\MuellerEuchre\euchre-multiplayer\test"
echo run unit test file and output to log file

npx mocha G:\Users\mmuel\OneDrive\Documents\GitHub\MuellerEuchre\euchre-multiplayer\test\server3.unit.test.js --timeout 5000 --require proxyquire --reporter spec >> Unit_test_output.log"

pause