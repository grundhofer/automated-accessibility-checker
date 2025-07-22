#!/usr/bin/env node

const { Command } = require('commander');
const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');

const program = new Command();

program
  .name('accessibility-checker')
  .description('CLI tool for automated accessibility testing')
  .version('1.0.0');

program
  .command('test-url')
  .description('Test a single URL for accessibility violations')
  .requiredOption('-u, --url <url>', 'URL to test')
  .option('-s, --server <server>', 'Accessibility checker server URL', 'http://localhost:3001')
  .option('-w, --wcag <level>', 'WCAG compliance level', 'wcag2aa')
  .option('-m, --max-violations <number>', 'Maximum allowed violations', '0')
  .option('-f, --format <format>', 'Output format (json|junit|sarif)', 'json')
  .option('-o, --output <file>', 'Output file path')
  .option('--fail-on-violations', 'Fail on any violations', true)
  .option('--screenshots', 'Include violation screenshots', false)
  .option('--verbose', 'Verbose output', false)
  .action(async (options) => {
    try {
      console.log(`🔍 Testing ${options.url} for accessibility violations...`);
      
      const wcagLevels = {
        'wcag2a': ['wcag2a'],
        'wcag2aa': ['wcag2a', 'wcag2aa'],
        'wcag21aa': ['wcag2a', 'wcag2aa', 'wcag21aa'],
        'wcag22aa': ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'],
        'section508': ['section508'],
        'comprehensive': ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'section508']
      };

      const requestBody = {
        url: options.url,
        wcagLevel: wcagLevels[options.wcag] || [options.wcag],
        failOnViolations: options.failOnViolations,
        maxViolations: parseInt(options.maxViolations),
        includeScreenshots: options.screenshots,
        format: options.format
      };

      if (options.verbose) {
        console.log('Request configuration:', JSON.stringify(requestBody, null, 2));
      }

      const response = await fetch(`${options.server}/api/ci/test-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const contentType = response.headers.get('content-type');
      let result;

      if (contentType && contentType.includes('application/xml')) {
        result = await response.text();
      } else {
        result = await response.json();
      }

      // Output results
      if (options.output) {
        if (options.format === 'junit') {
          await fs.writeFile(options.output, result);
        } else {
          await fs.writeFile(options.output, JSON.stringify(result, null, 2));
        }
        console.log(`📄 Results saved to ${options.output}`);
      } else {
        if (options.format === 'json') {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(result);
        }
      }

      // Print summary
      if (result.success !== undefined) {
        const status = result.success ? '✅ PASSED' : '❌ FAILED';
        console.log(`\n${status} - ${result.summary.violations} violations, ${result.summary.passes} passes`);
        
        if (result.violations && result.violations.length > 0) {
          console.log('\n🔴 Top violations:');
          result.violations.slice(0, 5).forEach((v, i) => {
            console.log(`  ${i + 1}. ${v.impact.toUpperCase()}: ${v.description} (${v.nodes} elements)`);
          });
        }

        // Exit with error code if tests failed
        if (!result.success) {
          process.exit(1);
        }
      }

    } catch (error) {
      console.error('❌ Error:', error.message);
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

program
  .command('test-urls')
  .description('Test multiple URLs for accessibility violations')
  .requiredOption('-f, --file <file>', 'File containing URLs (one per line)')
  .option('-s, --server <server>', 'Accessibility checker server URL', 'http://localhost:3001')
  .option('-w, --wcag <level>', 'WCAG compliance level', 'wcag2aa')
  .option('-m, --max-violations <number>', 'Maximum allowed violations per URL', '0')
  .option('-o, --output <file>', 'Output file path')
  .option('--continue-on-failure', 'Continue testing even if a URL fails', false)
  .option('--fail-on-violations', 'Fail on any violations', true)
  .option('--verbose', 'Verbose output', false)
  .action(async (options) => {
    try {
      // Read URLs from file
      const urlsContent = await fs.readFile(options.file, 'utf8');
      const urls = urlsContent.split('\n').filter(url => url.trim()).map(url => url.trim());

      if (urls.length === 0) {
        throw new Error('No URLs found in file');
      }

      console.log(`🔍 Testing ${urls.length} URLs for accessibility violations...`);

      const wcagLevels = {
        'wcag2a': ['wcag2a'],
        'wcag2aa': ['wcag2a', 'wcag2aa'],
        'wcag21aa': ['wcag2a', 'wcag2aa', 'wcag21aa'],
        'wcag22aa': ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'],
        'section508': ['section508'],
        'comprehensive': ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'section508']
      };

      const requestBody = {
        urls,
        wcagLevel: wcagLevels[options.wcag] || [options.wcag],
        failOnViolations: options.failOnViolations,
        maxViolations: parseInt(options.maxViolations),
        continueOnFailure: options.continueOnFailure
      };

      if (options.verbose) {
        console.log('Request configuration:', JSON.stringify(requestBody, null, 2));
      }

      const response = await fetch(`${options.server}/api/ci/test-urls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const result = await response.json();

      // Output results
      if (options.output) {
        await fs.writeFile(options.output, JSON.stringify(result, null, 2));
        console.log(`📄 Results saved to ${options.output}`);
      } else {
        console.log(JSON.stringify(result, null, 2));
      }

      // Print summary
      const status = result.success ? '✅ PASSED' : '❌ FAILED';
      console.log(`\n${status} - ${result.summary.passedUrls}/${result.summary.totalUrls} URLs passed`);
      
      if (result.summary.failedUrls > 0) {
        console.log('\n❌ Failed URLs:');
        result.results.filter(r => !r.success).forEach((r, i) => {
          console.log(`  ${i + 1}. ${r.url} - ${r.violations || 0} violations`);
        });
      }

      // Exit with error code if tests failed
      if (!result.success) {
        process.exit(1);
      }

    } catch (error) {
      console.error('❌ Error:', error.message);
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

program
  .command('start-server')
  .description('Start the accessibility checker server')
  .option('-p, --port <port>', 'Server port', '3001')
  .option('--verbose', 'Verbose output', false)
  .action(async (options) => {
    const { spawn } = require('child_process');
    
    console.log(`🚀 Starting accessibility checker server on port ${options.port}...`);
    
    const serverProcess = spawn('node', ['server.js'], {
      cwd: path.join(__dirname, '../backend'),
      env: { ...process.env, PORT: options.port },
      stdio: options.verbose ? 'inherit' : 'pipe'
    });

    serverProcess.on('error', (error) => {
      console.error('❌ Failed to start server:', error.message);
      process.exit(1);
    });

    serverProcess.on('exit', (code) => {
      console.log(`Server exited with code ${code}`);
      process.exit(code);
    });

    // Handle Ctrl+C gracefully
    process.on('SIGINT', () => {
      console.log('\n🛑 Stopping server...');
      serverProcess.kill('SIGINT');
    });
  });

program
  .command('health')
  .description('Check if the accessibility checker server is running')
  .option('-s, --server <server>', 'Accessibility checker server URL', 'http://localhost:3001')
  .action(async (options) => {
    try {
      const response = await fetch(`${options.server}/api/health`);
      const result = await response.json();
      
      console.log(`✅ Server is healthy - ${result.status} at ${result.timestamp}`);
    } catch (error) {
      console.error(`❌ Server is not responding: ${error.message}`);
      process.exit(1);
    }
  });

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
  process.exit(1);
});

program.parse();