/**
 * Screenshot script for Record OS
 *
 * Takes a screenshot of the app running on the dev server.
 * Usage: node scripts/screenshot.mjs [url] [output]
 *
 * Examples:
 *   node scripts/screenshot.mjs                              # Screenshot localhost:5173 -> screenshot.png
 *   node scripts/screenshot.mjs http://localhost:5173        # Screenshot specific URL
 *   node scripts/screenshot.mjs http://localhost:5173 out.png # Custom output filename
 */

import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

async function takeScreenshot(url = 'http://localhost:5173', outputFile = 'screenshot.png') {
  console.log(`Taking screenshot of ${url}...`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();

    // Set viewport to a common desktop size
    await page.setViewport({
      width: 1440,
      height: 900,
      deviceScaleFactor: 2, // Retina-quality screenshots
    });

    // Navigate to the URL
    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    // Wait a bit for any animations to settle
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Take screenshot
    const outputPath = outputFile.startsWith('/') ? outputFile : join(projectRoot, outputFile);
    await page.screenshot({
      path: outputPath,
      fullPage: false,
    });

    console.log(`Screenshot saved to ${outputPath}`);
    return outputPath;
  } finally {
    await browser.close();
  }
}

// CLI interface
const args = process.argv.slice(2);
const url = args[0] || 'http://localhost:5173';
const output = args[1] || 'screenshot.png';

takeScreenshot(url, output)
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Screenshot failed:', err.message);
    process.exit(1);
  });
