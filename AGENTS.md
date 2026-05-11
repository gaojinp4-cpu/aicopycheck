# AGENTS.md — aicopycheck (for AI coding assistants)

## Overview
`aicopycheck` is a CLI tool that scans codebases for AI-generated code patterns and produces copyright risk reports. Zero dependencies, pure Node.js core modules.

## All Exports

```js
// lib/scanner.js
scan(rootDir, options) → { project, projectRisk, stats, files[], scannedAt }

// lib/detectors.js
analyzeFile(content, filename) → { filename, totalLines, riskScore, risk, findings[] }

// lib/reporter.js
generateReport(results, format) → string
saveReport(results, format, outputPath) → outputPath

// lib/patterns.js
AI_TOOL_PATTERNS, CODE_PATTERNS, LICENSE_PATTERNS, IGNORE_PATTERNS, CODE_EXTENSIONS
```

## Type Shapes

```ts
type ScanResult = {
  project: string
  projectRisk: 'low' | 'medium' | 'high' | 'critical'
  stats: {
    totalFiles: number
    scannedFiles: number
    skippedFiles: number
    riskDistribution: { none: number, low: number, medium: number, high: number, critical: number }
    totalLines: number
    averageRisk: number  // 0.0 - 1.0
  }
  files: FileResult[]
  scannedAt: string  // ISO 8601
}

type FileResult = {
  filename: string
  totalLines: number
  riskScore: number   // 0.0 - 1.0
  risk: 'none' | 'low' | 'medium' | 'high' | 'critical'
  findings: Finding[]
}

type Finding = {
  type: 'ai-tool-attribution' | 'code-pattern' | 'license-risk'
  pattern: string
  weight: number      // 0.0 - 1.0, contribution to risk score
  description: string
  detail?: string
  line?: number
  match?: string
}
```

## Patterns

### Risk score formula
```
riskScore = 0
for each finding:
  riskScore += finding.weight * (1 - riskScore)  // diminishing returns
```

### Risk thresholds
- `riskScore > 0.8` → critical
- `riskScore > 0.6` → high
- `riskScore > 0.3` → medium
- else → low

## Common Mistakes
- ❌ Passing a file path instead of directory to `scan()`
- ❌ Forgetting to call `path.resolve()` before passing dir to scan
- ❌ Using `--ext` without leading dot (always normalize: add '.' if missing)
- ❌ Ignoring the exit code (0=low, 1=medium, 2=high/critical)

## Decision Tree
- CLI use → `bin/aicopycheck.js` (parse args, call scan, output report)
- Programmatic use → `require('aicopycheck').scan(dir, opts)`
- Custom reporter → use `scan()` result object, format yourself
- Adding new detection pattern → add to `lib/patterns.js`, then add detection logic in `lib/detectors.js`

## Architecture
```
bin/aicopycheck.js          CLI entry, arg parsing, output dispatch
lib/scanner.js         File collection, orchestration, aggregate stats
lib/detectors.js       Per-file analysis: pattern matching, risk scoring
lib/reporter.js        Output formatters: text, JSON, HTML
lib/patterns.js        Static data: regex patterns, config constants
```
