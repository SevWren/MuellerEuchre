# PowerShell script to rename test files according to the plan
# Run this from the test directory

# Create directories if they don't exist
$directories = @("phases", "services", "server")
foreach ($dir in $directories) {
    if (-not (Test-Path -Path $dir)) {
        New-Item -ItemType Directory -Path $dir | Out-Null
    }
}

# Phase tests
Move-Item -Path ".\endGame.unit.test.js" -Destination ".\phases\endGame.unit.test.js" -Force
Move-Item -Path ".\goAlonePhase.unit.test.js" -Destination ".\phases\goAlone.unit.test.js" -Force -ErrorAction SilentlyContinue
Move-Item -Path ".\orderUpPhase.unit.test.js" -Destination ".\phases\orderUp.unit.test.js" -Force -ErrorAction SilentlyContinue
Move-Item -Path ".\playPhase.unit.test.js" -Destination ".\phases\play.unit.test.js" -Force -ErrorAction SilentlyContinue
Move-Item -Path ".\scoring.unit.test.js" -Destination ".\phases\scoring.unit.test.js" -Force -ErrorAction SilentlyContinue
Move-Item -Path ".\startNewHand.unit.test.js" -Destination ".\phases\startHand.unit.test.js" -Force -ErrorAction SilentlyContinue
Move-Item -Path ".\startNewHand.integration.test.js" -Destination ".\phases\startHand.integration.test.js" -Force -ErrorAction SilentlyContinue

# Services tests
Move-Item -Path ".\reconnectionHandler.unit.test.js" -Destination ".\services\reconnection.unit.test.js" -Force -ErrorAction SilentlyContinue
Move-Item -Path ".\stateSyncService.unit.test.js" -Destination ".\services\stateSync.unit.test.js" -Force -ErrorAction SilentlyContinue
Move-Item -Path ".\uiIntegrationService.unit.test.js" -Destination ".\services\uiIntegration.unit.test.js" -Force -ErrorAction SilentlyContinue
Move-Item -Path ".\validation.unit.test.js" -Destination ".\services\validation.unit.test.js" -Force -ErrorAction SilentlyContinue
Move-Item -Path ".\coreGameLogic.unit.test.js" -Destination ".\services\coreGame.unit.test.js" -Force -ErrorAction SilentlyContinue

# Server tests
Move-Item -Path ".\server3.basic.test.mjs" -Destination ".\server\basic.unit.test.js" -Force -ErrorAction SilentlyContinue
Move-Item -Path ".\server3.dealerDiscard.test.js" -Destination ".\server\dealerDiscard.unit.test.js" -Force -ErrorAction SilentlyContinue
Move-Item -Path ".\server3.errorHandling.test.js" -Destination ".\server\errorHandling.unit.test.js" -Force -ErrorAction SilentlyContinue
Move-Item -Path ".\server3.goAlone.unit.test.js" -Destination ".\server\goAlone.unit.test.js" -Force -ErrorAction SilentlyContinue
Move-Item -Path ".\server3.integration.test.js" -Destination ".\server\integration.test.js" -Force -ErrorAction SilentlyContinue
Move-Item -Path ".\server3.logging.unit.test.js" -Destination ".\server\logging.unit.test.js" -Force -ErrorAction SilentlyContinue
Move-Item -Path ".\server3.multiGame.test.js" -Destination ".\server\multiGame.integration.test.js" -Force -ErrorAction SilentlyContinue
Move-Item -Path ".\server3.orderUp.unit.test.js" -Destination ".\server\orderUp.unit.test.js" -Force -ErrorAction SilentlyContinue
Move-Item -Path ".\server3.performance.test.js" -Destination ".\server\performance.unit.test.js" -Force -ErrorAction SilentlyContinue
Move-Item -Path ".\server3.persistence.test.js" -Destination ".\server\persistence.unit.test.js" -Force -ErrorAction SilentlyContinue
Move-Item -Path ".\server3.playCard.additional.test.js" -Destination ".\server\playCard.additional.unit.test.js" -Force -ErrorAction SilentlyContinue
Move-Item -Path ".\server3.playCard.unit.test.js" -Destination ".\server\playCard.unit.test.js" -Force -ErrorAction SilentlyContinue
Move-Item -Path ".\server3.reconnection.test.js" -Destination ".\server\reconnection.integration.test.js" -Force -ErrorAction SilentlyContinue
Move-Item -Path ".\server3.scoreHand.unit.test.js" -Destination ".\server\scoreHand.unit.test.js" -Force -ErrorAction SilentlyContinue
Move-Item -Path ".\server3.security.test.js" -Destination ".\server\security.integration.test.js" -Force -ErrorAction SilentlyContinue
Move-Item -Path ".\server3.socket.unit.test.js" -Destination ".\server\socket.unit.test.js" -Force -ErrorAction SilentlyContinue
Move-Item -Path ".\server3.spectator.test.js" -Destination ".\server\spectator.integration.test.js" -Force -ErrorAction SilentlyContinue
Move-Item -Path ".\server3.validation.test.js" -Destination ".\server\validation.unit.test.js" -Force -ErrorAction SilentlyContinue

Write-Host "All test files have been reorganized according to the plan."
