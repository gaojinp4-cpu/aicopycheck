const fs = require('fs');
const path = require('path');
const { analyzeFile } = require('./detectors');
const { IGNORE_PATTERNS, CODE_EXTENSIONS } = require('./patterns');

/**
 * Check if a file path should be ignored
 */
function shouldIgnore(filePath, ignorePatterns) {
  const normalized = filePath.replace(/\\/g, '/');

  for (const p of IGNORE_PATTERNS) {
    if (p.test(normalized)) return true;
  }
  for (const p of ignorePatterns) {
    if (p.test(normalized)) return true;
  }
  return false;
}

/**
 * Check if a file extension is a code file
 */
function isCodeFile(filePath, extraExts) {
  const ext = path.extname(filePath).toLowerCase();
  return CODE_EXTENSIONS.includes(ext) || extraExts.includes(ext);
}

/**
 * Recursively collect files in a directory
 */
function collectFiles(rootDir, options) {
  const files = [];
  const ignorePatterns = (options.ignore || []).map(p => new RegExp(p));
  const extraExts = (options.extensions || []).map(e => e.startsWith('.') ? e.toLowerCase() : '.' + e.toLowerCase());

  function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.relative(rootDir, fullPath);

      if (shouldIgnore(relPath, ignorePatterns)) continue;

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && isCodeFile(fullPath, extraExts)) {
        files.push(fullPath);
      }
    }
  }

  walk(rootDir);
  return files;
}

/**
 * Scan a directory for AI-generated code risks
 * @param {string} rootDir - directory to scan
 * @param {object} options - scan options
 * @returns {object} scan results
 */
function scan(rootDir, options = {}) {
  const absRoot = path.resolve(rootDir);
  const files = collectFiles(absRoot, options);

  const fileResults = [];
  const stats = {
    totalFiles: files.length,
    scannedFiles: 0,
    skippedFiles: 0,
    riskDistribution: { none: 0, low: 0, medium: 0, high: 0, critical: 0 },
    totalLines: 0,
    averageRisk: 0
  };

  for (const filePath of files) {
    let content;
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch {
      stats.skippedFiles++;
      continue;
    }

    const relPath = path.relative(absRoot, filePath);
    const result = analyzeFile(content, relPath);

    fileResults.push(result);
    stats.scannedFiles++;
    stats.totalLines += result.totalLines;
    stats.riskDistribution[result.risk]++;
  }

  // Calculate aggregate risk
  if (fileResults.length > 0) {
    const totalRisk = fileResults.reduce((sum, f) => sum + f.riskScore, 0);
    stats.averageRisk = Math.round((totalRisk / fileResults.length) * 100) / 100;
  }

  // Sort by risk score descending
  fileResults.sort((a, b) => b.riskScore - a.riskScore);

  // Overall project risk assessment
  let projectRisk = 'low';
  const highRiskCount = stats.riskDistribution.high + stats.riskDistribution.critical;
  const mediumRiskCount = stats.riskDistribution.medium;
  if (highRiskCount > 0) projectRisk = 'high';
  else if (mediumRiskCount > stats.scannedFiles * 0.2) projectRisk = 'medium';
  else if (stats.averageRisk > 0.3) projectRisk = 'medium';

  return {
    project: absRoot,
    projectRisk,
    stats,
    files: fileResults,
    scannedAt: new Date().toISOString()
  };
}

module.exports = { scan };
