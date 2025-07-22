const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;
const { createHtmlReport } = require('axe-html-reporter');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');
const ScreenshotCapture = require('./utils/screenshotUtils');
const ReportGenerator = require('./utils/reportGenerator');
const PDFGenerator = require('./utils/pdfGenerator');

// Helper functions for CI/CD report formats
function generateJUnitReport(results, url, wcagLevel) {
  const testSuites = [{
    name: 'Accessibility Tests',
    tests: results.violations.length + results.passes.length,
    failures: results.violations.length,
    time: 0,
    testcases: [
      ...results.violations.map(violation => ({
        classname: 'accessibility.violations',
        name: `${violation.id} - ${violation.description}`,
        time: 0,
        failure: {
          message: `${violation.impact} violation: ${violation.description}`,
          type: 'AssertionError',
          text: `Violation found on ${violation.nodes.length} element(s). Help: ${violation.helpUrl}`
        }
      })),
      ...results.passes.map(pass => ({
        classname: 'accessibility.passes',
        name: `${pass.id} - ${pass.description}`,
        time: 0
      }))
    ]
  }];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="Accessibility Tests" tests="${testSuites[0].tests}" failures="${testSuites[0].failures}" time="0">
  <testsuite name="${testSuites[0].name}" tests="${testSuites[0].tests}" failures="${testSuites[0].failures}" time="0">
    ${testSuites[0].testcases.map(tc => `
    <testcase classname="${tc.classname}" name="${tc.name}" time="${tc.time}">
      ${tc.failure ? `<failure message="${escapeXml(tc.failure.message)}" type="${tc.failure.type}">${escapeXml(tc.failure.text)}</failure>` : ''}
    </testcase>`).join('')}
  </testsuite>
</testsuites>`;

  return xml;
}

function generateSARIFReport(results, url, wcagLevel) {
  return {
    version: "2.1.0",
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    runs: [{
      tool: {
        driver: {
          name: "axe-core",
          version: "4.10.0",
          informationUri: "https://www.deque.com/axe/",
          rules: results.violations.map(violation => ({
            id: violation.id,
            shortDescription: { text: violation.description },
            fullDescription: { text: violation.help },
            helpUri: violation.helpUrl,
            properties: {
              tags: violation.tags,
              impact: violation.impact
            }
          }))
        }
      },
      results: results.violations.flatMap(violation => 
        violation.nodes.map(node => ({
          ruleId: violation.id,
          message: { text: violation.description },
          level: mapImpactToLevel(violation.impact),
          locations: [{
            physicalLocation: {
              artifactLocation: { uri: url },
              region: {
                snippet: { text: node.html }
              }
            }
          }]
        }))
      )
    }]
  };
}

function mapImpactToLevel(impact) {
  const mapping = {
    critical: 'error',
    serious: 'error', 
    moderate: 'warning',
    minor: 'note'
  };
  return mapping[impact] || 'warning';
}

function escapeXml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Serve static reports and screenshots
app.use('/reports', express.static(path.join(__dirname, '../reports')));

// In-memory storage for test results (in production, use a database)
const testResults = new Map();

// Test website accessibility
app.post('/api/test-website', async (req, res) => {
  const { 
    url, 
    testId = uuidv4(),
    wcagLevel = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'],
    includeScreenshots = true
  } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.goto(url, { waitUntil: 'networkidle' });
    
    // Run axe accessibility tests
    const axeBuilder = new AxeBuilder({ page })
      .withTags(wcagLevel);
    
    const results = await axeBuilder.analyze();
    
    // Capture screenshots if enabled and there are violations
    let screenshotData = null;
    if (includeScreenshots && results.violations.length > 0) {
      try {
        const screenshotCapture = new ScreenshotCapture(page);
        screenshotData = await screenshotCapture.captureViolationScreenshots(
          results, 
          testId, 
          path.join(__dirname, '../reports')
        );
        console.log(`Captured ${screenshotData.violationScreenshots.length} violation screenshots`);
      } catch (error) {
        console.error('Failed to capture screenshots:', error);
      }
    }
    
    await browser.close();

    // Generate enhanced HTML report with screenshots
    const reportPath = path.join(__dirname, '../reports', `${testId}.html`);
    
    const finalHtmlReport = await ReportGenerator.generateEnhancedReport(
      results,
      screenshotData,
      {
        projectKey: 'Accessibility Test',
        outputDir: path.dirname(reportPath),
        reportFileName: path.basename(reportPath),
        wcagLevel: wcagLevel, // Pass WCAG level for rules section
        customSummary: `
          <div class="custom-summary">
            <h3>Test Summary</h3>
            <p><strong>URL:</strong> ${url}</p>
            <p><strong>WCAG Standards:</strong> ${wcagLevel.join(', ')}</p>
            <p><strong>Test Date:</strong> ${new Date().toLocaleString()}</p>
            ${screenshotData ? `<p><strong>Screenshots:</strong> ${screenshotData.violationScreenshots.length} violation screenshots captured</p>` : ''}
          </div>
        `
      }
    );

    await fs.writeFile(reportPath, finalHtmlReport);

    const summary = {
      url,
      testId,
      timestamp: new Date().toISOString(),
      violations: results.violations.length,
      passes: results.passes.length,
      incomplete: results.incomplete.length,
      inapplicable: results.inapplicable.length,
      reportUrl: `http://localhost:${PORT}/reports/${testId}.html`
    };

    testResults.set(testId, { ...summary, fullResults: results });

    res.json(summary);
  } catch (error) {
    console.error('Error testing website:', error);
    res.status(500).json({ error: 'Failed to test website accessibility' });
  }
});

// Get test results
app.get('/api/test-results/:testId', (req, res) => {
  const { testId } = req.params;
  const result = testResults.get(testId);
  
  if (!result) {
    return res.status(404).json({ error: 'Test result not found' });
  }
  
  res.json(result);
});

// List all test results
app.get('/api/test-results', (req, res) => {
  const results = Array.from(testResults.values()).map(({ fullResults, ...summary }) => summary);
  res.json(results);
});

// Batch test multiple URLs with progress tracking
app.post('/api/batch-test', async (req, res) => {
  const { 
    urls,
    wcagLevel = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'],
    includeScreenshots = true
  } = req.body;
  
  if (!Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ error: 'URLs array is required' });
  }

  const batchId = uuidv4();
  
  // Initialize batch progress tracking
  const batchProgress = {
    batchId,
    status: 'running',
    totalUrls: urls.length,
    completedUrls: 0,
    failedUrls: 0,
    results: [],
    startTime: new Date().toISOString()
  };
  
  // Store batch progress (in production, use database)
  global.batchProgress = global.batchProgress || new Map();
  global.batchProgress.set(batchId, batchProgress);

  res.json({ 
    batchId, 
    message: 'Batch test started',
    totalUrls: urls.length,
    statusUrl: `/api/batch-status/${batchId}`
  });

  // Process batch in background with proper error handling
  setImmediate(async () => {
    let browser = null;
    let context = null;
    
    try {
      browser = await chromium.launch();
      context = await browser.newContext();
      
      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        let page = null;
        
        try {
          console.log(`Testing URL ${i + 1}/${urls.length}: ${url}`);
          
          // Update progress
          batchProgress.status = `Testing ${url}`;
          
          page = await context.newPage();
          
          // Set timeout for page operations
          page.setDefaultTimeout(30000); // 30 second timeout
          
          await page.goto(url, { 
            waitUntil: 'networkidle',
            timeout: 30000 
          });
          
          const axeBuilder = new AxeBuilder({ page })
            .withTags(wcagLevel);
          
          const results = await axeBuilder.analyze();
          
          // Capture screenshots if enabled and there are violations
          let screenshotData = null;
          if (includeScreenshots && results.violations.length > 0) {
            try {
              const screenshotCapture = new ScreenshotCapture(page);
              screenshotData = await screenshotCapture.captureViolationScreenshots(
                results, 
                `${batchId}_${uuidv4()}`, 
                path.join(__dirname, '../reports')
              );
              console.log(`Captured ${screenshotData.violationScreenshots.length} violation screenshots for ${url}`);
            } catch (error) {
              console.warn('Failed to capture screenshots for', url, ':', error.message);
            }
          }
          
          await page.close();
          page = null;

          const testId = `${batchId}_${uuidv4()}`;
          const reportPath = path.join(__dirname, '../reports', `${testId}.html`);
          
          const finalHtmlReport = await ReportGenerator.generateEnhancedReport(
            results,
            screenshotData,
            {
              projectKey: 'Batch Accessibility Test',
              outputDir: path.dirname(reportPath),
              reportFileName: path.basename(reportPath),
              wcagLevel: wcagLevel,
              customSummary: `
                <div class="custom-summary">
                  <h3>Batch Test Summary</h3>
                  <p><strong>URL:</strong> ${url}</p>
                  <p><strong>WCAG Standards:</strong> ${wcagLevel.join(', ')}</p>
                  <p><strong>Test Date:</strong> ${new Date().toLocaleString()}</p>
                  <p><strong>Batch ID:</strong> ${batchId}</p>
                  ${screenshotData ? `<p><strong>Screenshots:</strong> ${screenshotData.violationScreenshots.length} violation screenshots captured</p>` : ''}
                </div>
              `
            }
          );

          await fs.writeFile(reportPath, finalHtmlReport);

          const summary = {
            url,
            testId,
            batchId,
            timestamp: new Date().toISOString(),
            violations: results.violations.length,
            passes: results.passes.length,
            incomplete: results.incomplete.length,
            inapplicable: results.inapplicable.length,
            reportUrl: `http://localhost:${PORT}/reports/${testId}.html`,
            status: 'completed'
          };

          testResults.set(testId, { ...summary, fullResults: results });
          batchProgress.results.push(summary);
          batchProgress.completedUrls++;
          
          console.log(`✅ Successfully tested ${url} (${batchProgress.completedUrls}/${batchProgress.totalUrls})`);
          
        } catch (error) {
          console.error(`❌ Error testing ${url}:`, error.message);
          
          // Clean up page if still open
          if (page) {
            try { await page.close(); } catch (e) { /* ignore */ }
          }
          
          // Add failed result
          const failedResult = {
            url,
            testId: `${batchId}_failed_${i}`,
            batchId,
            timestamp: new Date().toISOString(),
            status: 'failed',
            error: error.message,
            violations: 0,
            passes: 0,
            incomplete: 0,
            inapplicable: 0
          };
          
          batchProgress.results.push(failedResult);
          batchProgress.failedUrls++;
          batchProgress.completedUrls++; // Count as completed for progress
          
          console.log(`⚠️ Failed to test ${url}, continuing with next URL...`);
        }
        
        // Update progress status
        batchProgress.status = `Completed ${batchProgress.completedUrls}/${batchProgress.totalUrls} URLs`;
      }
      
    } catch (error) {
      console.error('Batch test failed:', error);
      batchProgress.status = 'failed';
      batchProgress.error = error.message;
    } finally {
      // Clean up browser
      if (context) {
        try { await context.close(); } catch (e) { /* ignore */ }
      }
      if (browser) {
        try { await browser.close(); } catch (e) { /* ignore */ }
      }
      
      // Mark batch as completed
      batchProgress.status = batchProgress.failedUrls === batchProgress.totalUrls ? 'failed' : 'completed';
      batchProgress.endTime = new Date().toISOString();
      
      console.log(`🎉 Batch test completed: ${batchProgress.completedUrls - batchProgress.failedUrls}/${batchProgress.totalUrls} URLs successful`);
    }
  });
});

// Get batch test status
app.get('/api/batch-status/:batchId', (req, res) => {
  const { batchId } = req.params;
  
  if (!global.batchProgress || !global.batchProgress.has(batchId)) {
    return res.status(404).json({ error: 'Batch not found' });
  }
  
  const progress = global.batchProgress.get(batchId);
  res.json(progress);
});

// CI/CD Integration Endpoints

// Test single URL for CI/CD (returns JSON results)
app.post('/api/ci/test-url', async (req, res) => {
  const { 
    url, 
    wcagLevel = ['wcag2a', 'wcag2aa'],
    failOnViolations = true,
    maxViolations = 0,
    includeScreenshots = false,
    format = 'json' // 'json', 'junit', 'sarif'
  } = req.body;

  if (!url) {
    return res.status(400).json({ 
      success: false,
      error: 'URL is required' 
    });
  }

  try {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.goto(url, { waitUntil: 'networkidle' });
    
    const axeBuilder = new AxeBuilder({ page })
      .withTags(wcagLevel);
    
    const results = await axeBuilder.analyze();
    
    // Capture screenshots if enabled
    let screenshotData = null;
    if (includeScreenshots && results.violations.length > 0) {
      try {
        const screenshotCapture = new ScreenshotCapture(page);
        const testId = uuidv4();
        screenshotData = await screenshotCapture.captureViolationScreenshots(
          results, 
          testId, 
          path.join(__dirname, '../reports')
        );
      } catch (error) {
        console.warn('Screenshot capture failed:', error.message);
      }
    }
    
    await browser.close();

    // Determine success/failure
    const violationCount = results.violations.length;
    const success = !failOnViolations || violationCount <= maxViolations;

    // Format response based on requested format
    if (format === 'junit') {
      const junitXml = generateJUnitReport(results, url, wcagLevel);
      res.setHeader('Content-Type', 'application/xml');
      return res.send(junitXml);
    } else if (format === 'sarif') {
      const sarifReport = generateSARIFReport(results, url, wcagLevel);
      return res.json(sarifReport);
    }

    // Default JSON format
    const response = {
      success,
      url,
      wcagLevel,
      timestamp: new Date().toISOString(),
      summary: {
        violations: violationCount,
        passes: results.passes.length,
        incomplete: results.incomplete.length,
        inapplicable: results.inapplicable.length
      },
      violations: results.violations.map(violation => ({
        id: violation.id,
        description: violation.description,
        impact: violation.impact,
        tags: violation.tags,
        nodes: violation.nodes.length,
        helpUrl: violation.helpUrl
      })),
      screenshots: screenshotData?.violationScreenshots || []
    };

    if (!success) {
      res.status(422); // Unprocessable Entity - tests failed
    }

    res.json(response);

  } catch (error) {
    console.error('CI/CD test failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test URL for accessibility',
      details: error.message
    });
  }
});

// Bulk test for CI/CD (test multiple URLs)
app.post('/api/ci/test-urls', async (req, res) => {
  const { 
    urls,
    wcagLevel = ['wcag2a', 'wcag2aa'],
    failOnViolations = true,
    maxViolations = 0,
    continueOnFailure = false
  } = req.body;

  if (!Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ 
      success: false,
      error: 'URLs array is required' 
    });
  }

  const results = [];
  let overallSuccess = true;

  try {
    const browser = await chromium.launch();
    const context = await browser.newContext();

    for (const url of urls) {
      try {
        const page = await context.newPage();
        await page.goto(url, { waitUntil: 'networkidle' });
        
        const axeBuilder = new AxeBuilder({ page })
          .withTags(wcagLevel);
        
        const testResults = await axeBuilder.analyze();
        await page.close();

        const violationCount = testResults.violations.length;
        const urlSuccess = !failOnViolations || violationCount <= maxViolations;
        
        if (!urlSuccess) {
          overallSuccess = false;
        }

        results.push({
          url,
          success: urlSuccess,
          violations: violationCount,
          passes: testResults.passes.length,
          incomplete: testResults.incomplete.length,
          violationDetails: testResults.violations.map(v => ({
            id: v.id,
            description: v.description,
            impact: v.impact,
            nodes: v.nodes.length
          }))
        });

        // Stop on first failure if continueOnFailure is false
        if (!urlSuccess && !continueOnFailure) {
          break;
        }

      } catch (error) {
        console.error(`Failed to test ${url}:`, error);
        results.push({
          url,
          success: false,
          error: error.message
        });
        overallSuccess = false;

        if (!continueOnFailure) {
          break;
        }
      }
    }

    await browser.close();

    const response = {
      success: overallSuccess,
      timestamp: new Date().toISOString(),
      wcagLevel,
      summary: {
        totalUrls: urls.length,
        testedUrls: results.length,
        passedUrls: results.filter(r => r.success).length,
        failedUrls: results.filter(r => !r.success).length
      },
      results
    };

    if (!overallSuccess) {
      res.status(422); // Unprocessable Entity - tests failed
    }

    res.json(response);

  } catch (error) {
    console.error('Bulk CI/CD test failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test URLs for accessibility',
      details: error.message
    });
  }
});

// Generate PDF reports
app.post('/api/generate-pdf/:testId', async (req, res) => {
  const { testId } = req.params;
  const { type = 'executive' } = req.body; // 'executive' or 'technical'
  
  const result = testResults.get(testId);
  if (!result) {
    return res.status(404).json({ error: 'Test result not found' });
  }

  try {
    const pdfDir = path.join(__dirname, '../reports/pdf');
    await fs.mkdir(pdfDir, { recursive: true });

    let pdfPath;
    
    if (type === 'executive') {
      // Generate executive summary PDF
      pdfPath = path.join(pdfDir, `${testId}_executive.pdf`);
      await PDFGenerator.generateExecutiveSummary(
        result.fullResults,
        result.url,
        ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'], // TODO: Get from stored result
        testId,
        pdfPath
      );
    } else {
      // Generate technical PDF from HTML report
      const htmlReportPath = path.join(__dirname, '../reports', `${testId}.html`);
      const htmlContent = await fs.readFile(htmlReportPath, 'utf8');
      
      pdfPath = path.join(pdfDir, `${testId}_technical.pdf`);
      await PDFGenerator.generateTechnicalPDF(htmlContent, pdfPath);
    }

    // Return PDF file
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(pdfPath)}"`);
    
    const pdfBuffer = await fs.readFile(pdfPath);
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF report' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Accessibility testing server running on port ${PORT}`);
});