const pdf = require('html-pdf-node');
const fs = require('fs').promises;
const path = require('path');

/**
 * PDF Report Generator for Accessibility Reports
 */
class PDFGenerator {
  /**
   * Generate PDF report from HTML content
   */
  static async generatePDF(htmlContent, outputPath, options = {}) {
    const pdfOptions = {
      format: 'A4',
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      },
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="width: 100%; text-align: center; font-size: 12px; margin-top: 10px;">
          <span style="color: #666;">Accessibility Report - Generated ${new Date().toLocaleDateString()}</span>
        </div>
      `,
      footerTemplate: `
        <div style="width: 100%; text-align: center; font-size: 10px; color: #666; margin-bottom: 10px;">
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>
      `,
      ...options
    };

    const file = { content: htmlContent };

    try {
      const pdfBuffer = await pdf.generatePdf(file, pdfOptions);
      await fs.writeFile(outputPath, pdfBuffer);
      return outputPath;
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error('Failed to generate PDF report');
    }
  }

  /**
   * Generate executive summary PDF
   */
  static async generateExecutiveSummary(results, url, wcagLevel, testId, outputPath) {
    const summary = this.calculateSummaryStats(results);
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Accessibility Report - Executive Summary</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
            line-height: 1.6;
          }
          .header {
            text-align: center;
            border-bottom: 3px solid #007bff;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header h1 {
            color: #007bff;
            margin: 0;
            font-size: 28px;
          }
          .header p {
            color: #666;
            font-size: 16px;
            margin: 5px 0;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin: 30px 0;
          }
          .summary-card {
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 20px;
            background: #f9f9f9;
          }
          .summary-card h3 {
            margin: 0 0 15px 0;
            color: #007bff;
            font-size: 18px;
          }
          .stat-item {
            display: flex;
            justify-content: space-between;
            margin: 8px 0;
            padding: 8px 0;
            border-bottom: 1px solid #eee;
          }
          .stat-item:last-child {
            border-bottom: none;
          }
          .stat-value {
            font-weight: bold;
          }
          .critical { color: #dc3545; }
          .serious { color: #fd7e14; }
          .moderate { color: #ffc107; }
          .minor { color: #28a745; }
          .success { color: #28a745; }
          
          .recommendations {
            margin-top: 30px;
            padding: 20px;
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            border-radius: 4px;
          }
          .recommendations h3 {
            color: #856404;
            margin: 0 0 15px 0;
          }
          .recommendations ul {
            margin: 0;
            padding-left: 20px;
          }
          .recommendations li {
            margin: 5px 0;
          }
          
          .score-section {
            text-align: center;
            margin: 30px 0;
            padding: 25px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 12px;
          }
          .score {
            font-size: 48px;
            font-weight: bold;
            margin: 10px 0;
          }
          .score-label {
            font-size: 18px;
            opacity: 0.9;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Accessibility Report</h1>
          <p><strong>Executive Summary</strong></p>
          <p>${url}</p>
          <p>Generated: ${new Date().toLocaleString()}</p>
          <p>WCAG Standards: ${wcagLevel.join(', ').toUpperCase()}</p>
        </div>

        <div class="score-section">
          <div class="score-label">Accessibility Score</div>
          <div class="score">${summary.score}%</div>
          <div class="score-label">${summary.grade}</div>
        </div>

        <div class="summary-grid">
          <div class="summary-card">
            <h3>Test Results Overview</h3>
            <div class="stat-item">
              <span>Total Rules Tested</span>
              <span class="stat-value">${summary.totalRules}</span>
            </div>
            <div class="stat-item">
              <span>Violations Found</span>
              <span class="stat-value critical">${results.violations.length}</span>
            </div>
            <div class="stat-item">
              <span>Rules Passed</span>
              <span class="stat-value success">${results.passes.length}</span>
            </div>
            <div class="stat-item">
              <span>Incomplete Tests</span>
              <span class="stat-value moderate">${results.incomplete.length}</span>
            </div>
          </div>

          <div class="summary-card">
            <h3>Violation Severity Breakdown</h3>
            <div class="stat-item">
              <span>Critical Issues</span>
              <span class="stat-value critical">${summary.severityCounts.critical}</span>
            </div>
            <div class="stat-item">
              <span>Serious Issues</span>
              <span class="stat-value serious">${summary.severityCounts.serious}</span>
            </div>
            <div class="stat-item">
              <span>Moderate Issues</span>
              <span class="stat-value moderate">${summary.severityCounts.moderate}</span>
            </div>
            <div class="stat-item">
              <span>Minor Issues</span>
              <span class="stat-value minor">${summary.severityCounts.minor}</span>
            </div>
          </div>
        </div>

        <div class="summary-card">
          <h3>Top Issues by Category</h3>
          ${summary.topCategories.map(cat => `
            <div class="stat-item">
              <span>${cat.category}</span>
              <span class="stat-value">${cat.count} issues</span>
            </div>
          `).join('')}
        </div>

        <div class="recommendations">
          <h3>🎯 Key Recommendations</h3>
          <ul>
            ${summary.recommendations.map(rec => `<li>${rec}</li>`).join('')}
          </ul>
        </div>

        <div style="margin-top: 40px; text-align: center; color: #666; font-size: 12px;">
          <p>Generated by Automated Accessibility Checker | Test ID: ${testId}</p>
          <p>For detailed technical information, refer to the full HTML report.</p>
        </div>
      </body>
      </html>
    `;

    return await this.generatePDF(htmlContent, outputPath);
  }

  /**
   * Calculate summary statistics from results
   */
  static calculateSummaryStats(results) {
    const totalRules = results.violations.length + results.passes.length + results.incomplete.length + results.inapplicable.length;
    const totalViolations = results.violations.reduce((sum, v) => sum + v.nodes.length, 0);
    
    // Calculate severity counts
    const severityCounts = {
      critical: 0,
      serious: 0,
      moderate: 0,
      minor: 0
    };

    results.violations.forEach(violation => {
      if (severityCounts[violation.impact]) {
        severityCounts[violation.impact] += violation.nodes.length;
      }
    });

    // Calculate accessibility score (simplified)
    const passedTests = results.passes.length;
    const score = totalRules > 0 ? Math.round((passedTests / totalRules) * 100) : 100;
    
    // Determine grade
    let grade = 'Needs Improvement';
    if (score >= 95) grade = 'Excellent';
    else if (score >= 85) grade = 'Good';
    else if (score >= 70) grade = 'Fair';

    // Top categories (simplified)
    const categories = {};
    results.violations.forEach(violation => {
      violation.tags.forEach(tag => {
        if (tag.startsWith('cat.')) {
          const category = tag.replace('cat.', '').replace('-', ' ');
          categories[category] = (categories[category] || 0) + 1;
        }
      });
    });

    const topCategories = Object.entries(categories)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([category, count]) => ({ 
        category: category.charAt(0).toUpperCase() + category.slice(1), 
        count 
      }));

    // Generate recommendations
    const recommendations = [];
    if (severityCounts.critical > 0) {
      recommendations.push(`Address ${severityCounts.critical} critical accessibility issues immediately`);
    }
    if (severityCounts.serious > 0) {
      recommendations.push(`Fix ${severityCounts.serious} serious violations that impact user experience`);
    }
    if (results.incomplete.length > 0) {
      recommendations.push(`Review ${results.incomplete.length} incomplete tests that require manual verification`);
    }
    if (topCategories.length > 0) {
      recommendations.push(`Focus on ${topCategories[0].category.toLowerCase()} improvements (${topCategories[0].count} issues)`);
    }
    if (recommendations.length === 0) {
      recommendations.push('Great job! Continue monitoring for accessibility regressions');
    }

    return {
      totalRules,
      totalViolations,
      severityCounts,
      score,
      grade,
      topCategories,
      recommendations
    };
  }

  /**
   * Generate technical PDF from HTML report
   */
  static async generateTechnicalPDF(htmlContent, outputPath) {
    // Clean up HTML for better PDF rendering
    const cleanedHtml = htmlContent
      .replace(/display: block !important;/g, 'display: block;')
      .replace(/color: #[0-9a-f]{6} !important;/g, match => match.replace(' !important', ''));

    const pdfOptions = {
      format: 'A4',
      margin: {
        top: '15mm',
        right: '10mm',
        bottom: '15mm',
        left: '10mm'
      },
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="width: 100%; text-align: center; font-size: 10px; margin-top: 5px;">
          <span style="color: #666;">Accessibility Technical Report</span>
        </div>
      `,
      footerTemplate: `
        <div style="width: 100%; text-align: center; font-size: 9px; color: #666; margin-bottom: 5px;">
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>
      `
    };

    return await this.generatePDF(cleanedHtml, outputPath, pdfOptions);
  }
}

module.exports = PDFGenerator;