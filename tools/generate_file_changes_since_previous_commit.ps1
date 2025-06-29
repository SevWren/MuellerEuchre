# This script is now MODIFIED to use `git diff --staged` to capture ONLY
# staged changes since the last commit.
#
# It is designed to be run from its location and will correctly determine the
# repository root to execute commands and save the output file.

# --- Configuration ---
$outputFile = "changes_since_last_commit.txt"
$separator = @(
    "",
    "==================================================",
    "==================== FILE-BREAK ====================",
    "==================================================",
    ""
)

# --- Script ---

# 1. Determine the repository root.
$repoRoot = Join-Path -Path $PSScriptRoot -Resolve "..\"

# 2. Change the current location to the repository root.
Set-Location -Path $repoRoot

# 3. Define the full path for the output file, placing it in the repository root.
$outputFilePath = Join-Path -Path $repoRoot -ChildPath $outputFile

# 4. Get the list of ONLY STAGED files.
#    MODIFICATION: Added the --staged flag to the command.
$changedFiles = git diff --staged --name-only

# Check if there are any staged changes
if ($null -eq $changedFiles) {
    Write-Host "No staged changes found." -ForegroundColor Yellow
    Set-Content -Path $outputFilePath -Value "No staged changes found to report."
    exit 0
}

# 5. Build the content for the output file
$fileContents = @()
$fileCounter = 0

foreach ($file in $changedFiles) {
    # If this is not the first file, add the separator block
    if ($fileCounter -gt 0) {
        $fileContents += $separator
    }

    # Add the formatted file name header
    $fileContents += "**$file**"
    $fileContents += ""

    # Get the specific diff for this STAGED file.
    # MODIFICATION: Added the --staged flag to the command.
    $diffOutput = git diff --staged --no-prefix -- $file
    $fileContents += $diffOutput
    
    $fileCounter++
}

# 6. Write all the collected content to the output file
Set-Content -Path $outputFilePath -Value $fileContents -Encoding Utf8

# --- Confirmation ---
Write-Host "Success! Staged changes have been written to:"
Write-Host $outputFilePath -ForegroundColor Green