#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const { scan } = require('../lib/scanner');
const { generateReport, saveReport } = require('../lib/reporter');

function printUsage() {
  console.log(`
AI Code Copyright Risk Scanner (aicopycheck)

Usage:
  aicopycheck [directory] [options]

Options:
  --json           Output in JSON format
  --html           Output in HTML format
  --output <path>  Save report to file
  --ignore <pat>   Additional ignore pattern (regex, repeatable)
  --ext <ext>      Additional file extension (repeatable)
  --help, -h       Show this help

Examples:
  aicopycheck                          Scan current directory, text output
  aicopycheck ./src                    Scan ./src directory
  aicopycheck --json --output report.json
  aicopycheck --html --output report.html
  aicopycheck --ignore ".*\\\\.generated\\\\.ts$" --ext .vue

Exit codes:
  0  Low risk - no significant issues
  1  Medium risk - manual review recommended
  2  High/critical risk - compliance concerns detected
`);
}

function parseArgs(argv) {
  const options = {
    directory: '.',
    format: 'text',
    ignore: [],
    extensions: [],
    output: null
  };

  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    } else if (arg === '--json') {
      options.format = 'json';
    } else if (arg === '--html') {
      options.format = 'html';
    } else if (arg === '--output') {
      options.output = argv[++i];
    } else if (arg === '--ignore') {
      options.ignore.push(argv[++i]);
    } else if (arg === '--ext') {
      options.extensions.push(argv[++i]);
    } else if (!arg.startsWith('-')) {
      options.directory = arg;
    }
    i++;
  }

  return options;
}

function findConfig(dir) {
  const configPath = path.join(dir, '.aicopycheckrc.json');
  if (fs.existsSync(configPath)) {
    try {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch {
      // ignore invalid config
    }
  }
  return null;
}

// ─── MAIN ─────────────────────────────────────────────
const args = parseArgs(process.argv.slice(2));

// Merge with .aicopycheckrc.json if present
const config = findConfig(path.resolve(args.directory));
if (config) {
  if (config.ignore && !args.ignore.length) args.ignore = config.ignore;
  if (config.extensions && !args.extensions.length) args.extensions = config.extensions;
  if (config.format && args.format === 'text') args.format = config.format;
}

const scanOptions = {
  ignore: args.ignore,
  extensions: args.extensions
};

const results = scan(args.directory, scanOptions);

if (args.output) {
  saveReport(results, args.format, args.output);
  console.log(`Report saved to: ${args.output}`);
} else {
  console.log(generateReport(results, args.format));
}

// Exit with appropriate code
if (results.projectRisk === 'critical' || results.projectRisk === 'high') {
  process.exit(2);
} else if (results.projectRisk === 'medium') {
  process.exit(1);
} else {
  process.exit(0);
}
