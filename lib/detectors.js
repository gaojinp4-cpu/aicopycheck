const {
  AI_TOOL_PATTERNS,
  CODE_PATTERNS,
  LICENSE_PATTERNS
} = require('./patterns');

/**
 * Detect AI tool attribution in a single line of code
 * @param {string} line - source code line
 * @returns {Array<{pattern: string, weight: number, match: string}>}
 */
function detectAIToolPatterns(line) {
  const hits = [];
  for (const p of AI_TOOL_PATTERNS) {
    const m = line.match(p.regex);
    if (m) {
      hits.push({
        pattern: p.name,
        weight: p.weight,
        description: p.description,
        match: m[0].trim()
      });
    }
  }
  return hits;
}

/**
 * Detect code-level AI patterns in file content
 * @param {string[]} lines - all lines of the file
 * @param {number} totalLines
 * @param {Set} alreadyFound - patterns already found (to avoid dupes)
 * @returns {Array<{pattern: string, weight: number, description: string, detail: string}>}
 */
function detectCodePatterns(lines, totalLines, alreadyFound) {
  const results = [];

  // Count comment lines (more specific: only lines that are entirely comments)
  const commentLines = lines.filter(l => {
    const t = l.trim();
    return t.startsWith('//') || t.startsWith('#') ||
           /^\s*\/\*/.test(t) || /^\s*\*[^/]/.test(t) ||
           t.startsWith('<!--') || t.startsWith('--') ||
           t === '*/' || t === '*/';
  }).length;
  const commentRatio = totalLines > 0 ? commentLines / totalLines : 0;

  if (commentRatio > 0.4) {
    results.push({
      pattern: 'excessive-comment-ratio',
      weight: 0.3 * Math.min((commentRatio - 0.4) / 0.3, 1),
      description: 'High comment-to-code ratio (AI tendency)',
      detail: `${Math.round(commentRatio * 100)}% comment lines`
    });
  }

  // Detect AI-guard-comments: TODO/FIXME without actual detail (AI placeholder)
  let guardCount = 0;
  for (const line of lines) {
    if (/^\s*(?:\/\/|#|\*)\s*(?:TODO|FIXME|HACK):?\s*$/i.test(line)) {
      guardCount++;
    }
  }
  if (guardCount > 0) {
    results.push({
      pattern: 'ai-guard-comments',
      weight: Math.min(guardCount / Math.max(totalLines, 1) * 5, 0.3),
      description: 'AI-generated placeholder comments',
      detail: `${guardCount} empty TODO/FIXME comments`
    });
  }

  // Detect "As an AI" copy-paste artifacts (skip if already caught by tool patterns)
  if (!alreadyFound.has('as-an-ai-copy-paste')) {
    let aiCopyPasteCount = 0;
    for (const line of lines) {
      if (/(?:as\s+an\s+AI|I\s+apologize|I\s+am\s+(?:an?\s+)?AI|as\s+a\s+(?:large\s+)?language\s+model)/i.test(line)) {
        aiCopyPasteCount++;
      }
    }
    if (aiCopyPasteCount > 0) {
      results.push({
        pattern: 'as-an-ai-copy-paste',
        weight: 0.95,
        description: 'Copy-paste artifact from AI conversation',
        detail: `${aiCopyPasteCount} occurrence(s)`
      });
    }
  }

  // Generic variable name density
  let genericVarCount = 0;
  for (const line of lines) {
    const matches = line.match(/\b(?:result|data|info|temp|tmp|foo|bar|baz)\b/g);
    if (matches) genericVarCount += matches.length;
  }
  const genericRatio = totalLines > 0 ? genericVarCount / totalLines : 0;
  if (genericRatio > 0.3) {
    results.push({
      pattern: 'overly-descriptive-naming',
      weight: Math.min(genericRatio * 0.3, 0.15),
      description: 'Generic variable names common in AI output',
      detail: `${genericVarCount} generic vars in ${totalLines} lines`
    });
  }

  return results;
}

/**
 * Detect license-related risks
 * @param {string[]} lines
 * @returns {Array<{pattern: string, weight: number, description: string}>}
 */
function detectLicenseRisks(lines, filename, hasAIMarkers) {
  const results = [];
  // Only check first 30 lines for license headers
  const header = lines.slice(0, Math.min(30, lines.length)).join('\n');

  const hasMIT = /MIT\s+License|Permission\s+is\s+hereby\s+granted/i.test(header);
  const hasApache = /Apache\s+License|Licensed\s+under\s+the\s+Apache/i.test(header);
  const hasGPL = /GNU\s+(?:General\s+Public|GPL|Affero|AGPL)/i.test(header);
  const hasProprietary = /All\s+(?:right|Rights)\s+(?:reserved|Reserved)|Proprietary|Confidential/i.test(header);
  const hasAnyLicense = hasMIT || hasApache || hasGPL || hasProprietary;

  if (!hasAnyLicense) {
    // Only flag missing license as significant when AI markers are present
    const weight = hasAIMarkers ? 0.3 : 0.1;
    results.push({
      pattern: 'missing-license',
      weight,
      description: 'No license header detected'
    });
  }

  if (hasGPL) {
    results.push({
      pattern: 'gpl-license',
      weight: 0.7,
      description: 'GPL/copyleft license - potential conflict with AI training data'
    });
  }

  if (hasProprietary && !hasMIT && !hasApache) {
    results.push({
      pattern: 'proprietary-notice',
      weight: 0.5,
      description: 'Proprietary notice on AI-generated code'
    });
  }

  return results;
}

/**
 * Analyze a single file
 * @param {string} content - file content
 * @param {string} filename - file name/path
 * @returns {object} analysis result
 */
function analyzeFile(content, filename) {
  const lines = content.split('\n');
  const totalLines = lines.length;

  if (totalLines === 0) {
    return { filename, totalLines, riskScore: 0, findings: [], risk: 'none' };
  }

  const findings = [];

  // Check each line for AI tool patterns
  const aiHits = [];
  for (let i = 0; i < lines.length; i++) {
    const hits = detectAIToolPatterns(lines[i]);
    for (const h of hits) {
      aiHits.push({ ...h, line: i + 1 });
    }
  }

  // Deduplicate AI tool hits by pattern
  const seenPatterns = new Set();
  for (const h of aiHits) {
    if (!seenPatterns.has(h.pattern)) {
      seenPatterns.add(h.pattern);
      findings.push({
        type: 'ai-tool-attribution',
        pattern: h.pattern,
        weight: h.weight,
        description: h.description,
        match: h.match,
        line: h.line
      });
    }
  }

  // Code-level patterns (skip patterns already found by AI tool detection)
  const codeFindings = detectCodePatterns(lines, totalLines, seenPatterns);
  for (const f of codeFindings) {
    findings.push({ type: 'code-pattern', ...f });
  }

  // License risks: only flag missing-license when AI markers exist, or use low weight
  const hasAIMarkers = findings.length > 0;
  const licenseFindings = detectLicenseRisks(lines, filename, hasAIMarkers);
  for (const f of licenseFindings) {
    findings.push({ type: 'license-risk', ...f });
  }

  // Calculate risk score (weighted sum, capped at 1.0)
  let riskScore = 0;
  for (const f of findings) {
    riskScore += f.weight * (1 - riskScore); // diminishing returns per finding
  }
  riskScore = Math.round(riskScore * 100) / 100;

  let risk = 'low';
  if (riskScore > 0.3) risk = 'medium';
  if (riskScore > 0.6) risk = 'high';
  if (riskScore > 0.8) risk = 'critical';

  return {
    filename,
    totalLines,
    riskScore,
    risk,
    findings
  };
}

module.exports = { analyzeFile };
