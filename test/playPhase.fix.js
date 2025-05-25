// This is a temporary file to demonstrate the fix for the test case
// The issue is that the test is not properly handling the game state updates between card plays

// The fix is to ensure we're using a fresh copy of the game state for each play
// Here's how the test should be updated:

/*
// Original test code:
let updatedState = handlePlayCard(JSON.parse(JSON.stringify(gameState)), 'south', JSON.parse(JSON.stringify(southCard)));
updatedState = handlePlayCard(updatedState, 'west', JSON.parse(JSON.stringify(westCard)));
updatedState = handlePlayCard(updatedState, 'north', JSON.parse(JSON.stringify(northCard)));
updatedState = handlePlayCard(updatedState, 'east', JSON.parse(JSON.stringify(eastCard)));
*/

// Fixed test code:
/*
const play1 = handlePlayCard(JSON.parse(JSON.stringify(gameState)), 'south', JSON.parse(JSON.stringify(southCard)));
const play2 = handlePlayCard(JSON.parse(JSON.stringify(play1)), 'west', JSON.parse(JSON.stringify(westCard)));
const play3 = handlePlayCard(JSON.parse(JSON.stringify(play2)), 'north', JSON.parse(JSON.stringify(northCard)));
const updatedState = handlePlayCard(JSON.parse(JSON.stringify(play3)), 'east', JSON.parse(JSON.stringify(eastCard)));
*/

// The key difference is that we're creating a fresh copy of the game state for each play
// This ensures that each play is independent and the state is properly updated between plays
