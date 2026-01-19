import puppeteer from 'puppeteer';

async function main() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  console.log('📄 Checking https://ezypharma.vercel.app/pos ...\n');

  await page.goto('https://ezypharma.vercel.app/pos', {
    waitUntil: 'networkidle2',
    timeout: 30000,
  });

  await new Promise((r) => setTimeout(r, 3000));

  // Get page info
  const title = await page.title();
  const url = page.url();
  const content = await page.evaluate(() => document.body?.innerText || '');

  console.log(`Title: ${title}`);
  console.log(`Final URL: ${url}`);
  console.log(`\nPage Content:\n${'='.repeat(60)}\n${content.substring(0, 2000)}\n${'='.repeat(60)}`);

  // Take screenshot
  await page.screenshot({ path: 'ezypharma-screenshot.png', fullPage: true });
  console.log('\n📸 Screenshot saved to: ezypharma-screenshot.png');

  await browser.close();
}

main().catch(console.error);

