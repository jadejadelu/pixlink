import { chromium } from '@playwright/test';

async function testGameShareButtons() {
  // Launch the browser
  const browser = await chromium.launch({ headless: false }); // Set to true if you don't want to see the browser UI
  const page = await browser.newPage();

  try {
    // Navigate to the application
    await page.goto('http://localhost:5173');

    // Wait for the page to load
    await page.waitForTimeout(2000);

    // Check if we need to register/login first
    const loginButton = await page.locator('button:has-text("登录")').count();
    const registerButton = await page.locator('button:has-text("注册")').count();
    
    if (loginButton > 0 || registerButton > 0) {
      console.log('Need to register first...');
      
      // Click register button if available, otherwise login
      if (registerButton > 0) {
        await page.locator('button:has-text("注册")').click();
        await page.waitForTimeout(1000);
      } else if (loginButton > 0) {
        await page.locator('button:has-text("登录")').click();
        await page.waitForTimeout(1000);
      }
      
      // Fill registration/login form (adjust selectors as needed)
      await page.fill('input[type="email"]', `test${Date.now()}@example.com`);
      await page.fill('input[type="text"][placeholder*="昵称"], input[type="text"][name="nickname"]', `testuser${Date.now()}`);
      await page.fill('input[type="password"]', 'password123');
      
      // Submit form
      await page.locator('button:has-text("提交"), button:has-text("注册"), button:has-text("登录")').click();
      await page.waitForTimeout(3000);
    }

    // Now look for rooms or create a room
    const createRoomButton = await page.locator('button:has-text("创建房间"), button:has-text("New Room")').count();
    if (createRoomButton > 0) {
      await page.locator('button:has-text("创建房间"), button:has-text("New Room")').click();
      await page.waitForTimeout(1000);
      
      // Fill room name
      await page.fill('input[placeholder*="房间名"], input[placeholder*="name"]', 'Test Room');
      
      // Submit room creation
      await page.locator('button:has-text("创建"), button:has-text("Submit")').click();
      await page.waitForTimeout(2000);
    }

    // Look for any room in the list and click it
    const roomButtons = await page.locator('button:has-text("test"), button:has-text("Test Room"), button:has-text("房间")');
    if (await roomButtons.count() > 0) {
      console.log('Found a room, clicking...');
      await roomButtons.first().click();
    } else {
      // If no rooms found, try to find any clickable room element
      const anyRoomElement = page.locator('button, .room-item, .room-card').first();
      if (await anyRoomElement.count() > 0) {
        console.log('Clicking first room-like element...');
        await anyRoomElement.click();
      }
    }

    // Wait for room detail to load
    await page.waitForTimeout(3000);

    // Look for the game share tab or section
    const gameShareTab = await page.locator('button:has-text("游戏共享"), button:has-text("Game Share"), .game-share-tab').count();
    if (gameShareTab > 0) {
      console.log('Found game share tab, clicking...');
      await page.locator('button:has-text("游戏共享"), button:has-text("Game Share"), .game-share-tab').first().click();
      await page.waitForTimeout(2000);
    }

    // Look for game share elements
    const gameShareElements = await page.locator('.game-share-list').isVisible();
    console.log('Game share list visible:', gameShareElements);

    if (gameShareElements) {
      // Look for pause/resume/delete buttons
      const pauseButtons = await page.locator('button:has-text("暂停分享")').count();
      const resumeButtons = await page.locator('button:has-text("继续分享")').count();
      const deleteButtons = await page.locator('button:has-text("删除")').count();
      console.log(`Found ${pauseButtons} pause buttons, ${resumeButtons} resume buttons, ${deleteButtons} delete buttons`);

      // Look for status badges
      const statusBadges = await page.locator('.status-badge').count();
      console.log(`Found ${statusBadges} status badges`);

      if (statusBadges > 0) {
        const badgeTexts = await page.locator('.status-badge').allInnerTexts();
        console.log('Status badge texts:', badgeTexts);
      }

      // Look for join buttons
      const joinButtons = await page.locator('button:has-text("加入游戏")').count();
      console.log(`Found ${joinButtons} join buttons`);
    }

    // Take a screenshot of the current state
    await page.screenshot({ path: 'game-share-test.png', fullPage: true });

    console.log('Test completed. Screenshot saved as game-share-test.png');
  } catch (error) {
    console.error('Error during test:', error);
    await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

testGameShareButtons().catch(console.error);