const { chromium } = require('@playwright/test');

async function testRoomDetailPage() {
  // Launch the browser
  const browser = await chromium.launch({ headless: false }); // Set to true if you don't want to see the browser UI
  const page = await browser.newPage();

  try {
    // Navigate to the application
    await page.goto('http://localhost:5173');

    // Wait for the page to load
    await page.waitForTimeout(2000);

    // Look for the "test" room in the room list
    const roomButton = await page.locator('button').filter({ hasText: 'test' }).first();
    if (await roomButton.count() > 0) {
      console.log('Found the "test" room, clicking...');
      await roomButton.click();
    } else {
      console.log('Could not find the "test" room button');
      // List all available room buttons
      const allRoomButtons = await page.locator('button').allInnerTexts();
      console.log('All available buttons:', allRoomButtons);
    }

    // Wait for room detail to load
    await page.waitForTimeout(2000);

    // Look for tab navigation elements
    const tabButtons = await page.locator('.tab-btn').allInnerTexts();
    console.log('Available tabs:', tabButtons);

    // Take a screenshot of the current state
    await page.screenshot({ path: 'room-detail-test.png', fullPage: true });

    console.log('Test completed. Screenshot saved as room-detail-test.png');
  } catch (error) {
    console.error('Error during test:', error);
    await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

testRoomDetailPage().catch(console.error);