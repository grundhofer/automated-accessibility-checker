# Automated Accessibility Checker

A comprehensive, open-source solution for automated accessibility testing of websites and Flutter mobile applications against WCAG 2.2 criteria.

## Features

### ✅ Website Testing
- **WCAG 2.2 Compliance**: Tests against AA and AAA standards
- **Detailed Reports**: HTML reports with specific violation details
- **Batch Testing**: Test multiple URLs simultaneously
- **Real-time Results**: Live testing with immediate feedback

### ✅ Flutter App Testing
- **Widget-level Testing**: Semantic tree validation
- **Integration Testing**: Full app accessibility audits
- **Focus Management**: Navigation and focus order validation
- **Touch Target Validation**: Minimum size requirements

### ✅ Web Interface
- **Easy-to-use Dashboard**: Simple URL input and testing
- **Results Management**: View and track all test results
- **Report Generation**: Detailed HTML reports for each test
- **Batch Operations**: Test multiple sites at once

## Technology Stack

- **Backend**: Node.js, Express, Playwright, axe-core
- **Frontend**: React, Material-UI
- **Testing Engine**: axe-core (leading accessibility testing library)
- **Browser Automation**: Playwright
- **Reports**: HTML with detailed WCAG violations

## Quick Start

### Prerequisites
- Node.js 18 or higher
- npm or yarn

### Installation

1. **Clone and setup**:
   ```bash
   git clone <repository-url>
   cd automated-accessibility-check
   ./setup.sh
   ```

2. **Start the backend**:
   ```bash
   cd backend
   npm start
   ```

3. **Start the frontend** (in a new terminal):
   ```bash
   cd frontend
   npm start
   ```

4. **Access the application**:
   - Frontend: http://localhost:3000
   - API: http://localhost:3001

## Usage

### Testing Websites

1. **Single Website Test**:
   - Go to the "Test Website" tab
   - Enter a URL (e.g., https://example.com)
   - Click "Run Accessibility Test"
   - View results and detailed report

2. **Batch Testing**:
   - Go to the "Batch Test" tab
   - Add multiple URLs
   - Click "Run Batch Test"
   - Results appear in "Test Results" tab

### Testing Flutter Apps

See [Flutter Testing Guide](flutter-testing-guide.md) for detailed setup and testing procedures.

## API Endpoints

### Website Testing
- `POST /api/test-website` - Test a single website
- `POST /api/batch-test` - Test multiple websites
- `GET /api/test-results` - Get all test results
- `GET /api/test-results/:testId` - Get specific test result

### Flutter Testing
- `POST /api/test-flutter-app` - Test Flutter application
- See Flutter guide for additional endpoints

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React Frontend│    │  Express Backend │    │  Playwright +   │
│                 │◄──►│                  │◄──►│  axe-core       │
│  - URL Input    │    │  - API Routes    │    │  - Browser      │
│  - Results View │    │  - Test Queue    │    │  - Testing      │
│  - Reports      │    │  - File Storage  │    │  - Reports      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## WCAG 2.2 Coverage

The testing covers all WCAG 2.2 guidelines:

### Level A & AA Compliance
- ✅ **Perceivable**: Alt text, captions, color contrast
- ✅ **Operable**: Keyboard navigation, timing, seizures
- ✅ **Understandable**: Readable, predictable, input assistance
- ✅ **Robust**: Compatible with assistive technologies

### Specific Checks Include:
- Color contrast ratios (4.5:1 normal, 3:1 large text)
- Keyboard navigation and focus management
- Form labels and error identification
- Heading structure and landmarks
- Image alternative text
- Link purposes and context
- Table headers and structure
- ARIA labels and roles

## Report Features

### HTML Reports Include:
- **Executive Summary**: High-level violation counts
- **Detailed Violations**: Each issue with location and fix suggestions
- **WCAG Reference**: Direct links to relevant guidelines
- **Code Examples**: Exact HTML elements with issues
- **Priority Levels**: Critical, serious, moderate, minor classifications

### JSON API Results:
```json
{
  "url": "https://example.com",
  "testId": "uuid-here",
  "timestamp": "2024-01-15T10:30:00Z",
  "violations": 5,
  "passes": 42,
  "incomplete": 2,
  "reportUrl": "/reports/uuid-here.html"
}
```

## Configuration

### Environment Variables
```bash
PORT=3001                    # Backend port
PLAYWRIGHT_BROWSERS_PATH=    # Custom browser installation path
REPORTS_DIR=./reports        # Reports storage directory
```

### Custom Testing Rules
Modify `backend/server.js` to customize axe-core rules:

```javascript
const axeBuilder = new AxeBuilder({ page })
  .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
  .withRules(['color-contrast', 'keyboard-navigation'])
  .disableRules(['duplicate-id']); // if needed
```

## Development

### Project Structure
```
automated-accessibility-check/
├── backend/               # Express.js API server
├── frontend/             # React application
├── reports/              # Generated test reports
├── flutter-testing-guide.md
├── setup.sh
└── README.md
```

### Running in Development Mode

Backend:
```bash
cd backend
npm run dev  # Uses nodemon for auto-restart
```

Frontend:
```bash
cd frontend
npm start  # React development server
```

## Troubleshooting

### Common Issues

1. **Playwright Installation Failed**:
   ```bash
   cd backend
   npx playwright install chromium
   ```

2. **Permission Errors**:
   ```bash
   chmod +x setup.sh
   ```

3. **Port Conflicts**:
   Change ports in `backend/server.js` and `frontend/package.json` proxy setting

4. **Missing Dependencies**:
   ```bash
   npm install  # In both backend and frontend directories
   ```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

- Create an issue for bug reports
- Check existing issues for known problems
- See Flutter Testing Guide for mobile app testing
- Review API documentation for integration needs

## Roadmap

- [ ] PDF report generation
- [ ] Scheduled testing
- [ ] Email notifications
- [ ] Database persistence
- [ ] Custom rule creation
- [ ] Multi-language support
- [ ] CI/CD integration hooks