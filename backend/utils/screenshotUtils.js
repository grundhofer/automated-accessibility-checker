const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

/**
 * Capture screenshots of accessibility violations with highlighted elements
 */
class ScreenshotCapture {
  constructor(page) {
    this.page = page;
  }

  /**
   * Capture screenshots for all violations with highlighted problematic elements
   */
  async captureViolationScreenshots(results, testId, baseDir) {
    const screenshotDir = path.join(baseDir, 'screenshots', testId);
    await fs.mkdir(screenshotDir, { recursive: true });

    const screenshotData = [];

    // Capture full page screenshot first
    const fullPagePath = path.join(screenshotDir, 'full-page.png');
    await this.page.screenshot({ 
      path: fullPagePath, 
      fullPage: true,
      type: 'png'
    });

    // Process each violation
    for (let violationIndex = 0; violationIndex < results.violations.length; violationIndex++) {
      const violation = results.violations[violationIndex];
      
      for (let nodeIndex = 0; nodeIndex < violation.nodes.length; nodeIndex++) {
        const node = violation.nodes[nodeIndex];
        const screenshotName = `violation-${violationIndex + 1}-node-${nodeIndex + 1}.png`;
        const screenshotPath = path.join(screenshotDir, screenshotName);

        try {
          // Highlight the problematic element
          const elementScreenshot = await this.captureElementScreenshot(
            node.target[0], 
            screenshotPath,
            violation.impact
          );

          if (elementScreenshot) {
            screenshotData.push({
              violationIndex: violationIndex + 1,
              nodeIndex: nodeIndex + 1,
              ruleId: violation.id,
              impact: violation.impact,
              description: violation.description,
              element: node.target[0],
              screenshot: `/reports/screenshots/${testId}/${screenshotName}`,
              fullPath: screenshotPath
            });
          }
        } catch (error) {
          console.warn(`Failed to capture screenshot for violation ${violationIndex + 1}, node ${nodeIndex + 1}:`, error.message);
        }
      }
    }

    return {
      fullPageScreenshot: `/reports/screenshots/${testId}/full-page.png`,
      violationScreenshots: screenshotData
    };
  }

  /**
   * Capture screenshot of a specific element with highlighting
   */
  async captureElementScreenshot(selector, outputPath, impact) {
    try {
      // Find the element
      const element = await this.page.locator(selector).first();
      
      // Check if element exists and is visible
      if (!(await element.isVisible())) {
        console.warn(`Element ${selector} is not visible`);
        return null;
      }

      // Scroll element into view
      await element.scrollIntoViewIfNeeded();
      
      // Wait a bit for animations
      await this.page.waitForTimeout(500);

      // Get element bounding box
      const boundingBox = await element.boundingBox();
      if (!boundingBox) {
        console.warn(`Could not get bounding box for ${selector}`);
        return null;
      }

      // Add padding around the element
      const padding = 20;
      const screenshotArea = {
        x: Math.max(0, boundingBox.x - padding),
        y: Math.max(0, boundingBox.y - padding),
        width: boundingBox.width + (padding * 2),
        height: boundingBox.height + (padding * 2)
      };

      // Capture screenshot of the area
      const screenshot = await this.page.screenshot({
        type: 'png',
        clip: screenshotArea
      });

      // Add highlighting overlay
      const highlightedImage = await this.addHighlightOverlay(
        screenshot, 
        {
          x: padding,
          y: padding,
          width: boundingBox.width,
          height: boundingBox.height
        },
        impact
      );

      // Save the highlighted screenshot
      await fs.writeFile(outputPath, highlightedImage);
      
      return outputPath;
    } catch (error) {
      console.error(`Error capturing element screenshot for ${selector}:`, error);
      return null;
    }
  }

  /**
   * Add colored highlight overlay based on violation impact
   */
  async addHighlightOverlay(imageBuffer, elementBounds, impact) {
    try {
      // Define colors based on impact level
      const colors = {
        critical: { r: 220, g: 53, b: 69, a: 0.3 },   // Red
        serious: { r: 255, g: 193, b: 7, a: 0.3 },    // Orange  
        moderate: { r: 255, g: 235, b: 59, a: 0.3 },  // Yellow
        minor: { r: 40, g: 167, b: 69, a: 0.3 }       // Green
      };

      const color = colors[impact] || colors.moderate;
      
      // Get image metadata
      const image = sharp(imageBuffer);
      const { width, height } = await image.metadata();

      // Create highlight overlay
      const overlay = Buffer.from(
        `<svg width="${width}" height="${height}">
          <rect x="${elementBounds.x}" y="${elementBounds.y}" 
                width="${elementBounds.width}" height="${elementBounds.height}"
                fill="rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})"
                stroke="rgb(${color.r}, ${color.g}, ${color.b})"
                stroke-width="3"/>
          <text x="${elementBounds.x + 5}" y="${elementBounds.y - 5}"
                fill="rgb(${color.r}, ${color.g}, ${color.b})"
                font-family="Arial, sans-serif"
                font-size="12"
                font-weight="bold">${impact.toUpperCase()}</text>
        </svg>`
      );

      // Composite the overlay onto the image
      const result = await image
        .composite([{ input: overlay, top: 0, left: 0 }])
        .png()
        .toBuffer();

      return result;
    } catch (error) {
      console.error('Error adding highlight overlay:', error);
      // Return original image if overlay fails
      return imageBuffer;
    }
  }
}

module.exports = ScreenshotCapture;