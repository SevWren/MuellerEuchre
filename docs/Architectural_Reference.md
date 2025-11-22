
### `docs/Architectural_Reference.md`

# Mueller Euchre: Architectural Cross-Reference Guide

This document is the single source of truth for mapping the application's features and architectural concepts to their specific locations in the source code. It is designed to provide a clear and direct index for developers and AI agents to quickly locate the authoritative implementation for any given piece of logic.

## Core Architecture & Principles

| Feature / Concept | Key Source File(s) | Key Test File(s) | Implementation Notes |
| :--- | :--- | :--- | :--- |
| **Layer 1 Purity Mandate** | `src/game/logic/`, `src/game/phases/`, `src/utils/` | `test/game/logic/`, `test/game/phases/`, `test/utils/` | The foundational principle. All functions in these directories must be pure, stateless, and have no I/O. They take a state and return a **new** state. Errors are **thrown**, not handled. See `docs/Layer1_Purity_Rules.md`. |
| **Layer 2 State Management** | `src/game/state.js` | `test/game/state/state.unit.test.js` | The conceptual plan for this layer is in `docs/Project_Details/state.js_Architectural_and_Functional_Specifications.md`. The implementation in `state.js` centralizes in-memory state, enforcing immutability. |
| **Constants & Immutability** | `src/config/constants.js` | `test/config/constants.unit.test.js` | The single source for all game enums (phases, suits, roles). `Object.freeze()` is mandatory to ensure runtime immutability as per `docs/MandateforImplementingObjectFreeze.md`. |

## Fundamental Game Rules & Data

| Feature / Concept | Key Source File(s) | Key Test File(s) | Implementation Notes |
| :--- | :--- | :--- | :--- |
| **Card Ranking Hierarchy** | `src/utils/cardUtils.js` | `test/utils/cardUtils.unit.test.js` | Implements the three-tier system: **Trump > Led Suit > Off-Suit**. The `getCardRank` function is the primary programmatic model. See `docs/Knowledge/The Complete Card Ranking Hierarchy.md`. |
| **Left Bower's Identity Shift** | `src/utils/cardUtils.js` | `test/utils/cardUtils.unit.test.js`, `test/game/logic/validatePlay.edge.unit.test.js` | The Jack of the same color as trump **becomes** a trump card. Its effective suit changes. This is critical for "must follow suit" validation. The core logic resides in `isLeftBower` and `getEffectiveSuit`. See `docs/Knowledge/The Left Bowers Identity Shift.md`. |
| **Deck Creation & Shuffling** | `src/utils/deck.js` | `test/utils/deck.unit.test.js` | `createDeck` generates a standard 24-card deck. `shuffleDeck` uses a standard Fisher-Yates algorithm. For testing, a deterministic shuffle is used. |

## Player, Team & Turn Logic

| Feature / Concept | Key Source File(s) | Key Test File(s) | Implementation Notes |
| :--- | :--- | :--- | :--- |
| **Fixed Seating & Partnerships** | `src/config/constants.js` (`PLAYER_ROLES`), `src/utils/players.js` (`getPartner`) | `test/utils/players.unit.test.js` | Partnerships are fixed (N/S vs E/W) and derived mathematically from the `PLAYER_ROLES` array index. `getPartner` uses `(index + 2) % 4`. See `docs/Knowledge/The_Fixed_Partnership_and_Turn_Rotation_System.md`. |
| **Clockwise Turn Rotation** | `src/utils/players.js` (`getNextPlayer`) | `test/utils/players.unit.test.js` | Handled exclusively by `getNextPlayer`. It uses `(index + 1) % 4` and has built-in logic to skip the `partnerSittingOut` during a "go alone" hand. See `docs/Knowledge/The_Immutable_Turn_Order_Logic.md`. |
| **Lobby Management** | `src/utils/lobbyUtils.js`, `src/game/phases/lobbyPhase.js` | `test/utils/lobbyUtils.unit.test.js`, `test/game/phases/lobbyPhase.unit.test.js` | `lobbyUtils.js` contains pure helpers for assigning roles and checking if the lobby is full. `lobbyPhase.js` handles the state transition from `LOBBY` to `DEALING`. |

## Game Flow & Phases

| Feature / Concept | Key Source File(s) | Key Test File(s) | Implementation Notes |
| :--- | :--- | :--- | :--- |
| **New Hand Initialization** | `src/game/phases/startNewHandPhase.js` | `test/game/phases/startNewHandPhase.unit.test.js`, `test/game/phases/dealer_rotation_fix.unit.test.js` | The `startNewHand` function is responsible for rotating the dealer, creating/shuffling a new deck, dealing cards, and setting the `turnCard`. |
| **Two-Round Bidding** | `src/game/phases/biddingPhase.js`, `src/game/logic/validation-core.js` | `test/game/phases/biddingPhase.unit.test.js` | Round 1 is handled by `handleOrderUpDecision`. Round 2 by `handleCallTrumpDecision`. The turned-down suit from the `turnCard` cannot be called in Round 2. See `docs/Knowledge/The_Two_Round_Bidding_Process.md`. |
| **Dealer Discard Mechanism** | `src/game/phases/biddingPhase.js` (`handleDealerDiscard`) | `test/game/phases/biddingPhase.unit.test.js` | Triggered after a successful "order up". The dealer cannot discard the `turnCard` they just picked up. Note: Logic is in `biddingPhase.js`, not a separate file. See `docs/Knowledge/The_Dealer_Discard_Mechanism.md`. |
| **"Going Alone" Gameplay** | `src/game/phases/goAlonePhase.js`, `src/utils/players.js`, `src/game/phases/scoringPhase.js` | `test/game/phases/goAlonePhase.unit.test.js`, `test/game/phases/scoringPhase.unit.test.js` | This is a multi-phase feature. `goAlonePhase` sets flags (`goingAlone`, `partnerSittingOut`). `getNextPlayer` reads these flags to skip turns. `scoringPhase` reads them for the 4-point march bonus. See `docs/Knowledge/The Going Alone Gameplay and Scoring Modifiers.md`. |
| **Card Play Validation** | `src/game/logic/validation-core.js` (`validatePlay`) | `test/game/logic/validatePlay.unit.test.js`, `test/game/logic/validatePlay.edge.unit.test.js` | The `validatePlay` function is the single source of truth for enforcing "must follow suit" and other card playing rules. |
| **Trick Playing & Winner** | `src/game/phases/playingPhase.js` | `test/game/phases/playingPhase.unit.test.js` | `handlePlayCard` processes a card play and updates the `currentTrick`. `determineTrickWinner` uses `getCardRank` to find the winner. |
| **Scoring (Makers vs. Defenders)** | `src/game/phases/scoringPhase.js` (`calculateAndApplyScore`) | `test/game/phases/scoringPhase.unit.test.js` | Asymmetric scoring based on `gameState.makerTeam`. Makers score 1 point (3-4 tricks) or 2 points (5 tricks). Defenders only score 2 points on a "euchre" (makers get < 3 tricks). See `docs/Knowledge/The_Scoring_System_Makers_vs_Defenders.md`. |
| **Misdeal & Redeal** | `src/game/phases/biddingPhase.js`, `src/game/phases/startNewHandPhase.js` | `test/game/phases/biddingPhase.unit.test.js` | Triggered when the dealer passes in Round 2. No `MISDEAL` phase exists; it transitions directly to `DEALING`. The "Stick the Dealer" rule is **NOT** implemented. See `docs/Knowledge/The_Misdeal_and_Redeal_Process.md`. |

## Testing & Tooling

| Feature / Concept | Key Source File(s) | Key Test File(s) | Implementation Notes |
| :--- | :--- | :--- | :--- |
| **Mocking Strategy** | N/A (Pattern) | `test/game/phases/biddingPhase.unit.test.js`, `test/game/phases/__mocks__/startNewHandPhase.js` | ESM imports are read-only. Direct mocking will fail. The required pattern is **Dependency Injection**, either via `this` context (`.call`) or factory functions in `__mocks__/`. See `docs/The Unabridged Mueller Euchre Debugging Bible.md`. |
| **Test Helpers & Data** | `test/helpers/test-helpers.js` | `test/helpers/test-helpers.unit.test.js` | The single source of truth for test data. Use `createBaseGameState` and `setupTestState` to ensure consistent and valid data shapes for tests. Avoid manual object creation. See `docs/Test Helpers and Utilities.md`. |
| **Custom Test Runners** | `Scripts/` | N/A | Contains scripts for running specific test suites, such as `run-deck-dependent-tests-all.js` for regression testing card logic, and `run-coverage-all.js` for full test coverage reports. |