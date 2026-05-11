const fs = require('fs');
const path = require('path');

/**
 * Generate terminal/text report
 */
function textReport(results) {
  const lines = [];
  const { project, projectRisk, stats, files } = results;

  lines.push('');
  lines.push('╔══════════════════════════════════════════╗');
  lines.push('║    AI CODE COPYRIGHT RISK SCANNER       ║');
  lines.push('╚══════════════════════════════════════════╝');
  lines.push('');
  lines.push(`Project: ${project}`);
  lines.push(`Scanned: ${new Date(results.scannedAt).toLocaleString()}`);
  lines.push(`Files:   ${stats.scannedFiles} scanned | ${stats.totalLines} lines total`);
  lines.push('');

  // Project risk bar
  const riskColors = { low: '🟢', medium: '🟡', high: '🟠', critical: '🔴' };
  const riskEmoji = riskColors[projectRisk] || '⚪';
  lines.push(`Project Risk: ${riskEmoji} ${projectRisk.toUpperCase()}`);
  lines.push(`Average Score: ${stats.averageRisk} / 1.00`);
  lines.push('');

  // Distribution
  lines.push('Risk Distribution:');
  lines.push(`  CRITICAL: ${stats.riskDistribution.critical}  HIGH: ${stats.riskDistribution.high}  MEDIUM: ${stats.riskDistribution.medium}  LOW: ${stats.riskDistribution.low}`);
  lines.push('');

  // Top risky files
  const riskyFiles = files.filter(f => f.riskScore > 0);
  if (riskyFiles.length > 0) {
    lines.push('──────────────────────────────────────────');
    lines.push('FLAGGED FILES (top 20)');
    lines.push('──────────────────────────────────────────');
    const topFiles = riskyFiles.slice(0, 20);
    for (const f of topFiles) {
      const flag = f.risk === 'critical' ? '🔴' : f.risk === 'high' ? '🟠' : f.risk === 'medium' ? '🟡' : '  ';
      lines.push(`  ${flag} [${f.riskScore.toFixed(2)}] ${f.filename} (${f.totalLines} lines)`);
      for (const finding of f.findings.slice(0, 3)) {
        lines.push(`      ↳ ${finding.description}`);
      }
    }
    lines.push('');
  }

  // Summary
  if (projectRisk === 'critical' || projectRisk === 'high') {
    lines.push('⚠️  WARNING: Significant AI-generated code detected.');
    lines.push('   Review flagged files for copyright compliance before distribution.');
  } else if (projectRisk === 'medium') {
    lines.push('⚡ NOTICE: Moderate AI code signatures found. Manual review recommended.');
  } else {
    lines.push('✅ No significant AI code risks detected.');
  }

  lines.push('');
  return lines.join('\n');
}

/**
 * Generate JSON report
 */
function jsonReport(results) {
  // Strip heavy detail for compact JSON
  const compact = {
    project: results.project,
    projectRisk: results.projectRisk,
    scannedAt: results.scannedAt,
    stats: results.stats,
    files: results.files.map(f => ({
      filename: f.filename,
      lines: f.totalLines,
      riskScore: f.riskScore,
      risk: f.risk,
      findings: f.findings.map(fi => ({
        type: fi.type,
        pattern: fi.pattern,
        weight: fi.weight,
        description: fi.description
      }))
    }))
  };
  return JSON.stringify(compact, null, 2);
}

/**
 * Generate HTML report
 */
function htmlReport(results) {
  const { project, projectRisk, stats, files } = results;

  const riskColor = { low: '#22c55e', medium: '#eab308', high: '#f97316', critical: '#ef4444' };
  const projectColor = riskColor[projectRisk] || '#888';

  let fileRows = '';
  for (const f of files) {
    if (f.riskScore === 0) continue;
    const color = riskColor[f.risk];
    const findingHtml = f.findings.map(fi =>
      `<span class="finding" style="border-left: 3px solid ${color}; padding-left: 8px; margin: 2px 0; display: block; font-size: 12px;">${fi.description}</span>`
    ).join('');

    fileRows += `
      <tr>
        <td><code>${escapeHtml(f.filename)}</code></td>
        <td>${f.totalLines}</td>
        <td style="color: ${color}; font-weight: bold;">${(f.riskScore * 100).toFixed(0)}%</td>
        <td><span class="badge" style="background: ${color};">${f.risk.toUpperCase()}</span></td>
        <td>${findingHtml}</td>
      </tr>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AI Code Scan Report - ${escapeHtml(path.basename(project))}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; padding: 40px; }
  .container { max-width: 1000px; margin: 0 auto; }
  h1 { font-size: 24px; margin-bottom: 8px; }
  .meta { color: #94a3b8; font-size: 14px; margin-bottom: 24px; }
  .score-card { background: #1e293b; border-radius: 12px; padding: 24px; margin-bottom: 24px; display: flex; gap: 40px; align-items: center; }
  .big-score { font-size: 48px; font-weight: 700; color: ${projectColor}; }
  .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
  .stat { background: #1e293b; border-radius: 8px; padding: 16px; text-align: center; }
  .stat-value { font-size: 28px; font-weight: 700; }
  .stat-label { font-size: 12px; color: #94a3b8; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; background: #1e293b; border-radius: 8px; overflow: hidden; }
  th { background: #334155; padding: 12px 16px; text-align: left; font-size: 12px; text-transform: uppercase; color: #94a3b8; }
  td { padding: 12px 16px; border-top: 1px solid #334155; font-size: 13px; }
  .badge { padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; color: white; }
  .footer { text-align: center; color: #475569; font-size: 12px; margin-top: 32px; }
</style>
</head>
<body>
<div class="container">
  <h1>AI Code Copyright Risk Report</h1>
  <p class="meta">Project: ${escapeHtml(project)} | Scanned: ${new Date(results.scannedAt).toLocaleString()}</p>

  <div class="score-card">
    <div class="big-score">${(stats.averageRisk * 100).toFixed(0)}%</div>
    <div>
      <div style="font-size: 18px; color: ${projectColor}; font-weight: 600;">${projectRisk.toUpperCase()} RISK</div>
      <div style="color: #94a3b8; font-size: 14px;">Average project risk score</div>
    </div>
  </div>

  <div class="stats-grid">
    <div class="stat"><div class="stat-value">${stats.scannedFiles}</div><div class="stat-label">Files Scanned</div></div>
    <div class="stat"><div class="stat-value">${stats.totalLines.toLocaleString()}</div><div class="stat-label">Lines of Code</div></div>
    <div class="stat"><div class="stat-value" style="color: ${riskColor.high};">${stats.riskDistribution.high + stats.riskDistribution.critical}</div><div class="stat-label">High Risk Files</div></div>
  </div>

  <h2 style="margin-bottom: 12px; font-size: 16px;">Flagged Files</h2>
  <table>
    <thead><tr><th>File</th><th>Lines</th><th>Risk</th><th>Level</th><th>Findings</th></tr></thead>
    <tbody>${fileRows || '<tr><td colspan="5" style="text-align:center;color:#94a3b8;">No flagged files</td></tr>'}</tbody>
  </table>

  <div class="footer">Generated by aiscan v1.0.0</div>
</div>
</body>
</html>`;
}

function escapeHtml(text) {
  return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/**
 * Generate report in specified format
 * @param {object} results - scan results
 * @param {string} format - 'text', 'json', or 'html'
 * @returns {string} formatted report
 */
function generateReport(results, format = 'text') {
  switch (format) {
    case 'json': return jsonReport(results);
    case 'html': return htmlReport(results);
    case 'text':
    default: return textReport(results);
  }
}

/**
 * Save report to file
 */
function saveReport(results, format, outputPath) {
  const report = generateReport(results, format);
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(outputPath, report, 'utf-8');
  return outputPath;
}

module.exports = { generateReport, saveReport };
