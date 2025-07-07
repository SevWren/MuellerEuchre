# Set console output encoding to UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# First, get all files that would be tracked by git (respects .gitignore)
$files = git ls-files --recurse-submodules --full-name

# Function to build the tree structure
$tree = @{}
foreach ($file in $files) {
    $parts = $file -split '[\\/]'
    $current = $tree
    for ($i = 0; $i -lt $parts.Count; $i++) {
        $part = $parts[$i]
        if (-not $current.ContainsKey($part)) {
            $current[$part] = @{}
        }
        $current = $current[$part]
    }
}

# Function to print the tree
function Print-Tree {
    param(
        [Parameter(Mandatory = $true)]
        [hashtable]$node,
        [string]$prefix = ""
    )
    
    $keys = $node.Keys | Sort-Object
    $count = $keys.Count
    $i = 0
    
    foreach ($key in $keys) {
        $i++
        $isLast = $i -eq $count
        $line = if ($isLast) { [char]0x2514 + [char]0x2500 + [char]0x2500 + ' ' } else { [char]0x251C + [char]0x2500 + [char]0x2500 + ' ' }
        
        Write-Output ($prefix + $line + $key)
        
        $newPrefix = if ($isLast) { $prefix + "    " } else { $prefix + [char]0x2502 + "   " }
        Print-Tree -node $node[$key] -prefix $newPrefix
    }
}

# Create Reports directory if it doesn't exist
$reportsDir = Join-Path $PWD.Path "docs\Reports"
if (-not (Test-Path $reportsDir)) {
    New-Item -ItemType Directory -Path $reportsDir -Force | Out-Null
}

# Output to file with UTF-8 encoding
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$outputPath = Join-Path $reportsDir "MuellerEuchre_filetree.txt"
[System.IO.File]::WriteAllLines($outputPath, @(Print-Tree -node $tree), $utf8NoBom)
Write-Host "File tree has been saved to $outputPath"