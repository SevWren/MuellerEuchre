import fs from 'node:fs/promises';
import path from 'node:path';

function parseLineNumbers(lineString) {
  if (!lineString) {
    return [];
  }

  const numbers = new Set();
  const standardizedString = lineString.replace(/\s+/g, ',');
  const parts = standardizedString.split(',');

  for (const part of parts) {
    const trimmedPart = part.trim();
    if (trimmedPart === '') continue;

    if (trimmedPart.includes('-')) {
      const [start, end] = trimmedPart.split('-').map(num => parseInt(num, 10));
      if (!isNaN(start) && !isNaN(end) && start <= end) {
        for (let i = start; i <= end; i++) {
          numbers.add(i);
        }
      }
    } else {
      const num = parseInt(trimmedPart, 10);
      if (!isNaN(num)) {
        numbers.add(num);
      }
    }
  }

  return Array.from(numbers).sort((a, b) => a - b);
}

async function main() {
  const args = process.argv.slice(2);
  const filePath = args[0];
  const lineArgs = args.slice(1);

  if (!filePath || lineArgs.length === 0) {
    console.error('Usage: node Scripts/extract-uncovered-lines.js <file-path> <line-numbers>');
    console.error('Example (commas): node Scripts/extract-uncovered-lines.js <file-path> "81-82,110,153,166"');
    console.error('Example (spaces): node Scripts/extract-uncovered-lines.js <file-path> 1 6 8 2 9 11');
    console.error('Example (mixed):  node Scripts/extract-uncovered-lines.js <file-path> 147,165-166 181-182');
    process.exit(1);
  }

  const lineString = lineArgs.join(' ');
  const projectRoot = process.cwd();
  const sourceFilePath = path.resolve(projectRoot, filePath);
  const outputFilePath = path.resolve(projectRoot, 'uncovered_lines_content.txt');

  try {
    console.log(`Reading source file: ${sourceFilePath}`);
    const fileContent = await fs.readFile(sourceFilePath, 'utf-8');
    const lines = fileContent.split(/\r?\n/);
    const targetLineNumbers = parseLineNumbers(lineString);

    if (targetLineNumbers.length === 0) {
      console.warn('No valid line numbers were parsed. Output file will not be created.');
      return;
    }

    const outputLines = [];
    for (const lineNumber of targetLineNumbers) {
      if (lineNumber > 0 && lineNumber <= lines.length) {
        const lineContent = lines[lineNumber - 1];
        outputLines.push(`Line ${lineNumber}: ${lineContent}`);
      } else {
        outputLines.push(`Line ${lineNumber}: [Line number out of bounds for file with ${lines.length} lines]`);
      }
    }

    const header = `The Following is exactly what is not being covered in the file ${filePath}:\r\n\r\n`;
    const codeLinesContent = outputLines.join('\r\n');
    const outputContent = header + codeLinesContent;

    await fs.writeFile(outputFilePath, outputContent, 'utf-8');
    console.log(`Successfully wrote ${outputLines.length} uncovered lines to: ${outputFilePath}`);

  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error(`Error: Source file not found at '${sourceFilePath}'`);
    } else {
      console.error('An unexpected error occurred:', error);
    }
    process.exit(1);
  }
}

main();