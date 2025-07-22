const fs = require('fs').promises;
const { createHtmlReport } = require('axe-html-reporter');

/**
 * Enhanced HTML report generator with screenshot integration
 */
class ReportGenerator {
  /**
   * Generate enhanced HTML report with screenshots
   */
  static async generateEnhancedReport(results, screenshotData, options) {
    // Generate base HTML report
    const htmlReport = createHtmlReport({
      results,
      options: {
        projectKey: options.projectKey || 'Accessibility Test',
        outputDir: options.outputDir,
        reportFileName: options.reportFileName,
        customSummary: options.customSummary || ''
      }
    });

    // Enhance report with custom styling and fixes
    let enhancedReport = this.addCustomStyling(htmlReport, options);
    
    // Fix the rules section to show actual WCAG rules used
    enhancedReport = this.fixRulesSection(enhancedReport, options.wcagLevel || []);
    
    // Add screenshots if available
    if (screenshotData && screenshotData.violationScreenshots.length) {
      enhancedReport = this.injectScreenshots(enhancedReport, screenshotData);
    }
    
    return enhancedReport;
  }

  /**
   * Add custom CSS styling to the report
   */
  static addCustomStyling(htmlReport, options) {
    const customCSS = `
      <style>
        .custom-summary {
          background: #f8f9fa;
          padding: 15px;
          border-left: 4px solid #007bff;
          margin: 20px 0;
        }
        .violationNode table {
          margin: 5px 0 !important;
          border-collapse: collapse !important;
        }
        .violationNode td {
          padding: 3px 6px !important;
          vertical-align: top !important;
          line-height: 1.1 !important;
        }
        .violationNode th {
          padding: 3px 6px !important;
          vertical-align: top !important;
        }
        .card-body {
          padding: 8px !important;
          margin: 0 !important;
        }
        .violationCard {
          margin-bottom: 8px !important;
        }
        .violationCardLine {
          margin: 1px 0 !important;
          line-height: 1.2 !important;
        }
        .card-title, .card-subtitle, .card-text {
          margin: 1px 0 !important;
          line-height: 1.1 !important;
        }
        
        /* Aggressive whitespace removal for table content */
        .violationNode table p {
          margin: 0 !important;
          padding: 0 !important;
          line-height: 1.1 !important;
        }
        .violationNode table pre {
          margin: 1px 0 !important;
          padding: 1px 3px !important;
          line-height: 1.0 !important;
          font-size: 11px !important;
        }
        .violationNode table ul {
          margin: 2px 0 !important;
          padding-left: 16px !important;
        }
        .violationNode table li {
          margin: 0 !important;
          padding: 0 !important;
          line-height: 1.1 !important;
        }
        .violationNode table div {
          margin: 0 !important;
          padding: 0 !important;
        }
        .violationNode table .wrapBreakWord {
          margin: 0 !important;
          padding: 0 !important;
        }
        .violationNode table strong {
          font-size: 11px !important;
        }
        .violationNode table code {
          font-size: 10px !important;
          padding: 0 2px !important;
        }
        .btn-link {
          color: #007bff !important;
          font-weight: bold !important;
          font-size: 1.1em !important;
        }
        .card-header {
          background-color: #e9ecef !important;
        }
        #passes, #incomplete, #inapplicable {
          display: block !important;
        }
        button[data-target="#passes"] {
          color: #28a745 !important;
        }
        button[data-target="#incomplete"] {
          color: #ffc107 !important;
        }
        button[data-target="#inapplicable"] {
          color: #6c757d !important;
        }
        
        /* Screenshot styles */
        .screenshot-container {
          margin: 15px 0;
          padding: 15px;
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 8px;
        }
        .screenshot-title {
          font-weight: bold;
          color: #495057;
          margin-bottom: 10px;
        }
        .screenshot-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 15px;
        }
        .screenshot-item {
          text-align: center;
        }
        .screenshot-item img {
          max-width: 100%;
          border: 2px solid #dee2e6;
          border-radius: 4px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .screenshot-caption {
          font-size: 12px;
          color: #6c757d;
          margin-top: 5px;
          font-style: italic;
        }
        .impact-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: bold;
          text-transform: uppercase;
        }
        .impact-critical { background: #f8d7da; color: #721c24; }
        .impact-serious { background: #fff3cd; color: #856404; }
        .impact-moderate { background: #d4edda; color: #155724; }
        .impact-minor { background: #d1ecf1; color: #0c5460; }
      </style>
    `;
    
    return htmlReport.replace('</head>', customCSS + '</head>');
  }

  /**
   * Inject screenshot data and optimize violation tables
   */
  static injectScreenshots(htmlReport, screenshotData) {
    let enhancedReport = htmlReport;

    // First optimize the violation tables to reduce redundancy
    enhancedReport = this.optimizeViolationTables(enhancedReport);

    // Group screenshots by violation
    const screenshotsByViolation = {};
    if (screenshotData) {
      screenshotData.violationScreenshots.forEach(screenshot => {
        const key = screenshot.violationIndex;
        if (!screenshotsByViolation[key]) {
          screenshotsByViolation[key] = [];
        }
        screenshotsByViolation[key].push(screenshot);
      });
    }

    // Inject screenshots into each violation card
    Object.keys(screenshotsByViolation).forEach(violationIndex => {
      const screenshots = screenshotsByViolation[violationIndex];
      const screenshotHtml = this.generateScreenshotHtml(screenshots);
      
      // Find the violation card and inject screenshots before the closing tag
      const violationId = `<a id="${violationIndex}">`;
      const violationIndex_pos = enhancedReport.indexOf(violationId);
      
      if (violationIndex_pos > -1) {
        // Find the end of this violation card
        const cardEndPattern = '</div>\\s*</div>\\s*<div class="card violationCard">';
        const nextCardMatch = enhancedReport.substring(violationIndex_pos).match(new RegExp(cardEndPattern));
        
        let insertPosition;
        if (nextCardMatch) {
          insertPosition = violationIndex_pos + nextCardMatch.index;
        } else {
          // This might be the last card, look for different pattern
          const lastCardPattern = '</div>\\s*</div>\\s*<div id="accordion';
          const lastCardMatch = enhancedReport.substring(violationIndex_pos).match(new RegExp(lastCardPattern));
          if (lastCardMatch) {
            insertPosition = violationIndex_pos + lastCardMatch.index;
          } else {
            // Fallback: insert before the end of the violation table
            const tableEndPattern = '</table>\\s*</div>\\s*</div>';
            const tableEndMatch = enhancedReport.substring(violationIndex_pos).match(new RegExp(tableEndPattern));
            if (tableEndMatch) {
              insertPosition = violationIndex_pos + tableEndMatch.index + tableEndMatch[0].length - 12; // Before </div></div>
            }
          }
        }
        
        if (insertPosition) {
          enhancedReport = enhancedReport.substring(0, insertPosition) + 
                          screenshotHtml + 
                          enhancedReport.substring(insertPosition);
        }
      }
    });

    return enhancedReport;
  }

  /**
   * Optimize violation tables by consolidating similar violations
   */
  static optimizeViolationTables(htmlReport) {
    // First compress whitespace in table cells
    let optimizedReport = this.compressTableCellWhitespace(htmlReport);
    
    // Find all violation tables and optimize them
    const tableRegex = /<table class="table table-sm table-bordered">([\s\S]*?)<\/table>/g;
    
    return optimizedReport.replace(tableRegex, (match, tableContent) => {
      // Extract table rows
      const rowRegex = /<tr>([\s\S]*?)<\/tr>/g;
      const rows = [];
      let rowMatch;
      
      while ((rowMatch = rowRegex.exec(tableContent)) !== null) {
        rows.push(rowMatch[1]);
      }
      
      if (rows.length <= 1) return match; // Keep header-only tables as-is
      
      const headerRow = rows[0];
      const dataRows = rows.slice(1);
      
      // Group similar violations (same fix instructions)
      const groupedRows = this.groupSimilarViolations(dataRows);
      
      // Rebuild table with optimized content
      let optimizedTableContent = `<tr>${headerRow}</tr>`;
      
      groupedRows.forEach(group => {
        if (group.count === 1) {
          // Single violation - keep as-is
          optimizedTableContent += `<tr>${group.rows[0]}</tr>`;
        } else {
          // Multiple similar violations - create consolidated row
          optimizedTableContent += this.createConsolidatedRow(group);
        }
      });
      
      return `<table class="table table-sm table-bordered">${optimizedTableContent}</table>`;
    });
  }

  /**
   * Compress whitespace within table cells and fix HTML issues
   */
  static compressTableCellWhitespace(htmlReport) {
    // First fix duplicate button issues
    let fixedReport = htmlReport
      // Fix nested button elements (invalid HTML)
      .replace(/<button([^>]*)>([^<]*)<button([^>]*)>([^<]*)<\/button><\/button>/g, '<button$1>$2</button>')
      // Fix multiple consecutive buttons
      .replace(/(<\/button>)\s*(<button[^>]*>[^<]*<\/button>)/g, '$1$2')
      // Remove empty button duplicates
      .replace(/<button[^>]*>\s*<\/button>\s*<button/g, '<button');

    // Target table cells and compress their content
    return fixedReport.replace(/<td>([\s\S]*?)<\/td>/g, (match, cellContent) => {
      // Remove excessive whitespace and newlines
      let compressed = cellContent
        // Remove multiple consecutive newlines
        .replace(/\n\s*\n\s*\n/g, '\n')
        // Remove whitespace around HTML tags
        .replace(/>\s+</g, '><')
        // Compress whitespace within paragraphs
        .replace(/<p>\s+/g, '<p>')
        .replace(/\s+<\/p>/g, '</p>')
        // Compress whitespace within pre tags (but preserve some structure)
        .replace(/<pre><code([^>]*)>\s+/g, '<pre><code$1>')
        .replace(/\s+<\/code><\/pre>/g, '</code></pre>')
        // Remove leading/trailing whitespace in list items
        .replace(/<li>\s+/g, '<li>')
        .replace(/\s+<\/li>/g, '</li>')
        // Compress div content
        .replace(/<div([^>]*)>\s+/g, '<div$1>')
        .replace(/\s+<\/div>/g, '</div>')
        // Remove excessive spaces
        .replace(/\s{2,}/g, ' ')
        .trim();
      
      return `<td>${compressed}</td>`;
    });
  }

  /**
   * Group similar violations by their fix instructions
   */
  static groupSimilarViolations(rows) {
    const groups = {};
    
    rows.forEach((row, index) => {
      // Extract the fix instructions (third column)
      const fixInstructions = this.extractFixInstructions(row);
      const key = fixInstructions;
      
      if (!groups[key]) {
        groups[key] = {
          fixInstructions: key,
          rows: [],
          elements: [],
          count: 0
        };
      }
      
      groups[key].rows.push(row);
      groups[key].elements.push(this.extractElementInfo(row));
      groups[key].count++;
    });
    
    return Object.values(groups);
  }

  /**
   * Extract fix instructions from a table row
   */
  static extractFixInstructions(row) {
    const match = row.match(/<td>[\s\S]*?<\/td>[\s\S]*?<td>([\s\S]*?)<\/td>/);
    return match ? match[1].trim() : '';
  }

  /**
   * Extract element information from a table row
   */
  static extractElementInfo(row) {
    const cellMatch = row.match(/<td>([\s\S]*?)<\/td>/);
    if (!cellMatch) return '';
    
    const cellContent = cellMatch[1];
    const locationMatch = cellContent.match(/<pre><code[^>]*>(.*?)<\/code><\/pre>/);
    const sourceMatch = cellContent.match(/<pre><code[^>]*>(.*?)<\/code><\/pre>[\s\S]*?<pre><code[^>]*>(.*?)<\/code><\/pre>/);
    
    return {
      location: locationMatch ? locationMatch[1] : '',
      source: sourceMatch ? sourceMatch[2] : ''
    };
  }

  /**
   * Create a consolidated row for multiple similar violations
   */
  static createConsolidatedRow(group) {
    const elements = group.elements.slice(0, 3); // Show first 3 elements
    const remainingCount = group.count - 3;
    
    const elementsList = elements.map(el => `
      <div style="margin-bottom: 8px; padding: 4px; background: #f8f9fa; border-left: 2px solid #007bff;">
        <div><strong>Location:</strong> <code>${el.location}</code></div>
        <div><strong>Element:</strong> <code>${el.source.substring(0, 100)}${el.source.length > 100 ? '...' : ''}</code></div>
      </div>
    `).join('');
    
    const remainingText = remainingCount > 0 ? 
      `<div style="margin-top: 8px; font-style: italic; color: #666;">
        + ${remainingCount} more similar element${remainingCount > 1 ? 's' : ''}
      </div>` : '';
    
    return `
      <tr>
        <td><strong>${group.count}</strong></td>
        <td>
          <p><strong>Multiple similar violations (${group.count} elements)</strong></p>
          <div style="max-height: 200px; overflow-y: auto;">
            ${elementsList}
            ${remainingText}
          </div>
        </td>
        <td>${group.fixInstructions}</td>
      </tr>
    `;
  }

  /**
   * Fix the rules section to show actual WCAG rules used
   */
  static fixRulesSection(htmlReport, wcagLevel) {
    const ruleDescriptions = {
      'wcag2a': 'WCAG 2.0 Level A - Basic accessibility requirements',
      'wcag2aa': 'WCAG 2.0 Level AA - Standard accessibility compliance',
      'wcag21aa': 'WCAG 2.1 Level AA - Enhanced mobile and cognitive accessibility',
      'wcag22aa': 'WCAG 2.2 Level AA - Latest accessibility standards',
      'section508': 'US Section 508 - Federal accessibility requirements',
      'best-practice': 'Best Practices - Deque accessibility recommendations',
      'EN-301-549': 'EN 301 549 - European accessibility standard'
    };

    const ruleCount = wcagLevel.length;
    const rulesList = wcagLevel.map(level => 
      `<li><strong>${level.toUpperCase()}</strong>: ${ruleDescriptions[level] || 'Accessibility rule set'}</li>`
    ).join('');

    const newRulesSection = `
      <div id="rulesSection">
        <div class="card">
          <div class="card-header" id="ruleSection">
            <p class="mb-0">
              <button
                class="btn btn-link"
                data-toggle="collapse"
                data-target="#rules"
                aria-expanded="true"
                aria-controls="rules"
              >
                axe was running with ${ruleCount} rule set${ruleCount !== 1 ? 's' : ''}. Expand details on click
              </button>
            </p>
          </div>
          <div
            id="rules"
            class="collapse show"
            aria-labelledby="ruleSection"
            data-parent="#rules"
          >
            <div class="card-body">
              <h6>Active Rule Sets:</h6>
              <ul style="margin: 10px 0; padding-left: 20px;">
                ${rulesList}
              </ul>
              <p style="margin-top: 15px; color: #666; font-size: 14px;">
                These rule sets determine which accessibility checks are performed on your website.
                Each rule set includes multiple individual rules that test for specific WCAG criteria.
              </p>
            </div>
          </div>
        </div>
      </div>
    `;

    // Replace the existing rules section
    return htmlReport.replace(
      /<div id="rulesSection">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/,
      newRulesSection
    );
  }

  /**
   * Generate HTML for screenshot gallery
   */
  static generateScreenshotHtml(screenshots) {
    const screenshotItems = screenshots.map(screenshot => `
      <div class="screenshot-item">
        <img src="${screenshot.screenshot}" alt="Screenshot of accessibility violation" />
        <div class="screenshot-caption">
          <span class="impact-badge impact-${screenshot.impact}">${screenshot.impact}</span><br>
          Element: <code>${screenshot.element}</code>
        </div>
      </div>
    `).join('');

    return `
      <div class="screenshot-container">
        <div class="screenshot-title">🖼️ Visual Evidence</div>
        <div class="screenshot-grid">
          ${screenshotItems}
        </div>
      </div>
    `;
  }
}

module.exports = ReportGenerator;