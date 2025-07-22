# CI/CD Integration Guide

This guide explains how to integrate the Automated Accessibility Checker into your CI/CD pipelines.

## 🚀 Quick Start

### Option 1: GitHub Actions (Recommended)

Copy the provided workflow file to your repository:

```bash
mkdir -p .github/workflows
cp .github/workflows/accessibility-test.yml .github/workflows/
```

Update the URLs in the workflow file to match your website:
- Replace `https://your-website.com` with your actual website URL
- Add additional pages you want to test

### Option 2: CLI Tool

Install the CLI tool globally:

```bash
cd cli
npm install -g .
```

Use in your pipeline:

```bash
# Test a single URL
accessibility-checker test-url -u https://your-website.com --wcag wcag2aa

# Test multiple URLs from file
echo "https://your-site.com" > urls.txt
echo "https://your-site.com/about" >> urls.txt
accessibility-checker test-urls -f urls.txt --wcag wcag22aa
```

## 📋 API Endpoints for CI/CD

### Test Single URL
```bash
POST /api/ci/test-url
```

**Request Body:**
```json
{
  "url": "https://example.com",
  "wcagLevel": ["wcag2aa"],
  "failOnViolations": true,
  "maxViolations": 0,
  "includeScreenshots": false,
  "format": "json"
}
```

**Response (Success):**
```json
{
  "success": true,
  "url": "https://example.com",
  "wcagLevel": ["wcag2aa"],
  "timestamp": "2024-01-15T10:30:00.000Z",
  "summary": {
    "violations": 0,
    "passes": 45,
    "incomplete": 2,
    "inapplicable": 12
  },
  "violations": [],
  "screenshots": []
}
```

**Response (Failure - HTTP 422):**
```json
{
  "success": false,
  "url": "https://example.com",
  "summary": {
    "violations": 3,
    "passes": 42,
    "incomplete": 2,
    "inapplicable": 12
  },
  "violations": [
    {
      "id": "color-contrast",
      "description": "Elements must have sufficient color contrast",
      "impact": "serious",
      "tags": ["wcag2aa", "wcag143"],
      "nodes": 2,
      "helpUrl": "https://dequeuniversity.com/rules/axe/4.10/color-contrast"
    }
  ]
}
```

### Test Multiple URLs
```bash
POST /api/ci/test-urls
```

**Request Body:**
```json
{
  "urls": [
    "https://example.com",
    "https://example.com/about",
    "https://example.com/contact"
  ],
  "wcagLevel": ["wcag2aa"],
  "failOnViolations": true,
  "maxViolations": 0,
  "continueOnFailure": false
}
```

## 🔧 Configuration Options

### WCAG Compliance Levels
- `wcag2a` - WCAG 2.0 Level A
- `wcag2aa` - WCAG 2.0 Level AA (recommended)
- `wcag21aa` - WCAG 2.1 Level AA
- `wcag22aa` - WCAG 2.2 Level AA (latest)
- `section508` - US Section 508
- `comprehensive` - All standards combined

### Output Formats
- `json` - JSON format (default)
- `junit` - JUnit XML for test reporting
- `sarif` - SARIF format for GitHub Security tab

### Failure Modes
- `failOnViolations: true` - Fail pipeline on any violations
- `maxViolations: N` - Allow up to N violations before failing
- `continueOnFailure: true` - Test all URLs even if some fail

## 🔄 CI/CD Platform Examples

### Jenkins Pipeline
```groovy
pipeline {
    agent any
    
    stages {
        stage('Accessibility Tests') {
            steps {
                script {
                    def response = sh(
                        script: """
                            curl -s -X POST http://accessibility-server:3001/api/ci/test-url \\
                            -H "Content-Type: application/json" \\
                            -d '{"url": "https://your-website.com", "wcagLevel": ["wcag2aa"]}'
                        """,
                        returnStdout: true
                    )
                    
                    def result = readJSON text: response
                    
                    if (!result.success) {
                        error "Accessibility tests failed: ${result.summary.violations} violations found"
                    }
                }
            }
        }
    }
}
```

### GitLab CI
```yaml
accessibility-test:
  image: node:18
  stage: test
  script:
    - npm install -g accessibility-checker-cli
    - accessibility-checker test-url -u https://your-website.com --wcag wcag2aa
  artifacts:
    reports:
      junit: accessibility-results.xml
    paths:
      - accessibility-*.json
```

### Azure DevOps
```yaml
- task: NodeTool@0
  inputs:
    versionSpec: '18.x'
- script: |
    npm install -g accessibility-checker-cli
    accessibility-checker test-url -u https://your-website.com --wcag wcag2aa --format junit --output accessibility-results.xml
  displayName: 'Run Accessibility Tests'
- task: PublishTestResults@2
  inputs:
    testResultsFormat: 'JUnit'
    testResultsFiles: 'accessibility-results.xml'
```

### Docker Integration
```dockerfile
FROM node:18-alpine

# Install accessibility checker
RUN npm install -g accessibility-checker-cli

# Copy test configuration
COPY urls.txt /app/
WORKDIR /app

# Run tests
CMD ["accessibility-checker", "test-urls", "-f", "urls.txt", "--wcag", "wcag2aa"]
```

## 📊 GitHub Integration Features

### Security Tab Integration
The workflow automatically uploads SARIF files to GitHub's Security tab, showing accessibility violations as security alerts.

### Pull Request Comments
Automatic PR comments show accessibility test results:
- ✅/❌ Pass/fail status
- Violation counts by severity
- Links to detailed reports

### Test Reporting
JUnit XML integration provides:
- Test result summaries in PR checks
- Historical test trend data
- Integration with GitHub's test reporting

## ⚙️ Advanced Configuration

### Custom Rules
```json
{
  "url": "https://example.com",
  "wcagLevel": ["wcag2aa"],
  "customRules": {
    "disable": ["color-contrast"],
    "enable": ["custom-rule"]
  }
}
```

### Environment-Specific Testing
```yaml
matrix:
  environment:
    - staging
    - production
  wcag-level:
    - wcag2aa
    - wcag22aa
```

### Scheduled Testing
```yaml
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
    - cron: '0 14 * * 1' # Weekly on Mondays at 2 PM
```

## 🚨 Failure Handling

### Graceful Degradation
```bash
# Allow minor violations but fail on critical/serious
accessibility-checker test-url -u https://site.com --max-violations 5
```

### Conditional Failures
```yaml
- name: Test Accessibility (Non-blocking)
  run: accessibility-checker test-url -u https://staging.example.com
  continue-on-error: true
  
- name: Test Accessibility (Blocking)
  if: github.ref == 'refs/heads/main'
  run: accessibility-checker test-url -u https://example.com
```

### Notification Integration
```yaml
- name: Notify on failure
  if: failure()
  run: |
    curl -X POST https://hooks.slack.com/webhook \
    -d '{"text":"Accessibility tests failed on ${{ github.ref }}"}'
```

## 📈 Monitoring and Reporting

### Metrics Collection
- Track violation trends over time
- Monitor compliance scores by page
- Identify regression patterns

### Dashboard Integration
Export results to monitoring dashboards:
```bash
# Export to JSON for external processing
accessibility-checker test-url -u https://site.com --format json --output results.json
```

## 🔒 Security Considerations

### Server Security
- Run accessibility server in isolated environment
- Use HTTPS for production deployments
- Implement rate limiting and authentication

### Data Privacy
- Screenshots may contain sensitive data
- Configure screenshot capture appropriately
- Consider data retention policies

## 📚 Best Practices

1. **Start Simple**: Begin with basic WCAG 2.0 AA compliance
2. **Gradual Implementation**: Add more strict rules over time
3. **Team Education**: Train developers on accessibility principles
4. **Regular Reviews**: Schedule periodic accessibility audits
5. **User Testing**: Complement automated tests with real user feedback

## 🆘 Troubleshooting

### Common Issues
- **Server not responding**: Check if accessibility server is running
- **Tests timing out**: Increase timeout values for slow pages
- **False positives**: Review and customize rule sets
- **Memory issues**: Limit concurrent tests for large batches

### Debug Mode
```bash
accessibility-checker test-url -u https://site.com --verbose
```

This provides detailed logging and error information for troubleshooting.